/* eslint-disable no-console */
const chalk = require('chalk');
const request = require('request');

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
        req.pipe(request(_initApiRequest(token, apiUrl), (err) => {
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
        req.session.vaultToken = token;
        req.session.vaultDomain = parsedDomain;
        _sendTokenValidationResponse(parsedDomain, token, res);
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

                const {client_token: clientToken, entity_id: uid} = body.auth || {};
                if (uid) {
                    const User = require('./services/controllers/User');
                    const user = User.findOrCreate(uid);
                    console.info(`User logged in: ${user}`);
                }

                req.session.vaultToken = clientToken;
                req.session.vaultDomain = parsedDomain;
                _sendTokenValidationResponse(parsedDomain, clientToken, res);
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
        request(url, (error, response, body) => {
            if (error) {
                console.log(`Received error from ${url}:`);
                console.error(error);
                _sendVaultDomainError(url, res, error);
                return;
            }
            try {
                const sealStatusResponse = JSON.parse(body);
                const responseKeys = Object.keys(sealStatusResponse);
                // Validation approach to checking for a proper Vault server is to check that the response contains the required sealed, version, and cluster_name keys.
                if (responseKeys.includes('sealed') && responseKeys.includes('version') && responseKeys.includes('cluster_name')) {
                    res.json(sealStatusResponse);
                } else {
                    _sendVaultDomainError(url, res, sealStatusResponse);
                }
            } catch (err) {
                _sendVaultDomainError(url, res, err);
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
            const {vaultToken: sessionToken} = req.session;

            // Always make sure the domain is normalized.
            const apiDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
            req.session.vaultDomain = apiDomain;

            // Token mismatch, so need to verify through Vault again.
            if (token !== sessionToken) {
                console.log(`Token mismatch for the API call ${_yellowBold(req.originalUrl)} between header and stored session. Re-verifying through Vault.`);
                const apiUrl = `${apiDomain}/v1/auth/token/lookup-self`;
                request(_initApiRequest(token, apiUrl), (error, response, body) => {
                    if (error) {
                        _sendError(req.originalUrl, res, error);
                        return;
                    }
                    const parsedData = JSON.parse(body);
                    if (response.statusCode !== 200) {
                        res.status(response.statusCode).json(parsedData);
                        return;
                    }
                    req.session.vaultToken = (parsedData.data || {}).id;
                    next();
                });
            } else {
                console.info('Move along. Nothing to see here.');
                next();
            }
        }
    })
    .get('/secrets/*', (req, res) => {
        const {'x-vault-token': token} = req.headers;
        const {params = {}, query, url} = req;
        const urlParts = (params[0] || '').split('/').filter(path => !!path);
        const listUrlParts = [...urlParts];
        const isV2 = String(query.version) === '2';
        if (isV2) {
            listUrlParts.splice(1, 0, 'metadata');
        }
        const apiDomain = req.session.vaultDomain;
        const apiUrl = `${apiDomain}/v1/${listUrlParts.join('/')}?list=true`;
        console.log(`Listing secrets from ${_yellowBold(apiUrl)}.`);
        request(_initApiRequest(token, apiUrl), (error, response, body) => {
            if (error) {
                _sendError(url, res, error);
                return;
            }
            try {
                const parsedData = JSON.parse(body);
                if (response.statusCode !== 200) {
                    res.status(response.statusCode).json(parsedData);
                    return;
                }
                const paths = parsedData.data.keys.map(key => {
                    const getUrlParts = [...urlParts];
                    if (isV2) {
                        getUrlParts.splice(1, 0, key.endsWith('/') ? 'metadata' : 'data');
                    }
                    return `${getUrlParts.join('/')}/${key}`;
                });

                // Make sure to include listing path.
                const listingPath = listUrlParts.join('/');
                paths.push(listingPath);

                // Convert the list of paths to a key/value map for easier access later.
                const pathsMap = paths.reduce((accumulatedPaths, currentPath) => {
                    accumulatedPaths[currentPath] = currentPath;
                    return accumulatedPaths;
                }, {});

                const capabilitiesUrl = `${apiDomain}/v1/sys/capabilities-self`;
                console.log(`Checking capabilities with paths ${_yellowBold(JSON.stringify(paths))}.`);
                request({
                    ..._initApiRequest(token, capabilitiesUrl),
                    method: 'POST',
                    json: {
                        paths
                    }
                }, (capErr, capRes, capabilities) => {
                    if (capErr) {
                        _sendError(capabilitiesUrl, res, error);
                    } else {
                        res.json({
                            ...parsedData,
                            data: {
                                capabilities: capabilities[listingPath] || [], // Add the capabilities of the listing path to the top level of the response data.
                                secrets: Object.keys(pathsMap)
                                    .filter(key => key !== listingPath) // Exclude the listing path.
                                    .map(key => {
                                        const keySplit = key.split('/');
                                        const lastPath = keySplit[keySplit.length - 1];
                                        return {
                                            name: lastPath === '' ? `${keySplit[keySplit.length - 2]}/` : lastPath,
                                            capabilities: capabilities[key] || []
                                        };
                                    })
                            }
                        });
                    }
                });
            } catch (err) {
                _sendError(url, res, err);
            }
        });
    })
    .use((req, res) => {
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
 * Creates the initial Vault API request object.
 *
 * @private
 * @param {string} token The Vault token.
 * @param {string} apiUrl The Vault API endpoint.
 * @returns {Object}
 */
const _initApiRequest = (token, apiUrl) => {
    return {
        headers: {
            'x-vault-token': token
        },
        uri: apiUrl
    };
};

/**
 * Helper method to validate a Vault token. Important note: do *not* attempt to operate on the provided res object after this method is invoked.
 *
 * @private
 * @param {string} domain The valid Vault domain.
 * @param {string} token The token to validate.
 * @param {Object} res The HTTP response object.
 */
const _sendTokenValidationResponse = (domain, token, res) => {
    const apiUrl = `${domain}/v1/auth/token/lookup-self`;
    request(_initApiRequest(token, apiUrl), (error, response, body) => {
        if (error) {
            _sendError(apiUrl, res, error);
            return;
        }
        try {
            res.status(response.statusCode).json(JSON.parse(body));
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
