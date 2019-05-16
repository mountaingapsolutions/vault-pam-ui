const {safeWrap, unwrap} = require('@mountaingapsolutions/objectutil');
const logger = require('services/logger');
const notificationsManager = require('services/notificationsManager');
const {sendMailFromTemplate} = require('services/mail/smtpClient');
const {
    createOrUpdateStatusByRequester,
    getApprovedRequests,
    getRequests,
    updateStandardRequestByApprover
} = require('services/routes/standardRequestService');
const {asyncRequest, checkStandardRequestSupport, getDomain, initApiRequest, sendError, sendJsonResponse, setSessionData, wrapData} = require('services/utils');
const {createCredential} = require('services/routes/dynamicSecretRequestService');
const {REQUEST_STATUS, REQUEST_TYPES} = require('services/constants');
const addRequestId = require('express-request-id')();

/**
 * Retrieves user data by entity id.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @param {string} entityId The entity id.
 * @returns {Promise}
 */
const _getUserByEntityId = (req, entityId) => {
    const {entityId: sessionEntityId, token} = req.session.user;
    return new Promise((resolve) => {
        asyncRequest(initApiRequest(token, `${getDomain()}/v1/identity/entity/id/${entityId}`, sessionEntityId, true))
            .then((response) => {
                const responseBody = response.body;
                resolve(responseBody && responseBody.data ? responseBody.data : responseBody);
            })
            .catch((error) => resolve(error));
    });
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
    const {entityId: requesterEntityId} = req.session.user;
    const {CONTROL_GROUP, DYNAMIC_REQUEST, STANDARD_REQUEST} = REQUEST_TYPES;
    return new Promise(async (resolve, reject) => {
        try {
            const approverGroupPromises = [];
            // Control Group request cancellation.
            if (req.app.locals.features['control-groups'] && type === CONTROL_GROUP) {
                const {groups = []} = await require('vault-pam-premium').deleteRequest(req);
                groups.forEach(group => {
                    approverGroupPromises.push(_getUsersByGroupName(req, group.data.name));
                });
            }
            // Standard Request cancellation.
            else if (type === STANDARD_REQUEST || type === DYNAMIC_REQUEST) {
                await createOrUpdateStatusByRequester(req, requesterEntityId, path, REQUEST_STATUS.CANCELED);
                approverGroupPromises.push(_getUsersByGroupName(req, 'pam-approver'));
            }
            // Invalid type provided.
            else {
                reject({
                    message: 'Invalid request',
                    statusCode: 400
                });
                return;
            }

            // Non-blocking call to send out emails and notifications.
            const recipients = {};
            Promise.all(approverGroupPromises).then((groups) => {
                const requestType = 'cancel-request';
                notificationsManager.getInstance().to(requesterEntityId).emit(requestType, path);
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
    const {CONTROL_GROUP, DYNAMIC_REQUEST, STANDARD_REQUEST} = REQUEST_TYPES;
    return new Promise(async (resolve, reject) => {
        const requestType = 'reject-request';
        try {
            // Control Group rejection.
            if (req.app.locals.features['control-groups'] && type === CONTROL_GROUP) {
                const {groups = []} = await require('vault-pam-premium').deleteRequest(req);

                groups.forEach(group => {
                    const {name} = group.data;
                    // Notify the group of the rejection.
                    logger.info(`Emit ${requestType} of accessor ${path} to ${name}.`);
                    notificationsManager.getInstance().to(name).emit(requestType, path);
                });
            }
            // Standard Request rejection.
            else if (type === STANDARD_REQUEST || type === DYNAMIC_REQUEST) {
                await updateStandardRequestByApprover(req, entityId, path, REQUEST_STATUS.REJECTED);
                // Notify the group of the rejection.
                logger.info(`Emit ${requestType} of accessor ${path} to pam-approver.`);
                notificationsManager.getInstance().to('pam-approver').emit(requestType, path);
            }
            // Invalid type provided.
            else {
                reject({
                    message: 'Invalid request',
                    statusCode: 400
                });
                return;
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
    if (secretsRequest.request_info) {
        const {approved, authorizations, request_entity: requestEntity, request_path: requestPath} = secretsRequest.request_info.data;
        const {accessor, creation_time: creationTime, token} = secretsRequest.wrap_info || {};
        return {
            accessor,
            approved,
            authorizations: authorizations ? authorizations.map((authorization) => {
                const {entity_id: id, entity_name: name} = authorization;
                return {
                    id,
                    name
                };
            }) : [],
            creationTime,
            isWrapped: true,
            requestEntity,
            requestPath,
            token
        };
    } else if (secretsRequest.dataValues) {
        //TODO CHANGE engineType to reference column, once DB is finalized.
        const {approverEntityId, approverName, createdAt: creationTime, engineType: referenceId, id: requestId, requestData: requestPath, requesterEntityId: id, requesterName: name, status, type} = secretsRequest.dataValues;
        return {
            approved: status === REQUEST_STATUS.APPROVED,
            creationTime,
            authorizations: approverEntityId ? [{
                id: approverEntityId,
                name: approverName
            }] : [],
            isWrapped: false,
            requestEntity: {
                id,
                name
            },
            referenceId,
            requestId,
            requestPath,
            type
        };
    } else {
        logger.error(`Unknown request type: ${JSON.stringify(secretsRequest)}`);
        return {};
    }
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .use(addRequestId)
    .use(async (req, res, next) => {
        const {standardRequestSupported} = req.session.user;
        if (standardRequestSupported === undefined) {
            try {
                let standardRequestSupport = await checkStandardRequestSupport(req);
                setSessionData(req, {
                    standardRequestSupported: standardRequestSupport
                });
                logger.log('Setting Standard Request support in session user data: ', standardRequestSupport);
            } catch (err) {
                sendError(req, res, err);
                return;
            }
        }
        next();
    })
    /**
     * @swagger
     * /rest/secret/requests:
     *   get:
     *     tags:
     *       - Requests
     *     summary: Retrieves active requests
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Unauthorized.
     */
    .get('/requests', async (req, res) => {
        logger.audit(req, res);
        let requests = [];
        if (req.app.locals.features['control-groups']) {
            try {
                const controlGroupRequests = await require('vault-pam-premium').getRequests(req);
                requests = requests.concat(controlGroupRequests);
            } catch (err) {
                sendError(req, res, err);
                return;
            }
        }
        try {
            const standardRequests = await getRequests(req);
            requests = requests.concat(standardRequests);
        } catch (err) {
            sendError(req, res, err);
            return;
        }
        sendJsonResponse(req, res, requests);
    })
    /**
     * @swagger
     * /rest/secret/requests/all:
     *   get:
     *     tags:
     *       - Requests
     *     summary: Retrieves active requests and user's active requests
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Unauthorized.
     */
    .get('/requests/all', async (req, res) => {
        logger.audit(req, res);
        let requests = [];
        const promises = [];
        if (req.app.locals.features['control-groups']) {
            const {getRequests: premiumGetRequests, getActiveRequests} = require('vault-pam-premium');
            promises.push(premiumGetRequests(req));
            promises.push(getActiveRequests(req));
        }
        promises.push(getRequests(req));
        Promise.all(promises)
            .then(results => {
                results.forEach((currentRequests) => {
                    requests = requests.concat(currentRequests);
                });
                sendJsonResponse(req, res, requests.map(_remapSecretsRequest));
            })
            .catch((err) => {
                logger.error(err);
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
            sendError(req, res, 'Invalid request');
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
     *               engineType:
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
        const {entityId} = req.session.user;
        const {CONTROL_GROUP, DYNAMIC_REQUEST, STANDARD_REQUEST} = REQUEST_TYPES;
        try {
            const approverGroupPromises = [];
            let requestData;
            if (req.app.locals.features['control-groups'] && type === CONTROL_GROUP) {
                const {groups = [], data} = await require('vault-pam-premium').createRequest(req);
                requestData = _remapSecretsRequest(data);
                groups.forEach((groupName) => {
                    approverGroupPromises.push(_getUsersByGroupName(req, groupName));
                });
            } else if (type === STANDARD_REQUEST || type === DYNAMIC_REQUEST) {
                requestData = _remapSecretsRequest(await createOrUpdateStatusByRequester(req, entityId, path, REQUEST_STATUS.PENDING, type));
                approverGroupPromises.push(_getUsersByGroupName(req, 'pam-approver'));
            } else {
                sendError(req, res, 'Invalid request');
                return;
            }
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
        let {accessor, entityId, path, type} = req.body;
        const {groups} = req.session.user;
        const {CONTROL_GROUP, DYNAMIC_REQUEST, STANDARD_REQUEST} = REQUEST_TYPES;
        //DYNAMIC SECRET
        let leaseWrapToken = null;
        let resolveDynamicSecret = type !== REQUEST_TYPES.DYNAMIC_REQUEST;
        try {
            if (req.app.locals.features['control-groups'] && type === CONTROL_GROUP && accessor) {
                const {data} = await require('vault-pam-premium').authorizeRequest(req);
                path = unwrap(safeWrap(data).request_info.data.request_path);
                entityId = unwrap(safeWrap(data).request_info.data.request_entity.id);
                if (entityId) {
                    const remappedData = _remapSecretsRequest(data);
                    logger.info(`Emit approve-request data ${JSON.stringify(remappedData)} to ${entityId} and the following groups: ${groups.join(', ')}.`);
                    notificationsManager.getInstance().to(entityId).emit('approve-request', remappedData);
                    groups.forEach((groupName) => {
                        notificationsManager.getInstance().to(groupName).emit('approve-request', remappedData);
                    });
                }
            } else if (type === STANDARD_REQUEST || type === DYNAMIC_REQUEST) {
                if (type === DYNAMIC_REQUEST) {
                    const {body} = await createCredential(req);
                    if (body.lease_id) {
                        resolveDynamicSecret = true;
                        leaseWrapToken = body.data && await wrapData(body.data);
                    }
                }
                //TODO - Make separate method for dynamic requests? or just rename method
                const data = await updateStandardRequestByApprover(req, entityId, path, REQUEST_STATUS.APPROVED, leaseWrapToken) || {};
                const {dataValues = {}} = data;
                path = dataValues.requestData;
                entityId = dataValues.requesterEntityId;
                const remappedData = _remapSecretsRequest(data);
                logger.info(`Emit approve-request data ${JSON.stringify(remappedData)} to ${entityId} and pam-approvers.`);
                notificationsManager.getInstance().to(entityId).emit('approve-request', remappedData);
                notificationsManager.getInstance().to('pam-approver').emit('approve-request', remappedData);
            } else {
                sendError(req, res, 'Invalid request');
                return;
            }
            if (entityId && path && resolveDynamicSecret) {
                _getUserByEntityId(req, entityId).then((user) => {
                    if (user.metadata && user.metadata.email) {
                        sendMailFromTemplate(req, 'approve-request', {
                            to: user.metadata.email,
                            secretsPath: path.replace('/data/', '/')
                        });
                    }
                });
            }
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
        Promise.all([getApprovedRequests(entityId),
            asyncRequest(initApiRequest(token, apiUrl, entityId, true))
        ])
            .then((results) => {
                const approvedRequests = results[0];
                const secrets = (results[1] || {}).body;
                if (Array.isArray(approvedRequests) && secrets) {
                    const isApproved = approvedRequests.some((approvedRequest) => approvedRequest.dataValues.requestData === path);
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
        let result;
        try {
            result = await require('vault-pam-premium').unwrapRequest(req);
            (result.groups || []).forEach((groupName) => {
                logger.info(`Emit read-approved-request accessor ${result.accessor} to ${groupName}.`);
                notificationsManager.getInstance().to(groupName).emit('read-approved-request', result.accessor);
            });
            sendJsonResponse(req, res, result.body, result.statusCode);
        } catch (err) {
            sendError(req, res, err.message, null, err.statusCode);
        }
    });

module.exports = {
    router
};
