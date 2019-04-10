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
        this.DEFAULT_EMPTY_FIELD_VALUE = '';
        this.SECRET_REQUEST_ACTIVE_VIEW = {
            SECRET_REQUEST_DETAILS: 'SECRET_REQUEST_DETAILS',
            SECRET_REQUEST_ADD_SPLIT: 'SECRET_REQUEST_ADD_SPLIT'
        };
        this.REQUEST_STATUS = {
            PENDING: 'PENDING',
            APPROVED: 'APPROVED',
            LOCKED: 'LOCKED'
        };
    }
}

export default new Constants();
