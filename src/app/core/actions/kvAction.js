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
        return this._dispatchDelete(this.ACTION_TYPES.DELETE_SECRETS, `/api/v1/${this._encodePath(path)}`);
    }

    /**
     * Returns secrets at the specified location
     *
     * @param {string} [path] Specifies the path of the secrets to get.
     * @returns {function} Redux dispatch function.
     */
    getSecrets(path = '') {
        return this._dispatchGet(this.ACTION_TYPES.GET_SECRETS, `/api/v1/${this._encodePath(path)}`);
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
     * @param {boolean} [useApiKey] specifies if API key is used
     * @returns {function} Redux dispatch function.
     */
    listSecrets(path = '', useApiKey = false) {
        return useApiKey ? this._dispatchGet(this.ACTION_TYPES.LIST_SECRETS, `/api/v1/${this._encodePath(path)}`, {
            list: true
        }, {'X-Vault-Token': process.env.REACT_APP_API_TOKEN}) :
            this._dispatchGet(this.ACTION_TYPES.LIST_SECRETS, `/api/v1/${this._encodePath(path)}`, {
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
        return this._dispatchPost(this.ACTION_TYPES.SAVE_SECRET, `/api/v1/${this._encodePath(path)}`, secrets);
    }

    /**
     * Encodes the path, excluding forward slash.
     *
     * @private
     * @param {string} path The path to encode.
     * @returns {string}
     */
    _encodePath(path) {
        return path.split('/').map(p => encodeURIComponent(p)).join('/');
    }
}

export default new KvAction();
