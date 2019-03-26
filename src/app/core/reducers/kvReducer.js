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
    secrets: {},
    secretsMounts: {},
    secretsPaths: {}
}, action) => {
    switch (action.type) {
        case kvAction.ACTION_TYPES.GET_SECRETS:
            return {
                ...previousState,
                secrets: kvAction.injectMetaData((action.data || {}).data || {}, action)
            };
        case kvAction.ACTION_TYPES.LIST_MOUNTS:
            const mounts = (action.data || {}).data || {};
            return {
                ...previousState,
                secretsMounts: kvAction.injectMetaData({data: Object.keys(mounts).map(key => {
                    return {
                        ...mounts[key],
                        name: key
                    };
                }).filter(mount => mount.type !== 'identity' && mount.type !== 'system')}, action) // Filter out the identity and system mounts.
            };
        case kvAction.ACTION_TYPES.LIST_SECRETS:
            return {
                ...previousState,
                secretsPaths: kvAction.injectMetaData((action.data || {}).data || {}, action)
            };
        default:
            return {...previousState};
    }
};
