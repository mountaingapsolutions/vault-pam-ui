/* eslint-disable no-console */
const chalk = require('chalk');
const request = require('request');
const {checkIfApprover} = require('services/routes/standardRequestService');
const {initApiRequest, getDomain, sendError, setSessionData} = require('services/utils');
const RequestController = require('services/controllers/Request');
const {
    getUserSecretsAccess
} = require('services/routes/standardRequestService');
const {REQUEST_STATUS} = require('services/constants');
/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
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
        // Check for Control Group policies.
        const {controlGroupPaths} = req.session.user;
        if (!controlGroupPaths && req.app.locals.features['control-groups']) {
            let paths = {};
            try {
                paths = await require('vault-pam-premium').getPaths(req);
            } catch (err) {
                console.error(err);
            }
            console.log('Setting Control Group paths in session user data: ', paths);
            setSessionData(req, {
                controlGroupPaths: paths || {}
            });
        }
        const {params = {}, query, url} = req;
        const urlParts = (params[0] || '').split('/').filter(path => !!path);
        const listUrlParts = [...urlParts];
        const isV2 = String(query.version) === '2';
        if (isV2) {
            listUrlParts.splice(1, 0, 'metadata');
        }
        const domain = getDomain();
        const {entityId, token} = req.session.user;
        const apiUrl = `${domain}/v1/${listUrlParts.join('/')}?list=true`;

        // Get current user's active Control Group requests.
        let activeRequests = [];
        if (req.app.locals.features['control-groups']) {
            activeRequests = await require('vault-pam-premium').getActiveRequests(req);
        }

        console.log(`Listing secrets from ${chalk.yellow.bold(apiUrl)}.`);

        // Get Standard Requests
        let standardRequests;
        try {
            const isApprover = await checkIfApprover(req, entityId);
            if (isApprover) {
                standardRequests = await RequestController.findAll();
            } else {
                standardRequests = await RequestController.findAllByRequester(entityId);
            }
        } catch (err) {
            console.log(`No standard requests found: ${err}`);
        }

        request(initApiRequest(token, apiUrl), (error, response, body) => {
            if (error) {
                sendError(url, res, error);
                return;
            }
            try {
                const {statusCode} = response;
                if (statusCode !== 200 && statusCode !== 404) {
                    res.status(statusCode).json(body);
                    return;
                }
                // Maintain the list of paths as a key/value map as well for easier access later.
                const pathsMap = {};
                const paths = (((body || {}).data || {}).keys || []).map(key => {
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

                const capabilitiesUrl = `${domain}/v1/sys/capabilities-self`;
                console.log(`Checking capabilities with paths ${chalk.yellow.bold(JSON.stringify(paths))}.`);
                request({
                    ...initApiRequest(token, capabilitiesUrl),
                    method: 'POST',
                    json: {
                        paths
                    }
                }, (capErr, capRes, capabilities) => {
                    if (capErr) {
                        sendError(capabilitiesUrl, capRes, error);
                        return;
                    }
                    const promises = [];
                    const secrets = Object.keys(pathsMap)
                        .filter(key => key !== listingPath) // Exclude the listing path.
                        .map(key => {
                            const keySplit = key.split('/');
                            const lastPath = keySplit[keySplit.length - 1];
                            const secret = {
                                name: lastPath === '' ? `${keySplit[keySplit.length - 2]}/` : lastPath,
                                capabilities: capabilities[key] || [],
                                // return most recently created standardRequest if available
                                ...standardRequests && {
                                    standardRequestData: standardRequests.reduce((result, currentRequest) => {
                                        if ((currentRequest.dataValues || {}).requestData === key &&
                                            (!result.createdAt ||
                                            (currentRequest.dataValues || {}).createdAt > result.createdAt)) {
                                            result = {...currentRequest.dataValues};
                                        }
                                        return result;
                                    }, {})
                                }
                            };
                            const canRead = (capabilities[key] || []).includes('read');
                            if (canRead && !key.endsWith('/')) {
                                promises.push(new Promise((secretResolve) => {
                                    const getSecretApiUrl = `${domain}/v1/${key}`;
                                    const activeRequest = activeRequests.find(activeReq => (activeReq.request_info || {}).request_path === key);
                                    if (activeRequest) {
                                        console.log(`Active request found for ${key}: `, activeRequest);
                                        secret.data = activeRequest;
                                        secretResolve();
                                    } else {
                                        request(initApiRequest(token, getSecretApiUrl), (secretErr, secretRes, secretBody) => {
                                            if (secretBody) {
                                                secret.data = secretBody;
                                                const {wrap_info: wrapInfo} = secretBody;
                                                if (wrapInfo) {
                                                    try {
                                                        // Just immediately revoke the accessor. A new one will be generated upon a user requesting access. The initial wrap_info accessor is only to inform the user that this secret is wrapped.
                                                        require('vault-pam-premium').revokeAccessor(req, wrapInfo.accessor);
                                                    } catch (err) {
                                                        console.error(`Error occurred. The package vault-pam-premium possibly unavailable: ${err.toString()}`);
                                                    }
                                                }
                                                secretResolve();
                                            }
                                        });
                                    }
                                }));
                            }
                            return secret;
                        });
                    Promise.all(promises).then(() => {
                        res.json({
                            ...body,
                            data: {
                                capabilities: capabilities[listingPath] || [], // Add the capabilities of the listing path to the top level of the response data.
                                secrets
                            }
                        });
                    });
                });
            } catch (err) {
                sendError(url, res, err);
            }
        });
    })
    /**
     * @swagger
     * /rest/secrets/get/{path}:
     *   get:
     *     tags:
     *       - Secrets
     *     name: List secret values.
     *     summary: Retrieves the list of secret values by path.
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
    .get('/get/*', async (req, res) => {
        const {entityId, token} = req.session.user;
        const controlGroupSupport = !!req.app.locals.features['control-groups'];
        const {VAULT_API_TOKEN: apiToken} = process.env;
        const {params = {}, query} = req;
        const isAccessAllowed = !controlGroupSupport ? await getUserSecretsAccess(req, {
            requesterEntityId: entityId || null,
            status: REQUEST_STATUS.APPROVED,
            requestData: params[0]
        }) : true;

        if (isAccessAllowed) {
            const urlParts = (params[0] || '').split('/').filter(path => !!path);
            const listUrlParts = [...urlParts];
            const isV2 = String(query.version) === '2';
            if (isV2) {
                listUrlParts.splice(1, 0, 'metadata');
            }
            const apiUrl = `${getDomain()}/v1/${listUrlParts.join('/')}`;
            request(initApiRequest(controlGroupSupport ? token : apiToken, apiUrl), (error, response, body) => {
                if (error) {
                    sendError(error, response, body);
                    return;
                }
                res.json({...body});
            });
        } else {
            sendError(req.originalUrl, res, 'Access Denied');
        }
    });

module.exports = {
    router
};
