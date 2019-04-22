/* global it */
import {createMemoryHistory} from 'history';
import React from 'react';
import ReactDOM from 'react-dom';
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {Provider} from 'react-redux';
import {Router} from 'react-router-dom';

import sessionReducer from 'app/core/reducers/sessionReducer';
import systemReducer from 'app/core/reducers/systemReducer';
import userReducer from 'app/core/reducers/userReducer';

import Main from './Main';
import reduxThunk from 'redux-thunk';

/**
 * Configures the application store by invoking Redux's createStore method.
 *
 * @private
 * @param {Object} [initialState] = The initial state.
 * @returns {Object}
 */
const _configureStore = (initialState) => {
    return createStore(
        combineReducers({
            sessionReducer,
            systemReducer,
            userReducer
        }),
        initialState,
        applyMiddleware(reduxThunk)
    );
};

it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(<Provider store={_configureStore()}>
        <Router history={createMemoryHistory()}>
            <Main/>
        </Router>
    </Provider>, div);
    ReactDOM.unmountComponentAtNode(div);
});
