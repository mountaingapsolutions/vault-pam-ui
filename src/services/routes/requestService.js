/* eslint-disable no-console */
const {
    authorizeControlGroupRequest,
    getControlGroupRequests,
} = require('services/routes/controlGroupService');
const notificationsManager = require('services/notificationsManager');
const {
    createOrGetStandardRequest,
    getStandardRequestsByUserType,
    getStandardRequestsByRequester,
    updateStandardRequestByApprover,
    updateStandardRequestById
} = require('services/routes/standardRequestService');
const {checkStandardRequestSupport, sendError, setSessionData} = require('services/utils');
const {REQUEST_STATUS} = require('services/constants');

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
                console.log('Setting Standard Request support in session user data: ', standardRequestSupport);
            } catch (err) {
                sendError(req.originalUrl, res, err);
                return;
            }
        }
        next();
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
                const controlGroupRequests = await getControlGroupRequests(req);
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
                const standardSelfRequests = await getStandardRequestsByRequester(req);
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
            if (req.app.locals.features['control-groups'] && path) {
                const {accessor, groups = []} = await require('vault-pam-premium').deleteControlGroupRequest(req);
                // If entity id provided, it means it was a request rejection.
                if (entityId) {
                    // Notify the user of the request rejection.
                    console.warn(`Emit reject-request of accessor ${accessor} to ${entityId}.`);
                    notificationsManager.getInstance().to(entityId).emit('reject-request', accessor);
                }
                groups.forEach(group => {
                    const requestType = entityId ? 'reject-request' : 'cancel-request';
                    // Notify the group of the cancellation or rejection.
                    console.warn(`Emit ${requestType} of accessor ${accessor} to ${group.data.name}.`);
                    notificationsManager.getInstance().to(group.data.name).emit(requestType, accessor);
                });
                result = {
                    status: 'ok'
                };
            } else if (standardRequestSupported && id) {
                req.body = {id, status: REQUEST_STATUS.CANCELED};
                result = await updateStandardRequestById(req);
            } else {
                sendError(req.originalUrl, res, 'Invalid request', 400);
                return;
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
        const {path, requestData} = req.body;
        let result;
        const {standardRequestSupported} = req.session.user;
        try {
            if (req.app.locals.features['control-groups'] && path) {
                const {groups = [], data} = await require('vault-pam-premium').createControlGroupRequest(req);
                groups.forEach((groupName) => {
                    console.warn('Emit create-request data ', data, ' to ', groupName);
                    notificationsManager.getInstance().in(groupName).emit('create-request', data);
                });
                result = {
                    status: 'ok'
                };
                //TODO add engineType checking - engineType
            } else if (standardRequestSupported && requestData) {
                result = await createOrGetStandardRequest(req);
            } else {
                sendError(req.originalUrl, res, 'Invalid request', 400);
                return;
            }
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
        res.json(result);
    })
    /**
     * @swagger
     * /rest/requests/authorize:
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
        const {standardRequestSupported} = req.session.user;
        try {
            if (req.app.locals.features['control-groups'] && accessor) {
                result = await authorizeControlGroupRequest(req);
            } else if (standardRequestSupported && id) {
                req.body.status = REQUEST_STATUS.APPROVED;
                result = await updateStandardRequestByApprover(req);
            } else {
                sendError(req.originalUrl, res, 'Invalid request', 400);
                return;
            }
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
        res.json(result);
    });

module.exports = {
    router
};
