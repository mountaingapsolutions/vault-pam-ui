/* global it */
import {createMemoryHistory} from 'history';
import React from 'react';
import ReactDOM from 'react-dom';
import {combineReducers, createStore} from 'redux';
import {Provider} from 'react-redux';
import {Router} from 'react-router-dom';

import userReducer from 'app/core/reducers/userReducer';

import App from './App';

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
            userReducer
        }),
        initialState
    );
};

it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(<Provider store={_configureStore()}>
        <Router history={createMemoryHistory()}>
            <App/>
        </Router>
    </Provider>, div);
    ReactDOM.unmountComponentAtNode(div);
});
