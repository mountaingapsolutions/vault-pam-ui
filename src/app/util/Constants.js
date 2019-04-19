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
        this.SECRET_REQUEST_ACTIVE_VIEW = {
            SECRET_REQUEST_DETAILS: 'SECRET_REQUEST_DETAILS',
            SECRET_REQUEST_ADD_SPLIT: 'SECRET_REQUEST_ADD_SPLIT'
        };
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
    }
}

export default new Constants();
