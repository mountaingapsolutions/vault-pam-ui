/**
 * Reducer class responsible for returning inProgress and error status of actions.
 *
 */

const INITIAL_STATE = {
    errors: {},
    inProgress: {}
};

/**
 * The primary reduce method.
 *
 * @public
 * @param {Object} previousState - The previous state.
 * @param {Object} action - Action type.
 * @returns {Object} The updated state.
 */
export default (previousState = INITIAL_STATE, action) => {
    const {errors, inProgress, type} = action;

    if (action.inProgress) {
        // Clear error for action and set inProgress to true for inProgress action
        return {
            ...previousState,
            errors: {
                ...previousState.errors,
                [type]: null
            },
            inProgress: {
                ...previousState.inProgress,
                [type]: inProgress === true
            }
        };
    } else if (errors) {
        // Set error for action and set inProgress to false for action that resulted in error
        return {
            ...previousState,
            errors: {
                ...previousState.errors,
                [type]: errors
            },
            inProgress: {
                ...previousState.inProgress,
                [type]: false
            }
        };
    } else {
        // Clear error for action and set inProgress to false for completed action
        return {
            ...previousState,
            errors: {
                ...previousState.errors,
                [type]: null
            },
            inProgress: {
                ...previousState.inProgress,
                [type]: false
            }
        };
    }
};
