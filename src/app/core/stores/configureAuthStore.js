import {applyMiddleware, combineReducers, createStore} from 'redux';
import reduxThunk from 'redux-thunk';

import actionStatusReducer from 'app/core/reducers/actionStatusReducer';
import sessionReducer from 'app/core/reducers/sessionReducer';
import systemReducer from 'app/core/reducers/systemReducer';

/**
 * Configures the application store specific to the unauthenticated page by invoking Redux's createStore method.
 *
 * @param {Object} [initialState] = The initial state.
 * @returns {Object}
 */
const configureAuthStore = (initialState) => {
    return createStore(
        combineReducers({
            actionStatusReducer,
            sessionReducer,
            systemReducer
        }),
        initialState,
        applyMiddleware(reduxThunk)
    );
};

export default configureAuthStore;
