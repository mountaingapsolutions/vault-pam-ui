import sessionAction from 'app/core/actions/sessionAction';

/**
 * Reducer class responsible for reacting to and handling the session REST calls.
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
    vaultLookupSelf: {},
    vaultToken: {}
}, action) => {
    switch (action.type) {
        case sessionAction.ACTION_TYPES.SET_TOKEN:
            return {...previousState, vaultToken: action};
        case sessionAction.ACTION_TYPES.LOGIN:
        case sessionAction.ACTION_TYPES.VALIDATE_TOKEN:
            // Massage the error message with proper grammar.
            if (action.errors) {
                action.errors = action.errors.map(err => `Authentication failed: ${err}.`);
            }
            return {...previousState, vaultLookupSelf: action};
        default:
            return {...previousState};
    }
};
