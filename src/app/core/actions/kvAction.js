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
            APPROVE_REQUEST_DATA: 'APPROVE_REQUEST_DATA',
            AUTHORIZE_REQUEST: 'AUTHORIZE_REQUEST',
            CREATE_REQUEST_DATA: 'CREATE_REQUEST_DATA',
            DELETE_REQUEST: 'DELETE_REQUEST',
            DELETE_SECRETS: 'DELETE_SECRETS',
            GET_SECRETS: 'GET_SECRETS',
            LIST_MOUNTS: 'LIST_MOUNTS',
            LIST_SECRETS_AND_CAPABILITIES: 'LIST_SECRETS_AND_CAPABILITIES',
            LIST_REQUESTS: 'LIST_REQUESTS',
            REJECT_REQUEST: 'REJECT_REQUEST',
            REMOVE_REQUEST_DATA: 'REMOVE_REQUEST_DATA',
            REQUEST_SECRET: 'REQUEST_SECRET',
            SAVE_SECRET: 'SAVE_SECRET',
            UNWRAP_SECRET: 'UNWRAP_SECRET'
        });
    }

    /**
     * Authorizes a secrets request.
     *
     * @param {string} accessor The request accessor value.
     * @param {string} id The request id in database.
     * @returns {function} Redux dispatch function.
     */
    authorizeRequest(accessor, id) {
        return this._dispatchPost(this.ACTION_TYPES.AUTHORIZE_REQUEST, '/rest/requests/request/authorize', {
            accessor,
            id
        });
    }

    /**
     * Deletes the secrets request of the specified location.
     *
     * @param {string} path Specifies the path of the request to delete.
     * @param {string} [entityId] The user entity id. If not provided, the request will default to the current session user.
     * @param {string} [id] The request id in database.
     * @returns {function} Redux dispatch function.
     */
    deleteRequest(path, entityId = '', id) {
        return this._dispatchDelete(this.ACTION_TYPES.DELETE_REQUEST, '/rest/requests/request', {
            path,
            ...entityId && {entityId},
            ...id && {id}
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
        return this._dispatchGet(this.ACTION_TYPES.GET_SECRETS, `/rest/secrets/get/${this._encodePath(path)}`);
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
     * Returns a list of key names at the specified location with capabilities mixed in.
     *
     * @param {string} [path] Specifies the path of the secrets to list.
     * @param {number} [version] The KV engine version.
     * @returns {function} Redux dispatch function.
     */
    listSecretsAndCapabilities(path = '', version = 2) {
        return this._dispatchGet(this.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES, `/rest/secrets/list/${path}`, {
            version
        });
    }

    /**
     * Requests access to a secret.
     *
     * @param {Object} requestData Specifies the path of the secrets to request
     * @returns {function} Redux dispatch function.
     */
    requestSecret(requestData) {
        return this._dispatchPost(this.ACTION_TYPES.REQUEST_SECRET, '/rest/requests/request', {
            ...requestData
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
        return this._dispatchGet(this.ACTION_TYPES.LIST_REQUESTS, '/rest/requests/list');
    }

    /**
     * Removes the request data in the client data model.
     *
     * @param {string} accessor The accessor data to remove.
     * @returns {function} Redux dispatch function.
     */
    removeRequestData(accessor) {
        return this._createResourceData(this.ACTION_TYPES.REMOVE_REQUEST_DATA, undefined, accessor, false);
    }

    /**
     * Approve/update the request in the client data model.
     *
     * @param {Object} data The request data to update.
     * @returns {function} Redux dispatch function.
     */
    approveRequestData(data) {
        return this._createResourceData(this.ACTION_TYPES.APPROVE_REQUEST_DATA, undefined, data, false);
    }

    /**
     * Create/update the request in the client data model.
     *
     * @param {Object} data The request data to update.
     * @returns {function} Redux dispatch function.
     */
    createRequestData(data) {
        return this._createResourceData(this.ACTION_TYPES.CREATE_REQUEST_DATA, undefined, data, false);
    }

    /**
     * Unwraps a wrapped secret.
     *
     * @param {string} name The secret name.
     * @param {string} token The token to unwrap.
     * @returns {function} Redux dispatch function.
     */
    unwrapSecret(name, token) {
        return this._dispatchPost(this.ACTION_TYPES.UNWRAP_SECRET, '/rest/control-group/request/unwrap', {
            token
        });
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
