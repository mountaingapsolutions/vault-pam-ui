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
    vaultDomain: {},
    vaultLookupSelf: {},
    vaultSealStatus: {},
    vaultToken: {}
}, action) => {
    switch (action.type) {
        case sessionAction.ACTION_TYPES.SET_DOMAIN:
            return {...previousState, vaultDomain: action};
        case sessionAction.ACTION_TYPES.SET_TOKEN:
            return {...previousState, vaultToken: action};
        case sessionAction.ACTION_TYPES.VALIDATE_DOMAIN:
            return {...previousState, vaultSealStatus: action};
        case sessionAction.ACTION_TYPES.VALIDATE_TOKEN:
            return {...previousState, vaultLookupSelf: action};
        default:
            return {...previousState};
    }
};
