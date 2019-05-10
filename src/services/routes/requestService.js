const {safeWrap, unwrap} = require('@mountaingapsolutions/objectutil');
const logger = require('services/logger');
const notificationsManager = require('services/notificationsManager');
const {createRequest, getRequests, updateRequestResponse} = require('services/db/controllers/requestsController');
const {sendMailFromTemplate} = require('services/mail/smtpClient');
const {
    getApprovedRequests
} = require('services/routes/standardRequestService');
const {asyncRequest, checkStandardRequestSupport, getDomain, initApiRequest, sendError, setSessionData} = require('services/utils');
const {REQUEST_STATUS} = require('services/constants');
const addRequestId = require('express-request-id')();

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
 * Creates a request record and injects the requester name into the result.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} params The params to create the request with.
 * @returns {Promise}
 * @private
 */
const _createRequest = (req, params) => {
    return new Promise((resolve, reject) => {
        const {entityId} = params;
        Promise.all([_getUserEntityIds(req), createRequest(params)])
            .then((results) => {
                const userIdMap = results[0];
                // Inject the requester name into the data value.
                if (results[1] && results[1].dataValues) {
                    results[1].dataValues.name = (userIdMap[entityId] || {}).name || `<${entityId}>`;
                    resolve(results[1]);
                } else {
                    reject(results[1]);
                }
            })
            .catch(reject);
    });
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
                const requests = Array.isArray(results[1]) ? results[1] : [];
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
                // Filter out any CANCELLED requests.
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
 * @param {string} entityId The entity id.
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
        try {
            const approverGroupPromises = [];
            // Control Group request cancellation.
            if (req.app.locals.features['control-groups'] && type === 'control-group') {
                const {groups = []} = await require('vault-pam-premium').deleteRequest(req);
                groups.forEach(group => {
                    approverGroupPromises.push(_getUsersByGroupName(req, group.data.name));
                });
            }
            // Standard Request cancellation.
            else if (type === 'standard-request') {
                await updateRequestResponse({
                    entityId,
                    requestData: path,
                    type
                }, {
                    entityId,
                    type: REQUEST_STATUS.CANCELED
                });
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
        const requestType = 'reject-request';
        try {
            // Control Group rejection.
            if (req.app.locals.features['control-groups'] && type === 'control-group') {
                const {groups = []} = await require('vault-pam-premium').deleteRequest(req);

                groups.forEach(group => {
                    const {name} = group.data;
                    // Notify the group of the rejection.
                    logger.info(`Emit ${requestType} of accessor ${path} to ${name}.`);
                    notificationsManager.getInstance().to(name).emit(requestType, path);
                });
            }
            // Standard Request rejection.
            else if (type === 'standard-request') {
                const isApprover = await _checkIfApprover(req);
                console.warn('IS APPROVER: ', isApprover);
                if (isApprover) {
                    await updateRequestResponse({
                        entityId,
                        requestData: path,
                        type
                    }, {
                        entityId: req.session.user.entityId,
                        type: REQUEST_STATUS.REJECTED
                    });

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
        const {createdAt: creationTime, requestData: requestPath, entityId: id, name, responses = []} = secretsRequest.dataValues;
        return {
            approved: responses.some((response) => response.type === REQUEST_STATUS.APPROVED),
            creationTime,
            authorizations: responses.filter((response) => [REQUEST_STATUS.APPROVED, REQUEST_STATUS.REJECTED].includes(response.type)),
            isWrapped: false,
            requestEntity: {
                id,
                name
            },
            requestPath,
            responses
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
                sendError(req.originalUrl, res, err);
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
                sendError(req.originalUrl, res, err);
                return;
            }
        }
        try {
            const standardRequests = await _getRequests(req);
            requests = requests.concat(standardRequests);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }
        res.json(requests);
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
        promises.push(_getRequests(req));
        Promise.all(promises)
            .then(results => {
                results.forEach((currentRequests) => {
                    requests = requests.concat(currentRequests);
                });
                res.json(requests.map(_remapSecretsRequest));
            })
            .catch((err) => {
                logger.error(err);
                res.status(500).json([]);
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
            sendError(req.originalUrl, res, 'Invalid request', 400);
            return;
        }

        try {
            // If entity id explicitly provided and it's not the same as as the current session user's id, it means it was a request rejection.
            if (entityId && entityId !== entityIdSelf) {
                res.json(await _rejectRequest(req));
            } else {
                res.json(await _cancelRequest(req));
            }
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
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
        try {
            const approverGroupPromises = [];
            let requestData;
            if (req.app.locals.features['control-groups'] && type === 'control-group') {
                const {groups = [], data} = await require('vault-pam-premium').createRequest(req);
                requestData = _remapSecretsRequest(data);
                groups.forEach((groupName) => {
                    approverGroupPromises.push(_getUsersByGroupName(req, groupName));
                });
            } else if (type === 'standard-request') {
                requestData = _remapSecretsRequest(await _createRequest(req, {
                    entityId,
                    requestData: path,
                    type
                }));
                approverGroupPromises.push(_getUsersByGroupName(req, 'pam-approver'));
            } else {
                sendError(req.originalUrl, res, 'Invalid request', 400);
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
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
        res.json({
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
        try {
            if (req.app.locals.features['control-groups'] && type === 'control-group' && accessor) {
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
            } else if (type === 'standard-request') {
                const isApprover = await _checkIfApprover(req);
                if (isApprover) {
                    const data = await updateRequestResponse({
                        entityId,
                        requestData: path,
                        type
                    }, {
                        entityId: req.session.user.entityId,
                        type: REQUEST_STATUS.REJECTED
                    });
                    const {dataValues = {}} = data;
                    path = dataValues.requestData;
                    entityId = dataValues.entityId;
                    const remappedData = _remapSecretsRequest(data);
                    logger.info(`Emit approve-request data ${JSON.stringify(remappedData)} to ${entityId} and pam-approvers.`);
                    notificationsManager.getInstance().to(entityId).emit('approve-request', remappedData);
                    notificationsManager.getInstance().to('pam-approver').emit('approve-request', remappedData);
                } else {
                    sendError(req.originalUrl, res, 'Unauthorized', 403);
                    return;
                }
            } else {
                sendError(req.originalUrl, res, 'Invalid request', 400);
                return;
            }
            if (entityId && path) {
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
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
        res.json({
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
                        res.json(secrets);
                    } else {
                        sendError(apiUrl, res, 'Unauthorized', 403);
                    }
                } else {
                    sendError(apiUrl, res, 'Unknown error');
                }
            })
            .catch((err) => {
                sendError(apiUrl, res, err);
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
            res.status(result.statusCode).json(result.body);
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
        }
    });

module.exports = {
    router
};
