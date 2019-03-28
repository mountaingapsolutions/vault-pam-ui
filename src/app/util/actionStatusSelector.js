/**
 * Check error status of given actions
 *
 * @public
 * @param {Array} [actions] - array of actions to check
 * @returns {function}
 */
export const createErrorsSelector = actions => (state) => {
    const errors = actions.map(action => (state.errors || {})[action]).filter(error => !!error);
    // Return first error that is encountered
    if (errors && errors[0]) {
        return errors[0].toString();
    }
    return '';
};

/**
 * Check inProgress status of given actions
 *
 * @public
 * @param {Array} [actions] - array of actions to check
 * @returns {function}
 */
export const createInProgressSelector = actions => state =>
    actions.some(action => (state.inProgress || {})[action]);
