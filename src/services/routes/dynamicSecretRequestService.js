const request = require('request');
const {initApiRequest, getDomain} = require('services/utils');

/**
 * Get dynamic engine roles.
 *
 * @param {string} engineName The engine.
 * @returns {Promise<void>}
 */
const getDynamicEngineRoles = engineName => {
    return new Promise((resolve, reject) => {
        const domain = getDomain();
        const {VAULT_API_TOKEN: apiToken} = process.env;
        const apiUrl = `${domain}/v1/${engineName}/roles?list=true`;
        request({
            ...initApiRequest(apiToken, apiUrl),
            method: 'GET'
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

/**
 * Request credential for dynamic secret.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise<void>}
 */
const createCredential = req => {
    return new Promise((resolve, reject) => {
        const domain = getDomain();
        const {path} = req.body;
        const engineRole = path.split('/');
        //TODO what token to use API or user?
        const {VAULT_API_TOKEN: apiToken} = process.env;
        const apiUrl = `${domain}/v1/${engineRole[0]}/creds/${engineRole[1]}`;
        request({
            ...initApiRequest(apiToken, apiUrl),
            method: 'POST'
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

module.exports = {
    createCredential,
    getDynamicEngineRoles
};
