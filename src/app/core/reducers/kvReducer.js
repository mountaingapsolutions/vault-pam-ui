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
    requestListFromDatabase: [],
    secrets: {},
    secretsMounts: {},
    secretsPaths: {},
    secretsRequests: []
}, action) => {
    switch (action.type) {
        case kvAction.ACTION_TYPES.GET_SECRETS:
            return {
                ...previousState,
                secrets: (action.data || {}).data || {}
            };
        case kvAction.ACTION_TYPES.LIST_MOUNTS:
            const mounts = (action.data || {}).data || {};
            return {
                ...previousState,
                secretsMounts: {data: Object.keys(mounts).map(key => {
                    return {
                        ...mounts[key],
                        name: key
                    };
                }).filter(mount => mount.type !== 'identity' && mount.type !== 'system')}// Filter out the identity and system mounts.
            };
        case kvAction.ACTION_TYPES.LIST_REQUESTS:
            return {
                ...previousState,
                secretsRequests: action.data || []
            };
        // Deprecated?
        case kvAction.ACTION_TYPES.LIST_SECRETS:
            return {
                ...previousState,
                secretsPaths: (action.data || {}).data || {}
            };
        case kvAction.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES:
            return {
                ...previousState,
                secretsPaths: (action.data || {}).data || {}
            };
        case kvAction.ACTION_TYPES.GET_SECRETS_REQUEST_FROM_DATABASE:
            const mappedDatabaseSecretRequest = _mapSecretRequestsFromDatabase(action.data || []);
            return {
                ...previousState,
                requestListFromDatabase: mappedDatabaseSecretRequest
            };
        default:
            return {...previousState};
    }
};

/**
 * Helper method to map secret request data.
 *
 * @public
 * @param {Object} data - The previous user data.
 * @returns {Object} Filtered request data.
 */
const _mapSecretRequestsFromDatabase = (data) => {
    return data.map(item => {
        const {createdAt, engineType, requestData, requesterEntityId, status} = item;
        return {
            createdAt,
            engineType,
            requestData,
            requesterEntityId,
            status
        };
    });
};
