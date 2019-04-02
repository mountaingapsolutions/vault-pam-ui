/* eslint-disable no-console */
const chalk = require('chalk');
const request = require('request');
const {initApiRequest, sendError, setSessionData} = require('services/utils');

/* eslint-disable new-cap */
module.exports = require('express').Router()
/* eslint-enable new-cap */
/**
 * Fetches secret lists and data. TODO: Clean this up and refactor after the requirements are finalized.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
    .get('/*', (req, res) => {
        const {params = {}, query, url} = req;
        const urlParts = (params[0] || '').split('/').filter(path => !!path);
        const listUrlParts = [...urlParts];
        const isV2 = String(query.version) === '2';
        if (isV2) {
            listUrlParts.splice(1, 0, 'metadata');
        }
        const {domain, token} = req.session.user;
        const apiUrl = `${domain}/v1/${listUrlParts.join('/')}?list=true`;
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
                                const {wrapInfoMap = {}} = req.session.user;
                                promises.push(new Promise((secretResolve) => {
                                    const getSecretApiUrl = `${domain}/v1/${key}`;
                                    if (!wrapInfoMap[getSecretApiUrl]) {
                                        request(initApiRequest(token, getSecretApiUrl), (secretErr, secretRes, secretBody) => {
                                            if (secretBody) {
                                                const {wrap_info: wrapInfo} = secretBody;
                                                // If the secret is wrapped (from Control Groups), cache it in the user's session.
                                                if (wrapInfo) {
                                                    request({
                                                        ...initApiRequest(token, `${domain}/v1/sys/control-group/request`),
                                                        method: 'POST',
                                                        json: {
                                                            accessor: wrapInfo.accessor
                                                        }
                                                    }, (reqReq, reqRes, reqBody) => {
                                                        if (reqBody) {
                                                            wrapInfoMap[getSecretApiUrl] = {
                                                                ...secretBody,
                                                                request_info: reqBody.data
                                                            };
                                                            secret.data = wrapInfoMap[getSecretApiUrl];
                                                            setSessionData(req, {
                                                                wrapInfoMap
                                                            });
                                                        }
                                                        secretResolve();
                                                    });
                                                } else {
                                                    secretResolve();
                                                }
                                            }
                                        });
                                    } else {
                                        const cachedWrapInfo = wrapInfoMap[getSecretApiUrl];
                                        secret.data = cachedWrapInfo;
                                        request({
                                            ...initApiRequest(token, `${domain}/v1/sys/control-group/request`),
                                            method: 'POST',
                                            json: {
                                                accessor: cachedWrapInfo.wrap_info.accessor
                                            }
                                        }, (reqReq, reqRes, reqBody) => {
                                            if (reqBody) {
                                                wrapInfoMap[getSecretApiUrl] = {
                                                    ...cachedWrapInfo,
                                                    request_info: reqBody.data
                                                };
                                                secret.data = wrapInfoMap[getSecretApiUrl];
                                                setSessionData(req, {
                                                    wrapInfoMap
                                                });
                                            }
                                            secretResolve();
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
