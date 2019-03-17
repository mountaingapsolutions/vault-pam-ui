import localStorageAction from 'app/core/actions/localStorageAction';

/**
 * Reducer class responsible for reacting to and handling local storage calls.
 *
 */

/**
 * The primary reduce method.
 *
 * @public
 * @param {Object} previousState - The previous state.
 * @param {Object} action - Action type.
 * @returns {Object} The updated state.
 */
export default (previousState = {
    activeVaultDomain: '',
    vaultDomains: []
}, action) => {
    switch (action.type) {
        case localStorageAction.ACTION_TYPES.ADD_VAULT_DOMAIN:
            const updatedVaultDomains = [...previousState.vaultDomains];
            if (previousState.vaultDomains.includes(action.data)) {
                updatedVaultDomains.push(action.data);
            }
            return {
                ...previousState,
                activeVaultDomain: action.data,
                vaultDomains: updatedVaultDomains.sort()
            };
        case localStorageAction.ACTION_TYPES.GET_ACTIVE_VAULT_DOMAIN:
            return {
                ...previousState,
                activeVaultDomain: action.data
            };
        case localStorageAction.ACTION_TYPES.GET_VAULT_DOMAINS:
            return {
                ...previousState,
                vaultDomains: action.data.sort()
            };
        case localStorageAction.ACTION_TYPES.REMOVE_VAULT_DOMAIN:
            return {
                ...previousState,
                vaultDomains: previousState.vaultDomains.filter(domain => domain !== action.data)
            };
        default:
            return {...previousState};
    }
};
