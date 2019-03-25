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
    authUser: {},
    vaultDomain: {},
    vaultLookupSelf: {},
    sealStatus: {},
    vaultToken: {}
}, action) => {
    switch (action.type) {
        case sessionAction.ACTION_TYPES.AUTHENTICATE_USER_PASS:
            // Message the error message with proper grammar.
            if (action.errors) {
                action.errors = action.errors.map(err => `Authentication failed: ${err}.`);
            }
            return {...previousState, authUser: action};
        case sessionAction.ACTION_TYPES.SET_DOMAIN:
            return {...previousState, vaultDomain: action};
        case sessionAction.ACTION_TYPES.SET_TOKEN:
            return {...previousState, vaultToken: action};
        case sessionAction.ACTION_TYPES.VALIDATE_DOMAIN:
            return {...previousState, sealStatus: action};
        case sessionAction.ACTION_TYPES.VALIDATE_TOKEN:
            // Message the error message with proper grammar.
            if (action.errors) {
                action.errors = action.errors.map(err => `Authentication failed: ${err}.`);
            }
            return {...previousState, vaultLookupSelf: action};
        default:
            return {...previousState};
    }
};
