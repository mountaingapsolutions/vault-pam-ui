import {applyMiddleware, combineReducers, createStore} from 'redux';
import reduxThunk from 'redux-thunk';

import actionStatusReducer from 'app/core/reducers/actionStatusReducer';
import kvReducer from 'app/core/reducers/kvReducer';
import localStorageReducer from 'app/core/reducers/localStorageReducer';
import sessionReducer from 'app/core/reducers/sessionReducer';
import systemReducer from 'app/core/reducers/systemReducer';
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
            actionStatusReducer,
            kvReducer,
            localStorageReducer,
            sessionReducer,
            systemReducer,
            userReducer
        }),
        initialState,
        applyMiddleware(reduxThunk)
    );
};

export default configureMainStore;
