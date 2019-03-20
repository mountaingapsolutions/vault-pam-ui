import _Actions from 'app/core/actions/_Actions';

/**
 * Actions class responsible for kv secrets engine related actions.
 */
class KvAction extends _Actions {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     */
    constructor() {
        super('KvAction', {
            LIST_MOUNTS: 'LIST_MOUNTS',
            LIST_SECRETS: 'LIST_SECRETS'
        });
    }

    /**
     * Lists all the mounted secrets engines.
     *
     * @returns {function} Redux dispatch function.
     */
    listMounts() {
        return this._dispatchGet(this.ACTION_TYPES.LIST_MOUNTS, '/api/v1/sys/internal/ui/mounts');
    }

    /**
     * Returns a list of key names at the specified location
     *
     * @param {string} [path] Specifies the path of the secrets to list
     * @returns {function} Redux dispatch function.
     */
    listSecrets(path = '') {
        return this._dispatchGet(this.ACTION_TYPES.LIST_SECRETS, `/api/v1/${path}`, {
            list: true
        });
    }
}

export default new KvAction();
