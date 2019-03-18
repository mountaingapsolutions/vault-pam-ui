import {applyMiddleware, combineReducers, createStore} from 'redux';
import reduxThunk from 'redux-thunk';

import localStorageReducer from 'app/core/reducers/localStorageReducer';
import sessionReducer from 'app/core/reducers/sessionReducer';

/**
 * Configures the application store specific to the unauthenticated page by invoking Redux's createStore method.
 *
 * @param {Object} [initialState] = The initial state.
 * @returns {Object}
 */
const configureAuthStore = (initialState) => {
    return createStore(
        combineReducers({
            localStorageReducer,
            sessionReducer
        }),
        initialState,
        applyMiddleware(reduxThunk)
    );
};

export default configureAuthStore;
