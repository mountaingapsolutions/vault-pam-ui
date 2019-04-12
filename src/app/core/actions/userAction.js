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
            UPDATE_USER: 'UPDATE_USER',
            UPDATE_USER_POLICIES: 'UPDATE_USER_POLICIES'
        });
    }

    /**
     * Gets the properties of an existing user. If no entity id is provided, will default to the current session user.
     *
     * @param {string} [entityId] The entityId for the user.
     * @returns {function} Redux dispatch function.
     */
    getUser(entityId = '') {
        return this._dispatchGet(this.ACTION_TYPES.GET_USER, `/rest/user/${entityId}`);
    }

    /**
     * Updates the user data of the current session user.
     *
     * @param {Object} userData The updated user data.
     * @returns {function} Redux dispatch function.
     */
    updateUser(userData) {
        return this._dispatchPut(this.ACTION_TYPES.UPDATE_USER, '/rest/user', userData);
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
    logout() {
        return this._dispatchPost(this.ACTION_TYPES.LOGOUT, '/logout');
    }
}

export default new UserAction();
