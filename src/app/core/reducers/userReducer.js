import userAction from 'app/core/actions/userAction';
import Constants from 'app/util/Constants';

/**
 * Reducer class responsible for reacting to and handling user REST calls.
 *
 */

/**
 * The primary reduce method.
 *
 * @public
 * @param {Object} previousState - The previous state.
 * @param {Object} action - Action type.
 * @returns {Object} The updated state.
 */
export default (previousState = {
    user: {
        firstName: Constants.DEFAULT_EMPTY_FIELD_VALUE,
        lastName: Constants.DEFAULT_EMPTY_FIELD_VALUE,
        email: Constants.DEFAULT_EMPTY_FIELD_VALUE,
        engine: Constants.DEFAULT_EMPTY_FIELD_VALUE
    },
    isLoggedIn: true
}, action) => {
    switch (action.type) {
        case userAction.ACTION_TYPES.GET_USER:
            return {...previousState, user: _remapUserData(action.data || {})};
        case userAction.ACTION_TYPES.LOGOUT:
            const isLoggedIn = action.data && action.data.status && action.data.status !== 'ok';
            return {...previousState, isLoggedIn};
        case userAction.ACTION_TYPES.UPDATE_USER_DETAILS:
            return {...previousState, user: _remapUserData(action.data ? action.data[1][0] : {})};
        default:
            return {...previousState};
    }
};

/**
 * Helper method to map user data.
 *
 * @public
 * @param {Object} userData - The previous user data.
 * @returns {Object} Remapped user data.
 */
const _remapUserData = userData => {
    const {email, engineType, firstName, lastName} = userData;
    return {
        firstName: firstName || Constants.DEFAULT_EMPTY_FIELD_VALUE,
        lastName: lastName || Constants.DEFAULT_EMPTY_FIELD_VALUE,
        email: email || Constants.DEFAULT_EMPTY_FIELD_VALUE,
        engine: engineType || Constants.DEFAULT_EMPTY_FIELD_VALUE
    };
};
