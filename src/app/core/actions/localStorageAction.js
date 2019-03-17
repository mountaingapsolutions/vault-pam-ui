import _Actions from 'app/core/actions/_Actions';
import localStorageUtil from 'app/util/localStorageUtil';

/**
 * Actions class responsible for handling local storage management.
 *
 */
class LocalStorageAction extends _Actions {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     */
    constructor() {
        super('LocalStorageAction', {
            ADD_VAULT_DOMAIN: 'ADD_VAULT_DOMAIN',
            GET_ACTIVE_VAULT_DOMAIN: 'GET_ACTIVE_VAULT_DOMAIN',
            GET_VAULT_DOMAINS: 'GET_VAULT_DOMAINS',
            REMOVE_VAULT_DOMAIN: 'REMOVE_VAULT_DOMAIN'
        });
    }

    /**
     * Adds the domain value to local storage.
     *
     * @param {string} domain The domain to add.
     * @returns {Object}
     */
    addVaultDomain(domain) {
        const domainsString = localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_DOMAINS);
        const domains = domainsString ? JSON.parse(domainsString) : [];
        const domainToAdd = domain.toLowerCase();
        if (!domains.includes(domainToAdd)) {
            domains.push(domainToAdd);
            localStorageUtil.setItem(localStorageUtil.KEY_NAMES.VAULT_DOMAINS, JSON.stringify(domains));
        }
        return this._createResourceData(this.ACTION_TYPES.ADD_VAULT_DOMAIN, undefined, domainToAdd, false);
    }

    /**
     * Returns the active Vault domain in local storage.
     *
     * @returns {Object}
     */
    getActiveVaultDomain() {
        const domain = localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_DOMAIN);
        return this._createResourceData(this.ACTION_TYPES.GET_ACTIVE_VAULT_DOMAIN, undefined, domain, false);
    }

    /**
     * Returns the current Vault domains in local storage.
     *
     * @returns {Object}
     */
    getVaultDomains() {
        const domainsString = localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_DOMAINS);
        const domains = domainsString ? JSON.parse(domainsString) : [];
        return this._createResourceData(this.ACTION_TYPES.GET_VAULT_DOMAINS, undefined, domains, false);
    }

    /**
     * Removes the Vault domain value from local storage.
     *
     * @param {string} domain The domain to remove.
     * @returns {Object}
     */
    removeVaultDomain(domain) {
        const domainsString = localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_DOMAINS);
        const domains = domainsString ? JSON.parse(domainsString) : [];
        const domainToRemove = domain.toLowerCase();
        localStorageUtil.setItem(localStorageUtil.KEY_NAMES.VAULT_DOMAINS, JSON.stringify(domains.filter(d => d !== domainToRemove)));
        return this._createResourceData(this.ACTION_TYPES.REMOVE_VAULT_DOMAIN, undefined, domainToRemove, false);
    }
}

export default new LocalStorageAction();
