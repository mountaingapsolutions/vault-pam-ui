/* eslint-disable no-console */
const chalk = require('chalk');
const request = require('request');
const swaggerUi = require('swagger-ui-express');
const {options, swaggerDoc} = require('services/Swagger');
const {router: controlGroupServiceRouter, getGroupsByUser} = require('services/routes/controlGroupService');
const {router: secretsServiceRouter} = require('services/routes/secretsService');
const {router: userServiceRouter} = require('services/routes/userService');
const {router: requestServiceRouter} = require('services/routes/requestService');
const {router: standardRequestServiceRouter} = require('services/routes/standardRequestService');
const {initApiRequest, getDomain, sendError, setSessionData} = require('services/utils');
const logger = require('services/logger');

/**
 * Pass-through to the designated Vault server API endpoint.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
const api = (req, res) => {
    _disableCache(res);
    const {'x-vault-token': token} = req.headers;
    const apiUrl = `${getDomain()}${req.url}`;
    console.log(`Proxy the request from ${_yellowBold(req.originalUrl)} to ${_yellowBold(apiUrl)}.`);
    req.pipe(request(initApiRequest(token, apiUrl), (err) => {
        if (err) {
            res.status(500).json({errors: [err]});
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
    res.json({
        domain: process.env.VAULT_DOMAIN,
        features: req.app.locals.features || {}
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
                sendError(apiUrl, res, error);
                return;
            }
            try {
                if (response.statusCode !== 200) {
                    res.status(response.statusCode).json(body);
                    return;
                }

                const {client_token: clientToken} = body.auth || {};
                _sendTokenValidationResponse(clientToken, req, res);
            } catch (err) {
                sendError(apiUrl, res, err);
            }
        });
    }
    // Womp womp. ¯\_(ツ)_/¯
    else {
        res.status(400).json({errors: ['Unsupported authentication method. ¯\\_(ツ)_/¯']});
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
            sendError(req.originalUrl, res, err);
        } else {
            req.session = null;
            res.json({status: 'ok'});
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
            res.status(401).json({errors: ['Unauthorized.']});
        } else {
            const {token: sessionToken} = req.session.user || {};

            // Token mismatch, so need to verify through Vault again.
            if (token !== sessionToken) {
                logger.log(`Token mismatch for the API call ${_yellowBold(req.originalUrl)} between header and stored session. Re-verifying through Vault.`);
                const apiUrl = `${getDomain()}/v1/auth/token/lookup-self`;
                request(initApiRequest(token, apiUrl), (error, response, body) => {
                    if (error) {
                        sendError(req.originalUrl, res, error);
                        return;
                    }
                    if (response.statusCode !== 200) {
                        res.status(response.statusCode).json(body);
                        return;
                    }
                    const {entity_id: entityId, id: clientToken} = body.data || {};
                    setSessionData(req, {
                        token: clientToken,
                        entityId
                    });
                    res.cookie('entity_id', entityId, {
                        httpOnly: true
                    });
                    getGroupsByUser(req).then(groups => {
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
    .use('/user', userServiceRouter)
    .use('/requests', requestServiceRouter)
    .use('/request', standardRequestServiceRouter)
    .use('/control-group', controlGroupServiceRouter)
    .use('/secrets', secretsServiceRouter)
    .use('/log', logger.router)
    .get('/session', (req, res) => {
        const {'x-vault-token': token} = req.headers;
        _sendTokenValidationResponse(token, req, res);
    })
    .use((req, res) => {
        res.status(400).json({
            errors: ['These are\'t the droids you\'re looking for.']
        });
    });

/**
 * Sends the a Vault domain error response.
 *
 * @private
 * @param {Object} url The requested Vault server url.
 * @param {Object} res The HTTP response object.
 * @param {Object} error The error.
 */
const _sendVaultDomainError = (url, res, error) => {
    console.warn(`Error in retrieving url "${url}": `, error);
    res.status(400).json({
        errors: ['Invalid Vault server domain.']
    });
};

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
 * Helper method to validate a Vault token. Important note: do *not* attempt to operate on the provided res object after this method is invoked.
 *
 * @private
 * @param {string} token The token to validate.
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
const _sendTokenValidationResponse = (token, req, res) => {
    const apiUrl = `${getDomain()}/v1/auth/token/lookup-self`;
    request(initApiRequest(token, apiUrl), (error, response, body) => {
        if (error) {
            sendError(apiUrl, res, error);
            return;
        }
        try {
            const {entity_id: entityId} = body.data || {};
            setSessionData(req, {
                token,
                entityId
            });
            res.cookie('entity_id', entityId, {
                httpOnly: true
            });
            getGroupsByUser(req).then(groups => {
                setSessionData(req, {
                    groups: groups.map(group => group.data.name)
                });
                res.status(response.statusCode).json(body);
            });
        } catch (err) {
            _sendVaultDomainError(apiUrl, res, err);
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
