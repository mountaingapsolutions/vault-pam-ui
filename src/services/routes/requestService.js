/* eslint-disable no-console */
const {
    authorizeControlGroupRequest,
    createControlGroupRequest,
    deleteControlGroupRequest,
    getControlGroupRequests
} = require('services/routes/controlGroupService');
const {
    createStandardRequest,
    getStandardRequestsByApprover,
    getStandardRequestsByRequester,
    updateStandardRequestByApprover
} = require('services/routes/standardRequestService');
const {checkControlGroupSupport, sendError} = require('services/utils');

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
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
        let controlGroupSupported = false;
        let requests = {};
        try {
            controlGroupSupported = await checkControlGroupSupport(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }
        if (controlGroupSupported === true) {
            try {
                requests.controlGroupRequests = await getControlGroupRequests(req);
            } catch (err) {
                sendError(req.originalUrl, res, err);
            }
        }

        // TODO Check if server supports standard requests
        try {
            requests.standardRequests = await getStandardRequestsByApprover(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
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
        let controlGroupSupported = false;
        let requests = {};
        try {
            controlGroupSupported = await checkControlGroupSupport(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }
        if (controlGroupSupported === true) {
            try {
                requests.controlGroupSelfRequests = await getControlGroupRequests(req);
            } catch (err) {
                sendError(req.originalUrl, res, err);
            }
        }

        // TODO Check if server supports standard requests
        try {
            requests.standardSelfRequests = await getStandardRequestsByRequester(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
        }

        res.json(requests);
    })
    .delete('/request', async (req, res) => {
        const {path} = req.query;
        const {id, status} = req.body;
        let controlGroupSupported = false;
        let result;
        try {
            controlGroupSupported = await checkControlGroupSupport(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }
        try {
            if (controlGroupSupported === true && path) {
                result = await deleteControlGroupRequest(req);

            } else if (id && status) {
                result = await updateStandardRequestByApprover(req);

            }
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
        res.json(result);
    })
    .post('/request', async (req, res) => {
        const {engineType, path, requestData} = req.body;
        let controlGroupSupported = false;
        let result;
        try {
            controlGroupSupported = await checkControlGroupSupport(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }

        try {
            if (controlGroupSupported === true && path) {
                result = await createControlGroupRequest(req);
            } else if (engineType && requestData) {

                result = await createStandardRequest(req);
            }
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
        res.json(result);
    })
    .post('/request/authorize', async (req, res) => {
        const {accessor, id, status} = req.body;
        let controlGroupSupported = false;
        let result;
        try {
            controlGroupSupported = await checkControlGroupSupport(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }
        try {
            if (controlGroupSupported === true && accessor) {
                result = await authorizeControlGroupRequest(req);
            } else if (id && status) {

                result = await updateStandardRequestByApprover(req);
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
