/* eslint-disable no-console */
const request = require('request');
const {initApiRequest, sendError} = require('services/utils');


/* eslint-disable new-cap */
module.exports = require('express').Router()
/* eslint-enable new-cap */
    .get('/requests', (req, res) => {
        const {domain, token} = req.session.user;
        const apiUrl = `${domain}/v1/auth/token/accessors/?list=true`;
        request(initApiRequest(token, `${domain}/v1/auth/token/accessors/?list=true`), (error, response, body) => {
            if (error) {
                sendError(apiUrl, res, error);
                return;
            }
            const {keys: accessors} = body.data || {};
            if (accessors) {
                // From the returned list of accessors, iterate and lookup each accessor and filter for only the control-group types.
                const controlGroupAccessorsMap = {};
                const promises = accessors.map(accessor => new Promise((resolve) => request({
                    ...initApiRequest(token, `${domain}/v1/auth/token/lookup-accessor`),
                    method: 'POST',
                    json: {
                        accessor
                    }
                }, (accessorError, accessorResponse, accessorBody) => {
                    const {path = '', policies = []} = (accessorBody || {}).data || {};
                    if (policies.includes('control-group')) {
                        const existingControlGroup = controlGroupAccessorsMap[path];
                        if (existingControlGroup) {
                            const {accessor: existingAccessor, creation_time: existingCreationTime} = existingControlGroup.data;
                            const {accessor: newAccessor, creation_time: newCreationTime} = accessorBody.data;
                            let accessorToRevoke = newAccessor;
                            // If the accessor already exists, compare the timestamp and delete/revoke the older accessor.
                            if (newCreationTime > existingCreationTime) {
                                controlGroupAccessorsMap[path] = accessorBody;
                                accessorToRevoke = existingAccessor;
                            }
                            request({
                                ...initApiRequest(token, `${domain}/v1/auth/token/revoke-accessor`),
                                method: 'POST',
                                json: {
                                    accessor: accessorToRevoke
                                }
                            }, (revokedAccessorError, revokedAccessorResponse) => {
                                if (revokedAccessorResponse.statusCode === 204) {
                                    console.log(`Accessor successfully revoked: ${accessorToRevoke}`);
                                } else {
                                    console.log(`Error in attempting to revoke ${accessorToRevoke}: `, revokedAccessorError);
                                }
                            });
                        } else {
                            controlGroupAccessorsMap[path] = accessorBody;
                        }
                    }
                    resolve();
                })));
                Promise.all(promises).then(() => {
                    //https://vault.dev.gooddoglabs.com/v1/sys/control-group/request
                    const controlGroupStatusPromises = Object.keys(controlGroupAccessorsMap).map(path => new Promise((resolve) => {
                        request({
                            ...initApiRequest(token, `${domain}/v1/sys/control-group/request`),
                            method: 'POST',
                            json: {
                                accessor: controlGroupAccessorsMap[path].data.accessor
                            }
                        }, (requestError, requestResponse, requestBody) => {
                            if (requestError) {
                                console.error(requestError);
                            }
                            controlGroupAccessorsMap[path] = requestBody;
                            resolve();
                        });
                    }));
                    Promise.all(controlGroupStatusPromises).then(() => {
                        // Return the accessor map as an array.
                        res.json(Object.keys(controlGroupAccessorsMap).map(path => controlGroupAccessorsMap[path]));
                    });
                });
                return;
            }
            res.status(response.statusCode).json(body);
        });
    });
