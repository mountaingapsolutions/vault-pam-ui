/* eslint-disable no-console */
const chalk = require('chalk');

/**
 * Just a collection of service utility methods.
 */

/**
 * Validation map of what is allowed to be stored in a session user. If new data needs to be added, add the key to this map.
 *
 * @type {Object}
 */
const SESSION_USER_DATA_MAP = {
    CONTROL_GROUP_PATHS: 'controlGroupPaths',
    DOMAIN: 'domain',
    ENTITY_ID: 'entityId',
    TOKEN: 'token'
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
    const filteredSessionUserData = Object.keys(sessionUserData).filter(key => {
        const isValid = validValues.includes(key);
        if (!isValid) {
            console.warn(`Ignored property ${chalk.bold.yellow(key)}. If this property is intended to be stored, update utils.SESSION_USER_DATA_MAP.`);
        }
        return isValid;
    }).reduce((dataMap, key) => {
        dataMap[key] = sessionUserData[key];
        return dataMap;
    }, {});

    req.session.user = {
        ...req.session.user,
        ...filteredSessionUserData
    };
};

module.exports = {
    initApiRequest,
    sendError,
    setSessionData
};
