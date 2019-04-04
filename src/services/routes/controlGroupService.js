/* eslint-disable no-console */
const chalk = require('chalk');
const hcltojson = require('hcl-to-json');
const request = require('request');
const {initApiRequest, sendError} = require('services/utils');

/**
 * Check Control Group request status.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} accessor The accessor to check.
 * @returns {Promise}
 */
const checkControlGroupRequestStatus = async (req, accessor) => {
    const {domain, token} = req.session.user;
    const result = await new Promise((resolve, reject) => {
        request({
            ...initApiRequest(token, `${domain}/v1/sys/control-group/request`),
            method: 'POST',
            json: {
                accessor
            }
        }, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
    return result;
};

/**
 * Retrieves Control Group paths from policies.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const getControlGroupPaths = async (req) => {
    const result = await new Promise((resolve, reject) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        if (!apiToken) {
            reject('No API token configured.');
            return;
        }
        const {domain, token} = req.session.user;
        const apiUrl = `${domain}/v1/auth/token/lookup-self`;
        const controlGroupPolicies = {};
        request(initApiRequest(token, apiUrl), (error, response, body) => {
            if (error) {
                reject(error);
                return;
            }
            Promise.all(body.data.policies.filter(name => name !== 'root').map(name => new Promise((policyResolve) => {
                const policyApiUrl = `${domain}/v1/sys/policy/${name}`;
                request(initApiRequest(apiToken, policyApiUrl), (policyError, policyResponse, policyBody) => {
                    if (policyError) {
                        console.log(`Error in retrieving "${policyApiUrl}": `, policyError);
                    }
                    const {rules} = (policyBody || {}).data || {};
                    if (rules) {
                        try {
                            const parsedRules = hcltojson(rules);
                            Object.keys(parsedRules.path).forEach(path => {
                                const {control_group: controlGroup} = parsedRules.path[path];
                                if (controlGroup) {
                                    controlGroupPolicies[path] = controlGroup;
                                }
                            });
                        } catch (err) {
                            console.error(err);
                        }
                    }
                    policyResolve();
                });
            }))).then(() => resolve(controlGroupPolicies));
        });
    });
    return result;
};

/**
 * Retrieves the groups that the session user is assigned to.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const getGroupsByUser = async (req) => {
    const {domain, entityId, token} = req.session.user;
    const result = await new Promise((resolve, reject) => {
        const groups = [];
        request(initApiRequest(token, `${domain}/v1/identity/group/id?list=true`), (error, response, body) => {
            if (error) {
                reject(error);
            } else if (response.statusCode !== 200) {
                reject(body.errors || body);
            } else {
                Promise.all((((body || {}).data || {}).keys || []).map(key => {
                    return new Promise((groupResolve) => {
                        request(initApiRequest(token, `${domain}/v1/identity/group/id/${key}`), (groupError, groupResponse, groupBody) => {
                            if (groupBody) {
                                const {member_entity_ids: entityIds = []} = groupBody.data || {};
                                if (entityIds.includes(entityId)) {
                                    groups.push(groupBody);
                                }
                            }
                            groupResolve();
                        });
                    });
                })).then(() => resolve(groups));
            }
        });
    });
    return result;
};

/**
 * Retrieves the groups that contain the specified metadata key.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} metadataKey The metadata key.
 * @returns {Promise}
 */
const getGroupsByMetadata = async (req, metadataKey) => {
    const {REACT_APP_API_TOKEN: apiToken} = process.env;
    const {domain} = req.session.user;
    const result = await new Promise((resolve, reject) => {
        const groups = [];
        request(initApiRequest(apiToken, `${domain}/v1/identity/group/id?list=true`), (error, response, body) => {
            if (error) {
                reject(error);
            } else if (response.statusCode !== 200) {
                reject(body.errors || body);
            } else {
                Promise.all((((body || {}).data || {}).keys || []).map(key => {
                    return new Promise((groupResolve) => {
                        request(initApiRequest(apiToken, `${domain}/v1/identity/group/id/${key}`), (groupError, groupResponse, groupBody) => {
                            const {metadata = {}} = (groupBody || {}).data || {};
                            if (Object.keys(metadata).includes(metadataKey)) {
                                groups.push(groupBody);
                            }
                            groupResolve();
                        });
                    });
                })).then(() => resolve(groups));
            }
        });
    });
    return result;
};

/**
 * Revokes the provided accessor.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} accessor The accessor to revoke.
 * @returns {Promise}
 */
const revokeAccessor = async (req, accessor) => {
    const {domain} = req.session.user;
    const {REACT_APP_API_TOKEN: apiToken} = process.env;
    const result = await new Promise((resolve, reject) => {
        console.warn('ATTEMPTING TO REVOKE ', accessor, '!!!!');
        request({
            ...initApiRequest(apiToken, `${domain}/v1/auth/token/revoke-accessor`),
            method: 'POST',
            json: {
                accessor
            }
        }, (error, response) => {
            console.warn('status: ', response.statusCode);
            if (response.statusCode === 204) {
                console.log(`Accessor successfully revoked: ${accessor}.`);
                resolve();
            } else {
                console.log(`Error in attempting to revoke ${accessor}: `, error);
                reject();
            }
        });
    });
    return result;
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */

/**
 * @swagger
 * /rest/control-group/requests:
 *   post:
 *     tags:
 *       - Control-Group
 *     name: Request secret access.
 *     summary: Initiates a Control Group access request for a particular secret path.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               path:
 *                 type: string
 *               required:
 *                 - path
 *     responses:
 *       200:
 *         description: Success.
 *       400:
 *         description: Required path input was not provided.
 *       403:
 *         description: No API token was set.
 *       500:
 *         description: No approval group has been configured.
 */
    .post('/request', async (req, res) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        if (!apiToken) {
            sendError(req.orignalUrl, res, 'No API token was set.', 403);
            return;
        }
        const {controlGroupPaths, domain, entityId, token} = req.session.user;
        if (!controlGroupPaths) {
            sendError(req.orignalUrl, res, 'No approval group has been configured.', 500);
            return;
        }
        const {path} = req.body;
        if (!path) {
            sendError(req.orignalUrl, res, 'Required input data not provided.');
            return;
        }
        const matches = Object.keys(controlGroupPaths).filter(controlGroupPath => {
            const regex = new RegExp(controlGroupPath.endsWith('/*') ? controlGroupPath.replace('/*', '/.+') : controlGroupPath);
            return path.match(regex);
        }).map(controlGroupPath => controlGroupPaths[controlGroupPath]);
        const {group_names: groupNames = []} = (((matches[0] || {}).factor || {}).approvers || {}).identity || {};
        if (groupNames.length === 0) {
            sendError(req.orignalUrl, res, 'No approvers found.', 404);
            return;
        }

        const secretRequest = await new Promise((resolve) => {
            const getSecretApiUrl = `${domain}/v1/${path}`;
            request(initApiRequest(token, getSecretApiUrl), (error, response, body) => resolve(body));
        });

        const {wrap_info: wrapInfo} = secretRequest || {};
        if (!wrapInfo) {
            sendError(req.orignalUrl, res, `Unable to request ${path}`);
            return;
        }

        // Persist the data.
        const promises = groupNames.map((groupName) => {
            // Persist the request data as meta data of the corresponding group.
            return new Promise((resolve) => {
                const apiGroupUrl = `${domain}/v1/identity/group/name/${groupName}`;
                request(initApiRequest(apiToken, apiGroupUrl), (error, response, body) => {
                    if (error) {
                        console.log(`Error fetching ${apiGroupUrl}: `, error);
                        resolve();
                    } else if (response.statusCode !== 200) {
                        console.log(`Received ${response.statusCode} in attempting to fetch ${apiGroupUrl}.`);
                        resolve();
                    } else {
                        const {metadata = {}} = (body || {}).data;
                        const metaKey = `entity=${entityId}==path=${path.replace(/\//g, '_')}`;
                        const metaValue = JSON.stringify(wrapInfo);
                        console.log(`Persisting to ${apiGroupUrl} with the key/value pair: ${chalk.bold.yellow(metaKey)} / ${chalk.bold.yellow(metaValue)}`);
                        request({
                            ...initApiRequest(apiToken, apiGroupUrl),
                            method: 'POST',
                            json: {
                                metadata: {
                                    ...metadata,
                                    [metaKey]: metaValue
                                }
                            }
                        }, (groupUpdateError, groupUpdateResponse, groupUpdateBody) => {
                            if (groupUpdateError) {
                                console.log(`Error updating ${apiGroupUrl}: `, groupUpdateError);
                            } else {
                                console.log(`Update response: ${groupUpdateResponse.statusCode} - ${groupUpdateBody}.`);
                            }
                            resolve();
                        });
                    }
                });
            });
        });
        Promise.all(promises).then(() => {
            res.json({
                status: 'ok'
            });
        });
    })
    /**
     * @swagger
     * /rest/control-group/request:
     *   delete:
     *     tags:
     *       - Control-Group
     *     name: Delete Control Group request.
     *     summary: Deletes the specified Control Group request.
     *     parameters:
     *       - name: path
     *         in: query
     *         required: true,
     *         description: The path of the request to delete.
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Success.
     *       404:
     *         description: Request not found.
     */
    .delete('/request', async (req, res) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        const {path} = req.query;
        if (!path) {
            sendError(req.originalUrl, res, 'Required input path not provided.');
            return;
        }
        const decodedPath = decodeURIComponent(path);
        const {domain, entityId} = req.session.user;
        const key = `entity=${entityId}==path=${decodedPath.replace(/\//g, '_')}`;
        try {
            const groups = await getGroupsByMetadata(req, key);
            if (groups.length === 0) {
                sendError(req.originalUrl, res, `No active requests found for ${decodedPath}.`, 404);
                return;
            }
            await new Promise(resolve => {
                Promise.all(groups.map(group => new Promise((groupResolve) => {
                    const {id, metadata = {}} = group.data || {};
                    const updatedMetadata = Object.keys(metadata).filter(metadataKey => key !== metadataKey).reduce((dataMap, k) => {
                        dataMap[k] = metadata[k];
                        return dataMap;
                    }, {});
                    // Update the group metadata with the removed request.
                    request({
                        ...initApiRequest(apiToken, `${domain}/v1/identity/group/id/${id}`),
                        method: 'POST',
                        json: {
                            metadata: updatedMetadata
                        }
                    }, groupResolve);
                }))).then(resolve).catch(resolve);
            });
            const {accessor} = JSON.parse(groups[0].data.metadata[key]);
            if (!accessor) {
                sendError(req.originalUrl, res, `No accessor found for ${decodedPath}.`, 404);
                return;
            }
            console.warn('1=========', accessor);
            await revokeAccessor(req, accessor);
            console.warn('2=========', accessor);
            res.json({
                status: 'ok'
            });
        } catch (err) {
            console.error(err);
            sendError(req.originalUrl, res, `Unable to delete the request ${key}.`);
        }
    })
    /**
     * @swagger
     * /rest/control-group/requests:
     *   get:
     *     tags:
     *       - Control-Group
     *     name: Retrieves active requests.
     *     summary: Retrieves active Control Group requests from users.
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Permission denied.
     */
    .get('/requests', async (req, res) => {
        let groups = [];
        try {
            groups = await getGroupsByUser(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }
        if (groups.length === 0) {
            res.json([]);
            return;
        }
        const requests = {};
        groups.forEach(group => {
            Object.keys(group.data.metadata).forEach(metadataKey => {
                if (metadataKey.startsWith('entity=')) {
                    requests[metadataKey] = group.data.metadata[metadataKey];
                }
            });
        });
        Promise.all(Object.keys(requests).map(key => checkControlGroupRequestStatus(req, JSON.parse(requests[key]).accessor)))
            .then((results) => res.json(results))
            .catch(() => sendError(req.originalUrl, res, 'Unable to retrieve requests.'));
    })
    /**
     * @swagger
     * /rest/control-group/requests:
     *   delete:
     *     tags:
     *       - Control-Group
     *     name: Delete all Control Group requests.
     *     summary: "Cleanup endpoint to delete all Control Group requests. Note: this is a very destructive operation and an admin token is required."
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Permission denied.
     */
    .delete('/requests', async (req, res) => {
        const {domain, token} = req.session.user;

        try {
            await new Promise((resolve, reject) => {
                request(initApiRequest(token, `${domain}/v1/auth/token/accessors/?list=true`), (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else if (response.statusCode !== 200) {
                        reject(response);
                    } else {
                        const {keys: accessors} = body.data || {};
                        console.warn('accessors: ', accessors);
                        if (accessors) {
                            // Revoke all Control Group accessors.
                            Promise.all(accessors.map(accessor => new Promise((accessorResolve) => request({
                                ...initApiRequest(token, `${domain}/v1/auth/token/lookup-accessor`),
                                method: 'POST',
                                json: {
                                    accessor
                                }
                            }, (accessorError, accessorResponse, accessorBody) => {
                                const {policies = []} = (accessorBody || {}).data || {};
                                if (policies.includes('control-group')) {
                                    // For each Control Group accessor, look for older versions and revoke them.
                                    revokeAccessor(req, accessor)
                                        .then(accessorResolve)
                                        .catch(accessorResolve);
                                } else {
                                    accessorResolve();
                                }
                            }))))
                                .then(resolve)
                                .catch(resolve);
                        } else {
                            resolve();
                        }
                    }
                });
            });
        } catch (err) {
            sendError(req.originalUrl, res, err.statusCode ? err.body.errors : err, err.statusCode || 500);
            return;
        }
        try {
            await new Promise((resolve) => {
                request(initApiRequest(token, `${domain}/v1/identity/group/id?list=true`), (error, response, body) => {
                    Promise.all((((body || {}).data || {}).keys || []).map(key => {
                        return new Promise((groupResolve) => {
                            request(initApiRequest(token, `${domain}/v1/identity/group/id/${key}`), (groupError, groupResponse, groupBody) => {
                                const {id, metadata = {}} = (groupBody || {}).data || {};
                                const updatedMetadata = Object.keys(metadata).filter(metaKey => !metaKey.startsWith('entity=')).reduce((dataMap, metaKey) => {
                                    dataMap[metaKey] = metadata[metaKey];
                                    return dataMap;
                                }, {});
                                request({
                                    ...initApiRequest(token, `${domain}/v1/identity/group/id/${id}`),
                                    method: 'POST',
                                    json: {
                                        metadata: updatedMetadata
                                    }
                                }, () => groupResolve());
                            });
                        });
                    }))
                        .then(resolve)
                        .catch(resolve);
                });
            });
        } catch (err) {
            sendError(req.originalUrl, res, err.statusCode ? err.body.errors : err, err.statusCode || 500);
            return;
        }
        res.json({
            status: 'ok'
        });
    });

module.exports = {
    checkControlGroupRequestStatus,
    getControlGroupPaths,
    revokeAccessor,
    router
};
