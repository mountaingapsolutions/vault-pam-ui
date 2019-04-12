import systemAction from 'app/core/actions/systemAction';

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
    selfCapabilities: {},
    sealStatus: {},
    isEnterprise: false,
    groupData: {}
}, action) => {
    switch (action.type) {
        case systemAction.ACTION_TYPES.GET_GROUP_DATA:
            return {...previousState, groupData: action.data || {}, action};
        case systemAction.ACTION_TYPES.GET_SELF_CAPABILITIES:
            return {...previousState, selfCapabilities: action.data || {}, action};
        case systemAction.ACTION_TYPES.GET_SEAL_STATUS:
            return {...previousState, sealStatus: action.data || {}, action};
        case systemAction.ACTION_TYPES.GET_SERVER_LICENSE:
            const license = action.data;
            return {...previousState, isEnterprise: license && license.data && license.data.features.includes('Control Groups') || false, action};
        default:
            return {...previousState};
    }
};
