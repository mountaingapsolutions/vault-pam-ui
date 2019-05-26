const request = require('request');
const {initApiRequest, getDomain, sendError} = require('services/utils');
//const RequestController = require('services/controllers/Request');
const {revokeRequest} = require('services/db/controllers/requestsController');
const {REQUEST_STATUS, REQUEST_TYPES} = require('services/constants');
const {
    getRequests
} = require('services/db/controllers/requestsController');
const logger = require('services/logger');
const addRequestId = require('express-request-id')();

/**
 * Get dynamic engine roles.
 *
 * @param {string} engineName The engine.
 * @returns {Promise<void>}
 */
const getDynamicEngineRoles = engineName => {
    return new Promise((resolve, reject) => {
        const domain = getDomain();
        const {VAULT_API_TOKEN: apiToken} = process.env;
        const apiUrl = `${domain}/v1/${engineName}/roles?list=true`;
        request({
            ...initApiRequest(apiToken, apiUrl),
            method: 'GET'
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

/**
 * Request credential for dynamic secret.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise<void>}
 */
const createCredential = req => {
    return new Promise((resolve, reject) => {
        const domain = getDomain();
        const {path, reqMethod} = req.body;
        const engineRole = path.split('/');
        //TODO what token to use API or user?
        const {VAULT_API_TOKEN: apiToken} = process.env;
        const apiUrl = `${domain}/v1/${engineRole[0]}/creds/${engineRole[1]}`;
        request({
            ...initApiRequest(apiToken, apiUrl),
            method: reqMethod
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

/**
 * Get active lease of certain role.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise<void>}
 */
const _getLease = req => {
    return new Promise((resolve, reject) => {
        const domain = getDomain();
        const {mount, role} = req.query;
        const {VAULT_API_TOKEN: apiToken} = process.env;
        const apiUrl = `${domain}/v1/sys/leases/lookup/${mount}/creds/${role}?list=true`;
        request({
            ...initApiRequest(apiToken, apiUrl),
            method: 'GET'
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

/**
 * Revokes a lease.
 *
 * @param {string} lease_id The lease id.
 * @returns {Promise<void>}
 */
const _revokeLease = lease_id => {
    return new Promise((resolve, reject) => {
        const domain = getDomain();
        const {VAULT_API_TOKEN: apiToken} = process.env;
        const apiUrl = `${domain}/v1/sys/leases/revoke`;
        request({
            ...initApiRequest(apiToken, apiUrl),
            method: 'PUT',
            json: {lease_id}
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .use(addRequestId)
    /**
     * @swagger
     * /rest/dynamic/lease:
     *   get:
     *     tags:
     *       - Dynamic Secrets
     *     name: List roles.
     *     summary: Retrieves the list of roles by engine.
     *     parameters:
     *       - name: mount
     *         in: query
     *         description: The engine mount.
     *         schema:
     *           type: string
     *         required: true
     *       - name: role
     *         in: query
     *         description: The engine role.
     *         schema:
     *           type: string
     *         required: true
     *     responses:
     *       200:
     *         description: Success.
     *       404:
     *         description: Not found.
     */
    .get('/lease', async (req, res) => {
        logger.audit(req, res);
        const {mount, role} = req.query;
        const enginePath = `${mount}/${role}`;
        try {
            const response = await _getLease(req);
            const leaseKeys = ((response.body || {}).data || {}).keys || [];
            const dbRequests = await getRequests({});
            let mappedData = {};
            leaseKeys.forEach(key => {
                const dataInDB = dbRequests.find(dbReq => {
                    const {path, referenceData = {}, type} = dbReq.dataValues;
                    const leaseId = ((referenceData || {}).leaseId || '').split('/') || [];
                    const isLease = leaseId[leaseId.length - 1] === key;
                    const isDynamicRequest = type === REQUEST_TYPES.DYNAMIC_REQUEST;
                    const isSameMount = path === enginePath;
                    return isLease && isDynamicRequest && isSameMount;
                });
                //TODO INCLUDE REQUESTER NAME
                const {id, requesterName, entityId, path} = (dataInDB || {}).dataValues || {};
                mappedData[key] = {requestId: id, leaseId: `${mount}/creds/${role}/${key}`, requesterName: entityId, entityId, path};
            });
            response.body.data = mappedData;
            res.status(response.statusCode).json(response.body);
        } catch (err) {
            sendError(req.originalUrl, res, err);
        }
    })
    /**
     * @swagger
     * /rest/dynamic/revoke:
     *   put:
     *     tags:
     *       - Dynamic Secrets
     *     summary: Revoke Secret Lease.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               lease_id:
     *                 type: string
     *               requestId:
     *                 type: number
     *     responses:
     *       200:
     *         description: Success.
     *       404:
     *         description: Not found.
     */
    .put('/revoke', async (req, res) => {
        logger.audit(req, res);
        const {leaseId, requestId, entityId, path} = req.body;
        try {
            const response = await _revokeLease(leaseId);
            //TODO UPDATE DB FOR REVOKED RECORD
            //requestId && await RequestController.updateDataById(requestId, {status: REQUEST_STATUS.REVOKED, engineType: null});
            //requestId && await revokeRequest({id: requestId, entityId});
            res.status(response.statusCode).json(response.body);
        } catch (err) {
            sendError(req.originalUrl, res, err);
        }
    });

module.exports = {
    createCredential,
    getDynamicEngineRoles,
    router
};
