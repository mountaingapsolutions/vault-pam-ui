/* eslint-disable no-console */
const chalk = require('chalk');
const request = require('request');
const User = require('services/controllers/User');
const controlGroupService = require('services/routes/controlGroupService');
const secretsService = require('services/routes/secretsService');
const userService = require('services/routes/userService');
const requestService = require('services/routes/requestService');
const {initApiRequest, setSessionData} = require('services/utils');

/**
 * Pass-through to the designated Vault server API endpoint.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
const api = (req, res) => {
    _disableCache(res);
    const {'x-vault-domain': domain, 'x-vault-token': token} = req.headers;
    // Check if the domain has been provided.
    if (!domain) {
        res.status(400).json({errors: ['No Vault server domain provided.']});
    } else {
        const apiUrl = `${domain.endsWith('/') ? domain.slice(0, -1) : domain}${req.url}`;
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
    }
};

/**
 * Pass-through to Vault server as the IdP to authenticate. If successful, then a session will be stored.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
const login = (req, res) => {
    _disableCache(res);
    const {'x-vault-domain': domain = ''} = req.headers;
    const {authType = 'userpass', token, username, password} = req.body;
    // Check if the domain has been provided.
    const parsedDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
    if (!parsedDomain) {
        res.status(400).json({errors: ['No Vault server domain provided.']});
    }
    // Method 1: authentication through token.
    else if (token) {
        _sendTokenValidationResponse(parsedDomain, token, req, res);
    }
    // Method 2: authentication through username and password. Upon success, it will still validate the token from method 1.
    else if (username && password) {
        const apiUrl = `${parsedDomain}/v1/auth/${authType}/login/${username}`;
        request({
            uri: apiUrl,
            method: 'POST',
            json: {
                password
            }
        }, (error, response, body) => {
            if (error) {
                _sendError(apiUrl, res, error);
                return;
            }
            try {
                if (response.statusCode !== 200) {
                    res.status(response.statusCode).json(body);
                    return;
                }

                const {client_token: clientToken} = body.auth || {};
                _sendTokenValidationResponse(parsedDomain, clientToken, req, res);
            } catch (err) {
                _sendError(apiUrl, res, err);
            }
        });
    }
    // Womp womp. ¯\_(ツ)_/¯
    else {
        res.status(400).json({errors: ['Unsupported authentication method. ¯\\_(ツ)_/¯']});
    }
};

/**
 * Validates the Vault domain.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
const validate = (req, res) => {
    _disableCache(res);
    const domain = req.query.domain;
    if (!domain) {
        res.status(400).json({errors: ['No domain provided.']});
    } else {
        const url = `${domain.endsWith('/') ? domain.slice(0, -1) : domain}/v1/sys/seal-status`;
        console.log(`Validating ${_yellowBold(url)}.`);
        request({
            url,
            json: true
        }, (error, response, body) => {
            if (error) {
                console.log(`Received error from ${url}:`);
                console.error(error);
                _sendVaultDomainError(url, res, error);
                return;
            }
            const responseKeys = Object.keys(body);
            // Validation approach to checking for a proper Vault server is to check that the response contains the required sealed, version, and cluster_name keys.
            if (responseKeys.includes('sealed') && responseKeys.includes('version') && responseKeys.includes('cluster_name')) {
                res.json(body);
            } else {
                _sendVaultDomainError(url, res, body);
            }
        });
    }
};

/**
 * All the remaining authenticated routes.
 */
/* eslint-disable new-cap */
const authenticatedRoutes = require('express').Router()
/* eslint-enable new-cap */
    .use((req, res, next) => {
        _disableCache(res);
        const {'x-vault-domain': domain, 'x-vault-token': token} = req.headers;
        // Check if the domain and token has been provided.
        if (!domain || !token) {
            res.status(401).json({errors: ['Unauthorized.']});
        } else {
            const {token: sessionToken} = req.session.user || {};

            // Always make sure the domain is normalized.
            const apiDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
            setSessionData(req, {
                domain: apiDomain
            });

            // Token mismatch, so need to verify through Vault again.
            if (token !== sessionToken) {
                console.log(`Token mismatch for the API call ${_yellowBold(req.originalUrl)} between header and stored session. Re-verifying through Vault.`);
                const apiUrl = `${apiDomain}/v1/auth/token/lookup-self`;
                request(initApiRequest(token, apiUrl), (error, response, body) => {
                    if (error) {
                        _sendError(req.originalUrl, res, error);
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
                    next();
                });
            } else {
                console.info('Move along. Nothing to see here.');
                next();
            }
        }
    })
    .use('/user', userService)
    .use('/request', requestService)
    .use('/control-group', controlGroupService)
    .use('/secrets', secretsService)
    .use((req, res) => {
        console.warn('found nothing: ', req.url);
        res.status(400).json({
            errors: ['These are\'t the droids you\'re looking for.']
        });
    });

/**
 * Sends the standard error response.
 *
 * @private
 * @param {Object} url The requested Vault server url.
 * @param {Object} res The HTTP response object.
 * @param {string|Object} error The error.
 */
const _sendError = (url, res, error) => {
    console.warn(`Error in retrieving url "${url}": `, error);
    res.status(400).json({
        errors: [typeof error === 'string' ? error : error.toString()]
    });
};

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
 * @param {string} domain The valid Vault domain.
 * @param {string} token The token to validate.
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 */
const _sendTokenValidationResponse = (domain, token, req, res) => {
    const apiUrl = `${domain}/v1/auth/token/lookup-self`;
    request(initApiRequest(token, apiUrl), (error, response, body) => {
        if (error) {
            _sendError(apiUrl, res, error);
            return;
        }
        try {
            const {entity_id: entityId} = body.data || {};
            if (entityId) {
                User.findOrCreate(entityId).then(user => {
                    console.log(`Entity ID logged in: ${user.entityId}`);
                });
            }
            setSessionData(req, {
                domain,
                token,
                entityId
            });
            res.status(response.statusCode).json(body);
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
    login,
    validate,
    authenticatedRoutes
};
