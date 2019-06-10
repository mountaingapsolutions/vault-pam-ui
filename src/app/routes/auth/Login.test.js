/* global afterAll, beforeEach, expect, it, jest */
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
import {Button, Tab, TextField} from '@material-ui/core';

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

let _mockHistory = {
    location: {
        pathname: ''
    },
    listen: jest.fn(),
    push: jest.fn()
};

/**
 * Renders an instance of Login for testing.
 *
 * @private
 * @param {Object} [initialState] = The initial state.
 * @returns {ReactElement}
 */
const _getInstance = (initialState) => {
    return <Provider store={_configureStore(initialState)}>
        <Router history={_mockHistory}>
            <Login history={_mockHistory}/>
        </Router>
    </Provider>;
};

afterAll(() => {
    jest.resetAllMocks();
});

beforeEach(() => {
    jest.clearAllMocks();
    sessionAction.login.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    sessionAction.setToken.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    systemAction.getConfig.mockImplementation(() => () => new Promise((resolve) => resolve({})));
});

it('renders correctly', () => {
    expect(renderer.create(_getInstance()).toJSON()).toMatchSnapshot();
});


it('toggles the tab menu if tab is clicked', () => {
    const testInstance = renderer.create(_getInstance()).root;

    expect(testInstance.findAllByType(Tab)[0].props.selected).toBe(true);
    // click userpass tab
    testInstance.findAllByType(Tab)[1].props.onChange(null, 1);

    expect(testInstance.findAllByType(Tab)[0].props.selected).toBe(false);
    expect(testInstance.findAllByType(Tab)[1].props.selected).toBe(true);
});


it('check if the authentication failed', () => {
    const testInstance = renderer.create(_getInstance()).root;

    testInstance.findAllByType(Button)[1].props.onClick({
        preventDefault: jest.fn()
    });

    return new Promise((resolve) => {
        setTimeout(() => {
            expect(sessionAction.login).toHaveBeenCalledTimes(0);
            resolve();
        }, 0);
    });
});

it('check if the authentication was successful', () => {
    const testInstance = renderer.create(_getInstance()).root;

    // click the userpass tab
    testInstance.findAllByType(Tab)[1].props.onChange(null, 1);
    expect(testInstance.findAllByType(Tab)[1].props.selected).toBe(true);

    //  populate the username/password input fields
    const textfieldInstance = testInstance.findAllByType(TextField);
    const usernameProps = textfieldInstance[0].props;
    const passwordProps = textfieldInstance[1].props;
    usernameProps.onChange({
        preventDefault: jest.fn(),
        target: {name: 'username', value: 'foo'}
    });
    passwordProps.onChange({
        preventDefault: jest.fn(),
        target: {name: 'password', value: 'bar'}
    });

    // click the login button
    const buttonProps = testInstance.findAllByType(Button)[1].props;
    buttonProps.onClick({
        preventDefault: jest.fn()
    });
    return new Promise((resolve) => {
        setTimeout(() => {
            expect(sessionAction.login).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});
