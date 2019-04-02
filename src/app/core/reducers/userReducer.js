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
        Name: Constants.DEFAULT_EMPTY_FIELD_VALUE,
        Email: Constants.DEFAULT_EMPTY_FIELD_VALUE,
        Engine: Constants.DEFAULT_EMPTY_FIELD_VALUE
    },
    users: []
}, action) => {
    switch (action.type) {
        case userAction.ACTION_TYPES.LIST_USERS:
            const {data} = action;
            return {...previousState, users: ((data || {}).data || {}).keys || []};
        case userAction.ACTION_TYPES.GET_USER:
            return {...previousState, user: _remapUserData(action.data || {})};
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
    const fName = firstName || firstName === null && '';
    const lName = lastName || lastName === null && '';
    const fullName = `${fName}${lName}`.length > 0 ? `${fName} ${lName}` : Constants.DEFAULT_EMPTY_FIELD_VALUE;
    return {
        Name: fullName,
        Email: email || Constants.DEFAULT_EMPTY_FIELD_VALUE,
        Engine: engineType || Constants.DEFAULT_EMPTY_FIELD_VALUE
    };
};
