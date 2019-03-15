import _Actions from 'app/core/actions/_Actions';

/**
 * Actions class responsible for kv secrets engine related actions.
 *
 */
class KvAction extends _Actions {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     */
    constructor() {
        super('KvAction', {
            LIST_SECRETS: 'LIST_SECRETS'
        });
    }

    /**
     * Returns a list of key names at the specified location
     *
     * @param {string} path Specifies the path of the secrets to list
     * @returns {function} Redux dispatch function.
     */
    listSecrets(path = null) {
        return this._dispatchGet(this.ACTION_TYPES.LIST_SECRETS, path ? `/api/v1/secret/${path}?list=true` : '/api/v1/secret?list=true');
    }
}

export default new KvAction();
