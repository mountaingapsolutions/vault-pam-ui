/* global afterAll, beforeEach, expect, it, jest */
import {IconButton, ListItem} from '@material-ui/core';
import React from 'react';
import renderer from 'react-test-renderer';
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {Provider} from 'react-redux';
import {Route, Router} from 'react-router-dom';

import secretReducer from 'app/core/reducers/secretReducer';
import sessionReducer from 'app/core/reducers/sessionReducer';
import systemReducer from 'app/core/reducers/systemReducer';
import userReducer from 'app/core/reducers/userReducer';

import secretAction from 'app/core/actions/secretAction';

import SecretsList from './SecretsList';
import ConfirmationModal from 'app/core/components/ConfirmationModal';
import reduxThunk from 'redux-thunk';

jest.mock('app/core/actions/secretAction');
jest.mock('app/core/components/ConfirmationModal');
jest.mock('app/core/components/CreateUpdateSecretModal');
jest.mock('app/core/components/ListModal');

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
            data: [{
                options: {
                    version: '1'
                },
                type: 'kv',
                name: 'Mock-KV-v1-Mount/'
            }, {
                options: {
                    version: '2'
                },
                type: 'kv',
                name: 'Mock-KV-v2-Mount/'
            }, {
                type: 'aws',
                name: 'Mock-AWS-Mount/'
            }, {
                type: 'azure',
                name: 'Mock-Azure-Mount/'
            }]
        },
        secretsPaths: {
            secrets: [{
                name: 'test-secret-data',
                capabilities: ['create', 'delete', 'list', 'read', 'update'],
                data: {}
            }, {
                name: 'test-secret-path/',
                capabilities: ['list']
            }, {
                name: 'test-secret-data-read-only',
                capabilities: ['read']
            }, {
                name: 'test-secret-data-read-only-with-data',
                capabilities: ['read'],
                data: {}
            }, {
                name: 'approved-test-data',
                capabilities: []
            }, {
                name: 'approved-wrapped-test-data',
                capabilities: [],
                data: {
                    wrap_info: {}
                }
            }, {
                name: 'test-secret-data-that-requires-request',
                capabilities: []
            }, {
                name: 'test-secret-data-with-pending-request',
                capabilities: []
            }]
        },
        secretsRequests: [{
            approved: true,
            authorizations: [],
            path: 'Mock-AWS-Mount/approved-test-data',
            type: 'dynamic-request'
        }, {
            approved: true,
            authorizations: [],
            path: 'Mock-KV-v1-Mount/approved-wrapped-test-data',
            type: 'control-group'
        }, {
            approved: true,
            authorizations: [],
            path: 'Mock-KV-v1-Mount/approved-test-data',
            type: 'standard-request'
        }, {
            approved: false,
            authorizations: [],
            path: 'Mock-KV-v1-Mount/test-secret-data-with-pending-request',
            type: 'standard-request'
        }]
    }
};

/**
 * Configures the application store by invoking Redux's createStore method.
 *
 * @private
 * @param {Object} [initialState] The initial state.
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

/**
 * Renders an instance of Auth for testing.
 *
 * @private
 * @param {Object} [initialState] The initial state.
 * @param {string} [pathname] The path name.
 * @returns {ReactElement}
 */
const _getInstance = (initialState, pathname = '/secrets/Mock-KV-v1-Mount/test-path') => {
    const mockHistory = {
        location: {
            pathname
        },
        listen: jest.fn(),
        push: jest.fn()
    };

    return <Provider store={_configureStore(initialState)}>
        <Router history={mockHistory}>
            <Route component={SecretsList} path='/secrets/:mount/:path*'/>
        </Router>
    </Provider>;
};

afterAll(() => {
    jest.resetAllMocks();
});

beforeEach(() => {
    jest.clearAllMocks();

    secretAction.deleteRequest.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.deleteSecrets.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.getLeaseList.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.getSecrets.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.listMounts.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.listSecretsAndCapabilities.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.openApprovedSecret.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.requestSecret.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.setSecretsData.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.unwrapSecret.mockImplementation(() => () => new Promise((resolve) => resolve({})));
});

it('renders correctly', () => {
    expect(renderer.create(_getInstance()).toJSON()).toMatchSnapshot();
});

