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
            'aws'
        ];
    }
}

export default new Constants();
