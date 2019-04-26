/* eslint-disable no-console */
const chalk = require('chalk');
const session = require('express-session');
const request = require('request');
const {filter} = require('@mountaingapsolutions/objectutil');

/**
 * Just a collection of service utility methods.
 */

const getSessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'correct horse battery staple',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 600000
    }
});

/**
 * Validation map of what is allowed to be stored in a session user. If new data needs to be added, add the key to this map.
 *
 * @type {Object}
 */
const SESSION_USER_DATA_MAP = {
    CONTROL_GROUP_PATHS: 'controlGroupPaths',
    ENTITY_ID: 'entityId',
    GROUPS: 'groups',
    STANDARD_REQUEST_SUPPORTED: 'standardRequestSupported',
    TOKEN: 'token'
};

/**
 * Wraps a request in a Promise for async/await support.
 *
 * @param {Object} options The request options.
 * @returns {Promise}
 */
const asyncRequest = (options) => {
    return new Promise((resolve, reject) => {
        request(options, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

/**
 * Checks for premium features and injects it app.local to be used throughout the application lifecycle.
 *
 * @param {Object} app The top-level Express application.
 */
const checkPremiumFeatures = (app) => {
    const features = app.locals.features ? {
        ...app.locals.features
    } : {};
    try {
        const {validate} = require('vault-pam-premium');
        console.log(chalk.bold.green('Premium features available.'));
        validate().then((results) => {
            app.locals.features = results ? {
                ...features,
                ...results
            } : features;
        });
    } catch (err) {
        console.log(chalk.bold.red('Premium features unavailable.'));
        app.locals.features = features;
    }
};

/**
 * Check if standard requests are supported
 *
 * @returns {Promise}
 */
const checkStandardRequestSupport = async () => {
    const {VAULT_API_TOKEN: apiToken} = process.env;
    const groupName = 'pam-approver';
    return await new Promise((resolve, reject) => {
        request({
            ...initApiRequest(apiToken, `${getDomain()}/v1/identity/group/name/${groupName}`),
            method: 'GET',
        }, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                const {data} = body;
                resolve(!!data);
            }
        });
    });
};

/**
 * Creates the initial Vault API request object.
 *
 * @param {string} token The Vault token.
 * @param {string} apiUrl The Vault API endpoint.
 * @returns {Object}
 */
const initApiRequest = (token, apiUrl) => {
    return {
        headers: {
            'x-vault-token': token
        },
        uri: apiUrl,
        json: true
    };
};

/**
 * Returns the Vault domain.
 *
 * @returns {string}
 */
const getDomain = () => {
    const domain = process.env.VAULT_DOMAIN;
    return domain.endsWith('/') ? domain.slice(0, -1) : domain;
};

/**
 * Sends the standard error response.
 *
 * @param {Object} url The requested Vault server url.
 * @param {Object} res The HTTP response object.
 * @param {string|Object|Array} error The error.
 * @param {number} [statusCode] The HTTP status code.
 */
const sendError = (url, res, error, statusCode = 400) => {
    console.warn(`Error in retrieving url "${url}": `, error);
    let errors = [];
    if (typeof error === 'string') {
        errors.push(error);
    } else if (Array.isArray(error)) {
        errors = errors.concat(error);
    } else {
        errors.push(error.toString());
    }
    res.status(statusCode).json({
        errors
    });
};

/**
 * Sets session data onto the request.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} sessionUserData The session user data to set.
 */
const setSessionData = (req, sessionUserData) => {
    const validValues = Object.values(SESSION_USER_DATA_MAP);

    // Filter out any invalid properties.
    const filteredSessionUserData = filter(sessionUserData, key => {
        const isValid = validValues.includes(key);
        if (!isValid) {
            console.warn(`Ignored property ${chalk.bold.yellow(key)}. If this property is intended to be stored, update utils.SESSION_USER_DATA_MAP.`);
        }
        return isValid;
    });

    req.session.user = {
        ...req.session.user,
        ...filteredSessionUserData
    };
};

/**
 * Validates the Vault domain.
 *
 * @param {string} domain The domain to validate
 * @returns {Promise}
 */
const validateDomain = async (domain) => {
    const url = `${domain.endsWith('/') ? domain.slice(0, -1) : domain}/v1/sys/seal-status`;
    console.log(`Validating ${chalk.bold.yellow(url)}.`);
    const vaultDomainResponse = await asyncRequest({
        url,
        json: true
    });
    const responseKeys = Object.keys(vaultDomainResponse.body);
    // Validation approach to checking for a proper Vault server is to check that the response contains the required sealed, version, and cluster_name keys.
    return responseKeys.includes('sealed') && responseKeys.includes('version') && responseKeys.includes('cluster_name');
};

module.exports = {
    asyncRequest,
    checkPremiumFeatures,
    checkStandardRequestSupport,
    initApiRequest,
    getDomain,
    getSessionMiddleware,
    sendError,
    setSessionData,
    validateDomain
};
