const chalk = require('chalk');
const {asyncRequest, initApiRequest, getDomain, sendJsonResponse} = require('services/utils');
const {deleteRequest} = require('services/db/controllers/requestsController');
const {sendError} = require('services/error/errorHandler');
const logger = require('services/logger');
const {DYNAMIC_ENGINES} = require('services/constants');

/**
 * Helper method to retrieve secrets by the provided URL path.
 *
 * @private
 * @param {string} token The user session token.
 * @param {string} apiUrl The API url to fetch secrets from.
 * @param {string} [entityId] the user's entity id
 * @returns {Promise}
 */
const _getSecretsByPath = async (token, apiUrl, entityId) => {
    logger.log(`Listing secrets from ${chalk.yellow.bold(apiUrl)}.`);
    try {
        const response = await asyncRequest(initApiRequest(token, apiUrl, entityId));
        const {statusCode} = response;
        if (response.body) {
            const {body} = response;
            if (statusCode !== 200 && statusCode !== 404) {
                logger.error(`Error in retrieving secrets (${apiUrl}) (status code: ${statusCode}): ${body && JSON.stringify(body)}`);
                return [];
            }
            return (body.data || {}).keys || [];
        } else {
            logger.error(response.body);
        }
    } catch (error) {
        logger.error(`Error in retrieving secrets (${apiUrl}): ${error.toString()}`);
    }
    return [];
};

/**
 * Helper method to retrieve capabilities for the provided paths.
 *
 * @private
 * @param {string} token The user session token.
 * @param {string} entityId the user's entity id
 * @param {Array} paths The array of paths to check.
 * @returns {Promise}
 */
