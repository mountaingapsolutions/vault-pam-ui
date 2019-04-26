/**
 * Creates the primary email template.
 *
 * @private
 * @param {string} body The body content.
 * @returns {string}
 */
const _createTemplate = (body) => {
    return `<table style="background: #EEE; font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif; width: 100%">
                <thead>
                    <tr>
                        <th style="background: #2196f3; height: 64px; text-align: left;">
                            <h6 style="margin: 0 0 0 20px; color: #FFF !important; font-size: 1.25em; font-family: inherit; font-weight: 500;">[Vault PAM] Secrets access request</h6>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="background: #FFF; padding: 20px;">
                            ${body}
                        </td>
                    </tr>
                </tbody>
            </table>`;
};

/**
 * Returns the secrets request template.
 *
 * @param {Object} emailData The email data map.
 * @returns {Object}
 */
const secretsRequestTemplate = (emailData) => {
    const {url, from, to, secretsPath} = emailData;
    return {
        from,
        to,
        subject: `[Vault PAM] Secrets access request - ${secretsPath}`,
        html: _createTemplate(`<p style="color: #000;">
                                   <b>${from}</b> is requesting access to <b>${secretsPath}</b>.
                               </p>
                               <p style="color: #000;">
                                   To view this request, go to <a href="${url}">${url}</a>. 
                               </p>`)
    };
};

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
    secretsRequestTemplate,
    getUpdateRequestStatusEmailContent,
    'create-request': secretsRequestTemplate
};

