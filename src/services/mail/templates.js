
/**
 * Get approval email contents.
 *
 * @param {Object} emailData The email data.
 * @returns {Object}
 */
const getUpdateRequestStatusEmailContent = emailData => {
    const {approver, requester, customSubject, domain, secret, status} = emailData;
    const {id: requesterEntityId} = requester;
    const {email, firstName, lastName} = requester.metadata;
    const subject = customSubject || 'Request Access';
    const body = `<html>
        <body>
            <p><strong>${status}</strong> access to: <strong><i>${secret}</i></strong></p>
             <table>
              <tr>
                <td><strong>Domain:</strong></td>
                <td>${domain}</td>
              </tr>
              <tr>
                <td><strong>Entity ID:</strong></td>
                <td>${requesterEntityId}</td>
              </tr>
              <tr>
                <td><strong>Name:</strong></td>
                <td>${firstName} ${lastName}</td>
              </tr>
              <tr>
                <td><strong>Email:</strong></td>
                <td>${email}</td>
              </tr>
              <tr>
                <td><strong>Updated By:</strong></td>
                <td>${approver}</td>
              </tr>
            </table>
        </body>
    </html>`;
    const content = {
        subject: subject,
        body: body
    };
    return content;
};

module.exports = {
    getUpdateRequestStatusEmailContent
};

