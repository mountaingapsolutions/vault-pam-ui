const logger = require('services/logger');
const request = require('request');
const {getDomain, initApiRequest, sendError, sendJsonResponse} = require('services/utils');
const cryptoJs = require('crypto-js');

/**
 * Helper method to check if user is able to list available Vault Audit devices
 *
 * @private
 * @param {string} token The user session token.
 * @param {string} entityId the user's entity id
 * @returns {Promise}
 */
const _getAuditDevicesPermission = (token, entityId) => {
    const apiUrl = `${getDomain()}/v1/sys/audit`;
    return new Promise((resolve, reject) => {
        request({
            ...initApiRequest(token, apiUrl, entityId),
            method: 'GET',
        }, (error, response) => {
            if (response && response.statusCode === 403) {
                reject({apiUrl, message: 'Unauthorized', statusCode: response.statusCode});
            } else if (response.statusCode === 400) {
                reject({apiUrl, message: 'Bad Request', statusCode: response.statusCode});
            } else {
                resolve({});
            }
        });
    });
};

// eslint-disable-next-line new-cap
const router = require('express').Router()
    /**
     * @swagger
     * /rest/audit/hash:
     *   post:
     *     tags:
     *       - Audit
     *     summary: Generate hash for a given input string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               input:
     *                 type: string
     *               required:
     *                 - input
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Unauthorized.
     */
    .post('/hash', async (req, res) => {
        logger.audit(req, res);
        try {
            const {entityId, token} = req.session.user;

            // Check if user is permitted to list Vault audit devices
            await _getAuditDevicesPermission(token, entityId);

            const {input} = req.body;
            if (typeof input === 'string') {
                const {VAULT_API_TOKEN: apiToken} = process.env;
                // eslint-disable-next-line new-cap
                sendJsonResponse(req, res, cryptoJs.HmacSHA256(input, apiToken).toString(cryptoJs.enc.Hex));
            } else {
                sendError(req, res, 'Invalid input type. Input must be of type string');
            }
        } catch (err) {
            sendError(req, res, err.message, err.apiUrl, err.statusCode);
        }
    });

module.exports = {
    router
};