it('fetches both mounts and secrets after component has mounted if no secrets mounts loaded', () => {
    renderer.create(_getInstance(DEFAULT_SECRET_REDUCER_STATE));

    return new Promise((resolve) => {
        setTimeout(() => {
            expect(secretAction.listMounts).toHaveBeenCalledTimes(1);
            expect(secretAction.listSecretsAndCapabilities).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});

it('fetches just secrets after component has mounted if secrets mounts has already loaded', () => {
    renderer.create(_getInstance());

    return new Promise((resolve) => {
        setTimeout(() => {
            expect(secretAction.listMounts).toHaveBeenCalledTimes(0);
            expect(secretAction.listSecretsAndCapabilities).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});

it('fetches kv v1 secrets appropriately', () => {
    renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v1-Mount/test-path'));

    expect(secretAction.listSecretsAndCapabilities).toBeCalledWith('Mock-KV-v1-Mount/test-path', 1, 'kv');
});

it('fetches kv v2 secrets appropriately', () => {
    renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v2-Mount/test-path'));

    expect(secretAction.listSecretsAndCapabilities).toBeCalledWith('Mock-KV-v2-Mount/test-path', 2, 'kv');
});

it('fetches aws secrets appropriately', () => {
    renderer.create(_getInstance(undefined, '/secrets/Mock-AWS-Mount/test-path'));

    expect(secretAction.listSecretsAndCapabilities).toBeCalledWith('Mock-AWS-Mount/test-path', 1, 'aws');
});

it('fetches data appropriately on clicking a secrets path', () => {
    const testInstance = renderer.create(_getInstance()).root;

    testInstance.findAllByType(ListItem)[2].props.onClick({
        preventDefault: jest.fn()
    });

    expect(secretAction.listSecretsAndCapabilities).lastCalledWith('Mock-KV-v1-Mount/test-path/test-secret-path', 1, 'kv');
});

it('retrieves lease data on clicking dynamic secrets', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-AWS-Mount/test-path')).root;

    testInstance.findAllByType(ListItem)[1].props.onClick({
        preventDefault: jest.fn()
    });

    expect(secretAction.getLeaseList).lastCalledWith('Mock-AWS-Mount', 'test-secret-data');
});

it('retrieves secrets data with full path on clicking kv v1 secrets', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v1-Mount/test-path')).root;

    testInstance.findAllByType(ListItem)[1].props.onClick({
        preventDefault: jest.fn()
    });

    expect(secretAction.getSecrets).lastCalledWith('Mock-KV-v1-Mount/test-path/test-secret-data');
});

it('retrieves secrets data with full path on clicking kv v2 secrets', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v2-Mount/test-path')).root;

    testInstance.findAllByType(ListItem)[1].props.onClick({
        preventDefault: jest.fn()
    });

    expect(secretAction.getSecrets).lastCalledWith('Mock-KV-v2-Mount/data/test-path/test-secret-data');
});

it('retrieves secrets data with full path on clicking secrets with read-only permission', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v2-Mount/test-path')).root;

    testInstance.findAllByType(ListItem)[3].props.onClick({
        preventDefault: jest.fn()
    });

    expect(secretAction.getSecrets).lastCalledWith('Mock-KV-v2-Mount/data/test-path/test-secret-data-read-only');
});

it('sets secrets data on clicking secrets with read-only permission if data already exists', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v2-Mount/test-path')).root;

    testInstance.findAllByType(ListItem)[4].props.onClick({
        preventDefault: jest.fn()
    });

    expect(secretAction.setSecretsData).toHaveBeenCalledTimes(1);
});

it('opens the confirmation modal on clicking an approved dynamic secrets request', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-AWS-Mount')).root;

    testInstance.findAllByType(ListItem)[5].props.onClick({
        preventDefault: jest.fn()
    });

    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(true);
});

it('opens the confirmation modal on clicking an approved control group request', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v1-Mount')).root;

    testInstance.findAllByType(ListItem)[6].props.onClick({
        preventDefault: jest.fn()
    });

    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(true);
});

it('unwraps an approved control group request on confirmation', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v1-Mount')).root;

    testInstance.findAllByType(ListItem)[6].props.onClick({
        preventDefault: jest.fn()
    });

    testInstance.findByType(ConfirmationModal).props.onClose({
        confirm: true
    });
    expect(secretAction.unwrapSecret).toHaveBeenCalledTimes(1);
});

it('retrieves secrets data on clicking an approved standard request', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v1-Mount')).root;

    testInstance.findAllByType(ListItem)[5].props.onClick({
        preventDefault: jest.fn()
    });

    expect(secretAction.openApprovedSecret).toBeCalledWith('Mock-KV-v1-Mount/approved-test-data');
});

it('opens the secrets request modal on clicking an unapproved secret', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v1-Mount')).root;

    testInstance.findAllByType(ListItem)[7].props.onClick({
        preventDefault: jest.fn()
    });

    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(true);
    expect(testInstance.findByType(ConfirmationModal).props.content).toMatch(/has been locked through standard request/i);
});

it('opens the request cancellation modal on clicking an unapproved pending secret', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v1-Mount')).root;

    testInstance.findAllByType(ListItem)[8].props.onClick({
        preventDefault: jest.fn()
    });

    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(true);
    expect(testInstance.findByType(ConfirmationModal).props.title).toMatch(/cancel privilege access request/i);
});

it('opens the confirmation modal on clicking the delete icon', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v1-Mount')).root;

    const deleteButton = testInstance.findAllByType(IconButton).find((instance) => instance.props.title === 'Delete');
    deleteButton.props.onClick({
        preventDefault: jest.fn()
    });
    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(true);
    expect(testInstance.findByType(ConfirmationModal).props.title).toMatch(/delete/i);
});

it('deletes a secret on confirmation', () => {
    const testInstance = renderer.create(_getInstance(undefined, '/secrets/Mock-KV-v1-Mount')).root;

    const deleteButton = testInstance.findAllByType(IconButton).find((instance) => instance.props.title === 'Delete');
    deleteButton.props.onClick({
        preventDefault: jest.fn()
    });
    testInstance.findByType(ConfirmationModal).props.onClose({
        confirm: true
    });
    expect(secretAction.deleteSecrets).toHaveBeenCalledTimes(1);
});
