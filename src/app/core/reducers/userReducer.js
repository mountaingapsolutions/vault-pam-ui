import userAction from 'app/core/actions/userAction';

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
    users: []
}, action) => {
    switch (action.type) {
        case userAction.ACTION_TYPES.LIST_USERS:
            const {data} = action;
            return {...previousState, users: ((data || {}).data || {}).keys || []};
        default:
            return {...previousState};
    }
};
