const {safeWrap, toObject, unwrap} = require('@mountaingapsolutions/objectutil');
const logger = require('services/logger');
const notificationsManager = require('services/notificationsManager');
const {approveRequest, cancelRequest, deleteRequest, getRequest, getRequests, initiateRequest, openRequest, rejectRequest} = require('services/db/controllers/requestsController');
const {sendMailFromTemplate} = require('services/mail/smtpClient');
const {asyncRequest, getDomain, initApiRequest, sendError, sendJsonResponse} = require('services/utils');
const {REQUEST_STATUS, REQUEST_TYPES} = require('services/constants');
const addRequestId = require('express-request-id')();

/**
 * Authorizes a secrets requested via Control Groups.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @param {string} entityId The requester entity id.
 * @param {string} path The secrets request path.
 * @returns {Promise}
 */
const _authorizeControlGroupRequest = async (req, entityId, path) => {
    const {groups, token} = req.session.user;
    const {accessor} = ((await _getRequest(entityId, path, REQUEST_TYPES.CONTROL_GROUP)).dataValues || {}).referenceData || {};
    let remappedData;
    if (accessor) {
        // Inject the accessor into the post body.
        req.body.accessor = accessor;
        const data = await _injectEntityNameIntoRequestResponse(req, entityId, approveRequest(req, entityId, path));
        // Inject the Control Group authorization result into the data set.
        data.requestInfoData = await require('vault-pam-premium').authorizeRequest(token, accessor);
        remappedData = _remapSecretsRequest(data);
        logger.info(`Emit approve-request data ${JSON.stringify(remappedData)} to ${entityId} and the following groups: ${groups.join(', ')}.`);
        notificationsManager.getInstance().to(entityId).emit('approve-request', remappedData);
        groups.forEach((groupName) => {
            notificationsManager.getInstance().to(groupName).emit('approve-request', remappedData);
        });
    } else {
        throw new Error('Request not found');
    }
    return remappedData;
};

/**
 * Authorizes a secrets requested via standard or dynamic request.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @param {string} entityId The requester entity id.
 * @param {string} path The secrets request path.
 * @returns {Promise}
 */
const _authorizeRequest = async (req, entityId, path) => {
    const isApprover = await _checkIfApprover(req);
    let remappedData;
    if (isApprover) {
        const {type} = (await _getRequest(entityId, path)).dataValues || {};
        if (!type) {
            throw new Error('Request not found');
        }
        let referenceData = null;
        if (type === REQUEST_TYPES.DYNAMIC_REQUEST) {
            const {data, lease_id: leaseId} = await _createCredentials(req, path);
            if (data && leaseId) {
                const token = data && await _wrapData(req, data);
                referenceData = {token, leaseId};
            } else {
                const error = new Error('Invalid request');
                error.statusCode = 400;
                throw error;
            }
        }
        const data = await _injectEntityNameIntoRequestResponse(req, entityId, approveRequest(req, entityId, path, referenceData));
        remappedData = _remapSecretsRequest(data);
        logger.info(`Emit approve-request data ${JSON.stringify(remappedData)} to ${entityId} and pam-approvers.`);
        notificationsManager.getInstance().to(entityId).emit('approve-request', remappedData);
        notificationsManager.getInstance().to('pam-approver').emit('approve-request', remappedData);
    } else {
        const unauthorizedError = new Error('Unauthorized');
        unauthorizedError.statusCode = 403;
        throw unauthorizedError;
    }
    return remappedData;
};

/**
 * Check if user is a member of approver group.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const _checkIfApprover = async (req) => {
    const {entityId, token} = req.session.user;
    const groupName = 'pam-approver';
    try {
        const response = await asyncRequest(initApiRequest(token, `${getDomain()}/v1/identity/group/name/${groupName}`, entityId, true));
        if (response.body && response.body.data) {
            const {member_entity_ids = []} = response.body.data;
            return member_entity_ids.includes(entityId);
        } else {
            logger.error(`${groupName} group not found.`);
            return false;
        }
    } catch (error) {
        logger.error(error);
        return false;
    }
};

/**
 * Generates credentials for dynamic secrets approval. Refer to https://www.vaultproject.io/api/secret/aws/index.html or
 * https://www.vaultproject.io/api/secret/azure/index.html for additional information.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} path The secrets request path.
 * @returns {Promise}
 */
