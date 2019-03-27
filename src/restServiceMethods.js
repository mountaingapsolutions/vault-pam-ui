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
        const uri = `${domain.endsWith('/') ? domain.slice(0, -1) : domain}${req.url}`;
        console.log(`Proxy the request from ${_yellowBold(req.originalUrl)} to ${_yellowBold(uri)}.`);
        req.pipe(request({
            headers: {
                'x-vault-token': token
            },
            uri
        }, (err) => {
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
    res.send('Working on it...');
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
            } else {
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
            console.info('TODO - validate session.');
            next();
        }
    })
    .get('/secrets/*', (req, res) => {
        const {'x-vault-domain': domain, 'x-vault-token': token} = req.headers;
        const {params = {}, query, url} = req;
        const urlParts = (params[0] || '').split('/').filter(path => !!path);
        const listUrlParts = [...urlParts];
        const isV2 = String(query.version) === '2';
        if (isV2) {
            listUrlParts.splice(1, 0, 'metadata');
        }
        const apiDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
        const apiUrl = `${apiDomain}/v1/${listUrlParts.join('/')}?list=true`;
        console.log(`Listing secrets from ${_yellowBold(apiUrl)}.`);
        request({
            headers: {
                'x-vault-token': token
            },
            uri: apiUrl
        }, (error, response, body) => {
            if (error) {
                _sendError(url, res, error);
            } else {
                try {
                    const parsedData = JSON.parse(body);
                    const getUrlParts = [...urlParts];
                    if (isV2) {
                        getUrlParts.splice(1, 0, 'data');
                    }
                    const getUrl = getUrlParts.join('/');
                    const paths = parsedData.data.keys.map(key => `${getUrl}/${key}`);
                    if (paths.length > 0) {
                        const capabilitiesUrl = `${apiDomain}/v1/sys/capabilities-self`;
                        console.log(`Checking capabilities with paths ${_yellowBold(JSON.stringify(paths))}.`);
                        request({
                            headers: {
                                'x-vault-token': token
                            },
                            method: 'POST',
                            url: capabilitiesUrl,
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
                                        secrets: parsedData.data.keys.map(key => {
                                            return {
                                                name: key,
                                                capabilities: capabilities[Object.keys(capabilities).find(capabilityKey => capabilityKey.endsWith(key))] || []
                                            };
                                        })
                                    }
                                });
                            }
                        });
                    } else {
                        res.json(parsedData);
                    }
                } catch (err) {
                    _sendError(url, res, err);
                }
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
