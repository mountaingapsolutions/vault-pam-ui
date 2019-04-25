const {createLogger, format, transports} = require('winston');

/**
 * Main Logging method.
 */
const _logger = createLogger({
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({stack: true}),
        format.splat(),
        format.json()
    ),
    transports: [
        new transports.File({filename: 'logs/error.log', level: 'error'}),
        new transports.File({filename: 'logs/info.log', level: 'info'}),
        new transports.File({filename: 'logs/combined.log'})
    ],
    exitOnError: false
});

/**
 * Logging method.
 *
 * @private
 * @param {string} level - The log level.
 * @param {*} data - The data to log.
 * @param {Object} [req] - The Express req object.
 * @returns {Object}
 */
const _log = (level, data, req) => {
    const logObject = typeof data === 'object' ? data : {
        message: data
    };

    if (req && req.session) {
        logObject.user = req.session.user;
    }
    logObject.level = level;

    _logger.log({
        ...logObject
    });
    return null;
};

if (process.env.NODE_ENV !== 'production') {
    _logger.add(new transports.Console({
        format: format.combine(
            format.colorize(),
            format.simple()
        )
    }));
}

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .post('/', async (req, res) => {
        return _log(req.body.level || 'log', req.body, req, res);
    });

module.exports = {
    info: _log.bind(this, 'info'),
    log: _log.bind(this, 'log'),
    warn: _log.bind(this, 'warn'),
    error: _log.bind(this, 'error'),
    router
};
