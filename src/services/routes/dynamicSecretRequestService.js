const request = require('request');
const {initApiRequest, getDomain, sendError, unwrapData} = require('services/utils');
const RequestController = require('services/controllers/Request');
const {REQUEST_STATUS} = require('services/constants');

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
        const {path} = req.body;
        const engineRole = path.split('/');
        //TODO what token to use API or user?
        const {VAULT_API_TOKEN: apiToken} = process.env;
        const apiUrl = `${domain}/v1/${engineRole[0]}/creds/${engineRole[1]}`;
        request({
            ...initApiRequest(apiToken, apiUrl),
            method: 'POST'
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
                const keys = ((response.body || {}).data || {}).keys || [];
                const newData = {};
                keys.map(key => {
                    newData[key] = `${mount}/creds/${role}/${key}`;
                });
                response.body.data = newData;
                resolve(response);
            }
        });
    });
};

/**
 * Revokes a lease.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise<void>}
 */
const _revokeLease = req => {
    return new Promise((resolve, reject) => {
        const domain = getDomain();
        const {VAULT_API_TOKEN: apiToken} = process.env;
        const apiUrl = `${domain}/v1/sys/leases/revoke`;
        request({
            ...initApiRequest(apiToken, apiUrl),
            method: 'PUT',
            json: req.body
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
            const response = await _getLease(req);
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
     *     responses:
     *       200:
     *         description: Success.
     *       404:
     *         description: Not found.
     */
    .put('/revoke', async (req, res) => {
        try {
            const response = await _revokeLease(req);
            res.status(response.statusCode).json(response.body);
        } catch (err) {
            sendError(req.originalUrl, res, err);
        }
    })
    /**
     * @swagger
     * /rest/dynamic/unwrap:
     *   post:
     *     tags:
     *       - Dynamic Secrets
     *     summary: Unwrap Secret Lease.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               requestId:
     *                 type: string
     *               token:
     *                 type: string
     *     responses:
     *       200:
     *         description: Success.
     *       404:
     *         description: Not found.
     */
    //TODO CONSOLIDATE UNWRAPPING OF CONTROL GROUPS AND DYNAMIC SECRET
    .post('/unwrap', async (req, res) => {
        const {requestId, token} = req.body;
        try {
            const response = await unwrapData(token);
            await RequestController.updateStatusById(requestId, REQUEST_STATUS.OPENED);
            res.status(response.statusCode).json(response.body);
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
        }
    });

module.exports = {
    createCredential,
    getDynamicEngineRoles,
    router
};