const _createCredentials = async (req, path) => {
    const {entityId} = req.session.user;
    const {VAULT_API_TOKEN: apiToken} = process.env;

    const pathSplit = path.split('/');
    const engineName = pathSplit[0];
    const roleName = pathSplit[1];
    const response = (await asyncRequest(initApiRequest(apiToken, `${getDomain()}/v1/${engineName}/creds/${roleName}`, entityId, true))).body;
    return response;
};

/**
 * Updates or creates a request record and injects the requester name into the result.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} entityId The requester's entity id.
 * @param {Promise} requestPromise The request promise.
 * @returns {Promise}
 * @private
 */
const _injectEntityNameIntoRequestResponse = (req, entityId, requestPromise) => {
    return new Promise((resolve, reject) => {
        Promise.all([_getUserEntityIds(req), requestPromise])
            .then((results) => {
                const userIdMap = results[0];
                const request = results[1];
                if (request && request.dataValues) {
                    // Inject the requester name into the data value.
                    request.dataValues.name = (userIdMap[entityId] || {}).name || `<${entityId}>`;
                    // Inject the response creator's name into each of the responses.
                    request.dataValues.responses.forEach((response) => {
                        const {entityId: responderEntityId} = response;
                        response.name = (userIdMap[responderEntityId] || {}).name || `<${responderEntityId}>`;
                    });
                    resolve(request);
                } else {
                    reject(request);
                }
            })
            .catch(reject);
    });
};

/**
 * Returns the engine type from the provided secrets path.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @param {string} path The secrets request path.
 * @returns {Promise}
 */
const _getEngineType = async (req, path) => {
    const {entityId} = req.session.user;
    const {VAULT_API_TOKEN: apiToken} = process.env;

    // Retrieve the list of Vault engine mounts.
    const mounts = (await asyncRequest(initApiRequest(apiToken, `${getDomain()}/v1/sys/mounts`, entityId, true))).body;

    // Check the engine type from the provided path.
    const mountFromPath = `${path.split('/')[0]}/`;
    const mount = mounts[mountFromPath];
    if (!mount) {
        const error = new Error(`Invalid mount: ${mountFromPath}`);
        error.statusCode = 400;
        throw error;
    }

    return mount.type;
};

/**
 * Helper method to return the specified secrets request.
 *
 * @private
 * @param {string} entityId The requester entity id.
 * @param {string} path The request secrets path.
 * @param {string} [type] The request type.
 * @returns {Promise}
 */
const _getRequest = async (entityId, path, type) => {
    const requestParams = {
        entityId,
        path
    };
    if (type) {
        requestParams.type = type;
    }
    return await getRequest(requestParams);
};

/**
 * Retrieves the corresponding requests for the session user.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const _getRequests = (req) => {
    return new Promise(async (resolve, reject) => {
        const {entityId} = req.session.user;
        const isApprover = await _checkIfApprover(req);
        // If not an approver, only retrieve user's own requests.
        Promise.all([_getUserEntityIds(req), getRequests(isApprover ? {} : {
            entityId
        })])
            .then((results) => {
                const userIdMap = results[0];
                // Exclude any CANCELED or REJECTED requests.
                const requests = (Array.isArray(results[1]) ? results[1] : []).filter((request) => {
                    return !(request.dataValues.responses || []).some((response) => {
                        return response.type === REQUEST_STATUS.CANCELED || response.type === REQUEST_STATUS.REJECTED;
                    });
                });
                // Inject the requester name into each data value row.
                requests.forEach((request) => {
                    if (request.dataValues) {
                        const {entityId: id} = request.dataValues;
                        request.dataValues.name = (userIdMap[id] || {}).name || `<${id}>`;
                        // Inject the response creator's name into each of the responses.
                        request.dataValues.responses.forEach((response) => {
                            const {entityId: responderEntityId} = response;
                            response.name = (userIdMap[responderEntityId] || {}).name || `<${responderEntityId}>`;
                        });
                    }
                });
                resolve(requests.filter((request) => !(request.dataValues.responses || []).some((response) => response.type === REQUEST_STATUS.CANCELED)));
            })
            .catch(err => reject(err));
    });
};

/**
 * Retrieves user data by entity id.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @param {string} entityId The entity id.
 * @returns {Promise}
 */
