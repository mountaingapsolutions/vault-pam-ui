/* eslint-disable no-console */
const {filter, safeWrap, unwrap} = require('@mountaingapsolutions/objectutil');
const chalk = require('chalk');
const hcltojson = require('hcl-to-json');
const request = require('request');
const {initApiRequest, sendError} = require('services/utils');

const KEY_REPLACEMENT_MAP = {
    COMMA: '===',
    FORWARD_SLASH: '=_=',
    SPACE: '=+='
};

/**
 * Encodes a meta key based on entity id and path.
 *
 * @private
 * @param {string} entityId The entity id.
 * @param {string} path The secrets path.
 * @returns {string}
 */
const _encodeMetaKey = (entityId, path) => {
    return `entity=${entityId}${KEY_REPLACEMENT_MAP.COMMA}path=${path.replace(/\//g, KEY_REPLACEMENT_MAP.FORWARD_SLASH).replace(/ /g, KEY_REPLACEMENT_MAP.SPACE)}`;
};

/**
 * Retrieves the active Control Group requests from group metadata.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} entityId The entity id.
 * @returns {Promise}
 */
const getActiveRequestsByEntityId = async (req, entityId) => {
    const result = await new Promise((resolve, reject) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        if (!apiToken) {
            reject('No API token configured.');
            return;
        }
        const {domain} = req.session.user;
        let metadataMap = {};
        let activeRequests = {};
        let invalidRequests = {};
        const groups = [];
        request(initApiRequest(apiToken, `${domain}/v1/identity/group/id?list=true`), (error, response, body) => {
            Promise.all((((body || {}).data || {}).keys || []).map(key => {
                return new Promise((groupResolve) => {
                    request(initApiRequest(apiToken, `${domain}/v1/identity/group/id/${key}`), (groupError, groupResponse, groupBody) => {
                        if (groupBody && groupBody.data) {
                            const {metadata = {}} = groupBody.data;
                            metadataMap = {
                                ...metadataMap,
                                ...metadata
                            };
                            groups.push(groupBody.data);
                        }
                        groupResolve();
                    });
                });
            })).then(() => {
                const promises = Object.keys(metadataMap).filter(key => key.startsWith(`entity=${entityId}`)).map((key) => {
                    return new Promise((requestCheck) => {
                        const path = getPathFromEncodedMetaKey(key);
                        // Validate that the request accessor is still active. If the accessor is no longer available, it typically means that the request has expired.
                        const wrapInfo = JSON.parse(metadataMap[key]);
                        checkControlGroupRequestStatus(req, wrapInfo.accessor)
                            .then((requestData) => {
                                if (requestData.errors) {
                                    invalidRequests[key] = requestData;
                                } else {
                                    activeRequests[path] = {
                                        request_info: requestData.data,
                                        wrap_info: wrapInfo
                                    };
                                }
                                requestCheck();
                            })
                            .catch((err) => {
                                invalidRequests[key] = err;
                                requestCheck();
                            });
                    });
                });
                Promise.all(promises).then(() => {
                    // Execute non-blocking call to clean up any expired requests.
                    const invalidRequestKeys = Object.keys(invalidRequests);
                    if (invalidRequestKeys.length > 0) {
                        groups.forEach(group => {
                            const {id, metadata = {}, name} = group;
                            const updatedMetadata = filter(metadata, (key) => !invalidRequestKeys.includes(key));
                            console.log(`Removing invalid/expired requests from ${name}: ${JSON.stringify(invalidRequests)}`);
                            request({
                                ...initApiRequest(apiToken, `${domain}/v1/identity/group/id/${id}`),
                                method: 'POST',
                                json: {
                                    metadata: updatedMetadata
                                }
                            });
                        });
                    }
                    resolve(activeRequests);
                });
            });
        });
    });
    return result;
};

/**
 * Returns the decoded path from the encoded metadata key.
 *
 * @param {string} encodedMetaKey The encoded metadata key.
 * @returns {string}
 */
