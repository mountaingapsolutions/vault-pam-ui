const request = require('request');
const {initApiRequest, getDomain, sendError} = require('services/utils');
const {REQUEST_TYPES} = require('services/constants');
const {getRequests, revokeRequest} = require('services/db/controllers/requestsController');
const logger = require('services/logger');
const addRequestId = require('express-request-id')();

/**
 * Get active lease of certain role.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
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
 * @returns {Promise}
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

/**
 * Retrieves entity lists.
 *
 * @returns {Promise}
 */
const _getEntityIdInfo = () => {
    return new Promise((resolve, reject) => {
        const domain = getDomain();
        const {VAULT_API_TOKEN: apiToken} = process.env;
        const apiUrl = `${domain}/v1/identity/entity/id?list=true`;
        request({
            ...initApiRequest(apiToken, apiUrl),
            method: 'GET'
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response.body);
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
            const dynamicRequests = await getRequests({
                type: REQUEST_TYPES.DYNAMIC_REQUEST
            });
            const {data = {}} = await _getEntityIdInfo();
            const {key_info} = data;
            let mappedData = {};
            leaseKeys.forEach(key => {
                const requestData = dynamicRequests.find(dbReq => {
                    const {path, referenceData = {}} = dbReq.dataValues;
                    const leaseId = ((referenceData || {}).leaseId || '').split('/') || [];
                    const isLease = leaseId[leaseId.length - 1] === key;
                    const isSameMount = path === enginePath;
                    return isLease && isSameMount;
                });
                if (requestData) {
                    const {id, entityId, path, responses} = requestData.dataValues;
                    const {entityId: approverId} = responses[0];
                    const {name} = key_info[entityId];
                    mappedData[key] = {approverId, requestId: id, leaseId: `${mount}/creds/${role}/${key}`, requesterName: name, entityId, path};
                }
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
        const {leaseId, requestId, entityId, path, approverId} = req.body;
        try {
            const response = await _revokeLease(leaseId);
            requestId && await revokeRequest({approverId, id: requestId, entityId, path});
            res.status(response.statusCode).json(response.body);
        } catch (err) {
            sendError(req.originalUrl, res, err);
        }
    });

module.exports = {
    router
};