const _getUserByEntityId = async (req, entityId) => {
    const {entityId: sessionEntityId, token} = req.session.user;
    try {
        const response = await asyncRequest(initApiRequest(token, `${getDomain()}/v1/identity/entity/id/${entityId}`, sessionEntityId, true));
        if (response.body && response.body.data) {
            return response.body.data;
        } else {
            logger.error(response.body);
        }
    } catch (error) {
        logger.error(error);
    }
    return {};
};

/**
 * Retrieves all user entity ids.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const _getUserEntityIds = async (req) => {
    const {entityId, token} = req.session.user;
    try {
        const response = await asyncRequest(initApiRequest(token, `${getDomain()}/v1/identity/entity/id?list=true`, entityId, true));
        const keyInfo = unwrap(safeWrap(response.body).data.key_info);
        if (keyInfo) {
            return keyInfo;
        } else {
            logger.error(response.body);
        }
    } catch (error) {
        logger.error(error);
    }
    return {};
};

/**
 * Retrieves users associated to the provided group name.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @param {string} groupName The group name.
 * @returns {Promise}
 */
const _getUsersByGroupName = async (req, groupName) => {
    const {entityId: sessionEntityId, token} = req.session.user;
    const domain = getDomain();

    const groupRequest = initApiRequest(token, `${domain}/v1/identity/group/name/${groupName}`, sessionEntityId, true);
    const {member_entity_ids: entityIds = []} = ((await asyncRequest(groupRequest)).body || {}).data || {};
    return new Promise((resolve) => {
        Promise.all(entityIds.map((entityId) => new Promise((userResolve) => {
            const userRequest = initApiRequest(token, `${domain}/v1/identity/entity/id/${entityId}`, sessionEntityId, true);
            asyncRequest(userRequest)
                .then((response) => userResolve(response.body))
                .catch((error) => userResolve(error));
        })))
            .then((responses) => {
                resolve({
                    name: groupName,
                    users: responses.filter((response) => response.data).map((response) => response.data)
                });
            });
    });
};

