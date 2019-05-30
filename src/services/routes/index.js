const chalk = require('chalk');
const request = require('request');
const swaggerUi = require('swagger-ui-express');
const {options, swaggerDoc} = require('services/Swagger');
const {router: auditServiceRouter} = require('services/routes/auditService');
const {router: secretsServiceRouter} = require('services/routes/secretsService');
const {router: userServiceRouter} = require('services/routes/userService');
const {router: requestServiceRouter} = require('services/routes/requestService');
const {router: dynamicSecretServicRoute} = require('services/routes/dynamicSecretRequestService');
const {initApiRequest, getDomain, sendJsonResponse, setSessionData} = require('services/utils');
const {sendError} = require('services/error/errorHandler');
const logger = require('services/logger');

/**
 * Pass-through to the designated Vault server API endpoint.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
const api = (req, res) => {
    logger.audit(req, res);
    _disableCache(res);
    const {'x-vault-token': token} = req.headers;
    const {entityId} = req.session.user || {};
    const apiUrl = `${getDomain()}${req.url}`;
    logger.log(`Proxy the request from ${_yellowBold(req.originalUrl)} to ${_yellowBold(apiUrl)}.`);
    req.pipe(request(initApiRequest(token, apiUrl, entityId), (err, response) => {
        if (err) {
            sendJsonResponse(req, res, {errors: [err]}, 500);
        } else if (response) {
            logger.audit(req, res, response);
        }
    }))
    // .on('response', response => {
    //     // Do interstitial logic here such as setting cookies. E.g.
    //     // response.headers['set-cookie'] = response.headers['set-cookie'].map(value => value.replace(/secure(;)?/, '').replace(/HttpOnly(;)?/, ''));
    // })
        .pipe(res);
};

/**
 * Returns the current Vault server information.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
const config = (req, res) => {
    _disableCache(res);
    const {SHOW_BUILD_NUMBER: showBuildNumber, EB_VERSION: buildNumber} = process.env;
    sendJsonResponse(req, res, {
        build: {showBuildNumber, buildNumber},
        domain: process.env.VAULT_DOMAIN,
        features: req.app.locals.features || {},
    });
};

/**
 * Pass-through to Vault server as the IdP to authenticate. If successful, then a session will be stored.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
const login = (req, res) => {
    _disableCache(res);
    const {authType = 'userpass', token, username, password} = req.body;
    // Method 1: authentication through token.
    if (token) {
        _sendTokenValidationResponse(token, req, res);
    }
    // Method 2: authentication through username and password. Upon success, it will still validate the token from method 1.
    else if (username && password) {
        const apiUrl = `${getDomain()}/v1/auth/${authType}/login/${username}`;
        request({
            uri: apiUrl,
            method: 'POST',
            json: {
                password
            }
        }, (error, response, body) => {
            if (error) {
                sendError(req, res, error, apiUrl);
                return;
            }
            try {
                if (response.statusCode !== 200) {
                    sendError(req, res, error, apiUrl);
                    sendJsonResponse(req, res, body, response.statusCode);
                    return;
                }

                const {client_token: clientToken} = body.auth || {};
                _sendTokenValidationResponse(clientToken, req, res);
            } catch (err) {
                sendError(req, res, err, apiUrl);
            }
        });
    }
    // Womp womp. ¯\_(ツ)_/¯
    else {
        sendJsonResponse(req, res, {errors: ['Unsupported authentication method. ¯\\_(ツ)_/¯']}, 400);
    }
};

/**
 * Logs out current active user.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            sendError(req, res, err);
        } else {
            req.session = null;
            sendJsonResponse(req, res, {status: 'ok'});
        }
    });
};

/**
 * All the remaining authenticated routes.
 */
