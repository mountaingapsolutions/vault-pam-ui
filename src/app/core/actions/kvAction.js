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
            REQUEST_REQUEST: 'REQUEST_REQUEST',
            GET_SECRETS: 'GET_SECRETS',
            LIST_MOUNTS: 'LIST_MOUNTS',
            LIST_SECRETS: 'LIST_SECRETS',
            LIST_SECRETS_AND_CAPABILITIES: 'LIST_SECRETS_AND_CAPABILITIES',
            LIST_REQUESTS: 'LIST_REQUESTS',
            REQUEST_SECRET: 'REQUEST_SECRET',
            SAVE_SECRET: 'SAVE_SECRET'
        });
    }

    /**
     * Deletes the secrets request of the specified location.
     *
     * @param {string} path Specifies the path of the request to delete.
     * @returns {function} Redux dispatch function.
     */
    deleteRequest(path) {
        return this._dispatchDelete(this.ACTION_TYPES.REQUEST_REQUEST, '/rest/control-group/request', {
            path
        });
    }

    /**
     * Deletes the secrets at the specified location
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
        return useApiKey ? this._dispatchGet(this.ACTION_TYPES.LIST_SECRETS, `/api/v1/${this._encodePath(path)}`, {list: true}, {'X-Vault-Token': process.env.REACT_APP_API_TOKEN}) :
            this._dispatchGet(this.ACTION_TYPES.LIST_SECRETS, `/api/v1/${this._encodePath(path)}`, {
                list: true
            });
    }

    /**
     * Returns a list of key names at the specified location with capabilities mixed in.
     *
     * @param {string} [path] Specifies the path of the secrets to list.
     * @param {number} [version] The KV engine version.
     * @returns {function} Redux dispatch function.
     */
    listSecretsAndCapabilities(path = '', version = 2) {
        return this._dispatchGet(this.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES, `/rest/secrets/${path}`, {
            version
        });
    }

    /**
     * Requests access to a secret.
     *
     * @param {string} path Specifies the path of the secrets to request.
     * @returns {function} Redux dispatch function.
     */
    requestSecret(path) {
        return this._dispatchPost(this.ACTION_TYPES.REQUEST_SECRET, '/rest/control-group/request', {
            path
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
     * Lists the current secrets requests.
     *
     * @returns {function} Redux dispatch function.
     */
    listRequests() {
        return this._dispatchGet(this.ACTION_TYPES.LIST_REQUESTS, '/rest/control-group/requests');
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
