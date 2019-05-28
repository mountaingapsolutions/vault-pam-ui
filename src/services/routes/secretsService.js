const chalk = require('chalk');
const request = require('request');
const {initApiRequest, getDomain, sendError, sendJsonResponse} = require('services/utils');
const logger = require('services/logger');
const {DYNAMIC_ENGINES} = require('services/constants');
const addRequestId = require('express-request-id')();

/**
 * Helper method to retrieve secrets by the provided URL path.
 *
 * @private
 * @param {string} token The user session token.
 * @param {string} apiUrl The API url to fetch secrets from.
 * @param {string} [entityId] the user's entity id
 * @returns {Promise}
 */
const _getSecretsByPath = (token, apiUrl, entityId) => {
    logger.log(`Listing secrets from ${chalk.yellow.bold(apiUrl)}.`);
    return new Promise((resolve) => {
        request(initApiRequest(token, apiUrl, entityId), async (error, response, body) => {
            if (error) {
                logger.error(`Error in retrieving secrets (${apiUrl}): ${error.toString()}`);
                resolve([]);
                return;
            }
            const {statusCode} = response;
            if (statusCode !== 200 && statusCode !== 404) {
                logger.error(`Error in retrieving secrets (${apiUrl}) (status code: ${statusCode}): ${body && JSON.stringify(body)}`);
                resolve([]);
                return;
            }
            resolve(((body || {}).data || {}).keys || []);
        });
    });
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
const _getCapabilities = (token, entityId, paths) => {
    const apiUrl = `${getDomain()}/v1/sys/capabilities-self`;
    logger.log(`Checking capabilities with paths ${chalk.yellow.bold(JSON.stringify(paths))}.`);
    return new Promise((resolve) => {
        request({
            ...initApiRequest(token, apiUrl, entityId),
            method: 'POST',
            json: {
                paths
            }
        }, (error, response, capabilities) => {
            if (error) {
                logger.error(`Error in retrieving capabilities (${apiUrl}): ${error.toString()}`);
                resolve({});
                return;
            }
            resolve(capabilities || {});
        });
    });
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .use(addRequestId)
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
        logger.audit(req, res);
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
                        request(initApiRequest(token, getSecretApiUrl, requesterEntityId), (error, response, body) => {
                            if (error) {
                                logger.error(error);
                            }
                            if (body) {
                                secret.data = body;
                                const {wrap_info: wrapInfo} = body;
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
        logger.audit(req, res);
        const {entityId, token} = req.session.user;
        const apiUrl = `${getDomain()}/v1/${req.params[0]}`;
        request(initApiRequest(token, apiUrl, entityId), (error, response, body) => {
            if (error) {
                sendError(req, res, error, apiUrl);
                return;
            }
            sendJsonResponse(req, res, {...body});
        });
    });

module.exports = {
    router
};
