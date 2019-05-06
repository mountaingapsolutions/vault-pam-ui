import localStorageUtil from 'app/util/localStorageUtil';

/**
 * Logger utility class.
 */
class Logger {

    /**
     * Wrapper for a fetch call.
     *
     * @protected
     * @param {string} url - The XHR url.
     * @param {Object} data - The data to post or query by.
     * @returns {Promise}
     */
    _xhrRequestPost(url, data) {
        return new Promise((resolve, reject) => {
            let isTimeout = false;
            let timeoutId;

            timeoutId = setTimeout(() => {
                reject({
                    error: `Timeout from: ${url}`
                });
                isTimeout = true;
            }, 30000);

            let postData = {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            if (data) {
                postData = {
                    ...postData,
                    body: JSON.stringify(data)
                };
            }
            postData.headers['X-Vault-Token'] = window.app.store.getState().sessionReducer.vaultToken.data || localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN);

            let ok;
            fetch(url, postData).then(res => {
                ok = res.ok;
                return res.headers.get('content-type').includes('application/json') ? res.json() : res.text();
            }).then(response => {
                const responseData = typeof response === 'object' ? response : {response};
                if (!isTimeout) {
                    if (ok) {
                        resolve(responseData);
                    } else {
                        reject(responseData);
                    }
                    clearTimeout(timeoutId);
                }
            }).catch(err => reject(err));
        });
    }

    /**
     * Helper method to map data in an object
     * @param {*} data The data to log.
     * @return {Object}
     */
    _mapToObject = data => {
        return typeof data === 'object' ? data : {message: data};
    };

    /**
     * Output with log level 'error'.
     *
     * @public
     * @param {Object} params - user object
     */
    error(params) {
        const paramsData = this._mapToObject(params);
        this.print({
            ...paramsData,
            level: 'error'
        });
    }

    /**
     * Output with log level 'warn'.
     *
     * @public
     * @param {Object} params - user object
     */
    warn(params) {
        const paramsData = this._mapToObject(params);
        this.print({
            ...paramsData,
            level: 'warn'
        });
    }

    /**
     * Output with log level 'info'.
     *
     * @public
     * @param {Object} params - user object
     */
    info(params) {
        const paramsData = this._mapToObject(params);
        this.print({
            ...paramsData,
            level: 'info'
        });
    }

    /**
     * Output with log level 'log'.
     *
     * @public
     * @param {Object} params - user object
     */
    log(params) {
        const paramsData = this._mapToObject(params);
        this.print({
            ...paramsData,
            level: 'info'
        });
    }

    /**
     * The main log method.
     *
     * @public
     * @param {...*} params - The list of params.
     */
    print(params = {}) {
        this._xhrRequestPost('/rest/log',
            {...params});
    }
}

export default new Logger();
