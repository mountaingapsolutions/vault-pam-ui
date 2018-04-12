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
        return this._orchestrateRequest('GET', type, url, data);
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
        return this._orchestrateRequest('POST', type, url, data);
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
        return this._orchestrateRequest('PUT', type, url, data);
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
        return this._orchestrateRequest('DELETE', type, url, data);
    }

    /**
     * Orchestrates the REST call by dispatching the initial request, followed up by dispatching the response.
     *
     * @private
     * @param {string} method - The HTTP method.
     * @param {string} type - The action type.
     * @param {string} url - The XHR url.
     * @param {Object} data - The data to post or query by.
     * @returns {function} Redux dispatch function.
     */
    _orchestrateRequest(method, type, url, data) {
        return dispatch => {
            // Kickoff the initial inProgress dispatch.
            dispatch(this._createResourceData(type, undefined, undefined, true));

            this._fetch(method, url, data).then(res => {
                dispatch(this._createResourceData(type, undefined, res, false));
            }).catch(err => {
                dispatch(this._createResourceData(type, err, undefined, false));
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
     * @returns {Promise}
     */
    _fetch(method, url, data) {
        return new Promise((resolve, reject) => {
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
                // Reject the promise if response status is not OK, but still pass the response data.
                ok ? resolve(responseData) : reject(responseData);
            }).catch(err => reject(err));
        });
    }

    /**
     * Creates the response resource data.
     *
     * @private
     * @param {string} type - Specified action type from the ACTION_TYPES constant.
     * @param {Object} error - The error data field if the REST call returned with an error.
     * @param {Object} data - The response data field if the REST call was successful.
     * @param {Object} inProgress - Indicator if the REST call is in-flight.
     * @returns {Object} Resource data.
     */
    _createResourceData(type, error, data, inProgress) {
        return {
            type,
            error,
            data,
            inProgress
        };
    }
}