/* eslint-disable new-cap */
const authenticatedRoutes = require('express').Router()
/* eslint-enable new-cap */
    .use('/api', swaggerUi.serve)
    .get('/api', swaggerUi.setup(swaggerDoc, options))
    .use((req, res, next) => {
        _disableCache(res);
        const {'x-vault-token': token} = req.headers;
        // Check if the token has been provided.
        if (!token) {
            sendJsonResponse(req, res, {errors: ['Unauthorized.']}, 401);
        } else {
            const {token: sessionToken} = req.session.user || {};

            // Token mismatch, so need to verify through Vault again.
            if (token !== sessionToken) {
                const domain = getDomain();
                logger.log(`Token mismatch for the API call ${_yellowBold(req.originalUrl)} between header and stored session. Re-verifying through Vault.`);
                const apiUrl = `${domain}/v1/auth/token/lookup-self/sdf`;
                request(initApiRequest(token, apiUrl), (error, response, body) => {
                    if (error) {
                        sendError(req, res, error);
                        return;
                    }
                    if (response.statusCode !== 200) {
                        sendJsonResponse(req, res, body, response.statusCode);
                        return;
                    }
                    const {display_name: displayName, entity_id: entityId, id: clientToken, meta} = body.data || {};
                    setSessionData(req, {
                        token: clientToken,
                        entityId,
                        username: (meta || {}).username || displayName
                    });
                    res.cookie('entity_id', entityId, {
                        httpOnly: true
                    });
                    request(initApiRequest(token, `${domain}/v1/identity/entity/id/${entityId}`, entityId, true), (entityErr, entityRes, entityBody) => {
                        if (entityBody.data && entityBody.data.metadata) {
                            const {email, firstName, lastName} = entityBody.data.metadata;
                            setSessionData(req, {
                                email,
                                firstName,
                                lastName
                            });
                        }
                    });
                    _getGroupsByUser(req).then(groups => {
                        setSessionData(req, {
                            groups: groups.map(group => group.data.name)
                        });
                        next();
                    });
                });
            } else {
                logger.info('Move along. Nothing to see here.');
                next();
            }
        }
    })
    .use('/audit', auditServiceRouter)
    .use('/user', userServiceRouter)
    .use('/secret', requestServiceRouter)
    .use('/secrets', secretsServiceRouter)
    .use('/log', logger.router)
    .use('/dynamic', dynamicSecretServicRoute)
    .get('/session', (req, res) => {
        const {'x-vault-token': token} = req.headers;
        _sendTokenValidationResponse(token, req, res);
    })
    .use((req, res) => {
        sendJsonResponse(req, res, {
            errors: ['These are\'t the droids you\'re looking for.']
        }, 400);
    });

/**
 * Disables cache for the response.
 *
 * @private
 * @param {Object} res The HTTP response object.
 */
const _disableCache = (res) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', 0);
};

/**
 * Retrieves the groups that the session user is assigned to.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const _getGroupsByUser = (req) => {
    const domain = getDomain();
    const {entityId, token} = req.session.user;
    return new Promise((resolve) => {
        const groups = [];
        request(initApiRequest(token, `${domain}/v1/identity/group/id?list=true`, entityId, true), (error, response, body) => {
            if (error) {
                logger.error(error);
                resolve([]);
            } else if (response.statusCode !== 200) {
                logger.error(body.errors || body);
                resolve([]);
            } else {
                Promise.all((((body || {}).data || {}).keys || []).map(key => {
                    return new Promise((groupResolve) => {
                        request(initApiRequest(token, `${domain}/v1/identity/group/id/${key}`, entityId, true), (groupError, groupResponse, groupBody) => {
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
};

/**
 * Helper method to validate a Vault token. Important note: do *not* attempt to operate on the provided res object after this method is invoked.
 *
 * @private
 * @param {string} token The token to validate.
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
const _sendTokenValidationResponse = (token, req, res) => {
    const domain = getDomain();
    const apiUrl = `${domain}/v1/auth/token/lookup-self`;
    request(initApiRequest(token, apiUrl), (error, response, body) => {
        if (error) {
            sendError(req, res, error, apiUrl);
            return;
        }
        try {
            if (!body.errors) {
                const {display_name: displayName, entity_id: entityId, meta} = body.data || {};
                setSessionData(req, {
                    token,
                    entityId,
                    username: (meta || {}).username || displayName
                });
                res.cookie('entity_id', entityId, {
                    httpOnly: true
                });
                request(initApiRequest(token, `${domain}/v1/identity/entity/id/${entityId}`, entityId, true), (entityErr, entityRes, entityBody) => {
                    if (entityBody.data && entityBody.data.metadata) {
                        const {email, firstName, lastName} = entityBody.data.metadata;
                        setSessionData(req, {
                            email,
                            firstName,
                            lastName
                        });
                    }
                });
                _getGroupsByUser(req).then(groups => {
                    setSessionData(req, {
                        groups: groups.map(group => group.data.name)
                    });
                    sendJsonResponse(req, res, body, response.statusCode);
                });
            } else {
                sendJsonResponse(req, res, body, response.statusCode);
            }
        } catch (err) {
            sendError(req, res, err, apiUrl);
        }
    });
};

/**
 * Outputs the input value as yellow and bold.
 *
 * @private
 * @param {string} value The value to make yellow and bold.
 * @returns {string}
 */
const _yellowBold = (value) => {
    return chalk.bold.yellow(value);
};

module.exports = {
    api,
    config,
    login,
    logout,
    authenticatedRoutes
};
