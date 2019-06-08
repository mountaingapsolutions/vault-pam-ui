import {clone, safeWrap, unwrap, updateIn, updateOrAppend} from '@mountaingapsolutions/objectutil';
import secretAction from 'app/core/actions/secretAction';

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
    leaseList: {},
    secrets: {},
    secretsMounts: {},
    secretsPaths: {},
    secretsRequests: [],
    approvers: []
}, action) => {
    switch (action.type) {
        case secretAction.ACTION_TYPES.GET_SECRETS:
        case secretAction.ACTION_TYPES.UNWRAP_SECRET:
            return {
                ...previousState,
                secrets: (action.data || {}).data || {}
            };
        case secretAction.ACTION_TYPES.LIST_MOUNTS:
            const mounts = unwrap(safeWrap(action).data.data.secret) || {};
            return {
                ...previousState,
                secretsMounts: {data: Object.keys(mounts).map(key => {
                    return {
                        ...mounts[key],
                        name: key
                    };
                }).filter(mount => mount.type !== 'identity' && mount.type !== 'system')}// Filter out the identity and system mounts.
            };
        case secretAction.ACTION_TYPES.LIST_REQUESTS:
            return {
                ...previousState,
                secretsRequests: action.data || []
            };
        case secretAction.ACTION_TYPES.REMOVE_REQUEST_DATA:
            // Remove from secretsRequests.
            const secretsRequests = clone(previousState.secretsRequests).filter(request => request.path !== action.data);
            return {
                ...previousState,
                secretsRequests
            };
        case secretAction.ACTION_TYPES.APPROVE_REQUEST_DATA:
            return {
                ...previousState,
                secretsRequests: updateIn(previousState.secretsRequests, action.data, 'path')
            };
        case secretAction.ACTION_TYPES.CREATE_REQUEST_DATA:
            return {
                ...previousState,
                secretsRequests: updateOrAppend(previousState.secretsRequests, action.data, 'path')
            };
        case secretAction.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES:
            return {
                ...previousState,
                secretsPaths: (action.data || {}).data || {}
            };
        case secretAction.ACTION_TYPES.LIST_LEASE:
            return {
                ...previousState,
                leaseList: (action.data || {}).data || {}
            };
        case secretAction.ACTION_TYPES.LIST_APPROVERS:
            return {
                ...previousState,
                approvers: action.data || []
            };
        default:
            return {...previousState};
    }
};