const _getCapabilities = async (token, entityId, paths) => {
    const apiUrl = `${getDomain()}/v1/sys/capabilities-self`;
    logger.log(`Checking capabilities with paths ${chalk.yellow.bold(JSON.stringify(paths))}.`);
    try {
        const response = await asyncRequest({
            ...initApiRequest(token, apiUrl, entityId),
            method: 'POST',
            json: {
                paths
            }
        });
        return response.body || {};
    } catch (error) {
        logger.error(`Error in retrieving capabilities (${apiUrl}): ${error.toString()}`);
        return {};
    }
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
/**
 * @swagger
 * /rest/secrets/{path}:
 *   post:
 *     tags:
 *       - Secrets
 *     summary: Creates or updates secrets.
 *     parameters:
 *       - name: path
 *         in: path
 *         description: The Vault secrets path.
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Created or updated secrets data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request.
 *       403:
 *         description: Unauthorized.
 */
    .post('/*', async (req, res) => {
        const {entityId, token} = req.session.user;
        const {params = {}} = req;
        const path = params['0'] || '';
        const apiUrl = `${getDomain()}/v1/${path}`;
        const response = await asyncRequest({
            ...initApiRequest(token, apiUrl, entityId),
            method: 'POST',
            json: req.body
        });
        const {body, statusCode} = response;
        if (body && statusCode === 200) {
            deleteRequest({
                path
            });
        }
        res.status(statusCode).json(body);
    })
    /**
     * @swagger
     * /rest/secrets/list/{path}:
     *   get:
     *     tags:
     *       - Secrets
     *     name: List secrets.
     *     summary: Retrieves the list of secrets by path.
     *     parameters:
     *       - name: path
     *         in: path
     *         description: The Vault secrets path.
     *         schema:
     *           type: string
     *         required: true
     *       - name: version
     *         in: query
     *         description: The version of the Vault KV secrets engine.
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 2
     *           default: 2
     *         required: true
     *     responses:
     *       200:
     *         description: Success.
     *       404:
     *         description: Not found.
     */
    .get('/list/*', async (req, res) => {
        const {params = {}, query} = req;
        const urlParts = (params['0'] || '').split('/').filter(path => !!path);
        const listUrlParts = [...urlParts];

        const isDynamicEngine = DYNAMIC_ENGINES.some(engine => engine === query.type);
        const isV2 = String(query.version) === '2';

        if (isDynamicEngine) {
            listUrlParts.splice(1, 0, 'roles');
        } else if (isV2) {
            listUrlParts.splice(1, 0, 'metadata');
        }
        const domain = getDomain();
        const {entityId: requesterEntityId, token} = req.session.user;
        const apiUrl = `${domain}/v1/${listUrlParts.join('/')}?list=true`;

        // Maintain the list of paths as a key/value map as well for easier access later.
        const pathsMap = {};
        const paths = (await _getSecretsByPath(token, apiUrl, requesterEntityId)).map((key) => {
            const getUrlParts = [...urlParts];
            if (isV2) {
                getUrlParts.splice(1, 0, key.endsWith('/') ? 'metadata' : 'data');
            }
            const path = `${getUrlParts.join('/')}/${key}`;
            pathsMap[path] = path;
            return path;
        });

        // Make sure to include listing path.
        const listingPath = listUrlParts.join('/');
        paths.push(listingPath);
        pathsMap[listingPath] = listingPath;
        const capabilities = await _getCapabilities(token, requesterEntityId, paths);
        const promises = [];
        const secrets = Object.keys(pathsMap)
            .filter(key => key !== listingPath) // Exclude the listing path.
            .map(key => {
                const keySplit = key.split('/');
                const lastPath = keySplit[keySplit.length - 1];
                const secret = {
                    name: lastPath === '' ? `${keySplit[keySplit.length - 2]}/` : lastPath,
                    capabilities: capabilities[key] || []
                };
                const canRead = (capabilities[key] || []).includes('read');
                if (canRead && !key.endsWith('/') && !isDynamicEngine) {
                    promises.push(new Promise((secretResolve) => {
                        const getSecretApiUrl = `${domain}/v1/${key}`;
                        asyncRequest(initApiRequest(token, getSecretApiUrl, requesterEntityId)).then((response) => {
                            if (response.body) {
                                secret.data = response.body;
                                const {wrap_info: wrapInfo} = response.body;
                                if (wrapInfo) {
                                    try {
                                        // Just immediately revoke the accessor. A new one will be generated upon a user requesting access. The initial wrap_info accessor is only to inform the user that this secret is wrapped.
                                        require('vault-pam-premium').revokeAccessor(wrapInfo.accessor);
                                    } catch (err) {
                                        logger.error(`Error occurred. The package vault-pam-premium possibly unavailable: ${err.toString()}`);
                                    }
                                }
                            } else {
                                logger.error(`No response body returned from ${getSecretApiUrl}`);
                                secret.data = {};
                            }
                            secretResolve();
                        }).catch((error) => {
                            logger.error(error);
                            secret.data = {};
                            secretResolve();
                        });
                    }));
                }
                return secret;
            });
        Promise.all(promises).then(() => {
            sendJsonResponse(req, res, {
                data: {
                    capabilities: capabilities[listingPath] || [], // Add the capabilities of the listing path to the top level of the response data.
                    secrets
                }
            });
        });
    })
    /**
     * @swagger
     * /rest/secrets/get/{path}:
     *   get:
     *     tags:
     *       - Secrets
     *     name: Get secret values.
     *     summary: Retrieves the secret values by path.
     *     parameters:
     *       - name: path
     *         in: path
     *         description: The Vault secrets path.
     *         schema:
     *           type: string
     *         required: true
     *     responses:
     *       200:
     *         description: Success.
     *       404:
     *         description: Not found.
     */
    .get('/get/*', async (req, res) => {
        const {entityId, token} = req.session.user;
        const apiUrl = `${getDomain()}/v1/${req.params[0]}`;
        try {
            const response = await asyncRequest(initApiRequest(token, apiUrl, entityId));
            sendJsonResponse(req, res, response.body);
        } catch (error) {
            sendError(req, res, error, apiUrl);
        }
    })
    /**
     * @swagger
     * /rest/secrets/delete/{path}:
     *   delete:
     *     tags:
     *       - Secrets
     *     name: Delete secret values.
     *     summary: Delete the secret value by path.
     *     parameters:
     *       - name: path
     *         in: path
     *         description: The Vault secrets path.
     *         schema:
     *           type: string
     *         required: true
     *     responses:
     *       200:
     *         description: Success.
     *       400:
     *         description: Invalid permissions or not found.
     */
    .delete('/delete/*', async (req, res) => {
        const {entityId, token} = req.session.user;
        const path = req.params[0];
        const apiUrl = `${getDomain()}/v1/${path}`;

        try {
            const response = await asyncRequest({
                ...initApiRequest(token, apiUrl, entityId),
                method: 'DELETE'
            });
            if (response.statusCode === 200 || response.statusCode === 204) { // 204 Status Code indicates success with no response.
                deleteRequest({
                    path
                });
                sendJsonResponse(req, res, {
                    status: 'ok'
                });
            } else {
                sendError(req, res, 'Could not find secret or did not have permissions to delete secret.', 400);
            }
        } catch (error) {
            sendError(req, res, error, apiUrl);
        }
    });

module.exports = {
    router
};
