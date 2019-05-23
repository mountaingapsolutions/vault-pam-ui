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
    config: {},
    selfCapabilities: {},
    sealStatus: {},
    build: {}
}, action) => {
    const {SHOW_BUILD_NUMBER: showBuildNumber, EB_VERSION: buildNumber} = process.env;

    switch (action.type) {
        case systemAction.ACTION_TYPES.GET_CONFIG:
            return {...previousState, config: action.data || {}, action};
        case systemAction.ACTION_TYPES.GET_SELF_CAPABILITIES:
            return {...previousState, selfCapabilities: action.data || {}, action};
        case systemAction.ACTION_TYPES.GET_SEAL_STATUS:
            return {...previousState, sealStatus: action.data, build: {showBuildNumber, buildNumber} || {}, action};
        default:
            return {...previousState};
    }
};
