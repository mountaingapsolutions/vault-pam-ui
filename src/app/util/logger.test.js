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
const HTTP_RESPONSE = {
    headers: {'Content-Type': 'application/json'}
};
global.window.app = {
    store: {
        getState: jest.fn(() => DEFAULT_MOCK_STATE)
    }
};

beforeEach(() => {
    fetch.resetMocks();

    fetch.mockResponseOnce(JSON.stringify(DATA), HTTP_RESPONSE);
});

it('fetches data from server when server returns a successful response', () => {
    const path = '/foo/bar';
    const response = {
        ...HTTP_RESPONSE.headers,
        'X-Vault-Token': {
            data: DEFAULT_MOCK_STATE.sessionReducer.vaultToken.data.data
        }
    };
    expect(logger._xhrRequestPost(path, JSON.stringify(DATA))).resolves.toEqual(DATA);
    // check response headers and data
    expect(fetch.mock.calls).toHaveLength(1);
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
    expect(fetch.mock.calls).toHaveLength(1);
    expect(fetch.mock.calls[0][0]).toEqual(path);
    expect(fetch.mock.calls[0][1].method).toEqual('POST');
    expect(fetch.mock.calls[0][1].headers).toMatchObject(response);
});

it('map data in an object', () => {
    const dataString = JSON.stringify(DATA);
    expect(logger._mapToObject(DATA) === DATA).toBe(true);
    expect(logger._mapToObject(dataString).message === dataString).toBe(true);
});

it('print logger successful', () => {
    logger.print(DATA);
    expect(fetch.mock.calls).toHaveLength(1);
    expect(fetch.mock.calls[0][1].body).toEqual(JSON.stringify(DATA));
});

it('info logger successful', () => {
    logger.info(DATA);
    const responseData = {...DATA, level: 'info'};
    expect(fetch.mock.calls).toHaveLength(1);
    expect(fetch.mock.calls[0][1].body).toEqual(JSON.stringify(responseData));
});

it('log logger successful', () => {
    logger.log(DATA);
    const responseData = {...DATA, level: 'info'};
    expect(fetch.mock.calls).toHaveLength(1);
    expect(fetch.mock.calls[0][1].body).toEqual(JSON.stringify(responseData));
});

it('warn logger successful', () => {
    logger.warn(DATA);
    const responseData = {...DATA, level: 'warn'};
    expect(fetch.mock.calls).toHaveLength(1);
    expect(fetch.mock.calls[0][1].body).toEqual(JSON.stringify(responseData));
});

it('error logger successful', () => {
    logger.error(DATA);
    const responseData = {...DATA, level: 'error'};
    expect(fetch.mock.calls).toHaveLength(1);
    expect(fetch.mock.calls[0][1].body).toEqual(JSON.stringify(responseData));
});
