/* global expect, it, jest */
import {createMemoryHistory} from 'history';
import React from 'react';
import renderer from 'react-test-renderer';
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {Provider} from 'react-redux';
import {Router} from 'react-router-dom';

import sessionReducer from 'app/core/reducers/sessionReducer';
import systemReducer from 'app/core/reducers/systemReducer';

import Auth from './Auth';
import reduxThunk from 'redux-thunk';

jest.mock('app/routes/auth/Login');

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
            systemReducer
        }),
        initialState,
        applyMiddleware(reduxThunk)
    );
};

/**
 * Renders an instance of Auth for testing.
 *
 * @private
 * @returns {ReactElement}
 */
const _getInstance = () => {
    return <Provider store={_configureStore()}>
        <Router history={createMemoryHistory()}>
            <Auth/>
        </Router>
    </Provider>;
};

it('renders correctly', () => {
    expect(renderer.create(_getInstance()).toJSON()).toMatchSnapshot();
});
