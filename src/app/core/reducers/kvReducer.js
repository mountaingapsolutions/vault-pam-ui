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
    secretsMounts: [],
    secretsPaths: {}
}, action) => {
    switch (action.type) {
        case kvAction.ACTION_TYPES.GET_SECRETS:
            return {
                ...previousState,
                secrets: kvAction.injectMetaData((action.data || {}).data || {}, action)
            };
        case kvAction.ACTION_TYPES.LIST_MOUNTS:
            const mounts = ((action.data || {}).data || {}).secret || {};
            return {
                ...previousState,
                secretsMounts: Object.keys(mounts).map(key => {
                    return {
                        ...mounts[key],
                        name: key,
                        // See https://www.vaultproject.io/docs/secrets/kv/kv-v2.html for additional information. Version 2 KV secrets engine requires an additional /metadata in the query path.
                        path: (mounts[key].options || {}).version === '2' ? `${key}/metadata` : key
                    };
                }).filter(mount => mount.type !== 'identity' && mount.type !== 'system') // Filter out the identity and system mounts.
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
