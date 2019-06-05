/* global afterAll, beforeEach, expect, it, jest */
import {createMemoryHistory} from 'history';
import React from 'react';
import renderer from 'react-test-renderer';
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {Provider} from 'react-redux';
import {Router} from 'react-router-dom';

import secretAction from 'app/core/actions/secretAction';
import sessionAction from 'app/core/actions/sessionAction';
import systemAction from 'app/core/actions/systemAction';
import sessionReducer from 'app/core/reducers/sessionReducer';
import systemReducer from 'app/core/reducers/systemReducer';
import userAction from 'app/core/actions/userAction';
import userReducer from 'app/core/reducers/userReducer';

import Main from './Main';
import reduxThunk from 'redux-thunk';

jest.mock('app/core/actions/secretAction');
jest.mock('app/core/actions/sessionAction');
jest.mock('app/core/actions/systemAction');
jest.mock('app/core/actions/userAction');

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
 * Renders an instance of Main for testing.
 *
 * @private
 * @returns {ReactElement}
 */
const _getInstance = () => {
    return <Provider store={_configureStore()}>
        <Router history={createMemoryHistory()}>
            <Main/>
        </Router>
    </Provider>;
};

afterAll(() => {
    jest.resetAllMocks();
});

beforeEach(() => {
    jest.clearAllMocks();

    sessionAction.setToken.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.listRequests.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    systemAction.getSealStatus.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    systemAction.getConfig.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    userAction.logout.mockImplementation(() => () => new Promise((resolve) => resolve({})));
});

it('renders correctly', () => {
    expect(renderer.create(_getInstance()).toJSON()).toMatchSnapshot();
});

it('checks session after mounting', () => {
    renderer.create(_getInstance());
    expect(sessionAction.validateToken).toHaveBeenCalledTimes(1);
});

it('sets the response token if session is valid', () => {
    sessionAction.validateToken.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    renderer.create(_getInstance());
    // Returning a promise to ensure validateToken is executed first.
    return new Promise((resolve) => {
        resolve();

        expect(sessionAction.setToken).toHaveBeenCalledTimes(1);
    });
});

it('does not fetch user data if session is root', () => {
    sessionAction.validateToken.mockImplementation(() => () => new Promise((resolve) => resolve({
        data: {
            data: {
                policies: ['root']
            }
        }
    })));
    renderer.create(_getInstance());
    // Returning a promise with delay to ensure validateToken is executed first.
    return new Promise((resolve) => {
        setTimeout(() => {
            expect(userAction.getUser).toHaveBeenCalledTimes(0);
            resolve();
        }, 0);
    });
});

it('fetches user data if session is valid and not root', () => {
    sessionAction.validateToken.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    sessionAction.setToken.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.listRequests.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    systemAction.getSealStatus.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    userAction.logout.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    renderer.create(_getInstance());
    // Returning a promise with delay to ensure validateToken is executed first.
    return new Promise((resolve) => {
        setTimeout(() => {
            expect(userAction.getUser).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});
