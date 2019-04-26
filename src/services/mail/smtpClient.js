const nodemailer = require('nodemailer');
const templates = require('services/mail/templates');

const {SMTP_PORT, SMTP_HOST, SMTP_SERVICE, SMTP_USER, SMTP_PASS, SMTP_SECURE, SMTP_DEBUG_MODE} = process.env;
const mailConfig = {
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    }
};
if (SMTP_SERVICE) {
    mailConfig.service = SMTP_SERVICE;
} else {
    mailConfig.host = SMTP_HOST;
    mailConfig.port = SMTP_PORT;
}
if (SMTP_SECURE) {
    mailConfig.secure = SMTP_SECURE.toLowerCase().trim() === 'true';
}
if (SMTP_DEBUG_MODE) {
    mailConfig.debug = SMTP_DEBUG_MODE.toLowerCase().trim() === 'true';
}
const _smtpTransport = nodemailer.createTransport(mailConfig);

/**
 * Sends an email from the specified template name.
 *
 * @param {string} templateName The template name.
 * @param {Object} emailData The dynamic email data to send. Refer to templates.js for required key value pairs.
 */
const sendMailFromTemplate = (templateName, emailData) => {
    const fromTemplate = templates[templateName];
    if (fromTemplate) {
        const contents = fromTemplate(emailData);
        _smtpTransport.sendMail(contents).then(console.log).catch(console.error);
    } else {
        throw new Error(`${templateName} is not a valid email template.`);
    }
};

module.exports = {
    sendMailFromTemplate
};
