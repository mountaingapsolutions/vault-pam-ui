import _Actions from 'app/core/actions/_Actions';

/**
 * Actions class responsible for user related actions.
 */
class UserAction extends _Actions {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     */
    constructor() {
        super('UserAction', {
            DELETE_USER: 'DELETE_USER',
            GET_USER: 'GET_USER',
            LIST_USERS: 'LIST_USERS',
            UPDATE_USER_PASSWORD: 'UPDATE_USER_PASSWORD',
            UPDATE_USER_POLICIES: 'UPDATE_USER_POLICIES'
        });
    }

    /**
     * List available userpass users.
     *
     * @returns {function} Redux dispatch function.
     */
    listUsers() {
        return this._dispatchGet(this.ACTION_TYPES.LIST_USERS, '/api/v1/auth/userpass/users', {
            list: true
        });
    }

    /**
     * Gets the properties of an existing username.
     *
     * @param {string} entityId The userId for the user.
     * @returns {function} Redux dispatch function.
     */
    getUser(entityId) {
        return this._dispatchGet(this.ACTION_TYPES.GET_USER, `/rest/user/entityId/${entityId}`);
    }

    /**
     * Deletes the specified user.
     *
     * @param {string} username The username for the user.
     * @returns {function} Redux dispatch function.
     */
    deleteUser(username) {
        return this._dispatchDelete(this.ACTION_TYPES.DELETE_USER, `/api/v1/auth/userpass/users/${username}`);
    }

    /**
     * Update password for an existing user.
     *
     * @param {string} username The username for the user.
     * @param {string} password New password.
     * @returns {function} Redux dispatch function.
     */
    updateUserPassword(username, password) {
        return this._dispatchPost(this.ACTION_TYPES.UPDATE_USER_PASSWORD, `/api/v1/auth/userpass/users/${username}/password`, {
            password
        });
    }

    /**
     * Update policies for an existing user.
     *
     * @param {string} username The username for the user.
     * @param {string} policies Comma-separated list of policies.
     * @returns {function} Redux dispatch function.
     */
    updateUserPolicies(username, policies = '') {
        return this._dispatchPost(this.ACTION_TYPES.UPDATE_USER_POLICIES, `/api/v1/auth/userpass/users/${username}/policies`, {
            policies
        });
    }
}

export default new UserAction();
