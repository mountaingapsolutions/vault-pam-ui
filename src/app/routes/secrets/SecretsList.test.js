/* global afterAll, beforeEach, expect, it, jest */
import {IconButton, ListItem} from '@material-ui/core';
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
import ConfirmationModal from 'app/core/components/ConfirmationModal';
import reduxThunk from 'redux-thunk';

jest.mock('app/core/actions/secretAction');
jest.mock('app/core/components/ConfirmationModal');
jest.mock('app/core/components/CreateUpdateSecretModal');

const MOUNT_NO_SUB_DIRECTORY = 'mockMount';
const MOUNT_WITH_SUB_DIRECTORY = `${MOUNT_NO_SUB_DIRECTORY}/`;

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

const MOCK_SERCRETS_MOUNTS = {secretsMounts: {
    data: [{options: {},
        type: 'mockType',
        name: MOUNT_WITH_SUB_DIRECTORY}]}};

const MOCK_SECRETS_PATHS = {secretsPaths: {secrets: [
    {name: MOUNT_WITH_SUB_DIRECTORY,
        capabilities: ['read'],
        data: {wrap_info: {
            token: 'mocktoken234124kjh',
            accessor: 'testaccessor',
            creation_time: '2019-06-06T19:07:52Z',
            creation_path: 'mockName/data/test/mockUser'}}}]}};

const MOCK_SECRETS_REQUESTS = {secretsRequests: [
    {approved: true,
        creationTime: '2019-05-30T19:55:01.833Z',
        authorizations: [
            {id: 78,
                type: 'APPROVED',
                name: 'testadmin'}],
        isWrapped: false,
        id: 39,
        opened: false,
        path: 'undefined/mockMount', //TODO undefined -> having issue passing the mount through Router
        type: 'standard-request'}]};

