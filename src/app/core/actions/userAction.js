import _Actions from 'app/core/actions/_Actions';

/**
 * Actions class responsible for persisting various user state.
 *
 * @author Mountain Gap Solutions
 * @copyright ©2018 Shorelight Education
 */
class UserAction extends _Actions {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     */
    constructor() {
        super('UserAction', {
            SET_USERNAME: 'SET_USERNAME'
        });
    }

    /**
     * Returns the current user profile in session.
     *
     * @public
     * @returns {function} Redux dispatch function.
     */
    /**
     *
     * @param {string} username - The username to set.
     * @returns {function} Redux dispatch function.
     */
    setUsername(username) {
        return this._dispatchPost(this.ACTION_TYPES.SET_USERNAME, '/user', {username});
    }
}

export default new UserAction();
