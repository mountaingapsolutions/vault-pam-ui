/* global beforeEach, expect, it, jest */
import logger from 'app/util/logger';

global.fetch = require('jest-fetch-mock');

const DATA = {foo: 'bar'};
const DEFAULT_MOCK_STATE = {
    sessionReducer: {
        vaultToken: {
            data: {
                data: {
                    policies: []
                }
            }
        }
    },

};

global.window.app = {
    store: {
        getState: jest.fn(() => DEFAULT_MOCK_STATE)
    }
};

beforeEach(() => {
    fetch.resetMocks();
});

it('fetches data from server when server returns a successful response', () => {
    const httpResponse = {
        headers: {'Content-Type': 'application/json'}
    };
    const path = '/foo/bar';
    const response = {
        ...httpResponse.headers,
        'X-Vault-Token': {
            data: DEFAULT_MOCK_STATE.sessionReducer.vaultToken.data.data
        }
    };

    fetch.mockResponseOnce(JSON.stringify(DATA), httpResponse);
    logger._xhrRequestPost(path, JSON.stringify(DATA)).then(res => {
        expect(res).toEqual(DATA);
    });
    // check response headers and data
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual(path);
    expect(fetch.mock.calls[0][1].method).toEqual('POST');
    expect(fetch.mock.calls[0][1].headers).toMatchObject(response);
});

it('server returns an error response', () => {
    const httpResponse = null;
    const path = null;
    const response = {};

    fetch.mockResponseOnce(JSON.stringify(DATA), httpResponse);
    logger._xhrRequestPost(path, JSON.stringify(DATA)).catch((err) => {
        expect(err.message).toBe('Cannot read property \'size\' of null');
    });
    // check response headers and data
    expect(fetch.mock.calls.length).toEqual(1);
    expect(fetch.mock.calls[0][0]).toEqual(path);
    expect(fetch.mock.calls[0][1].method).toEqual('POST');
    expect(fetch.mock.calls[0][1].headers).toMatchObject(response);
});

it('map data in an object', () => {
    const dataString = JSON.stringify(DATA);
    expect(logger._mapToObject(DATA) === DATA).toBeTruthy();
    expect(logger._mapToObject(dataString).message === dataString).toBeTruthy();
});