const DEFAULT_MOCK_STATE = {
    secretReducer: {
        ...MOCK_SERCRETS_MOUNTS,
        ...MOCK_SECRETS_PATHS,
        ...MOCK_SECRETS_REQUESTS
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

    secretAction.deleteRequest.mockImplementation(() => () => new Promise((resolve) => resolve({})));
    secretAction.deleteSecrets.mockImplementation(() => () => new Promise((resolve) => resolve({})));
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

it('list secret mounts after component mounting', () => {
    renderer.create(_getInstance(DEFAULT_SECRET_REDUCER_STATE));

    return new Promise((resolve) => {
        setTimeout(() => {
            expect(secretAction.listMounts).toHaveBeenCalledTimes(1);
            expect(secretAction.listSecretsAndCapabilities).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});

it('clicking a secret mount and listing its sub-mount', () => {
    const testInstance = renderer.create(_getInstance()).root;

    const mountBtn = testInstance.findAllByType(ListItem)[0].props;
    mountBtn.onClick({preventDefault: jest.fn()});

    return new Promise((resolve) => {
        setTimeout(() => {
            //WILL BE CALLED TWICE
            //1. AFTER MOUNTING
            //2. AFTER CLICKING THE PARENT MOUNT
            expect(secretAction.listSecretsAndCapabilities).toHaveBeenCalledTimes(2);
            resolve();
        }, 0);
    });
});

it('deleting a secret mount', () => {
    let newState = {...DEFAULT_MOCK_STATE};
    newState.secretReducer.secretsPaths.secrets[0].capabilities.push('delete');
    newState.secretReducer.secretsPaths.secrets[0].name = MOUNT_NO_SUB_DIRECTORY;

    const testInstance = renderer.create(_getInstance(newState)).root;

    //LIST COMPONENT - DELETE FUNCTIONALITY
    const mountBtn = testInstance.findAllByType(ListItem)[0].props;
    mountBtn.onClick({preventDefault: jest.fn()});

    //ICON BUTTON COMPONENT - DELETE FUNCTIONALITY
    const iconDeleteBtn = testInstance.findAllByType(IconButton)[0].props;
    iconDeleteBtn.onClick({preventDefault: jest.fn()});

    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(true);
    expect(testInstance.findByType(ConfirmationModal).props.title).toBe(`Delete ${MOUNT_NO_SUB_DIRECTORY}?`);

    //CONFIRMATION MODAL
    const confirmationModal = testInstance.findAllByType(ConfirmationModal)[0].props;
    confirmationModal.onClose({confirm: true});
    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(false);

    return new Promise((resolve) => {
        setTimeout(() => {
            expect(secretAction.deleteSecrets).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});

it('unwraps control-groups approved secret request', () => {
    let newState = {...DEFAULT_MOCK_STATE};
    newState.secretReducer.secretsPaths.secrets[0].name = MOUNT_NO_SUB_DIRECTORY;
    newState.secretReducer.secretsPaths.secrets[0].capabilities.pop();

    const testInstance = renderer.create(_getInstance(newState)).root;

    //LIST COMPONENT - OPEN FUNCTIONALITY
    const mountBtn = testInstance.findAllByType(ListItem)[0].props;
    mountBtn.onClick({preventDefault: jest.fn()});

    //ICON BUTTON COMPONENT - OPEN FUNCTIONALITY
    const iconBtnOpen = testInstance.findAllByType(IconButton)[0].props;
    iconBtnOpen.onClick({preventDefault: jest.fn()});

    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(true);
    expect(testInstance.findByType(ConfirmationModal).props.title).toBe(`Open ${MOUNT_NO_SUB_DIRECTORY}?`);

    //CONFIRMATION MODAL
    const confirmationModal = testInstance.findAllByType(ConfirmationModal)[0].props;
    confirmationModal.onClose({confirm: true});
    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(false);

    return new Promise((resolve) => {
        setTimeout(() => {
            expect(secretAction.unwrapSecret).toHaveBeenCalledTimes(1);
            expect(secretAction.listSecretsAndCapabilities).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});

it('open approved secret request', () => {
    let newState = {...DEFAULT_MOCK_STATE};
    newState.secretReducer.secretsPaths.secrets[0].capabilities.pop();
    newState.secretReducer.secretsPaths.secrets[0].data.wrap_info = null;

    const testInstance = renderer.create(_getInstance(newState)).root;

    const mountBtn = testInstance.findAllByType(ListItem)[0].props;
    mountBtn.onClick({preventDefault: jest.fn()});

    return new Promise((resolve) => {
        setTimeout(() => {
            expect(secretAction.openApprovedSecret).toHaveBeenCalledTimes(1);
            expect(secretAction.listSecretsAndCapabilities).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});

it('get secrets, with update capabilities', () => {
    let newState = {...DEFAULT_MOCK_STATE};
    newState.secretReducer.secretsPaths.secrets[0].capabilities.push('update');

    const testInstance = renderer.create(_getInstance(newState)).root;

    const mountBtn = testInstance.findAllByType(ListItem)[0].props;
    mountBtn.onClick({preventDefault: jest.fn()});

    return new Promise((resolve) => {
        setTimeout(() => {
            expect(secretAction.getSecrets).toHaveBeenCalledTimes(1);
            expect(secretAction.listSecretsAndCapabilities).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});

it('setting secret data', () => {
    const testInstance = renderer.create(_getInstance()).root;

    //LIST COMPONENT - OPEN FUNCTIONALITY
    const mountBtn = testInstance.findAllByType(ListItem)[0].props;
    mountBtn.onClick({preventDefault: jest.fn()});

    //ICON BUTTON COMPONENT - OPEN FUNCTIONALITY
    const iconBtnOpen = testInstance.findAllByType(IconButton)[0].props;
    iconBtnOpen.onClick({preventDefault: jest.fn()});

    return new Promise((resolve) => {
        setTimeout(() => {
            expect(secretAction.setSecretsData).toHaveBeenCalledTimes(1);
            expect(secretAction.listSecretsAndCapabilities).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });
});

it('cancelling secret request', () => {
    let newState = {...DEFAULT_MOCK_STATE};
    newState.secretReducer.secretsPaths.secrets[0].capabilities.pop();
    newState.secretReducer.secretsRequests[0].approved = false;

    const testInstance = renderer.create(_getInstance(newState)).root;

    //LIST COMPONENT - CANCEL FUNCTIONALITY
    const mountBtn = testInstance.findAllByType(ListItem)[0].props;
    mountBtn.onClick({preventDefault: jest.fn()});

    //ICON BUTTON COMPONENT - CANCEL FUNCTIONALITY
    const iconBtnCancel = testInstance.findAllByType(IconButton)[0].props;
    iconBtnCancel.onClick({preventDefault: jest.fn()});
    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(true);

    //CONFIRMATION MODAL
    const confirmationModal = testInstance.findAllByType(ConfirmationModal)[0].props;
    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(true);
    expect(testInstance.findByType(ConfirmationModal).props.title).toBe('Cancel Privilege Access Request');
    confirmationModal.onClose({confirm: true});

    return new Promise((resolve) => {
        setTimeout(() => {
            expect(secretAction.deleteRequest).toHaveBeenCalledTimes(1);
            expect(secretAction.listSecretsAndCapabilities).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });

});

it('requesting a secret', () => {
    let newState = {...DEFAULT_MOCK_STATE};
    newState.secretReducer.secretsPaths.secrets[0].capabilities.pop();
    newState.secretReducer.secretsRequests.pop();

    const testInstance = renderer.create(_getInstance(newState)).root;

    //LIST COMPONENT - OPEN FUNCTIONALITY
    const mountBtn = testInstance.findAllByType(ListItem)[0].props;
    mountBtn.onClick({preventDefault: jest.fn()});

    //ICON BUTTON COMPONENT - OPEN FUNCTIONALITY
    const iconOpenBtn = testInstance.findAllByType(IconButton)[0].props;
    iconOpenBtn.onClick({preventDefault: jest.fn()});
    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(true);

    //CONFIRMATION MODAL
    const confirmationModal = testInstance.findAllByType(ConfirmationModal)[0].props;
    expect(testInstance.findByType(ConfirmationModal).props.open).toBe(true);
    expect(testInstance.findByType(ConfirmationModal).props.title).toBe('Privilege Access Request');
    confirmationModal.onClose({confirm: true});

    return new Promise((resolve) => {
        setTimeout(() => {
            expect(secretAction.requestSecret).toHaveBeenCalledTimes(1);
            expect(secretAction.listSecretsAndCapabilities).toHaveBeenCalledTimes(1);
            resolve();
        }, 0);
    });

});
