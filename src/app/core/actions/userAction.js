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
            LOGOUT: 'LOGOUT',
            UPDATE_USER_DETAILS: 'UPDATE_USER_DETAILS',
            UPDATE_USER_PASSWORD: 'UPDATE_USER_PASSWORD',
            UPDATE_USER_POLICIES: 'UPDATE_USER_POLICIES'
        });
    }

    /**
     * Gets the properties of an existing username.
     *
     * @param {string} entityId The entityId for the user.
     * @returns {function} Redux dispatch function.
     */
    getUser(entityId) {
        return this._dispatchGet(this.ACTION_TYPES.GET_USER, `/rest/user/entityId/${entityId}`);
    }

    /**
     * Update the properties of an existing username.
     *
     * @param {Object} data The new user data.
     * @returns {function} Redux dispatch function.
     */
    updateUser(data) {
        return this._dispatchPut(this.ACTION_TYPES.UPDATE_USER_DETAILS, '/rest/user/update', data);
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

    /**
     * Logout current user.
     *
     * @returns {function} Redux dispatch function.
     */
    logOut() {
        return this._dispatchPost(this.ACTION_TYPES.LOGOUT, '/rest/user/logout');
    }
}

export default new UserAction();