/**
 * Cancels the secrets request.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const _cancelRequest = (req) => {
    const {path, type} = req.query;
    const {entityId} = req.session.user;
    return new Promise(async (resolve, reject) => {
        if (!path || !type) {
            reject({
                message: 'Invalid request',
                statusCode: 400
            });
            return;
        }

        try {
            const approverGroupPromises = [];
            // Control Group request cancellation.
            if (type === REQUEST_TYPES.CONTROL_GROUP) {
                const {accessor} = ((await _getRequest(entityId, path, type)).dataValues || {}).referenceData || {};
                if (accessor) {
                    // Inject the accessor into the query.
                    const {groups = []} = await require('vault-pam-premium').deleteRequest(entityId, accessor, path);
                    groups.forEach(group => {
                        approverGroupPromises.push(_getUsersByGroupName(req, group));
                    });
                    // Control Group requests operate differently in that it needs to be deleted, since the Vault accessor is revoked.
                    logger.warn(`Deleting the record with accessor ${accessor} from database.`);
                    deleteRequest({
                        referenceData: {
                            accessor
                        }
                    });
                } else {
                    reject({
                        message: 'Request not found',
                        statusCode: 404
                    });
                    return;
                }
            } else {
                cancelRequest(req, path);
                approverGroupPromises.push(_getUsersByGroupName(req, 'pam-approver'));
            }

            // Non-blocking call to send out emails and notifications.
            const recipients = {};
            Promise.all(approverGroupPromises).then((groups) => {
                const requestType = 'cancel-request';
                notificationsManager.getInstance().to(entityId).emit(requestType, path);
                groups.forEach((groupData) => {
                    const {name, users = []} = groupData;
                    // Notify the group of the cancellation.
                    logger.info(`Emit ${requestType} of path ${path} to ${name}.`);
                    notificationsManager.getInstance().to(name).emit(requestType, path);
                    users.forEach((user) => {
                        if (user.metadata && user.metadata.email) {
                            recipients[user.metadata.email] = user;
                        }
                    });
                });
                sendMailFromTemplate(req, 'cancel-request', {
                    to: Object.keys(recipients).join(', '),
                    secretsPath: path
                });
            });

            resolve({
                status: 'ok'
            });
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Rejects the secrets request.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const _rejectRequest = (req) => {
    const {entityId, path, type} = req.query;
    return new Promise(async (resolve, reject) => {
        if (!path || !type) {
            reject({
                message: 'Invalid request',
                statusCode: 400
            });
            return;
        }

        const requestType = 'reject-request';
        try {
            if (type === REQUEST_TYPES.CONTROL_GROUP) {
                const {accessor} = ((await _getRequest(entityId, path, type)).dataValues || {}).referenceData || {};
                if (accessor) {
                    const {entityId: entityIdSelf} = req.session.user;
                    const {groups = []} = await require('vault-pam-premium').deleteRequest(entityIdSelf, accessor, path, entityId);
                    groups.forEach(name => {
                        // Notify the group of the rejection.
                        logger.info(`Emit ${requestType} of accessor ${path} to ${name}.`);
                        notificationsManager.getInstance().to(name).emit(requestType, path);
                    });
                    // Control Group requests operate differently in that it needs to be deleted, since the Vault accessor is revoked.
                    logger.warn(`Deleting the record with accessor ${accessor} from database.`);
                    deleteRequest({
                        path,
                        referenceData: {
                            accessor
                        }
                    });
                } else {
                    reject({
                        message: 'Request not found',
                        statusCode: 404
                    });
                    return;
                }
            } else {
                const isApprover = await _checkIfApprover(req);
                if (isApprover) {
                    rejectRequest(req, entityId, path);

                    // Notify the group of the rejection.
                    logger.info(`Emit ${requestType} of accessor ${path} to pam-approver.`);
                    notificationsManager.getInstance().to('pam-approver').emit(requestType, path);
                } else {
                    reject({
                        message: 'Unauthorized',
                        statusCode: 403
                    });
                    return;
                }
            }

            logger.info(`Emit reject-request of path ${path} to ${entityId}.`);
            notificationsManager.getInstance().to(entityId).emit(requestType, path);

            // Non-blocking call to send out emails.
            _getUserByEntityId(req, entityId).then((user) => {
                if (user.metadata && user.metadata.email) {
                    sendMailFromTemplate(req, requestType, {
                        to: user.metadata.email,
                        secretsPath: path
                    });
                }
            });

            resolve({
                status: 'ok'
            });
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Helper method to normalize a standard request and Control Group request data object.
 *
 * @private
 * @param {Object} secretsRequest Either the standard request or Control Group request data object.
 * @returns {Object}
 */
const _remapSecretsRequest = (secretsRequest) => {
    const {createdAt: creationTime, entityId, id, name, path, referenceData = {}, responses = [], type} = secretsRequest.dataValues;
    let approved, authorizations, opened;
    if (secretsRequest.requestInfoData) {
        const {data} = secretsRequest.requestInfoData;
        approved = !!data.approved;
        authorizations = data.authorizations ? data.authorizations.map((authorization) => {
            const {entity_id, entity_name} = authorization;
            return {
                entityId: entity_id,
                name: entity_name
            };
        }) : [];
    } else {
        approved = responses.some((response) => response.type === REQUEST_STATUS.APPROVED);
        opened = responses.some((response) => response.type === REQUEST_STATUS.OPENED);
        authorizations = responses.filter((response) => [REQUEST_STATUS.APPROVED, REQUEST_STATUS.REJECTED].includes(response.type));
    }
    return {
        approved,
        creationTime,
        authorizations,
        id,
        isWrapped: type === 'control-group',
        opened,
        path,
        referenceData,
        requestEntity: {
            id: entityId,
            name
        },
        responses,
        type
    };
};


/**
 * Helper method for wrapping data.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @param {Object} data The data object to be wrapped.
 * @returns {Promise}
 */
