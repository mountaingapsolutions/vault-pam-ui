
/**
 * Get request email contents.
 *
 * @param {Object} emailData The email data.
 * @returns {Object}
 */
const getRequestEmailContent = (emailData) => {
    const {requesterEntityId, customSubject, domain, requestData} = emailData;
    const subject = customSubject || `Request Access - ${requesterEntityId}`;
    const body = `<html>
        <body>
            <p>Requesting access to: ${requestData}</p>
            <p>Domain: ${domain}</p>
            <p>Requester Entity ID: ${requesterEntityId}</p>
        </body>
    </html>`;
    const content = {
        subject: subject,
        body: body
    };
    return content;
};

module.exports = {
    getRequestEmailContent
};
