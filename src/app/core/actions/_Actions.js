import localStorageUtil from 'app/util/localStorageUtil';

/**
 * Base action creator class that all concrete action creator classes should extend from.
 */
export default class _Actions {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @param {string} namespace - The concrete Action class name.
     * @param {string} actionTypes - Map of action types of the concrete Action class.
     * @public
     */
    constructor(namespace, actionTypes) {

        /**
         * Action types map to be set by the extending concrete Action class.
         *
         * @public
         */
        this.ACTION_TYPES = {};

        // Namespace the action type by prepending the class name.
        Object.keys(actionTypes).forEach(key => {
            this.ACTION_TYPES[key] = `${namespace}-${actionTypes[key]}`;
        });
    }

    /**
     * Dispatches a GET call.
     *
     * @protected
     * @param {string} type - The action type.
     * @param {string} url - The XHR url.
     * @param {Object} [data] - The data to query by.
     * @param {Object} [headers] - custom headers
     * @returns {function} Redux dispatch function.
     */
    _dispatchGet(type, url, data, headers) {
        return this._orchestrateRequest('GET', type, url, data, headers);
    }

    /**
     * Dispatches a POST call.
     *
     * @protected
     * @param {string} type - The action type.
     * @param {string} url - The XHR url.
     * @param {Object} [data] - The data to post.
     * @param {Object} [headers] - custom headers
     * @returns {function} Redux dispatch function.
     */
    _dispatchPost(type, url, data, headers) {
        return this._orchestrateRequest('POST', type, url, data, headers);
    }

    /**
     * Dispatches a PUT call.
     *
     * @protected
     * @param {string} type - The action type.
     * @param {string} url - The XHR url.
     * @param {Object} [data] - The data to post.
     * @param {Object} [headers] - custom headers
     * @returns {function} Redux dispatch function.
     */
    _dispatchPut(type, url, data, headers) {
        return this._orchestrateRequest('PUT', type, url, data, headers);
    }

    /**
     * Dispatches a DELETE call.
     *
     * @protected
     * @param {string} type - The action type.
     * @param {string} url - The XHR url.
     * @param {Object} [data] - The data to query by.
     * @param {Object} [headers] - custom headers
     * @returns {function} Redux dispatch function.
     */
    _dispatchDelete(type, url, data, headers) {
        return this._orchestrateRequest('DELETE', type, url, data, headers);
    }

    /**
     * Orchestrates the REST call by dispatching the initial request, followed up by dispatching the response.
     *
     * @private
     * @param {string} method - The HTTP method.
     * @param {string} type - The action type.
     * @param {string} url - The XHR url.
     * @param {Object} data - The data to post or query by.
     * @param {Object} [headers] - custom headers
     * @returns {function} Redux dispatch function.
     */
    _orchestrateRequest(method, type, url, data, headers) {
        return dispatch => {
            // Kickoff the initial inProgress dispatch.
            dispatch(this._createResourceData(type, undefined, undefined, true));

            return new Promise((resolve, reject) => {
                this._fetch(method, url, data, headers).then(res => {
                    const responseData = this._createResourceData(type, undefined, res, false);
                    dispatch(responseData);
                    resolve(responseData);
                }).catch(err => {
                    const errorData = this._createResourceData(type, err.errors || [err], undefined, false);
                    dispatch(errorData);
                    reject(errorData);
                });
            });
        };
    }

    /**
     * Wrapper for a fetch call with client-triggered timeout logic.
     *
     * @protected
     * @param {string} method - The HTTP method.
     * @param {string} url - The XHR url.
     * @param {Object} data - The data to post or query by.
     * @param {Object} [headers] - custom headers
     * @returns {Promise}
     */
    _fetch(method, url, data, headers) {
        return new Promise((resolve, reject) => {
            let initData = { // Refer to https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch for full init data documentation.
                method,
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            if (data) {
                // If method is GET or DELETE, convert the data to query params.
                if (method === 'GET' || method === 'DELETE') {
                    url = `${url}?${Object.keys(data).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`).join('&')}`;
                } else {
                    initData = {
                        ...initData,
                        body: JSON.stringify(data)
                    };
                }
            }
            // Must pass the Vault domain and token if in local storage data.
            const vaultDomain = localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_DOMAIN);
            if (vaultDomain) {
                initData.headers['X-Vault-Domain'] = vaultDomain;
            }
            const vaultToken = window.app.store.getState().sessionReducer.vaultToken.data || localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN);
            if (headers && headers['X-Vault-Token']) {
                initData.headers['X-Vault-Token'] = headers['X-Vault-Token'];
            } else if (vaultToken) {
                initData.headers['X-Vault-Token'] = vaultToken;
            }
            let ok;
            /* global fetch */
            fetch(url, initData).then(res => {
                ok = res.ok;
                return res.headers.get('content-type').includes('application/json') && res.status !== 204 ? res.json() : res.text();
            }).then(response => {
                // If response data is already an object, resolve with the data object. Otherwise, wrap it in an object with "response" as the key.
                const responseData = typeof response === 'object' ? response : {response};
                // Reject the promise if response status is not OK, but still pass the response data.
                ok ? resolve(responseData) : reject(responseData);
            }).catch(reject);
        });
    }

    /**
     * Creates the response resource data.
     *
     * @protected
     * @param {string} type - Specified action type from the ACTION_TYPES constant.
     * @param {Array} errors - The error data field of the REST call returned with an array of errors.
     * @param {Object} data - The response data field if the REST call was successful.
     * @param {Object} inProgress - Indicator if the REST call is in-flight.
     * @returns {Object} Resource data.
     */
    _createResourceData(type, errors, data, inProgress) {
        return {
            type,
            errors,
            data,
            inProgress
        };
    }

    /**
     * Injects meta data into the provided response data.
     *
     * @public
     * @param {*} data - The concrete response data to inject the meta data into.
     * @param {Object} action - Action type.
     * @returns {Object} The updated data.
     */
    injectMetaData(data, action) {
        if (action) {
            const {errors, inProgress} = action;
            data._meta = {errors, inProgress};
        }
        return data;
    }
}
