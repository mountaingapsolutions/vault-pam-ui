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
                hashedObject[key] = obj[key];
    });
    return hashedObject;
};

/**
 * Logging method.
 *
 * @private
 * @param {string} level - The log level.
 * @param {*} [data] - The data to log.
 * @param {Object} [req] - The Express req object.
 * @param {Object} [res] - The Express res object.
 * @param {Object} [response] the response object
 * @param {Object} [error] the error object
 * @returns {Object}
 */
const _log = (level, data, req, res, response, error) => {
    const logObject = typeof data === 'object' ? data : {
        message: data
    };

    if (req) {
        const {method, originalUrl, params, query, session} = req;
        logObject.method = method;
        logObject.path = originalUrl;
        if (params) {
            logObject.params = params;
        }
        if (query) {
            logObject.query = query;
        }
        if (session && session.user) {
            const {user} = session;
            logObject.user = _hashObject(user);
        }
    }

    if (res) {
        logObject.requestId = res.getHeaders()['x-request-id'];
    }

    if (response) {
        const {data: responseData} = response;
        if (responseData) {
            logObject.response = _hashObject(responseData);
        } else {
            logObject.response = response;
        }
    }

    if (error) {
        logObject.error = error;
    }

    logObject.level = level;

    _logger.log({
        ...logObject
    });
    return logObject;
};

/**
 * Audit logging method.
 *
 * @private
 * @param {string} level - The log level.
 * @param {Object} [req] - The Express req object.
 * @param {Object} [res] - The Express res object.
 * @param {Object} [response] the response object
 * @param {Object} [error] the error object
 * @returns {Object}
 */
const _logAudit = (level, req, res, response, error) => {
    return _log(level, response ? 'response' : error ? 'error' : 'request', req, res, response, error);
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .post('/', async (req, res) => {
        _logAudit('audit', req, res);
        res.json(_log(req.body.level || 'info', req.body, req));
    });

module.exports = {
    audit: _logAudit.bind(this, 'audit'),
    info: _log.bind(this, 'info'),
    log: _log.bind(this, 'info'),
    warn: _log.bind(this, 'warn'),
    error: _log.bind(this, 'error'),
    router
};
