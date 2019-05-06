/* global localStorage */
import Logger from 'app/util/Logger';

/**
 * Utility class to handle localStorage operations.
 *
 */
class LocalStorageUtil {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     */
    constructor() {
        this.KEY_NAMES = {
            VAULT_TOKEN: 'vault-token'
        };

        this._keyValues = Object.values(this.KEY_NAMES);
    }

    /**
     * Executes the call to get a key's value from localStorage.
     *
     * @param {string} keyName - key name
     * @public
     * @returns {string}
     */
    getItem(keyName) {
        this._validate(keyName);
        return localStorage.getItem(keyName);
    }

    /**
     * Executes the call to add a key to localStorage, or update that key's value if it already exists.
     *
     * @param {string} keyName - key name
     * @param {boolean|string} keyValue - key value
     * @public
     */
    setItem(keyName, keyValue) {
        this._validate(keyName);
        localStorage.setItem(keyName, keyValue);
    }

    /**
     * Executes the call to remove an item from localStorage.
     *
     * @param {string} keyName The key name.
     * @public
     */
    removeItem(keyName) {
        this._validate(keyName);
        localStorage.removeItem(keyName);
    }

    /**
     * Executes the call to empty all keys out from localStorage.
     *
     * @public
     */
    clear() {
        localStorage.clear();
    }

    /**
     * Validates the specified key name.
     *
     * @param {string} keyName The key name.
     * @private
     */
    _validate(keyName) {
        if (!this._keyValues.includes(keyName)) {
            const message = `Invalid key: ${keyName}.`;
            Logger.error(message);
            throw new Error(message);
        }
    }
}

export default new LocalStorageUtil();
