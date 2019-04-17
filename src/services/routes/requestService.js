/* eslint-disable no-console */
const {
    authorizeControlGroupRequest,
    createControlGroupRequest,
    deleteControlGroupRequest,
    getControlGroupRequests,
    getSelfActiveRequests
} = require('services/routes/controlGroupService');
const {
    createOrGetStandardRequest,
    getStandardRequestsByUserType,
    getStandardRequestsByRequester,
    updateStandardRequestByApprover,
    updateStandardRequestById
} = require('services/routes/standardRequestService');
const {checkControlGroupSupport, checkStandardRequestSupport, sendError, setSessionData} = require('services/utils');
const {REQUEST_STATUS} = require('services/constants');

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .use(async (req, res, next) => {
        const {controlGroupSupported, standardRequestSupported} = req.session.user;
        if (controlGroupSupported === undefined) {
            try {
                let controlGroupSupport = await checkControlGroupSupport(req);
                setSessionData(req, {
                    controlGroupSupported: controlGroupSupport
                });
                console.log('Setting Control Group support in session user data: ', controlGroupSupport);
            } catch (err) {
                sendError(req.originalUrl, res, err);
                return;
            }
        }
        if (standardRequestSupported === undefined) {
            try {
                let standardRequestSupport = await checkStandardRequestSupport(req);
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
     * /rest/requests/requests:
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
        const {controlGroupSupported, standardRequestSupported} = req.session.user;
        if (controlGroupSupported === true) {
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
        const {controlGroupSupported, standardRequestSupported} = req.session.user;
        if (controlGroupSupported === true) {
            try {
                const controlGroupSelfRequests = await getSelfActiveRequests(req);
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
     *         required: true,
     *         description: The path of the request to delete.
     *         schema:
     *           type: string
     *       - name: entityId
     *         in: query
     *         description: Optional entity id of the request to delete. If not provided, will default to the session user's entity id.
     *         schema:
     *           type: string
     *       - name: id
     *         in: body
     *         description: standard request id to delete
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
        const {id, path} = req.query;
        let result;
        const {controlGroupSupported, standardRequestSupported} = req.session.user;
        try {
            if (controlGroupSupported === true && path) {
                result = await deleteControlGroupRequest(req);
            } else if (standardRequestSupported && id) {
                req.body.status = REQUEST_STATUS.CANCELED;
                result = await updateStandardRequestById(id, REQUEST_STATUS.CANCELED);
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
        const {controlGroupSupported, standardRequestSupported} = req.session.user;
        try {
            if (controlGroupSupported === true && path) {
                result = await createControlGroupRequest(req);
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
     *     summary: Authorizes a Control Group request.
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
        const {controlGroupSupported, standardRequestSupported} = req.session.user;
        try {
            if (controlGroupSupported === true && accessor) {
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
