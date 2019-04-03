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

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .post('/request', (req, res) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        if (!apiToken) {
            sendError(req.orignalUrl, res, 'No API token was set.', 402);
            return;
        }
        const {controlGroupPaths, domain, entityId} = req.session.user;
        if (!controlGroupPaths) {
            sendError(req.orignalUrl, res, 'No approval group has been configured.', 500);
            return;
        }
        const {data, path} = req.body;
        if (!data || !path) {
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
                        const metaValue = JSON.stringify(data);
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
    .get('/requests', (req, res) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        const {domain} = req.session.user;
        const apiUrl = `${domain}/v1/auth/token/accessors/?list=true`;
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
    router
};
