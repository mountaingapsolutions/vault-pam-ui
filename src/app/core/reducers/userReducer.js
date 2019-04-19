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
    user: {},
    isLoggedIn: true
}, action) => {
    switch (action.type) {
        case userAction.ACTION_TYPES.GET_USER:
            return {
                ...previousState,
                user: action.data
            };
        case userAction.ACTION_TYPES.LOGOUT:
            const isLoggedIn = action.data && action.data.status && action.data.status !== 'ok';
            return {...previousState, isLoggedIn};
        default:
            return {...previousState};
    }
};
