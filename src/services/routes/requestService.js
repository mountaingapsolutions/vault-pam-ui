const {safeWrap, unwrap} = require('@mountaingapsolutions/objectutil');
const logger = require('services/logger');
const notificationsManager = require('services/notificationsManager');
const {sendMailFromTemplate} = require('services/mail/smtpClient');
const {
    createOrGetStandardRequest,
    getStandardRequestsByUserType,
    getStandardRequestsByStatus,
    updateStandardRequestByApprover,
    updateStandardRequestById
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
    const {VAULT_API_TOKEN: apiToken} = process.env;
    return new Promise((resolve) => {
        asyncRequest(initApiRequest(apiToken, `${getDomain()}/v1/identity/entity/id/${entityId}`))
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
    const {VAULT_API_TOKEN: apiToken} = process.env;
    const domain = getDomain();

    const groupRequest = initApiRequest(apiToken, `${domain}/v1/identity/group/name/${groupName}`);
    const {member_entity_ids: entityIds = []} = ((await asyncRequest(groupRequest)).body || {}).data || {};
    return new Promise((resolve) => {
        Promise.all(entityIds.map((entityId) => new Promise((userResolve) => {
            const userRequest = initApiRequest(apiToken, `${domain}/v1/identity/entity/id/${entityId}`);
            asyncRequest(userRequest)
                .then((response) => userResolve(response.body))
                .catch((error) => userResolve(error));
        })))
            .then((responses) => {
                resolve(responses.filter((response) => response.data).map((response) => response.data));
            });
    });
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .use(async (req, res, next) => {
        const {standardRequestSupported} = req.session.user;
        if (standardRequestSupported === undefined) {
            try {
                let standardRequestSupport = await checkStandardRequestSupport();
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
     * /rest/requests/all:
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
    .get('/all', async (req, res) => {
        let requests = [];
        const {standardRequestSupported} = req.session.user;
        if (req.app.locals.features['control-groups']) {
            try {
                const controlGroupRequests = await require('vault-pam-premium').getRequests(req);
                requests = requests.concat(controlGroupRequests);

                const controlGroupSelfRequests = await require('vault-pam-premium').getActiveRequests(req);
                requests = requests.concat(controlGroupSelfRequests);
            } catch (err) {
                sendError(req.originalUrl, res, err);
                return;
            }
        }

        if (standardRequestSupported === true) {
            try {
                const standardRequests = await getStandardRequestsByUserType(req);
                requests = requests.concat(standardRequests);
            } catch (err) {
                sendError(req.originalUrl, res, err);
                return;
            }
        }
        res.json(requests);
    })
    /**
     * @swagger
     * /rest/requests/list:
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
    .get('/list', async (req, res) => {
        let requests = [];
        const {standardRequestSupported} = req.session.user;
        if (req.app.locals.features['control-groups']) {
            try {
                const controlGroupRequests = await require('vault-pam-premium').getRequests(req);
                requests = requests.concat(controlGroupRequests);
            } catch (err) {
                sendError(req.originalUrl, res, err);
                return;
            }
        }
        if (standardRequestSupported === true) {
            try {
                const standardRequests = await getStandardRequestsByUserType(req);
                requests = requests.concat(standardRequests);
            } catch (err) {
                sendError(req.originalUrl, res, err);
                return;
            }
        }
        res.json(requests);
    })
    /**
     * @swagger
     * /rest/requests/self:
     *   get:
     *     tags:
     *       - Requests
     *     summary: Retrieves user's active requests
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Unauthorized.
     */
    .get('/self', async (req, res) => {
        let requests = [];
        const {standardRequestSupported} = req.session.user;
        if (req.app.locals.features['control-groups']) {
            try {
                const controlGroupSelfRequests = await require('vault-pam-premium').getActiveRequests(req);
                requests = requests.concat(controlGroupSelfRequests);
            } catch (err) {
                sendError(req.originalUrl, res, err);
                return;
            }
        }

        if (standardRequestSupported === true) {
            try {
                const standardSelfRequests = await getStandardRequestsByStatus(req, REQUEST_STATUS.PENDING);
                requests = requests.concat(standardSelfRequests);
            } catch (err) {
                sendError(req.originalUrl, res, err);
                return;
            }
        }
        res.json(requests);
    })
    /**
     * @swagger
     * /rest/requests/request:
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
        const {entityId, id, path} = req.query;
        let result;
        const {standardRequestSupported} = req.session.user;
        try {
            const approverGroupPromises = [];
            if (req.app.locals.features['control-groups'] && path && !id) {
                const {accessor, groups = []} = await require('vault-pam-premium').deleteRequest(req);
                // If entity id provided, it means it was a request rejection.
                if (entityId) {
                    // Notify the user of the request rejection.
                    logger.info(`Emit reject-request of accessor ${accessor} to ${entityId}.`);
                    notificationsManager.getInstance().to(entityId).emit('reject-request', accessor);
                }
                groups.forEach(group => {
                    const {name} = group.data;
                    const requestType = entityId ? 'reject-request' : 'cancel-request';
                    // Notify the group of the cancellation or rejection.
                    logger.info(`Emit ${requestType} of accessor ${accessor} to ${name}.`);
                    notificationsManager.getInstance().to(name).emit(requestType, accessor);
                    approverGroupPromises.push(_getUsersByGroupName(req, name));
                });
                result = {
                    status: 'ok'
                };
            } else if (standardRequestSupported && id) {
                req.body = {id, status: REQUEST_STATUS.CANCELED};
                result = await updateStandardRequestById(req);
                approverGroupPromises.push(_getUsersByGroupName(req, 'pam-approver'));
            } else {
                sendError(req.originalUrl, res, 'Invalid request', 400);
                return;
            }
            // Given entity id, send the rejection email.
            if (entityId) {
                _getUserByEntityId(req, entityId).then((user) => {
                    if (user.metadata && user.metadata.email) {
                        sendMailFromTemplate(req, 'reject-request', {
                            to: user.metadata.email,
                            secretsPath: path
                        });
                    }
                });
            }
            // If no entity id, send the request cancellation email to would-be approvers.
            else {
                const approvers = {};
                Promise.all(approverGroupPromises).then((groups) => {
                    groups.forEach((users) => {
                        users.forEach((user) => {
                            if (user.metadata && user.metadata.email) {
                                approvers[user.metadata.email] = user;
                            }
                        });
                    });
                    sendMailFromTemplate(req, 'cancel-request', {
                        to: Object.keys(approvers).join(', '),
                        secretsPath: path
                    });
                });
            }
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
        res.json(result);
    })
    /**
     * @swagger
     * /rest/requests/request:
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
        let result;
        const {standardRequestSupported} = req.session.user;
        try {
            const approverGroupPromises = [];
            if (req.app.locals.features['control-groups'] && type === 'control-groups') {
                const {groups = [], data} = await require('vault-pam-premium').createRequest(req);
                groups.forEach((groupName) => {
                    logger.info('Emit create-request data ', data, ' to ', groupName);
                    notificationsManager.getInstance().in(groupName).emit('create-request', data);
                    approverGroupPromises.push(_getUsersByGroupName(req, groupName));
                });
                result = {
                    status: 'ok'
                };
            } else if (standardRequestSupported && path) {
                // Set status to PENDING.
                // TODO - Refactor so we are not overriding req.body.
                req.body.status = 'PENDING';
                req.body.requestData = path;
                req.body.engineType = ''; // TODO - Workaround. This needs to be reviewed.
                result = await createOrGetStandardRequest(req);
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
        res.json(result);
    })
    /**
     * @swagger
     * /rest/requests/request/authorize:
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
        const {accessor, id} = req.body;
        let result;
        const {groups, standardRequestSupported} = req.session.user;
        try {
            let entityId;
            let path;
            if (req.app.locals.features['control-groups'] && accessor && !id) {
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
                result = {
                    status: 'ok'
                };
            } else if (standardRequestSupported && id) {
                req.body.status = REQUEST_STATUS.APPROVED;
                const {dataValues = {}} = (await updateStandardRequestByApprover(req) || [])[1] || {};
                path = dataValues.requestData;
                entityId = dataValues.requesterEntityId;
                result = {
                    status: 'ok'
                };
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
        res.json(result);
    })
    /**
     * @swagger
     * /rest/requests/request/unwrap:
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
    .post('/request/unwrap', async (req, res) => {
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
