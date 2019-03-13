import _Actions from 'app/core/actions/_Actions';

/**
 * Actions class responsible for handling session management such as authentication and client configuration.
 *
 * @author Mountain Gap Solutions
 * @copyright ©2019 Shorelight Education
 */
class SessionAction extends _Actions {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     */
    constructor() {
        super('SessionAction', {
            SET_DOMAIN: 'SET_DOMAIN',
            SET_TOKEN: 'SET_TOKEN',
            VALIDATE_DOMAIN: 'VALIDATE_DOMAIN',
            VALIDATE_TOKEN: 'VALIDATE_TOKEN'
        });
    }

    /**
     * Sets the domain within the client model.
     *
     * @param {string} domain The domain to set.
     * @returns {Object}
     */
    setDomain(domain) {
        return this._createResourceData(this.ACTION_TYPES.SET_DOMAIN, undefined, domain, false);
    }

    /**
     * Sets the token within the client model.
     *
     * @param {string} token The token to set.
     * @returns {Object}
     */
    setToken(token) {
        return this._createResourceData(this.ACTION_TYPES.SET_TOKEN, undefined, token, false);
    }

    /**
     * Validates the specified Vault server domain.
     *
     * @param {string} domain - The domain to validate.
     * @returns {function} Redux dispatch function.
     */
    validateServer(domain) {
        return this._dispatchGet(this.ACTION_TYPES.VALIDATE_DOMAIN, '/validate', {domain});
    }

    /**
     * Validates the specified Vault token. Note: the token is retrieved from local storage.
     *
     * @returns {function} Redux dispatch function.
     */
    validateToken() {
        return this._dispatchGet(this.ACTION_TYPES.VALIDATE_TOKEN, '/api/v1/auth/token/lookup-self');
    }
}

export default new SessionAction();
