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
            DELETE_SECRETS: 'DELETE_SECRETS',
            GET_SECRETS: 'GET_SECRETS',
            LIST_MOUNTS: 'LIST_MOUNTS',
            LIST_SECRETS: 'LIST_SECRETS',
            SAVE_SECRET: 'SAVE_SECRET'
        });
    }

    /**
     * Returns secrets at the specified location
     *
     * @param {string} path Specifies the path of the secrets to delete.
     * @returns {function} Redux dispatch function.
     */
    deleteSecrets(path) {
        return this._dispatchDelete(this.ACTION_TYPES.DELETE_SECRETS, `/api/v1/${path}`);
    }

    /**
     * Returns secrets at the specified location
     *
     * @param {string} [path] Specifies the path of the secrets to get.
     * @returns {function} Redux dispatch function.
     */
    getSecrets(path = '') {
        return this._dispatchGet(this.ACTION_TYPES.GET_SECRETS, `/api/v1/${path}`);
    }

    /**
     * Lists all the mounted secrets engines.
     *
     * @returns {function} Redux dispatch function.
     */
    listMounts() {
        return this._dispatchGet(this.ACTION_TYPES.LIST_MOUNTS, '/api/v1/sys/mounts');
    }

    /**
     * Returns a list of key names at the specified location
     *
     * @param {string} [path] Specifies the path of the secrets to list.
     * @returns {function} Redux dispatch function.
     */
    listSecrets(path = '') {
        return this._dispatchGet(this.ACTION_TYPES.LIST_SECRETS, `/api/v1/${path}`, {
            list: true
        });
    }

    /**
     * Returns a list of key names at the specified location
     *
     * @param {string} path Specifies the path of the secrets to list.
     * @param {Object} secrets The secrets key value map to save.
     * @returns {function} Redux dispatch function.
     */
    saveSecret(path, secrets) {
        return this._dispatchPost(this.ACTION_TYPES.SAVE_SECRET, `/api/v1/${path}`, secrets);
    }
}

export default new KvAction();
