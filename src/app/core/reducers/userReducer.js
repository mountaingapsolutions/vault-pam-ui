import userAction from 'app/core/actions/userAction';

/**
 * Reducer class responsible for reacting and handling to the user REST calls.
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
export default (previousState = {}, action) => {
    switch (action.type) {
        case userAction.ACTION_TYPES.SET_USERNAME:
            return {...previousState, user: action};
        default:
            return {...previousState};
    }
}
