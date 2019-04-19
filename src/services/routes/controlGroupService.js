/* eslint-disable no-console */
const {filter, safeWrap, unwrap} = require('@mountaingapsolutions/objectutil');
const chalk = require('chalk');
const hcltojson = require('hcl-to-json');
const request = require('request');
const notificationsManager = require('services/notificationsManager');
const {initApiRequest, getDomain, sendError} = require('services/utils');

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
 * Retrieves the current user's active Control Group requests from group metadata.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const getSelfActiveRequests = async (req) => {
    const {entityId} = req.session.user;
    const result = await new Promise((resolve, reject) => {
        const {VAULT_API_TOKEN: apiToken} = process.env;
        if (!apiToken) {
            reject('No API token configured.');
            return;
        }
        const domain = getDomain();
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
    const domain = getDomain();
    const {token} = req.session.user;
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
        const {VAULT_API_TOKEN: apiToken} = process.env;
        if (!apiToken) {
            reject('No API token configured.');
            return;
        }
        const domain = getDomain();
        const {token} = req.session.user;
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
    const {VAULT_API_TOKEN: apiToken} = process.env;
    const domain = getDomain();
    const {entityId} = req.session.user;
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
    const {VAULT_API_TOKEN: apiToken} = process.env;
    const domain = getDomain();
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
 * Authorizes a Control Group request.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const authorizeControlGroupRequest = async (req) => {
    return new Promise(async (finalResolve, reject) => {
        const domain = getDomain();
        const {groups, token} = req.session.user;
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
                    reject({message: error});
                } else if (body.errors) {
                    reject({message: body.errors, statusCode: response.statusCode});
                } else {
                    resolve(body);
                }
            });
        });

        // Return the request status.
        let status;
        try {
            status = await checkControlGroupRequestStatus(req, accessor);
            const requester = unwrap(safeWrap(status).data.request_entity.id);
            if (requester) {
                const requestInfo = {
                    accessor,
                    request_info: status
                };
                console.warn('Emit approve-request data ', requestInfo, ' to ', requester, ' and the following groups: ', groups.join(', '));
                notificationsManager.getInstance().to(requester).emit('approve-request', requestInfo);
                groups.forEach((groupName) => {
                    notificationsManager.getInstance().to(groupName).emit('approve-request', requestInfo);
                });
            }
        } catch (err) {
            reject({message: err});
            return;
        }

        if (status.errors) {
            reject({message: status.errors});
            return;
        }
        finalResolve(status);
    });
};

/**
 * Creates a new Control Group request.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const createControlGroupRequest = async (req) => {
    const {VAULT_API_TOKEN: apiToken} = process.env;
    return new Promise(async (finalResolve, reject) => {
        if (!apiToken) {
            reject({message: 'no API token was set.', statusCode: 403});
            return;
        }

        const domain = getDomain();
        const {controlGroupPaths, entityId, token} = req.session.user;
        if (!controlGroupPaths) {
            reject({message: 'No approval group has been configured.', statusCode: 500});
            return;
        }

        const {path} = req.body;
        if (!path) {
            reject({message: 'Required input data not provided.'});
            return;
        }

        const matches = Object.keys(controlGroupPaths).filter(controlGroupPath => {
            const regex = new RegExp(controlGroupPath.endsWith('/*') ? controlGroupPath.replace('/*', '/.+') : controlGroupPath);
            return path.match(regex);
        }).map(controlGroupPath => controlGroupPaths[controlGroupPath]);
        const {group_names: groupNames = []} = unwrap(safeWrap(matches[0]).factor.approvers.identity) || {};
        if (groupNames.length === 0) {
            reject({message: 'Unable to process request - no approvers found.', statusCode: 404});
            return;
        }

        const secretRequest = await new Promise((resolve) => {
            const getSecretApiUrl = `${domain}/v1/${path}`;
            request(initApiRequest(token, getSecretApiUrl), (error, response, body) => resolve(body));
        });

        const {wrap_info: wrapInfo} = secretRequest || {};
        if (!wrapInfo) {
            reject({message: 'Unable to process request ${path}'});
            return;
        }
        const requestInfo = await checkControlGroupRequestStatus(req, wrapInfo.accessor);

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
                        const requestNotification = {
                            accessor: wrapInfo.accessor,
                            request_info: requestInfo,
                            wrap_info: wrapInfo
                        };
                        console.warn('Emit create-request data ', requestNotification, ' to ', groupName);
                        notificationsManager.getInstance().in(groupName).emit('create-request', requestNotification);
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
            finalResolve({
                status: 'ok'
            });
        });
    });
};

/**
 * Deletes an active Control Group request.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const deleteControlGroupRequest = async (req) => {
    const {VAULT_API_TOKEN: apiToken} = process.env;
    return new Promise(async (finalResolve, reject) => {
        const {entityId, path} = req.query;
        if (!path) {
            reject({message: 'Required input path not provided.'});
            return;
        }
        const decodedPath = decodeURIComponent(path);
        const domain = getDomain();
        const {entityId: entityIdSelf} = req.session.user;
        try {
            const key = _encodeMetaKey(entityId || entityIdSelf, decodedPath);
            const groups = await getGroupsByMetadata(req, key);
            if (groups.length === 0) {
                reject({message: `No active requests found for ${decodedPath}.`, statusCode: 404});
                return;
            }
            // If an entity id is provided, also have to check permissions by checking if the current user is in any of the groups.
            if (entityId) {
                const isAuthorized = groups.some(group => {
                    const {member_entity_ids: memberEntityIds = []} = group.data;
                    return memberEntityIds.some(memberEntityId => memberEntityId === entityIdSelf);
                });
                if (!isAuthorized) {
                    reject({message: 'Unauthorized', statusCode: 403});
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
                reject({message: `No accessor found for ${decodedPath}.`, statusCode: 404});
                return;
            }
            await revokeAccessor(req, accessor);
            // If entity id provided, it means it was a request rejection.
            if (entityId) {
                // Notify the user of the request rejection.
                console.warn(`Emit reject-request of accessor ${accessor} to ${entityId}.`);
                notificationsManager.getInstance().to(entityId).emit('reject-request', accessor);
            }
            groups.forEach(group => {
                const requestType = entityId ? 'reject-request' : 'cancel-request';
                // Notify the group of the cancellation or rejection.
                console.warn(`Emit ${requestType} of accessor ${accessor} to ${group.data.name}.`);
                notificationsManager.getInstance().to(group.data.name).emit(requestType, accessor);
            });

            finalResolve({
                status: 'ok'
            });
        } catch (err) {
            console.error(err);
            reject({message: `Unable to delete the request to ${path} for entity ${entityId || entityIdSelf}.`});
        }
    });
};

/**
 * Returns all active Control Group requests by the groups that the session user is associated to.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const getControlGroupRequests = async (req) => {
    return new Promise(async (resolve, reject) => {
        let groups = [];
        try {
            groups = await getGroupsByUser(req);
        } catch (err) {
            reject({message: err});
        }
        if (groups.length === 0) {
            resolve([]);
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
                resolve(results.map((request_info, i) => {
                    return {
                        accessor: wrapInfoList[i].accessor,
                        request_info,
                        wrap_info: wrapInfoList[i]
                    };
                }));
            })
            .catch(() => reject({message: 'Unable to retrieve requests.'}));
    });
};

/**
 * Revokes the provided accessor.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} accessor The accessor to revoke.
 * @returns {Promise}
 */