const _wrapData = async (req, data) => {
    const {VAULT_API_TOKEN: apiToken} = process.env;
    let apiRequest = initApiRequest(apiToken, `${getDomain()}/v1/sys/wrapping/wrap`, true);
    // TODO TTL is currently hard-coded. Have this be configurable.
    apiRequest.headers['x-vault-wrap-ttl'] = 60000;
    const response = await asyncRequest({
        ...apiRequest,
        method: 'POST',
        json: data
    });
    if (response.body) {
        return response.body.wrap_info.token;
    }
    throw new Error('Invalid request');
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .use(addRequestId)
    /**
     * @swagger
     * /rest/secret/requests:
     *   get:
     *     tags:
     *       - Requests
     *     summary: Retrieves the session user's active requests.
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Unauthorized.
     */
    .get('/requests', async (req, res) => {
        logger.audit(req, res);
        const requests = [];
        const promises = [];
        // Retrieve requests.
        (await _getRequests(req)).forEach((requestRecord) => {
            const {referenceData, type} = requestRecord.dataValues;
            const {accessor} = referenceData || {};
            if (accessor && type === 'control-group') {
                // For Control Group requests, also validate the accessor.
                const accessorValidationPromise = require('vault-pam-premium').validateAccessor(accessor);
                accessorValidationPromise.then((response) => {
                    const requestData = response.body.data;
                    if (!requestData) {
                        logger.warn(`Invalid accessor ${accessor}. Deleting from database.`);
                        deleteRequest({
                            referenceData: {
                                accessor
                            }
                        });
                    } else {
                        requests.push(_remapSecretsRequest({
                            requestData,
                            ...requestRecord
                        }));
                    }
                });
                promises.push(accessorValidationPromise);
            } else {
                requests.push(_remapSecretsRequest(requestRecord));
            }
        });
        Promise.all(promises)
            .then(() => {
                sendJsonResponse(req, res, requests);
            })
            .catch((err) => {
                logger.error(err.toString(), req, res, null, err);
                sendJsonResponse(req, res, [], 500);
            });
    })
    /**
     * @swagger
     * /rest/secret/request:
     *   delete:
     *     tags:
     *       - Requests
     *     summary: Deletes the specified request
     *     parameters:
     *       - name: path
     *         in: query
     *         description: The path of the control group request to delete.
     *         schema:
     *           type: string
     *       - name: entityId
     *         in: query
     *         description: Entity id of the control group request to delete. If not provided, will default to the session user's entity id.
     *         schema:
     *           type: string
     *       - name: id
     *         in: query
     *         description: Id of the standard request to delete
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Unauthorized.
     *       404:
     *         description: Request not found.
     */
    .delete('/request', async (req, res) => {
        logger.audit(req, res);
        const {entityId, path, type} = req.query;
        const {entityId: entityIdSelf} = req.session.user;
        if (!path || !type) {
            sendError(req, res, 'Invalid request', null, 400);
            return;
        }

        try {
            // If entity id explicitly provided and it's not the same as as the current session user's id, it means it was a request rejection.
            if (entityId && entityId !== entityIdSelf) {
                sendJsonResponse(req, res, await _rejectRequest(req));
            } else {
                sendJsonResponse(req, res, await _cancelRequest(req));
            }
        } catch (err) {
            sendError(req, res, err.message, null, err.statusCode);
        }
    })
    /**
     * @swagger
     * /rest/secret/request:
     *   post:
     *     tags:
     *       - Requests
     *     summary: Initiates a request for a particular secret path.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               path:
     *                 type: string
     *               requestData:
     *                 type: string
     *               type:
     *                 type: string
     *               status:
     *                 type: string
     *     responses:
     *       200:
     *         description: Success.
     *       400:
     *         description: Required path input was not provided.
     *       403:
     *         description: No API token was set.
     *       500:
     *         description: No approval group has been configured.
     */
    .post('/request', async (req, res) => {
        logger.audit(req, res);
        const {path, type} = req.body;
        if (!path || !type) {
            sendError(req, res, 'Invalid request. Params path and type must be provided.', 400);
            return;
        }
        const {entityId, token: sessionToken} = req.session.user;
        try {
            const approverGroupPromises = [];

            let referenceData = {
                engineType: await _getEngineType(req, path)
            };
            if (type === REQUEST_TYPES.CONTROL_GROUP) {
                // Need to generate an accessor and token to be stored as referenceData if it's a Control Group request.
                const {groups = [], accessor, token} = await require('vault-pam-premium').createRequest(sessionToken, path);
                referenceData = {
                    ...referenceData,
                    accessor,
                    token
                };
                groups.forEach((groupName) => {
                    approverGroupPromises.push(_getUsersByGroupName(req, groupName));
                });
            } else {
                approverGroupPromises.push(_getUsersByGroupName(req, 'pam-approver'));
            }

            const requestData = _remapSecretsRequest(await _injectEntityNameIntoRequestResponse(req, entityId, initiateRequest(req, {
                referenceData,
                path,
                type
            })));

            const approvers = {};
            Promise.all(approverGroupPromises).then((groups) => {
                // Notify self as well as groups.
                notificationsManager.getInstance().in(entityId).emit('create-request', requestData);
                groups.forEach((groupData) => {
                    const {name, users = []} = groupData;
                    logger.info(`Emit create-request data ${JSON.stringify(requestData)} to ${name}`);
                    notificationsManager.getInstance().in(name).emit('create-request', requestData);
                    users.forEach((user) => {
                        if (user.metadata && user.metadata.email) {
                            approvers[user.metadata.email] = user;
                        }
                    });
                });
                sendMailFromTemplate(req, 'create-request', {
                    to: Object.keys(approvers).join(', '),
                    secretsPath: path
                });
            });
        } catch (err) {
            sendError(req, res, err.message, null, err.statusCode);
            return;
        }
        sendJsonResponse(req, res, {
            status: 'ok'
        });
    })
    /**
     * @swagger
     * /rest/secret/request/{id}/approvers:
     *   get:
     *     tags:
     *       - Requests
     *     summary: Retrieves the approvers associated to the request.
     *     parameters:
     *       - name: id
     *         in: path
     *         description: The request id.
     *         schema:
     *           type: integer
     *         required: true
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Unauthorized.
     *       404:
     *         description: Not found.
     */
    .get('/request/:id/approvers', async (req, res) => {
        const {id} = req.params;
        const request = await getRequest({
            id
        });
        if (request) {
            const {entityId: sessionEntityId} = req.session.user;
            const {entityId, path, type} = request.dataValues;
            let users;
            if (type === REQUEST_TYPES.CONTROL_GROUP) {
                let usersMap = {};
                const groups = await require('vault-pam-premium').getApproverGroupsByPath(path);
                (await Promise.all(groups.map((groupName) => {
                    return _getUsersByGroupName(req, groupName);
                }))).forEach((response) => {
                    if (response && response.users) {
                        // De-dup any overlapping users across multiple groups.
                        usersMap = toObject(response.users, 'id');
                    }
                });
                users = Object.keys(usersMap).map((key) => usersMap[key]);
            } else {
                users = (await _getUsersByGroupName(req, 'pam-approver') || {}).users || [];
            }
            // Also check if the user is the requester or if the user is one of the approvers. If not, 403 response is returned.
            if (entityId === sessionEntityId || users.some((user) => user.id === sessionEntityId)) {
                sendJsonResponse(req, res, users.map((user) => {
                    const {name, metadata} = user;
                    return {
                        name,
                        metadata
                    };
                }));
            } else {
                sendError(req, res, 'Unauthorized.', req.originalUrl, 403);
            }
        } else {
            sendError(req, res, 'Request not found', req.originalUrl, 404);
        }
    })
    /**
     * @swagger
     * /rest/secret/request/authorize:
     *   post:
     *     tags:
     *       - Requests
     *     summary: Authorizes a request.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               accessor:
     *                 type: string
     *               id:
     *                 type: string
     *     responses:
     *       200:
     *         description: Success.
     *       400:
     *         description: Invalid accessor.
     *       403:
     *         description: Unauthorized.
     *       500:
     *         description: No approval group has been configured.
     */
    .post('/request/authorize', async (req, res) => {
        logger.audit(req, res);
        let {entityId, path, type} = req.body;

        if (!entityId || !path) {
            sendError(req, res, 'Invalid request');
            return;
        }
        let responseData;
        try {
            if (req.app.locals.features['control-groups'] && type === REQUEST_TYPES.CONTROL_GROUP) {
                responseData = await _authorizeControlGroupRequest(req, entityId, path);
            } else {
                responseData = await _authorizeRequest(req, entityId, path);
            }
            _getUserByEntityId(req, entityId).then((user) => {
                if (user.metadata && user.metadata.email) {
                    sendMailFromTemplate(req, 'approve-request', {
                        to: user.metadata.email,
                        secretsPath: path.replace('/data/', '/')
                    });
                }
            });
        } catch (err) {
            sendError(req, res, err.message, null, err.statusCode);
            return;
        }
        sendJsonResponse(req, res, responseData);
    })
    /**
     * @swagger
     * /rest/secret/open/{path}:
     *   get:
     *     tags:
     *       - Requests
     *     name: Open an approved secrets request.
     *     summary: Retrieves the secret values by path.
     *     parameters:
     *       - name: path
     *         in: path
     *         description: The Vault secrets path.
     *         schema:
     *           type: string
     *         required: true
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Unauthorized.
     *       404:
     *         description: Not found.
     */
    .get('/open/*', async (req, res) => {
        logger.audit(req, res);
        const {entityId, token} = req.session.user;
        const path = req.params[0];
        const apiUrl = `${getDomain()}/v1/${path}`;
        // Request for approved requests and secrets data can be fetched in parallel.
        Promise.all([getRequests({
            entityId
        }, {
            type: REQUEST_STATUS.APPROVED
        }), asyncRequest(initApiRequest(token, apiUrl, entityId, true))])
            .then((results) => {
                const approvedRequests = results[0];
                const secrets = (results[1] || {}).body;
                if (Array.isArray(approvedRequests) && secrets) {
                    const isApproved = approvedRequests.some((approvedRequest) => approvedRequest.dataValues.path === path);
                    if (isApproved) {
                        sendJsonResponse(req, res, secrets);
                    } else {
                        sendError(req, res, 'Unauthorized', apiUrl, 403);
                    }
                } else {
                    sendError(req, res, 'Unknown error', apiUrl);
                }
            })
            .catch((err) => {
                sendError(req, res, err, apiUrl);
            });
    })
    /**
     * @swagger
     * /rest/secret/unwrap:
     *   post:
     *     tags:
     *       - Requests
     *     summary: Unwraps an authorized Control Group request.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               token:
     *                 type: string
     *               required:
     *                 - token
     *     responses:
     *       200:
     *         description: The unwrapped secret.
     *       400:
     *         description: Wrapping token is not valid, does not exist, or needs further authorization.
     *       403:
     *         description: Unauthorized.
     */
    .post('/unwrap', async (req, res) => {
        logger.audit(req, res);
        try {
            const {entityId, token} = req.session.user;
            const {path} = req.body;
            const {referenceData, type} = (await _getRequest(entityId, path)).dataValues || {};
            const {token: unwrapToken} = referenceData || {};
            if (path && unwrapToken) {
                const response = await asyncRequest({
                    ...initApiRequest(token, `${getDomain()}/v1/sys/wrapping/unwrap`, entityId, true),
                    method: 'POST',
                    json: {
                        token: unwrapToken
                    }
                });
                if (response.body) {
                    if (req.app.locals.features['control-groups'] && type === REQUEST_TYPES.CONTROL_GROUP) {
                        const groups = await require('vault-pam-premium').getApproverGroupsByPath(path);
                        (groups || []).forEach((groupName) => {
                            logger.info(`Emit read-approved-request path ${path} to ${groupName}.`);
                            notificationsManager.getInstance().to(groupName).emit('read-approved-request', path);
                        });
                    } else {
                        //DYNAMIC SECRET, UPDATE STATUS TO OPENED
                        await openRequest({path, entityId});
                    }
                    sendJsonResponse(req, res, response.body, response.statusCode);
                } else {
                    sendError(req, res, 'Invalid request');
                }
            } else {
                sendError(req, res, 'Invalid request');
            }
        } catch (err) {
            sendError(req, res, err.message, null, err.statusCode);
        }
    });

module.exports = {
    router
};
