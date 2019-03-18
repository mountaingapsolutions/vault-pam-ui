import {applyMiddleware, combineReducers, createStore} from 'redux';
import reduxThunk from 'redux-thunk';

import kvReducer from 'app/core/reducers/kvReducer';
import localStorageReducer from 'app/core/reducers/localStorageReducer';
import sessionReducer from 'app/core/reducers/sessionReducer';
import userReducer from 'app/core/reducers/userReducer';

/**
 * Configures the application store specific to the main authenticated page by invoking Redux's createStore method.
 *
 * @param {Object} [initialState] = The initial state.
 * @returns {Object}
 */
const configureMainStore = (initialState) => {
    return createStore(
        combineReducers({
            kvReducer,
            localStorageReducer,
            sessionReducer,
            userReducer
        }),
        initialState,
        applyMiddleware(reduxThunk)
    );
};

export default configureMainStore;
