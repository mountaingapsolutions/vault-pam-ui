import _Actions from 'app/core/actions/_Actions';
import Constants from 'app/util/Constants';

/**
 * Actions class responsible for kv secrets engine related actions.
 */
class SecretAction extends _Actions {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     */
    constructor() {
        super('SecretAction', {
            APPROVE_REQUEST_DATA: 'APPROVE_REQUEST_DATA',
            AUTHORIZE_REQUEST: 'AUTHORIZE_REQUEST',
            CREATE_REQUEST_DATA: 'CREATE_REQUEST_DATA',
            DELETE_REQUEST: 'DELETE_REQUEST',
            DELETE_SECRETS: 'DELETE_SECRETS',
            GET_SECRETS: 'GET_SECRETS',
            LIST_LEASE: 'LIST_LEASE',
            LIST_MOUNTS: 'LIST_MOUNTS',
            LIST_SECRETS_AND_CAPABILITIES: 'LIST_SECRETS_AND_CAPABILITIES',
            LIST_REQUESTS: 'LIST_REQUESTS',
            OPEN_APPROVED_SECRET: 'OPEN_APPROVED_SECRET',
            REJECT_REQUEST: 'REJECT_REQUEST',
            REMOVE_REQUEST_DATA: 'REMOVE_REQUEST_DATA',
            REQUEST_SECRET: 'REQUEST_SECRET',
            REVOKE_LEASE: 'REVOKE_LEASE',
            SAVE_SECRET: 'SAVE_SECRET',
            UNWRAP_SECRET: 'UNWRAP_SECRET'
        });
    }

    /**
     * Authorizes a secrets request.
     *
     * @param {string} accessor The request accessor value.
     * @param {string} path Specifies the path of the request to authorize.
     * @param {string} entityId The user entity id.
     * @param {string} [type] The request type.
     * @returns {function} Redux dispatch function.
     */
    authorizeRequest(accessor, path, entityId, type = Constants.REQUEST_TYPES.STANDARD_REQUEST) {
        return this._dispatchPost(this.ACTION_TYPES.AUTHORIZE_REQUEST, '/rest/secret/request/authorize', {
            accessor,
            path,
            entityId,
            type
        });
    }

    /**
     * Deletes the secrets request of the specified location.
     *
     * @param {string} path Specifies the path of the request to delete.
     * @param {string} [entityId] The user entity id. If not provided, the request will default to the current session user.
     * @param {string} [type] The request type.
     * @returns {function} Redux dispatch function.
     */
    deleteRequest(path, entityId = '', type = Constants.REQUEST_TYPES.STANDARD_REQUEST) {
        return this._dispatchDelete(this.ACTION_TYPES.DELETE_REQUEST, '/rest/secret/request', {
            path,
            entityId,
            type
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
     * Sets secrets data within the client data model.
     *
     * @param {Object} data The secrets data to set.
     * @returns {function} Redux dispatch function.
     */
    setSecretsData(data) {
        return this._createResourceData(this.ACTION_TYPES.GET_SECRETS, undefined, data, false);
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
     * @param {string} [type] The engine type.
     * @returns {function} Redux dispatch function.
     */
    listSecretsAndCapabilities(path = '', version = 2, type = '') {
        return this._dispatchGet(this.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES, `/rest/secrets/list/${path}`, {
            version,
            type
        });
    }

    /**
     * Lists all the active lease per role.
     *
     * @param {string} [mount] The engine mount.
     * @param {string} [role] The engine type.
     * @returns {function} Redux dispatch function.
     */
    getLeaseList(mount, role) {
        return this._dispatchGet(this.ACTION_TYPES.LIST_LEASE, '/rest/dynamic/lease', {
            mount,
            role
        });
    }

    /**
     * Revokes a lease.
     *
     * @param {string} [lease_id] The Lease id.
     * @param {number} [requestId] The request id in database.
     * @returns {function} Redux dispatch function.
     */
    revokeLease(lease_id, requestId) {
        return this._dispatchPut(this.ACTION_TYPES.REVOKE_LEASE, '/rest/dynamic/revoke', {lease_id, requestId});
    }

    /**
     * Requests access to a secret.
     *
     * @param {Object} requestData Specifies the path of the secrets to request
     * @returns {function} Redux dispatch function.
     */
    requestSecret(requestData) {
        return this._dispatchPost(this.ACTION_TYPES.REQUEST_SECRET, '/rest/secret/request', {
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
     * Lists the user's secrets requests and requests to review if user is an approver.
     *
     * @returns {function} Redux dispatch function.
     */
    listRequests() {
        return this._dispatchGet(this.ACTION_TYPES.LIST_REQUESTS, '/rest/secret/requests/all');
    }

    /**
     * Removes the request data in the client data model.
     *
     * @param {string} requestPath The request path to remove.
     * @returns {function} Redux dispatch function.
     */
    removeRequestData(requestPath) {
        return this._createResourceData(this.ACTION_TYPES.REMOVE_REQUEST_DATA, undefined, requestPath, false);
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
     * Opens an approved secret.
     *
     * @param {string} path Specifies the path of the secrets to get.
     * @returns {function} Redux dispatch function.
     */
    openApprovedSecret(path) {
        return this._dispatchGet(this.ACTION_TYPES.GET_SECRETS, `/rest/secret/open/${this._encodePath(path)}`);
    }

    /**
     * Unwraps a wrapped secret.
     *
     * @param {string} name The secret name.
     * @param {string} token The token to unwrap.
     * @returns {function} Redux dispatch function.
     */
    unwrapSecret(name, token) {
        return this._dispatchPost(this.ACTION_TYPES.UNWRAP_SECRET, '/rest/secret/unwrap', {
            token
        });
    }

    /**
     * Unwraps a dynamic secret.
     *
     * @param {string} referenceId The token to unwrap.
     * @param {number} requestId The request id.
     * @returns {function} Redux dispatch function.
     */
    unwrapDynamicSecret(referenceId, requestId) {
        //TODO SEPARATE WRAP ID AND LEASE ID IN NEW DB SCHEMA
        const token = referenceId.split('/')[0];
        return this._dispatchPost(this.ACTION_TYPES.UNWRAP_SECRET, '/rest/dynamic/unwrap', {
            token,
            requestId
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

export default new SecretAction();
