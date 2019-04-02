/* eslint-disable no-console */
/**
 * Just a collection of service utility methods.
 */

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
 * @param {string|Object} error The error.
 */
const sendError = (url, res, error) => {
    console.warn(`Error in retrieving url "${url}": `, error);
    res.status(400).json({
        errors: [typeof error === 'string' ? error : error.toString()]
    });
};

/**
 * Sets session data onto the request.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} sessionUserData The session user data to set.
 */
const setSessionData = (req, sessionUserData) => {
    req.session.user = {
        ...req.session.user,
        ...sessionUserData
    };
};

module.exports = {
    initApiRequest,
    sendError,
    setSessionData
};
