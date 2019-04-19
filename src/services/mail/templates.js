
/**
 * Get request email contents.
 *
 * @param {Object} emailData The email data.
 * @returns {Object}
 */
const getRequestEmailContent = (emailData) => {
    const {requester, customSubject, domain, requestData} = emailData;
    const {id: requesterEntityId} = requester;
    const {email, firstName, lastName} = requester.metadata;
    const subject = customSubject || 'Request Access';
    const body = `<html>
        <body>
            <p>Requesting access to: ${requestData}</p>
            <p>Domain: ${domain}</p>
            <p>Requester</p>
            <p>Entity ID: ${requesterEntityId}</p>
            <p>Name: ${firstName} ${lastName}</p>
            <p>Email: ${email}</p>
        </body>
    </html>`;
    const content = {
        subject: subject,
        body: body
    };
    return content;
};

/**
 * Get approval email contents.
 *
 * @param {Object} emailData The email data.
 * @returns {Object}
 */
const getApprovalEmailContent = (emailData) => {
    const {approver, requester, customSubject, domain, requestData, status} = emailData;
    const {id: requesterEntityId} = requester;
    const {email, firstName, lastName} = requester.metadata;
    const subject = customSubject || 'Request Access Approval Status';
    const body = `<html>
        <body>
            <p>Requesting access to: ${requestData}</p>
            <p>Domain: ${domain}</p>
            <p>Requester</p>
            <p>Entity ID: ${requesterEntityId}</p>
            <p>Name: ${firstName} ${lastName}</p>
            <p>Email: ${email}</p>
            <br/>
            <p>Status: ${status}</p>
            <p>Updated By: ${approver}</p>
        </body>
    </html>`;
    const content = {
        subject: subject,
        body: body
    };
    return content;
};

module.exports = {
    getApprovalEmailContent,
    getRequestEmailContent
};
