const {createLogger, format, transports} = require('winston');
const {LOG_LEVELS} = require('services/constants');
const cryptoJs = require('crypto-js');

/**
 * Main Logging method.
 */
const _logger = createLogger({
    level: process.env.NODE_ENV === 'production' ? 'audit' : 'info',
    levels: LOG_LEVELS,
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({stack: true}),
        format.splat(),
        format.json()
    ),
    transports: [
        process.env.NODE_ENV === 'production' ?
            new transports.Console() :
            new transports.Console({
                format: format.combine(
                    format.simple()
                )
            })
    ],
    exitOnError: false
});

/**
 * Method to hash an object's properties using HMAC-SHA256
 *
 * @private
 * @param {Object} obj object to be hashed
 * @returns {Object}
 */
const _hashObject = (obj) => {
    const {VAULT_API_TOKEN: apiToken} = process.env;
    const hashedObject = {};
    Object.keys(obj).forEach(key => {
        const objProp = obj[key];
        typeof objProp === 'string' ?
            // eslint-disable-next-line new-cap
            hashedObject[key] = cryptoJs.HmacSHA256(obj[key], apiToken).toString(cryptoJs.enc.Hex) :
            Array.isArray(objProp) ? hashedObject[key] = objProp.map((prop) => {
                // eslint-disable-next-line new-cap
                return typeof prop === 'string' ? cryptoJs.HmacSHA256(obj[key], apiToken).toString(cryptoJs.enc.Hex) : prop;
            }) :
                objProp !== null && typeof objProp === 'object' && objProp.constructor === Object && Object.entries(objProp).length > 0 ?
                    hashedObject[key] = _hashObject(objProp)
                    : hashedObject[key] = obj[key];
    });
    return hashedObject;
};

/**
 * Logging method.
 *
 * @private
 * @param {string} level - The log level.
 * @param {*} data - The data to log.
 * @returns {Object}
 */
const _log = (level, data) => {
    const logObject = typeof data === 'object' ? data : {
        message: data
    };

    _logger.log({
        ...logObject,
        level
    });
    return logObject;
};

/**
 * Audit logging method.
 *
 * @private
 * @param {string} requestId - The request id
 * @param {Object} [req] - The Express req object.
 * @param {Object} [response] the response object
 * @param {Object} [error] the error object
 * @returns {Object}
 */
const _logAudit = (requestId, req, response, error) => {
    const logObject = {
        message: response ? 'response' : error ? 'error' : 'request',
        requestId
    };

    if (req) {
        const {method, originalUrl, params, query, session} = req;
        logObject.method = method;
        logObject.path = originalUrl;
        if (params && Object.entries(params).length > 0) {
            logObject.params = params;
        }
        if (query && Object.entries(query).length > 0) {
            logObject.query = query;
        }
        if (session && session.user) {
            const {user} = session;
            logObject.user = _hashObject(user);
        }
    }

    if (response) {
        const {data: responseData, body} = response;
        logObject.response = responseData ? _hashObject(responseData) :
            body ? _hashObject(body) :
                response;
    }

    if (error) {
        logObject.error = error;
    }

    _logger.log({
        ...logObject,
        level: 'audit'
    });
    return logObject;
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .post('/', async (req, res) => {
        _logAudit(req, res);
        res.json(_log(req.body.level || 'info', req.body));
    });

module.exports = {
    audit: _logAudit.bind(this),
    info: _log.bind(this, 'info'),
    log: _log.bind(this, 'info'),
    warn: _log.bind(this, 'warn'),
    error: _log.bind(this, 'error'),
    router
};