const getPathFromEncodedMetaKey = (encodedMetaKey) => {
    // Using split and join approach over replace so that the SPACE =+= key does not need to be regex escapped (i.e. =\\+=).
    return encodedMetaKey.split(`${KEY_REPLACEMENT_MAP.COMMA}path=`)[1].split(KEY_REPLACEMENT_MAP.FORWARD_SLASH).join('/').split(KEY_REPLACEMENT_MAP.SPACE).join(' ');
};

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
        request({
            ...initApiRequest(apiToken, `${domain}/v1/auth/token/revoke-accessor`),
            method: 'POST',
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
 * /rest/control-group/request:
 *   post:
 *     tags:
 *       - Control-Group
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
        const {group_names: groupNames = []} = unwrap(safeWrap(matches[0]).factor.approvers.identity) || {};
        if (groupNames.length === 0) {
            sendError(req.orignalUrl, res, 'Unable to process request - no approvers found.', 404);
            return;
        }

        const secretRequest = await new Promise((resolve) => {
            const getSecretApiUrl = `${domain}/v1/${path}`;
            request(initApiRequest(token, getSecretApiUrl), (error, response, body) => resolve(body));
        });

        const {wrap_info: wrapInfo} = secretRequest || {};
        if (!wrapInfo) {
            sendError(req.orignalUrl, res, `Unable to process request ${path}`);
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
                        const metaKey = _encodeMetaKey(entityId, path);
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
                                console.log(`Update response: ${groupUpdateResponse.statusCode} - `, groupUpdateBody);
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
     *     summary: Deletes the specified Control Group request.
     *     parameters:
     *       - name: path
     *         in: query
     *         required: true,
     *         description: The path of the request to delete.
     *         schema:
     *           type: string
     *       - name: entityId
     *         in: query
     *         description: Optional entity id of the request to delete. If not provided, will default to the session user's entity id.
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Unauthorized.
     *       404:
     *         description: Request not found.
     */
    .delete('/request', async (req, res) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        const {entityId, path} = req.query;
        if (!path) {
            sendError(req.originalUrl, res, 'Required input path not provided.');
            return;
        }
        const decodedPath = decodeURIComponent(path);
        const {domain, entityId: entityIdSelf} = req.session.user;
        try {
            const key = _encodeMetaKey(entityId, decodedPath);
            const groups = await getGroupsByMetadata(req, key);
            if (groups.length === 0) {
                sendError(req.originalUrl, res, `No active requests found for ${decodedPath}.`, 404);
                return;
            }
            // If an entity id is provided, also have to check permissions by checking if the current user is in any of the groups.
            if (entityId) {
                const isAuthorized = groups.some(group => {
                    const {member_entity_ids: memberEntityIds = []} = group.data;
                    return memberEntityIds.some(memberEntityId => memberEntityId === entityIdSelf);
                });
                if (!isAuthorized) {
                    sendError(req.originalUrl, res, 'Unauthorized', 403);
                    return;
                }
            }
            await new Promise(resolve => {
                Promise.all(groups.map(group => new Promise((groupResolve) => {
                    const {id, metadata = {}} = group.data || {};
                    const updatedMetadata = filter(metadata, (metadataKey) => key !== metadataKey);
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
            await revokeAccessor(req, accessor);
            res.json({
                status: 'ok'
            });
        } catch (err) {
            console.error(err);
            sendError(req.originalUrl, res, `Unable to delete the request to ${path} for entity ${entityId || entityIdSelf}.`);
        }
    })
    /**
     * @swagger
     * /rest/control-group/request/authorize:
     *   post:
     *     tags:
     *       - Control-Group
     *     summary: Authorizes a Control Group request.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               accessor:
     *                 type: string
     *               required:
     *                 - accessor
     *     responses:
     *       200:
     *         description: Success.
     *       400:
     *         description: Invalid accessor.
     *       403:
     *         description: Unauthorized.
     *       500:
     *         description: No approval group has been configured.
     */
    .post('/request/authorize', async (req, res) => {
        const {domain, token} = req.session.user;
        const {accessor} = req.body;

        // Authorize the accessor.
        await new Promise((resolve) => {
            request({
                ...initApiRequest(token, `${domain}/v1/sys/control-group/authorize`),
                method: 'POST',
                json: {
                    accessor
                }
            }, (error, response, body) => {
                if (error) {
                    sendError(req.originalUrl, res, error);
                    return;
                } else if (body.errors) {
                    sendError(req.originalUrl, res, body.errors, response.statusCode);
                    return;
                }
                resolve(body);
            });
        });

        // Return the request status.
        let status;
        try {
            status = await checkControlGroupRequestStatus(req, accessor);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }

        if (status.errors) {
            sendError(req.originalUrl, res, status.errors);
            return;
        }
        res.json(status);
    })
    /**
     * @swagger
     * /rest/control-group/requests:
     *   get:
     *     tags:
     *       - Control-Group
     *     summary: Retrieves active Control Group requests from users.
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Unauthorized.
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
        const wrapInfoList = Object.keys(requests).map(key => JSON.parse(requests[key]));
        Promise.all(wrapInfoList.map(requestData => checkControlGroupRequestStatus(req, requestData.accessor)))
            .then((results) => {
                res.json(results.map((request_info, i) => {
                    return {
                        request_info,
                        wrap_info: wrapInfoList[i]
                    };
                }));
            })
            .catch(() => sendError(req.originalUrl, res, 'Unable to retrieve requests.'));
    })
    /**
     * @swagger
     * /rest/control-group/requests/self:
     *   get:
     *     tags:
     *       - Control-Group
     *     summary: Retrieves active requests for the current session user.
     *     responses:
     *       200:
     *         description: Success.
     */
    .get('/requests/self', async (req, res) => {
        const {entityId} = req.session.user;
        try {
            const activeRequests = await getActiveRequestsByEntityId(req, entityId);
            res.json(Object.keys(activeRequests).map(key => activeRequests[key]));
        } catch (err) {
            sendError(req.originalUrl, res, err);
        }
    })
    /**
     * @swagger
     * /rest/control-group/requests:
     *   delete:
     *     tags:
     *       - Control-Group
     *     summary: "Cleanup endpoint to delete all Control Group requests. Note: this is a very destructive operation and an admin token is required."
     *     responses:
     *       200:
     *         description: Success.
     *       403:
     *         description: Unauthorized.
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
                    const keys = unwrap(safeWrap(body).data.keys) || [];
                    Promise.all(keys.map(key => {
                        return new Promise((groupResolve) => {
                            request(initApiRequest(token, `${domain}/v1/identity/group/id/${key}`), (groupError, groupResponse, groupBody) => {
                                const {id, metadata = {}} = (groupBody || {}).data || {};
                                const updatedMetadata = filter(metadata, metaKey => !metaKey.startsWith('entity='));
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
    getActiveRequestsByEntityId,
    getControlGroupPaths,
    getPathFromEncodedMetaKey,
    revokeAccessor,
    router
};
