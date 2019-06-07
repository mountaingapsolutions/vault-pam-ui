/* global afterAll, beforeEach, expect, it, jest */
import React from 'react';
import renderer from 'react-test-renderer';
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {Provider} from 'react-redux';
import {Router} from 'react-router-dom';

import secretReducer from 'app/core/reducers/secretReducer';
import sessionReducer from 'app/core/reducers/sessionReducer';
import systemReducer from 'app/core/reducers/systemReducer';
import userReducer from 'app/core/reducers/userReducer';

import secretAction from 'app/core/actions/secretAction';

import SecretsList from './SecretsList';
import reduxThunk from 'redux-thunk';

jest.mock('app/core/actions/secretAction');

const DEFAULT_SECRET_REDUCER_STATE = {
    secretReducer: {
        leaseList: {},
        secrets: {},
        secretsMounts: {},
        secretsPaths: {},
        secretsRequests: [],
        approvers: []
    }
};

const DEFAULT_MOCK_STATE = {
    secretReducer: {
        secretsMounts: {
            data: [
                {
                    options: {},
                    type: 'mockType',
                    name: 'mockName/'
                }
            ]
        },
        secretsPaths: {
            secrets: [
                {
                    name: 'mockUser',
                    capabilities: ['read'],
                    data: {
                        wrap_info:
                            {
                                token: 'mocktoken234124kjh',
                                accessor: 'testaccessor',
                                creation_time: '2019-06-06T19:07:52Z',
                                creation_path: 'mockName/data/test/mockUser'
                            }
                    }
                }
            ]
        },
        secretsRequests: [
            {
                approved: true,
                creationTime: '2019-05-30T19:55:01.833Z',
                authorizations: [
                    {
                        id: 78,
                        type: 'APPROVED',
                        name: 'testadmin'
                    }
                ],
                isWrapped: false,
                id: 39,
                opened: false,
                path: 'undefined/mockUser',
                type: 'standard-request'
            }
        ]
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
 * Renders an instance of Auth for testing.
 *
 * @private
 * @param {Object} [initialState] = The initial state.
 * @returns {ReactElement}
 */
const _getInstance = (initialState) => {
    return <Provider store={_configureStore(initialState)}>
        <Router history={_mockHistory}>
            <SecretsList/>
        </Router>
    </Provider>;
};

afterAll(() => {
    jest.resetAllMocks();
});

beforeEach(() => {
    jest.clearAllMocks();
    secretAction.listMounts.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.deleteRequest.mockImplementation(() => () => new Promise((resolve) => resolve({})));
});

it('renders correctly', () => {
    expect(renderer.create(_getInstance()).toJSON()).toMatchSnapshot();
});

it('list secret mounts after mounting', () => {
    renderer.create(_getInstance(DEFAULT_SECRET_REDUCER_STATE));
    expect(secretAction.listMounts).toHaveBeenCalledTimes(1);
});

