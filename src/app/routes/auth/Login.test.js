/* global afterAll, beforeEach, expect, it, jest */
import {createMemoryHistory} from 'history';
import React from 'react';
import renderer from 'react-test-renderer';
import {applyMiddleware, combineReducers, createStore} from 'redux';

import sessionAction from 'app/core/actions/sessionAction';
import systemAction from 'app/core/actions/systemAction';
import sessionReducer from 'app/core/reducers/sessionReducer';
import systemReducer from 'app/core/reducers/systemReducer';
import userReducer from 'app/core/reducers/userReducer';

import {Provider} from 'react-redux';
import {Router} from 'react-router-dom';

import Login from './Login';
import reduxThunk from 'redux-thunk';

jest.mock('app/core/actions/sessionAction');
jest.mock('app/core/actions/systemAction');

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

/**
 * Renders an instance of Login for testing.
 *
 * @private
 * @returns {ReactElement}
 */
const _getInstance = () => {
    return <Provider store={_configureStore()}>
        <Router history={createMemoryHistory()}>
            <Login/>
        </Router>
    </Provider>;
};

afterAll(() => {
    jest.resetAllMocks();
});

beforeEach(() => {
    jest.clearAllMocks();

    systemAction.getConfig.mockImplementation(() => () => new Promise((resolve) => resolve({})));
});

it('renders correctly', () => {
    expect(renderer.create(_getInstance()).toJSON()).toMatchSnapshot();
});

it('sets the response token if authenticated', () => {
    sessionAction.login.mockImplementation(() => () => new Promise((resolve) => resolve({
        data: {
            data: {
                id: 'foobar'
            }
        }
    })));
    // TODO - Need to force _onSubmit to be clicked to trigger authenticate.
    renderer.create(_getInstance());
    // Returning a promise with delay to ensure validateToken is executed first.
    // return new Promise((resolve) => {
    //     setTimeout(() => {
    //         expect(sessionAction.setToken).toHaveBeenCalledTimes(1);
    //         resolve();
    //     }, 0);
    // });
});
