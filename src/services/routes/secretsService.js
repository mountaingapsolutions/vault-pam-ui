/* eslint-disable no-console */
const chalk = require('chalk');
const request = require('request');
const {checkControlGroupRequestStatus, getControlGroupPaths, revokeAccessor} = require('services/routes/controlGroupService');
const {initApiRequest, sendError, setSessionData} = require('services/utils');

/**
 * Retrieves the active Control Group requests from group metadata.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} entityId The entity id.
 * @returns {Promise}
 */
const _getActiveRequestsByEntityId = async (req, entityId) => {
    const result = await new Promise((resolve, reject) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        if (!apiToken) {
            reject('No API token configured.');
            return;
        }
        const {domain} = req.session.user;
        let activeRequests = {};
        request(initApiRequest(apiToken, `${domain}/v1/identity/group/id?list=true`), (error, response, body) => {
            Promise.all((((body || {}).data || {}).keys || []).map(key => {
                return new Promise((groupResolve) => {
                    request(initApiRequest(apiToken, `${domain}/v1/identity/group/id/${key}`), (groupError, groupResponse, groupBody) => {
                        const {metadata = {}} = (groupBody || {}).data || {};
                        activeRequests = {
                            ...activeRequests,
                            ...metadata
                        };
                        groupResolve();
                    });
                });
            })).then(() => {
                const remappedActiveRequests = Object.keys(activeRequests).filter(key => key.startsWith(`entity=${entityId}`)).reduce((requestMap, key) => {
                    const path = key.split('==path=')[1].replace(/_/g, '/');
                    requestMap[path] = JSON.parse(activeRequests[key]);
                    return requestMap;
                }, {});
                resolve(remappedActiveRequests);
            });
        });
    });
    return result;
};


/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
/**
 * @swagger
 * /rest/secrets/{path}:
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
    .get('/*', async (req, res) => {
        // Check for Control Group policies.
        const {controlGroupPaths, entityId} = req.session.user;
        if (!controlGroupPaths) {
            let paths = {};
            try {
                paths = await getControlGroupPaths(req);
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
        const {domain, token} = req.session.user;
        const apiUrl = `${domain}/v1/${listUrlParts.join('/')}?list=true`;

        // Get active Control Group requests.
        const activeRequests = await _getActiveRequestsByEntityId(req, entityId);

        console.log(`Listing secrets from ${chalk.yellow.bold(apiUrl)}.`);
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
                const paths = (((body || {}).data || {}).keys || []).map(key => {
                    const getUrlParts = [...urlParts];
                    if (isV2) {
                        getUrlParts.splice(1, 0, key.endsWith('/') ? 'metadata' : 'data');
                    }
                    return `${getUrlParts.join('/')}/${key}`;
                });

                // Make sure to include listing path.
                const listingPath = listUrlParts.join('/');
                paths.push(listingPath);

                // Convert the list of paths to a key/value map for easier access later.
                const pathsMap = paths.reduce((accumulatedPaths, currentPath) => {
                    accumulatedPaths[currentPath] = currentPath;
                    return accumulatedPaths;
                }, {});

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
                                capabilities: capabilities[key] || []
                            };

                            const canRead = (capabilities[key] || []).includes('read');
                            if (canRead && !key.endsWith('/')) {
                                promises.push(new Promise((secretResolve) => {
                                    const getSecretApiUrl = `${domain}/v1/${key}`;
                                    const activeRequest = activeRequests[key];
                                    if (activeRequest) {
                                        console.log(`Active request found for ${key}: `, activeRequest);
                                        secret.data = {
                                            wrap_info: activeRequest
                                        };
                                        checkControlGroupRequestStatus(req, activeRequest.accessor)
                                            .then((requestData) => {
                                                secret.data = {
                                                    ...secret.data,
                                                    request_info: requestData.data
                                                };
                                                secretResolve();
                                            }).catch(secretResolve);
                                    } else {
                                        request(initApiRequest(token, getSecretApiUrl), (secretErr, secretRes, secretBody) => {
                                            if (secretBody) {
                                                secret.data = secretBody;
                                                const {wrap_info: wrapInfo} = secretBody;
                                                if (wrapInfo) {
                                                    // Just immediately revoke the accessor. A new one will be generated upon a user requesting access. The initial wrap_info accessor is only to inform the user that this secret is wrapped.
                                                    revokeAccessor(req, wrapInfo.accessor);
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
    });

module.exports = {
    router
};
