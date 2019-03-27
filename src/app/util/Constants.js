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
        this.GRID_WIDTH = 12;
        this.SECRET_REQUEST_ACTIVE_VIEW = {
            SECRET_REQUEST_DETAILS: 'SECRET_REQUEST_DETAILS',
            SECRET_REQUEST_ADD_SPLIT: 'SECRET_REQUEST_ADD_SPLIT'
        };
    }
}

export default new Constants();
