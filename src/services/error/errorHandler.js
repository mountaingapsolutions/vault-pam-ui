const logger = require('services/logger');

/**
 * Sends the standard error response.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} res The HTTP response object.
 * @param {string|Object|Array} error The error.
 * @param {string} [url] The requested Vault server url.
 * @param {number} [statusCode] The HTTP status code.
 */
const sendError = (req, res, error, url, statusCode = 400) => {
    logger.audit(res.getHeaders()['x-request-id'], req, null, error);
    logger.warn(`Error in retrieving url "${url || req.originalUrl}": `, error);
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

module.exports = {
    sendError
};
