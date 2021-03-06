import _Actions from 'app/core/actions/_Actions';

/**
 * Actions class responsible for handling the various /v1/sys Vault endpoints.
 */
class SystemAction extends _Actions {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     */
    constructor() {
        super('SystemAction', {
            GET_CONFIG: 'GET_CONFIG',
            GET_GROUP_DATA: 'GET_GROUP_DATA',
            GET_SELF_CAPABILITIES: 'GET_SELF_CAPABILITIES',
            GET_SEAL_STATUS: 'GET_SEAL_STATUS'
        });
    }

    /**
     * Returns the list of capabilities of a given path of the session user.
     *
     * @param {string} path The path to query.
     * @returns {function} Redux dispatch function.
     */
    checkSelfCapabilities(path) {
        return this._dispatchPost(this.ACTION_TYPES.GET_SELF_CAPABILITIES, '/api/v1/sys/capabilities-self', {
            paths: [path]
        });
    }

    /**
     * Returns the current Vault application configuration data.
     *
     * @param {string} domain - The domain to validate.
     * @returns {function} Redux dispatch function.
     */
    getConfig() {
        return this._dispatchGet(this.ACTION_TYPES.GET_CONFIG, '/config');
    }

    /**
     * Returns the current Vault status.
     *
     * @returns {function} Redux dispatch function.
     */
    getSealStatus() {
        return this._dispatchGet(this.ACTION_TYPES.GET_SEAL_STATUS, '/api/v1/sys/seal-status');
    }
}

export default new SystemAction();
