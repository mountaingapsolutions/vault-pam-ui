const {safeWrap, unwrap} = require('@mountaingapsolutions/objectutil');
const logger = require('services/logger');
const notificationsManager = require('services/notificationsManager');
const {sendMailFromTemplate} = require('services/mail/smtpClient');
const {
    createOrUpdateStatusByRequester,
    getRequests,
    updateStandardRequestByApprover
} = require('services/routes/standardRequestService');
const {asyncRequest, checkStandardRequestSupport, getDomain, initApiRequest, sendError, setSessionData} = require('services/utils');
const {REQUEST_STATUS} = require('services/constants');

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
                resolve(responses.filter((response) => response.data).map((response) => response.data));
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
    return new Promise(async (resolve, reject) => {
        try {
            const approverGroupPromises = [];
            // Control Group request cancellation.
            if (req.app.locals.features['control-groups'] && type === 'control-group') {
                const {accessor, groups = []} = await require('vault-pam-premium').deleteRequest(req);
                const requestType = 'cancel-request';
                groups.forEach(group => {
                    const {name} = group.data;
                    // Notify the group of the cancellation or rejection.
                    logger.info(`Emit ${requestType} of accessor ${accessor} to ${name}.`);
                    notificationsManager.getInstance().to(name).emit(requestType, accessor);
                    approverGroupPromises.push(_getUsersByGroupName(req, name));
                });
                logger.info(`Emit ${requestType} of accessor ${accessor} to ${requesterEntityId}.`);
                notificationsManager.getInstance().to(requesterEntityId).emit(requestType, accessor);
            }
            // Standard Request cancellation.
            else if (type === 'standard-request') {
                await createOrUpdateStatusByRequester(requesterEntityId, path, 'CANCELED');
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
                groups.forEach((users) => {
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
                const {accessor, groups = []} = await require('vault-pam-premium').deleteRequest(req);
                logger.info(`Emit reject-request of accessor ${accessor} to ${entityId}.`);
                notificationsManager.getInstance().to(entityId).emit(requestType, accessor);

                groups.forEach(group => {
                    const {name} = group.data;
                    // Notify the group of the cancellation or rejection.
                    logger.info(`Emit ${requestType} of accessor ${accessor} to ${name}.`);
                    notificationsManager.getInstance().to(name).emit(requestType, accessor);
                });
            }
            // Standard Request rejection.
            else if (type === 'standard-request') {
                const {entityId: entityIdSelf, token} = req.session.user;
                await updateStandardRequestByApprover(entityIdSelf, token, entityId, path, 'REJECTED');
            }
            // Invalid type provided.
            else {
                reject({
                    message: 'Invalid request',
                    statusCode: 400
                });
                return;
            }

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

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
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
            const standardRequests = await getRequests(req);
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
                res.json(requests);
            })
            .catch(() => res.status(500).json([]));
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
        const {path, type} = req.body;
        const {entityId} = req.session.user;
        try {
            const approverGroupPromises = [];
            if (req.app.locals.features['control-groups'] && type === 'control-group') {
                const {groups = [], data} = await require('vault-pam-premium').createRequest(req);
                groups.forEach((groupName) => {
                    logger.info('Emit create-request data ', data, ' to ', groupName);
                    notificationsManager.getInstance().in(groupName).emit('create-request', data);
                    approverGroupPromises.push(_getUsersByGroupName(req, groupName));
                });
            } else if (type === 'standard-request') {
                await createOrUpdateStatusByRequester(entityId, path, REQUEST_STATUS.PENDING);
                approverGroupPromises.push(_getUsersByGroupName(req, 'pam-approver'));
            } else {
                sendError(req.originalUrl, res, 'Invalid request', 400);
                return;
            }
            const approvers = {};
            Promise.all(approverGroupPromises).then((groups) => {
                groups.forEach((users) => {
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
        let {accessor, entityId, path, type} = req.body;
        const {groups} = req.session.user;
        try {
            if (req.app.locals.features['control-groups'] && type === 'control-group' && accessor) {
                const {data} = await require('vault-pam-premium').authorizeRequest(req);
                path = unwrap(safeWrap(data).request_info.data.request_path);
                entityId = unwrap(safeWrap(data).request_info.data.request_entity.id);
                if (entityId) {
                    logger.info(`Emit approve-request data ${JSON.stringify(data)} to ${entityId} and the following groups: ${groups.join(', ')}.`);
                    notificationsManager.getInstance().to(entityId).emit('approve-request', data);
                    groups.forEach((groupName) => {
                        notificationsManager.getInstance().to(groupName).emit('approve-request', data);
                    });
                }
            } else if (type === 'standard-request') {
                const {entityId: entityIdSelf, token} = req.session.user;
                const {dataValues = {}} = (await updateStandardRequestByApprover(entityIdSelf, token, entityId, path, REQUEST_STATUS.APPROVED) || [])[1] || {};
                path = dataValues.requestData;
                entityId = dataValues.requesterEntityId;
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
