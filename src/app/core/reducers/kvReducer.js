import kvAction from 'app/core/actions/kvAction';

/**
 * Reducer class responsible for reacting to and handling the kv secrets engine REST calls.
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
    secretsPaths: []
}, action) => {
    switch (action.type) {
        case kvAction.ACTION_TYPES.LIST_SECRETS:
            const {data} = action;
            return {...previousState, secretsPaths: ((data || {}).data || {}).keys};
        default:
            return {...previousState};
    }
};
