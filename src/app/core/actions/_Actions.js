/**
 * Base action creator class that all concrete action creator classes should extend from.
 *
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
         * The default XHR timeout.
         *
         * @protected
         */
        this.DEFAULT_TIMEOUT = 60000;

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
     * @param {Object} data - The data to query by.
     * @returns {function} Redux dispatch function.
     */
    _dispatchGet(type, url, data) {
        return this._handleXhr('GET', type, url, data);
    }

    /**
     * Dispatches a POST call.
     *
     * @protected
     * @param {string} type - The action type.
     * @param {string} url - The XHR url.
     * @param {Object} data - The data to post.
     * @returns {function} Redux dispatch function.
     */
    _dispatchPost(type, url, data) {
        return this._handleXhr('POST', type, url, data);
    }

    /**
     * Dispatches a PUT call.
     *
     * @protected
     * @param {string} type - The action type.
     * @param {string} url - The XHR url.
     * @param {Object} data - The data to post.
     * @returns {function} Redux dispatch function.
     */
    _dispatchPut(type, url, data) {
        return this._handleXhr('PUT', type, url, data);
    }

    /**
     * Dispatches a DELETE call.
     *
     * @protected
     * @param {string} type - The action type.
     * @param {string} url - The XHR url.
     * @param {Object} data - The data to query by.
     * @returns {function} Redux dispatch function.
     */
    _dispatchDelete(type, url, data) {
        return this._handleXhr('DELETE', type, url, data);
    }

    /**
     * Base handler for all XHR calls.
     *
     * @private
     * @param {string} method - The HTTP method.
     * @param {string} type - The action type.
     * @param {string} url - The XHR url.
     * @param {Object} data - The data to post or query by.
     * @returns {function} Redux dispatch function.
     */
    _handleXhr(method, type, url, data) {
        return dispatch => {
            // Kickoff the initial inProgress dispatch.
            dispatch(this._createRequest(type));

            this._xhrRequest(method, url, data).then(res => dispatch(this._createResponse(type, undefined, res))).catch(err => dispatch(this._createResponse(type, err)));
        };
    }

    /**
     * Wrapper for a fetch call with client-triggered timeout logic.
     *
     * @protected
     * @param {string} method - The HTTP method.
     * @param {string} url - The XHR url.
     * @param {Object} data - The data to post or query by.
     * @param {boolean} [withoutTimeout] - Flag to avoid timeout (intended for calls that are known to be long running).
     * @returns {Promise}
     */
    _xhrRequest(method, url, data, withoutTimeout) {
        return new Promise((resolve, reject) => {
            let isTimeout = false;
            let timeoutId;
            if (!withoutTimeout) {
                timeoutId = setTimeout(() => {
                    reject({
                        error: `Client timeout from: ${url}`
                    });
                    isTimeout = true;
                }, this.DEFAULT_TIMEOUT);
            }

            let postData = {
                method
            };
            if (data) {
                // If method is GET or DELETE, convert the data to query params.
                if (method === 'GET' || method === 'DELETE') {
                    url = `${url}?${Object.keys(data).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`).join('&')}`;
                } else {
                    postData = {
                        ...postData,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    };
                }
            }

            let ok;
            /* global fetch */
            fetch(url, postData).then(res => {
                ok = res.ok;
                return res.headers.get('content-type').includes('application/json') ? res.json() : res.text();
            }).then(response => {
                // If response data is already an object, resolve with the data object. Otherwise, wrap it in an object with "response" as the key.
                const responseData = typeof response === 'object' ? response : {response};
                if (!isTimeout) {
                    // Reject the promise if response status is not OK, but still pass the response data.
                    if (ok) {
                        resolve(responseData);
                    } else {
                        reject(responseData);
                    }
                    // Make sure to clear the timeout if we have a response.
                    clearTimeout(timeoutId);
                }
            }).catch(err => reject(err));
        });
    }

    /**
     * Creates the request resource data.
     *
     * @protected
     * @param {string} actionType - Specified action type from the ACTION_TYPES constant.
     * @returns {Object} Resource data.
     */
    _createRequest(actionType) {
        return this._createResourceData(actionType, undefined, undefined, true);
    }

    /**
     * Creates the response resource data.
     *
     * @protected
     * @param {string} actionType - Specified action type from the ACTION_TYPES constant.
     * @param {Object} [err] - The error data field if the REST call returned with an error.
     * @param {Object} [res] - The response data field if the REST call was successful.
     * @returns {Object} Resource data.
     */
    _createResponse(actionType, err, res) {
        return this._createResourceData(actionType, err, res, false);
    }

    /**
     * Helper method to create the common resource data object.
     *
     * @private
     * @param {string} type - Specified action type from the ACTION_TYPES constant.
     * @param {Object} [error] - The error data from an unsuccessful response.
     * @param {Object} [data] - The response data from a successful response.
     * @param {Object} [inProgress] - Indicator for whether or not this is an in-flight response.
     * @returns {Object} Resource data.
     */
    _createResourceData(type, error, data, inProgress = false) {
        return {
            _meta: {
                error,
                inProgress,
                timestamp: Date.now()
            },
            type,
            data
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
        if (data && action) {
            return {
                _meta: {
                    ...action._meta
                },
                ...data
            }
        }
        return data;
    }
}
