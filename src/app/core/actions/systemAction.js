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
            GET_GROUP_DATA: 'GET_GROUP_DATA',
            GET_SELF_CAPABILITIES: 'GET_SELF_CAPABILITIES',
            GET_SEAL_STATUS: 'GET_SEAL_STATUS',
            GET_SERVER_LICENSE: 'GET_SERVER_LICENSE'
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
     * Returns the current Vault status.
     *
     * @returns {function} Redux dispatch function.
     */
    getSealStatus() {
        return this._dispatchGet(this.ACTION_TYPES.GET_SEAL_STATUS, '/api/v1/sys/seal-status');
    }

    /**
     * Returns the current Vault server license.
     *
     * @returns {function} Redux dispatch function.
     */
    getServerLicense() {
        return this._dispatchGet(this.ACTION_TYPES.GET_SERVER_LICENSE, '/api/v1/sys/license', null, {'X-Vault-Token': process.env.REACT_APP_API_TOKEN});
    }

    /**
     * Returns the group data.
     *
     * @param {string} groupName The group name.
     * @returns {function} Redux dispatch function.
     */
    getGroupData(groupName = 'pam-approver') {
        return this._dispatchGet(this.ACTION_TYPES.GET_GROUP_DATA, `/api/v1/identity/group/name/${groupName}`, null, {'X-Vault-Token': process.env.REACT_APP_API_TOKEN});
    }
}

export default new SystemAction();
