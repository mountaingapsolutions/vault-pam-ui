/* eslint-disable no-console */
const chalk = require('chalk');
const nodemailer = require('nodemailer');
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

/**
 * Sends email.
 *
 * @param {Array} recipients The email recipients.
 * @param {string} subject The email subject.
 * @param {string} message The email message.
 */
const sendEmail = (recipients, subject, message) => {
    const {PAM_MAIL_SMTP_PORT, PAM_MAIL_SMTP_HOST, PAM_MAIL_SERVICE, PAM_MAIL_USER, PAM_MAIL_PASS} = process.env;
    const smtpTransport = nodemailer.createTransport({
        service: PAM_MAIL_SERVICE,
        port: PAM_MAIL_SMTP_PORT,
        host: PAM_MAIL_SMTP_HOST,
        secure: true,
        auth: {
            user: PAM_MAIL_USER,
            pass: PAM_MAIL_PASS,
        },
        debug: true
    });
    const mailOptions = {
        to: recipients,
        subject: subject,
        html: message
    };
    smtpTransport.sendMail(mailOptions).then((info) => {
        console.log('Email sent.', info);
    }).catch((err) => {
        console.error(err);
    });
};

module.exports = {
    initApiRequest,
    sendEmail,
    sendError,
    setSessionData
};
