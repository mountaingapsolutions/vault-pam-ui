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
            GET_VAULT_SEAL_STATUS: 'GET_VAULT_SEAL_STATUS'
        });
    }

    /**
     * Validates Vault status.
     *
     * @returns {function} Redux dispatch function.
     */
    getVaultSealStatus() {
        return this._dispatchGet(this.ACTION_TYPES.GET_VAULT_SEAL_STATUS, '/api/v1/sys/seal-status');
    }

}

export default new SystemAction();
