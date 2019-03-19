import sessionAction from 'app/core/actions/systemAction';

/**
 * Reducer class responsible for reacting to and handling the system REST calls.
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
    vaultSealStatus: {}
}, action) => {
    switch (action.type) {
        case sessionAction.ACTION_TYPES.GET_VAULT_SEAL_STATUS:
            return {...previousState, vaultSealStatus: action.data};
        default:
            return {...previousState};
    }
};
