/* eslint-disable no-console, no-unused-vars */
const {filter, safeWrap, unwrap} = require('@mountaingapsolutions/objectutil');
const hcltojson = require('hcl-to-json');
const request = require('request');
const notificationsManager = require('services/notificationsManager');
const {getDomain, initApiRequest, sendError, sendNotificationEmail} = require('services/utils');
const {getUser} = require('services/routes/userService');
const {REQUEST_STATUS} = require('services/constants');

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
    const {token} = req.session.user;
    const result = await new Promise((resolve, reject) => {
        request({
            ...initApiRequest(token, `${getDomain()}/v1/sys/control-group/request`),
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
    let emailRecipients = [];
    return new Promise(async (finalResolve, reject) => {
        const domain = getDomain();
        const {entityId, groups, token} = req.session.user;
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
                const promises = groups.map((groupName) => {
                    return new Promise(resolve => {
                        const apiGroupUrl = `${domain}/v1/identity/group/name/${groupName}`;
                        request(initApiRequest(token, apiGroupUrl), async (error, response, body) => {
                            if (error) {
                                console.log(`Error fetching ${apiGroupUrl}: `, error);
                                resolve();
                            } else if (response.statusCode !== 200) {
                                console.log(`Received ${response.statusCode} in attempting to fetch ${apiGroupUrl}.`);
                                resolve();
                            } else {
                                await Promise.all((((body || {}).data || {}).member_entity_ids || []).map(async approverEntityId => {
                                    await getUser(req, approverEntityId, 'admin').then(userData => {
                                        const email = ((((userData || {}).body || {}).data || {}).metadata || {}).email;
                                        email && !emailRecipients.includes(email) && emailRecipients.push(email);
                                    });
                                })).then(resolve);
                            }
                        });
                    });
                });
                Promise.all(promises).then(async () => {
                    const requesterData = await getUser(req, requester, 'admin').then(userData => {
                        return userData;
                    });
                    // TODO - Refactor and move to requestService.
                    sendNotificationEmail({
                        approvers: emailRecipients,
                        requestData: {requestData: requestInfo.request_info.data.request_path, status: REQUEST_STATUS.APPROVED},
                        requesterData,
                        userSession: {domain, entityId}
                    });
                });

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
 * Deletes an active Control Group request.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const deleteControlGroupRequest = async (req) => {
    let emailRecipients = [];
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
                Promise.all(groups.map(group => new Promise(async (groupResolve) => {
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
                    await Promise.all((((group || {}).data || {}).member_entity_ids || []).map(async approverEntityId => {
                        await getUser(req, approverEntityId, 'admin').then(userData => {
                            const email = ((((userData || {}).body || {}).data || {}).metadata || {}).email;
                            email && !emailRecipients.includes(email) && emailRecipients.push(email);
                        });
                    }));
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

            const requesterData = await getUser(req, entityId || entityIdSelf, 'admin').then(userData => {
                return userData;
            });
            // TODO - Refactor and move to requestService.
            sendNotificationEmail({
                approvers: emailRecipients,
                requestData: {requestData: decodedPath, status: entityId ? REQUEST_STATUS.REJECTED : REQUEST_STATUS.CANCELED},
                requesterData,
                userSession: {domain, entityId: entityIdSelf}
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
