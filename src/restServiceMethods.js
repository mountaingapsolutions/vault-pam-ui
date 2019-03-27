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
        console.log(`Proxy the request from ${chalk.bold.yellow(chalk.bold(req.originalUrl))} to ${chalk.bold.yellow(chalk.bold(uri))}.`);
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
        console.log(`Validating ${chalk.bold.yellow(url)}.`);
        request(url, (error, response, body) => {
            if (error) {
                console.log(`Received error from ${url}:`);
                console.error(error);
                _sendError(url, res, error);
            } else {
                try {
                    const sealStatusResponse = JSON.parse(body);
                    const responseKeys = Object.keys(sealStatusResponse);
                    // Validation approach to checking for a proper Vault server is to check that the response contains the required sealed, version, and cluster_name keys.
                    if (responseKeys.includes('sealed') && responseKeys.includes('version') && responseKeys.includes('cluster_name')) {
                        res.json(sealStatusResponse);
                    } else {
                        _sendError(url, res, sealStatusResponse);
                    }
                } catch (err) {
                    _sendError(url, res, err);
                }
            }
        });
    }
};

/**
 * All the remaining authenticated routes.
 */
const authenticatedRoutes = require('express').Router()
    .use((req, res, next) => {
        console.info('TODO - validate session.');
        next();
    })
    .get('/secrets*', (req, res) => {
        const {cookies = {}, headers, method, query, originalUrl, route, url} = req;
        res.json({
            cookies,
            headers,
            method,
            query,
            originalUrl,
            route,
            url
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
 * @param {Object} error The error.
 */
const _sendError = (url, res, error) => {
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

module.exports = {
    api,
    login,
    validate,
    authenticatedRoutes
};
