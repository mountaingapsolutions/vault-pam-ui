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
        request({
            ...initApiRequest(apiToken, `${domain}/v1/auth/token/revoke-accessor`),
            method: 'post',
            json: {
                accessor
            }
        }, (error, response) => {
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
 *       402:
 *         description: No API token was set.
 *       500:
 *         description: No approval group has been configured.
 */
    .post('/request', async (req, res) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        if (!apiToken) {
            sendError(req.orignalUrl, res, 'No API token was set.', 402);
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
            sendError('/request', res, `Unable to request ${path}`);
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
     * /rest/control-group/requests:
     *   get:
     *     tags:
     *       - Control-Group
     *     name: Retrieves active requests.
     *     summary: Retrieves active Control Group requests from users.
     *     responses:
     *       200:
     *         description: Success.
     *       402:
     *         description: Permission denied.
     */
    .get('/requests', async (req, res) => {
        let groups = [];
        try {
            groups = await getGroupsByUser(req);
        } catch (err) {
            sendError('/requests', res, err);
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
            .catch(() => sendError('/requests', res, 'Unable to retrieve requests.'));
    })
    .get('/REFACTORME', async (req, res) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        const {domain} = req.session.user;
        const apiUrl = `${domain}/v1/auth/token/accessors/?list=true`;
        let groups = [];
        try {
            groups = await getGroupsByUser(req);
        } catch (err) {
            sendError('/requests', res, err);
        }
        if (groups.length === 0) {
            res.json([]);
            return;
        }

        request(initApiRequest(apiToken, `${domain}/v1/auth/token/accessors/?list=true`), (error, response, body) => {
            if (error) {
                sendError(apiUrl, res, error);
                return;
            }
            const {keys: accessors} = body.data || {};
            if (accessors) {
                // From the returned list of accessors, iterate and lookup each accessor and filter for only the control-group types.
                const controlGroupAccessorsMap = {};
                const promises = accessors.map(accessor => new Promise((resolve) => request({
                    ...initApiRequest(apiToken, `${domain}/v1/auth/token/lookup-accessor`),
                    method: 'POST',
                    json: {
                        accessor
                    }
                }, (accessorError, accessorResponse, accessorBody) => {
                    const {path = '', policies = []} = (accessorBody || {}).data || {};
                    if (policies.includes('control-group')) {
                        // For each Control Group accessor, look for older versions and revoke them.
                        checkControlGroupRequestStatus(req, accessor)
                            .then((requestBody) => {
                                const {id: entityId} = (requestBody.data || {}).request_entity;
                                const key = `${entityId}|${path}`;
                                const existingControlGroup = controlGroupAccessorsMap[key];
                                if (existingControlGroup) {
                                    const {accessor: existingAccessor, creation_time: existingCreationTime} = existingControlGroup.data;
                                    const {accessor: newAccessor, creation_time: newCreationTime} = accessorBody.data;
                                    let accessorToRevoke = newAccessor;
                                    // If the accessor already exists, compare the timestamp and delete/revoke the older accessor.
                                    if (newCreationTime > existingCreationTime) {
                                        controlGroupAccessorsMap[path] = requestBody;
                                        accessorToRevoke = existingAccessor;
                                    }
                                    request({
                                        ...initApiRequest(apiToken, `${domain}/v1/auth/token/revoke-accessor`),
                                        method: 'POST',
                                        json: {
                                            accessor: accessorToRevoke
                                        }
                                    }, (revokedAccessorError, revokedAccessorResponse) => {
                                        if (revokedAccessorResponse.statusCode === 204) {
                                            console.log(`Accessor successfully revoked: ${accessorToRevoke} (${key}).`);
                                        } else {
                                            console.log(`Error in attempting to revoke ${accessorToRevoke}: `, revokedAccessorError);
                                        }
                                    });
                                } else {
                                    controlGroupAccessorsMap[key] = requestBody;
                                }
                            })
                            .catch(resolve);
                    }
                    resolve();
                })));
                Promise.all(promises).then(() => {
                    res.json(Object.keys(controlGroupAccessorsMap).map(key => controlGroupAccessorsMap[key]));
                });
                return;
            }
            res.status(response.statusCode).json([]);
        });
    });

module.exports = {
    checkControlGroupRequestStatus,
    getControlGroupPaths,
    revokeAccessor,
    router
};
