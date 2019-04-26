import {clone, safeWrap, unwrap, updateIn, updateOrAppend} from '@mountaingapsolutions/objectutil';
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
    let secretsPaths;
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
            const requests = action.data && _remapRequest(action.data);
            return {
                ...previousState,
                secretsRequests: requests || []
            };
        case kvAction.ACTION_TYPES.REMOVE_REQUEST_DATA:
            secretsPaths = clone(previousState.secretsPaths);
            // Remove from secretPaths (requester's perspective).
            if (secretsPaths.secrets) {
                secretsPaths.secrets.forEach(secret => {
                    if (unwrap(safeWrap(secret).data.wrap_info.accessor) === action.data) {
                        delete secret.data.request_info;
                    }
                });
            }
            // Remove from secretsRequests (approver's perspective).
            const secretsRequests = clone(previousState.secretsRequests).filter(request => request.accessor !== action.data);
            return {
                ...previousState,
                secretsPaths,
                secretsRequests
            };
        case kvAction.ACTION_TYPES.APPROVE_REQUEST_DATA:
            secretsPaths = clone(previousState.secretsPaths);
            // Update secretPaths (requester's perspective).
            if (secretsPaths.secrets) {
                secretsPaths.secrets.forEach(secret => {
                    if (unwrap(safeWrap(secret).data.wrap_info.accessor) === action.data.accessor) {
                        secret.data.request_info = action.data.request_info.data;
                    }
                });
            }
            return {
                ...previousState,
                secretsPaths,
                secretsRequests: updateIn(previousState.secretsRequests, action.data, 'accessor')
            };
        case kvAction.ACTION_TYPES.CREATE_REQUEST_DATA:
            return {
                ...previousState,
                secretsRequests: updateOrAppend(previousState.secretsRequests, action.data, 'accessor')
            };
        case kvAction.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES:
            return {
                ...previousState,
                secretsPaths: (action.data || {}).data || {}
            };
        // case kvAction.ACTION_TYPES.UNWRAP_SECRET:
        //     if (action.data) {
        //         const {name, data} = action.data;
        //         const updatedSecrets = {
        //             ...previousState.secretsPaths
        //         };
        //         updatedSecrets.secrets.some((secret) => {
        //             if (secret.name === name) {
        //                 secret.data = data;
        //                 return true;
        //             }
        //             return false;
        //         });
        //         return {
        //             ...previousState,
        //             secretsPaths: updatedSecrets
        //         };
        //     }
        //     return {
        //         ...previousState
        //     };
        default:
            return {...previousState};
    }
};

/**
 * Helper method to map request from database.
 *
 * @param {Array} requests array from database
 * @returns {Array} remapped request array.
 */
const _remapRequest = requests => {
    return requests.map(request => {
        const {approverEntityId, createdAt, id, requestData, requesterEntityId, requesterName, status} = request;
        return request.wrap_info ? request : {
            request_info: {
                data: {
                    approved: status,
                    approver_entity: approverEntityId,
                    authorizations: null,
                    request_entity: {id: requesterEntityId, name: requesterName},
                    request_path: requestData
                },
                request_id: id,
                creation_time: createdAt,
                accessor: requesterEntityId
            }
        };
    });
};
