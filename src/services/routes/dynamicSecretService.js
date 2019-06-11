const request = require('request');
const {initApiRequest, getDomain, sendJsonResponse} = require('services/utils');
const {sendError} = require('services/error/errorHandler');
const {revokeRequest} = require('services/db/controllers/requestsController');
const logger = require('services/logger');

/**
 * Get lease information
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} key lease key to lookup
 * @returns {Promise}
 */
const _getLease = (req, key) => {
    return new Promise((resolve, reject) => {
        const {VAULT_API_TOKEN: apiToken} = process.env;
        const {mount, role} = req.query;
        const apiUrl = `${getDomain()}/v1/sys/leases/lookup`;
        const leaseId = `${mount}/creds/${role}/${key}`;
        request({
            ...initApiRequest(apiToken, apiUrl),
            method: 'PUT',
            json: {
                lease_id: leaseId
            }
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
 * @returns {Promise}
 */
const _getLeaseList = req => {
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

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
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
        try {
            const promises = [];
            const leaseList = await _getLeaseList(req);
            const leaseKeys = ((leaseList.body || {}).data || {}).keys || [];
            let mappedData = {};
            leaseKeys.forEach(key => {
                const getLeasePromise = _getLease(req, key);
                getLeasePromise.then((response) => {
                    const requestData = (response.body || {}).data;
                    mappedData[key] = {
                        expireTime: `Expires ${new Date(requestData.expire_time).toLocaleString()}`,
                        leaseId: requestData.id
                    };
                });
                promises.push(getLeasePromise);
            });
            Promise.all(promises)
                .then(() => {
                    sendJsonResponse(req, res, mappedData);
                })
                .catch((err) => {
                    logger.error(err.toString(), req, res, null, err);
                    sendJsonResponse(req, res, [], 500);
                });
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
