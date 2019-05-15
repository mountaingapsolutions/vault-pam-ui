import {clone, updateIn, updateOrAppend} from '@mountaingapsolutions/objectutil';
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
        case kvAction.ACTION_TYPES.UNWRAP_SECRET:
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
        case kvAction.ACTION_TYPES.REMOVE_REQUEST_DATA:
            // Remove from secretsRequests.
            const secretsRequests = clone(previousState.secretsRequests).filter(request => request.requestPath !== action.data);
            return {
                ...previousState,
                secretsRequests
            };
        case kvAction.ACTION_TYPES.APPROVE_REQUEST_DATA:
            return {
                ...previousState,
                secretsRequests: updateIn(previousState.secretsRequests, action.data, 'requestPath')
            };
        case kvAction.ACTION_TYPES.CREATE_REQUEST_DATA:
            return {
                ...previousState,
                secretsRequests: updateOrAppend(previousState.secretsRequests, action.data, 'requestPath')
            };
        case kvAction.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES:
            return {
                ...previousState,
                secretsPaths: (action.data || {}).data || {}
            };
        case kvAction.ACTION_TYPES.LIST_LEASE:
            return {
                ...previousState,
                leaseList: (action.data || {}).data || {}
            };
        default:
            return {...previousState};
    }
};
