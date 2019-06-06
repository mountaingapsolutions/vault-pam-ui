/* global afterAll, beforeEach, expect, it, jest */
import {AccountCircle, List, Lock, LockOpen} from '@material-ui/icons';
import {IconButton, Menu, MenuItem, Snackbar} from '@material-ui/core';
import React from 'react';
import renderer from 'react-test-renderer';
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {Provider} from 'react-redux';
import {Router} from 'react-router-dom';

import secretAction from 'app/core/actions/secretAction';
import sessionAction from 'app/core/actions/sessionAction';
import systemAction from 'app/core/actions/systemAction';
import secretReducer from 'app/core/reducers/secretReducer';
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
jest.mock('app/core/components/UserProfileModal');
jest.mock('app/core/components/NotificationsModal');
jest.mock('@material-ui/core/Menu');
jest.mock('@material-ui/core/Snackbar');

const DEFAULT_MOCK_STATE = {
    sessionReducer: {
        vaultLookupSelf: {
            data: {
                data: {
                    policies: []
                }
            }
        }
    },
    userReducer: {
        user: {
            data: {
                metadata: {
                    firstName: 'foo',
                    lastName: 'bar',
                    email: 'foo.bar@test.com'
                }
            }
        }
    }
};

/**
 * Configures the application store by invoking Redux's createStore method.
 *
 * @private
 * @param {Object} [initialState] = The initial state.
 * @returns {Object}
 */
const _configureStore = (initialState = {}) => {
    return createStore(
        combineReducers({
            secretReducer,
            sessionReducer,
            systemReducer,
            userReducer
        }),
        {
            ...DEFAULT_MOCK_STATE,
            ...initialState
        },
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
 * Renders an instance of Main for testing.
 *
 * @private
 * @param {Object} [initialState] = The initial state.
 * @returns {ReactElement}
 */
const _getInstance = (initialState) => {
    return <Provider store={_configureStore(initialState)}>
        <Router history={_mockHistory}>
            <Main/>
        </Router>
    </Provider>;
};

afterAll(() => {
    jest.resetAllMocks();
});

beforeEach(() => {
    jest.clearAllMocks();

    sessionAction.validateToken.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    sessionAction.setToken.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.listMounts.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.listRequests.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    systemAction.getSealStatus.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    systemAction.getConfig.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    userAction.getUser.mockImplementation(() => () => new Promise((resolve) => resolve({})));
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
    renderer.create(_getInstance());
    // Returning a promise with delay to ensure validateToken is executed first.
    return new Promise((resolve) => {
        setTimeout(() => {
            expect(sessionAction.setToken).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
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
    return new Promise((resolve) => {
        setTimeout(() => {
            expect(userAction.getUser).toHaveBeenCalledTimes(0);
            resolve();
        }, 0);
    });
});

it('fetches user data if session is valid and not root', () => {
    renderer.create(_getInstance());
    return new Promise((resolve) => {
        setTimeout(() => {
            expect(userAction.getUser).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});

it('fetches mounts, requests, and seal status, after checking session', () => {
    renderer.create(_getInstance());
    return new Promise((resolve) => {
        setTimeout(() => {
            expect(secretAction.listMounts).toHaveBeenCalledTimes(1);
            expect(secretAction.listRequests).toHaveBeenCalledTimes(1);
            expect(systemAction.getSealStatus).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});

it('logs out if session is invalid', () => {
    sessionAction.validateToken.mockImplementation(() => () => new Promise((resolve, reject) => reject()));
    renderer.create(_getInstance());
    return new Promise((resolve) => {
        setTimeout(() => {
            expect(userAction.logout).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});

it('renders the default profile icon if email is not present', () => {
    const testInstance = renderer.create(_getInstance({
        userReducer: {
            user: {}
        }
    })).root;
    expect(testInstance.findByType(AccountCircle)).toBeTruthy();
});

it('renders the default profile icon if image load fails', () => {
    const testInstance = renderer.create(_getInstance()).root;
    expect(testInstance.findAllByType(AccountCircle).length).toBe(0);
    // Force the image onError.
    testInstance.findAllByType('img')[1].props.onError();
    expect(testInstance.findAllByType(AccountCircle).length).toBe(1);
});

it('displays a root user warning for root users', () => {
    const testInstance = renderer.create(_getInstance({
        ...DEFAULT_MOCK_STATE,
        sessionReducer: {
            vaultLookupSelf: {
                data: {
                    data: {
                        policies: ['root']
                    }
                }
            }
        }
    })).root;
    return new Promise((resolve) => {
        setTimeout(() => {
            const snackBar = testInstance.findByType(Snackbar);
            expect(snackBar.props.open).toBe(true);
            snackBar.props.onClose();
            setTimeout(() => {
                expect(snackBar.props.open).toBe(false);
                resolve();
            }, 0);
        }, 0);
    });
});

it('renders the lock icon if Vault is sealed', () => {
    const testInstance = renderer.create(_getInstance({
        ...DEFAULT_MOCK_STATE,
        systemReducer: {
            sealStatus: {
                sealed: true
            }
        }
    })).root;
    expect(testInstance.findByType(Lock)).toBeTruthy();
});

it('renders the expected mount icons from type', () => {
    const testInstance = renderer.create(_getInstance({
        ...DEFAULT_MOCK_STATE,
        secretReducer: {
            secretsMounts: {
                data: [{
                    name: 'aws',
                    type: 'aws'
                }, {
                    name: 'cubbyhole',
                    type: 'cubbyhole'
                }, {
                    name: 'azure',
                    type: 'azure'
                }, {
                    name: 'kv',
                    type: 'kv'
                }]
            }
        }
    })).root;
    const images = testInstance.findAllByType('img');
    expect(images[2].props.src).toBe('/assets/aws-icon.svg');
    expect(images[3].props.src).toBe('/assets/azure-icon.svg');
    expect(testInstance.findAllByType(LockOpen).length).toBe(2);
    expect(testInstance.findAllByType(List).length).toBe(1);
});

it('navigates to the expected secrets path from click', () => {
    const testInstance = renderer.create(_getInstance({
        ...DEFAULT_MOCK_STATE,
        secretReducer: {
            secretsMounts: {
                data: [{
                    name: 'kv',
                    type: 'kv'
                }]
            }
        }
    })).root;
    // Expecting that the 2nd anchor is the secrets list item.
    const anchorProps = testInstance.findAllByType('a')[1].props;
    anchorProps.onClickCapture({
        preventDefault: jest.fn(),
        currentTarget: {
            getAttribute: jest.fn(() => anchorProps.href)
        }
    });
    expect(_mockHistory.push.mock.calls[0][0]).toBe(anchorProps.href);
});

it('toggles the account menu if account icon is clicked', () => {
    const testInstance = renderer.create(_getInstance()).root;
    const iconProps = testInstance.findAllByType(IconButton)[1].props;
    const currentTarget = {
        foo: 'bar'
    };
    // Account menu is expected to be closed by default.
    expect(testInstance.findByType(Menu).props.open).toBe(false);
    iconProps.onClick({
        currentTarget
    });
    // Account menu is expected to be toggled open upon click.
    expect(testInstance.findByType(Menu).props.open).toBe(true);
    iconProps.onClick();
    // Account menu is expected to be toggled off upon second click.
    expect(testInstance.findByType(Menu).props.open).toBe(false);
});
