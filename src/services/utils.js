const chalk = require('chalk');
const session = require('express-session');
const request = require('request');
const {filter} = require('@mountaingapsolutions/objectutil');
const logger = require('services/logger');

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
    EMAIL: 'email',
    ENTITY_ID: 'entityId',
    FIRST_NAME: 'firstName',
    GROUPS: 'groups',
    LAST_NAME: 'lastName',
    TOKEN: 'token',
    USERNAME: 'username'
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
        logger.log(chalk.bold.green('Premium features available.'));
        validate().then((results) => {
            app.locals.features = results ? {
                ...features,
                ...results
            } : features;
        });
    } catch (err) {
        logger.log(chalk.bold.red('Premium features unavailable.'));
        app.locals.features = features;
    }
};

/**
 * Creates the initial Vault API request object.
 *
 * @param {string} token the user's Vault token.
 * @param {string} apiUrl The Vault API URL
 * @param {string} [entityId] the user's entity id
 * @param {boolean} [useApiToken] whether to use the api token
 * @returns {Object}
 */
const initApiRequest = (token, apiUrl, entityId, useApiToken = false) => {
    const {VAULT_API_TOKEN: apiToken} = process.env;
    return {
        headers: {
            ...entityId && {'x-entity-id': entityId},
            'x-user-token': token,
            'x-vault-token': useApiToken ? apiToken : token,
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
 * Sends a JSON response and logs the response.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 * @param {Object} response The response object.
 * @param {number} [statusCode] The HTTP status code.
 */
const sendJsonResponse = (req, res, response, statusCode) => {
    logger.audit(res.getHeaders()['x-request-id'], req, response);
    statusCode ? res.status(statusCode).json(response) : res.json(response);
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
            logger.warn(`Ignored property ${chalk.bold.yellow(key)}. If this property is intended to be stored, update utils.SESSION_USER_DATA_MAP.`);
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
    logger.log(`Validating ${chalk.bold.yellow(url)}.`);
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
    initApiRequest,
    getDomain,
    getSessionMiddleware,
    sendJsonResponse,
    setSessionData,
    validateDomain
};
