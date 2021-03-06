/**
 * Enum of various constants.
 */
class Constants {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     */
    constructor() {
        this.APP_TITLE = 'Vault PAM UI';
        this.REQUEST_STATUS = {
            CANCELED: 'CANCELED',
            PENDING: 'PENDING',
            APPROVED: 'APPROVED',
            LOCKED: 'LOCKED'
        };
        this.NOTIFICATION_EVENTS = {
            REQUEST: {
                APPROVE: 'approve-request',
                CANCEL: 'cancel-request',
                CREATE: 'create-request',
                READ_APPROVED: 'read-approved-request',
                REJECT: 'reject-request',
            }
        };
        this.REQUEST_TYPES = {
            CONTROL_GROUP: 'control-group',
            DYNAMIC_REQUEST: 'dynamic-request',
            STANDARD_REQUEST: 'standard-request'
        };
        this.DYNAMIC_ENGINES = [
            'aws',
            'azure'
        ];
        this.AUTH_METHODS = [
            {label: 'Token', type: 'token'},
            {label: 'Userpass', type: 'userpass'},
            {label: 'LDAP', type: 'ldap'},
            {label: 'GitHub', type: 'github'},
            {label: 'Okta', type: 'okta'}
        ];
    }
}

export default new Constants();