const unwrapControlGroupRequest = async (req) => {
    const domain = getDomain();
    const {token} = req.session.user;
    const {token: requestToken} = req.body;
    const result = await new Promise((resolve, reject) => {
        request({
            ...initApiRequest(token, `${domain}/v1/sys/wrapping/unwrap`),
            method: 'POST',
            json: {
                token: requestToken
            }
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                const {VAULT_API_TOKEN: apiToken} = process.env;
                // Update metadata in the groups by removing the unwrapped request in the meta.
                request(initApiRequest(apiToken, `${domain}/v1/identity/group/id?list=true`), (groupsError, groupsResponse, groupsBody) => {
                    const keys = unwrap(safeWrap(groupsBody).data.keys) || [];
                    Promise.all(keys.map(id => {
                        return new Promise((groupResolve) => {
                            request(initApiRequest(apiToken, `${domain}/v1/identity/group/id/${id}`), (groupError, groupResponse, groupBody) => {
                                if (groupBody && groupBody.data) {
                                    const {metadata = {}, name} = groupBody.data;
                                    let accessor;
                                    const updatedMetadata = filter(metadata, (key) => {
                                        const parsedMetadata = JSON.parse(metadata[key]);
                                        if (parsedMetadata.token === requestToken) {
                                            accessor = parsedMetadata.accessor;
                                            return false;
                                        }
                                        return true;
                                    });
                                    groupResolve();
                                    if (accessor) {
                                        request({
                                            ...initApiRequest(token, `${domain}/v1/identity/group/id/${id}`),
                                            method: 'POST',
                                            json: {
                                                metadata: updatedMetadata
                                            }
                                        }, () => groupResolve());
                                        console.warn(`Emit read-approved-request accessor ${accessor} to ${name}.`);
                                        notificationsManager.getInstance().to(name).emit('read-approved-request', accessor);
                                    } else {
                                        groupResolve();
                                    }
                                } else {
                                    groupResolve();
                                }
                            });
                        });
                    }))
                        .then(() => resolve(response))
                        .catch(() => resolve(response));
                });
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
    const {VAULT_API_TOKEN: apiToken} = process.env;
    const result = await new Promise((resolve, reject) => {
        request({
            ...initApiRequest(apiToken, `${getDomain()}/v1/auth/token/revoke-accessor`),
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
        let result;
        try {
            result = await createControlGroupRequest(req);
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
        res.json(result);
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
        let result;
        try {
            result = await deleteControlGroupRequest(req);
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
        res.json(result);
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
        let result;
        try {
            result = await authorizeControlGroupRequest(req);
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
        res.json(result);
    })
    /**
     * @swagger
     * /rest/control-group/request/unwrap:
     *   post:
     *     tags:
     *       - Control-Group
     *     summary: Unwraps an authorized Control Group request.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               token:
     *                 type: string
     *               required:
     *                 - token
     *     responses:
     *       200:
     *         description: The unwrapped secret.
     *       400:
     *         description: Wrapping token is not valid, does not exist, or needs further authorization.
     *       403:
     *         description: Unauthorized.
     */
    .post('/request/unwrap', async (req, res) => {
        let result;
        try {
            result = await unwrapControlGroupRequest(req);
            res.status(result.statusCode).json(result.body);
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
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
        let result;
        try {
            result = await getControlGroupRequests(req);
        } catch (err) {
            sendError(req.originalUrl, res, err.message, err.statusCode);
            return;
        }
        res.json(result);
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
        try {
            const activeRequests = await getSelfActiveRequests(req);
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
        const domain = getDomain();
        const {token} = req.session.user;

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
    authorizeControlGroupRequest,
    checkControlGroupRequestStatus,
    createControlGroupRequest,
    deleteControlGroupRequest,
    getSelfActiveRequests,
    getControlGroupPaths,
    getControlGroupRequests,
    getGroupsByUser,
    getPathFromEncodedMetaKey,
    revokeAccessor,
    router
};
