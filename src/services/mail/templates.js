/**
 * Creates the primary email template.
 *
 * @private
 * @param {string} title The title content.
 * @param {string} body The body content.
 * @returns {string}
 */
const _createTemplate = (title, body) => {
    return `<table style="background: #EEE; font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif; width: 100%">
                <thead>
                    <tr>
                        <th style="background: #2196f3; height: 64px; text-align: left;">
                            <h6 style="margin: 0 0 0 20px; color: #FFF !important; font-size: 1.25em; font-family: inherit; font-weight: 500;">[Vault PAM] ${title}</h6>
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
 * Returns the sender from the provider request.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @returns {string}
 */
const _getSenderFromRequest = (req) => {
    const {email, firstName, lastName, username} = req.session.user;
    const name = firstName && lastName ? `${firstName} ${lastName}` : username;
    return `"${name}" <${email}>`;
};


/**
 * Returns the secrets request approval template.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} emailData The email data map.
 * @returns {Object}
 */
const secretsRequestApprovalTemplate = (req, emailData) => {
    const {firstName, lastName, username} = req.session.user;
    const name = firstName && lastName ? `${firstName} ${lastName}` : username;
    const {to, secretsPath} = emailData;
    const fullPath = `${req.protocol}://${req.get('host')}/${secretsPath}`;
    return {
        from: _getSenderFromRequest(req),
        to,
        subject: `[Vault PAM] Secrets access approved - ${secretsPath}`,
        html: _createTemplate('Secrets access approved',
            `<p style="color: #000;">
                 <b>${name}</b> has approved your secrets request access to <b>${secretsPath}</b>.
             </p>
             <p style="color: #000;">
                 To view this secret, go to <a href="${fullPath}">${fullPath}</a>.
             </p>`)
    };
};

/**
 * Returns the secrets request template.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} emailData The email data map.
 * @returns {Object}
 */
const secretsRequestTemplate = (req, emailData) => {
    const {firstName, lastName, username} = req.session.user;
    const name = firstName && lastName ? `${firstName} ${lastName}` : username;
    const {to, secretsPath} = emailData;
    const url = `${req.protocol}://${req.get('host')}`;
    return {
        from: _getSenderFromRequest(req),
        to,
        subject: `[Vault PAM] Secrets access request - ${secretsPath}`,
        html: _createTemplate('Secrets access request',
            `<p style="color: #000;">
                 <b>${name}</b> is requesting access to <b>${secretsPath}</b>.
             </p>
             <p style="color: #000;">
                 To view this request, go to <a href="${url}">${url}</a>.
             </p>`)
    };
};

/**
 * Returns the secrets request cancellation template.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} emailData The email data map.
 * @returns {Object}
 */
const secretsRequestCancellationTemplate = (req, emailData) => {
    const {firstName, lastName, username} = req.session.user;
    const name = firstName && lastName ? `${firstName} ${lastName}` : username;
    const {to, secretsPath} = emailData;
    return {
        from: _getSenderFromRequest(req),
        to,
        subject: `[Vault PAM] Secrets access request cancellation - ${secretsPath}`,
        html: _createTemplate('Secrets access request cancellation',
            `<p style="color: #000;">
                 <b>${name}</b> has cancelled their secrets request access to <b>${secretsPath}</b>.
             </p>`)
    };
};

/**
 * Returns the secrets request rejection template.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} emailData The email data map.
 * @returns {Object}
 */
const secretsRequestRejectionTemplate = (req, emailData) => {
    const {firstName, lastName, username} = req.session.user;
    const name = firstName && lastName ? `${firstName} ${lastName}` : username;
    const {to, secretsPath} = emailData;
    return {
        from: _getSenderFromRequest(req),
        to,
        subject: `[Vault PAM] Secrets access request rejection - ${secretsPath}`,
        html: _createTemplate('Secrets access request rejection',
            `<p style="color: #000;">
                 <b>${name}</b> has rejected your secrets request access to <b>${secretsPath}</b>.
             </p>`)
    };
};

/**
 * Returns the secrets deleted template.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} emailData The email data map.
 * @returns {Object}
 */
const secretsDeletedTemplate = (req, emailData) => {
    const {firstName, lastName, username} = req.session.user;
    const name = firstName && lastName ? `${firstName} ${lastName}` : username;
    const {to, secretsPath} = emailData;
    return {
        from: _getSenderFromRequest(req),
        to,
        subject: `[Vault PAM] Secrets access removed - ${secretsPath}`,
        html: _createTemplate('Secrets access removed',
            `<p style="color: #000;">
                 <b>${name}</b> has deleted <b>${secretsPath}</b>.
             </p>`)
    };
};

/**
 * Returns the secrets updated template.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} emailData The email data map.
 * @returns {Object}
 */
const secretsUpdatedTemplate = (req, emailData) => {
    const {firstName, lastName, username} = req.session.user;
    const name = firstName && lastName ? `${firstName} ${lastName}` : username;
    const {to, secretsPath} = emailData;
    return {
        from: _getSenderFromRequest(req),
        to,
        subject: `[Vault PAM] Secrets access removed - ${secretsPath}`,
        html: _createTemplate('Secrets access removed',
            `<p style="color: #000;">
                 <b>${name}</b> has updated <b>${secretsPath}</b>.
                 You are receiving this email, because you have a pending or approved request to <b>${secretsPath}</b>.
                 Initiate a new request to obtain access again.
             </p>`)
    };
};

module.exports = {
    'approve-request': secretsRequestApprovalTemplate,
    'cancel-request': secretsRequestCancellationTemplate,
    'create-request': secretsRequestTemplate,
    'reject-request': secretsRequestRejectionTemplate,
    'secrets-deleted': secretsDeletedTemplate,
    'secrets-updated': secretsUpdatedTemplate
};

