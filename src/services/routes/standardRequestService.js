const request = require('request');

const RequestController = require('services/controllers/Request');
const requestLib = require('request');
const logger = require('services/logger');
const {initApiRequest, getDomain} = require('services/utils');
const {REQUEST_STATUS} = require('services/constants');

/**
 * Retrieves all user entity ids.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const _getUserIds = () => {
    return new Promise((resolve) => {
        const {VAULT_API_TOKEN: apiToken} = process.env;
        request(initApiRequest(apiToken, `${getDomain()}/v1/identity/entity/id?list=true`), (error, response, body) => {
            const entityIdMap = ((body || {}).data || {}).key_info || {};
            resolve(entityIdMap);
        });
    });
};

/**
 * Check if user is a member of approver group
 *
 * @private
 * @param {string} entityId user's entityId.
 * @returns {Promise}
 */
const _checkIfApprover = (entityId) => {
    return new Promise((resolve, reject) => {
        const {VAULT_API_TOKEN: apiToken} = process.env;

        if (!apiToken) {
            reject('No API token configured.');
        }

        const groupName = 'pam-approver';
        requestLib(initApiRequest(apiToken, `${getDomain()}/v1/identity/group/name/${groupName}`), (error, response, body) => {
            if (body && body.data) {
                const {member_entity_ids = []} = body.data || {};
                resolve(member_entity_ids.includes(entityId));
            } else {
                logger.error(`${groupName} group not found.`);
                resolve(false);
            }
        });
    });
};

/**
 * Get standard requests by status.
 *
 * @privtae
 * @param {string} entityId The entity id of the user in session.
 * @param {string} status The request status in database.
 * @returns {Promise}
 */
const _getRequestsByStatus = (entityId, status) => {
    return new Promise(async (resolve, reject) => {
        const isApprover = await _checkIfApprover(entityId);
        const params = {
            status
        };
        // If not an approver, only retrieve user's own requests.
        if (!isApprover) {
            params.requesterEntityId = entityId;
        }
        Promise.all([RequestController.findByParams(params), _getUserIds()]).then((results) => {
            const standardRequests = Array.isArray(results) && results[0] ? results[0] : [];
            const userIdMap = results[1];
            // Inject the requester name into each data value row.
            standardRequests.forEach((standardRequest) => {
                if (standardRequest.dataValues) {
                    const {requesterEntityId} = standardRequest.dataValues;
                    const name = (userIdMap[requesterEntityId] || {}).name || `<${requesterEntityId}>`;
                    standardRequest.dataValues.requesterName = name;
                }
            });
            resolve(standardRequests);
        }).catch(reject);
    });
};

/**
 * Get approved requests.
 *
 * @param {string} entityId The requester entity id.
 * @returns {Promise}
 */
const getApprovedRequests = (entityId) => {
    return RequestController.findByParams({
        requesterEntityId: entityId,
        status: REQUEST_STATUS.APPROVED
    });
};

/**
 * Get standard pending requests.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const getRequests = (req) => {
    return new Promise(async (resolve, reject) => {
        let result = [];
        try {
            const {entityId} = req.session.user;
            const data = await _getRequestsByStatus(entityId, REQUEST_STATUS.PENDING);
            result = result.concat(data);
        } catch (err) {
            reject({
                message: err,
                statusCode: 400
            });
        }
        resolve(result);
    });
};

/**
 * Create or update standard request by requester.
 *
 * @param {string} requesterEntityId The requester entity id.
 * @param {string} path The request path.
 * @param {string} status The request status.
 * @returns {Promise}
 */
const createOrUpdateStatusByRequester = (requesterEntityId, path, status) => {
    return new Promise((resolve, reject) => {
        RequestController.updateStatusByRequester(requesterEntityId, path, status)
            .then(async (results) => {
                if (results && Array.isArray(results)) {
                    if (results[0] === 0) {
                        logger.info(`Creating new request for ${requesterEntityId} for the path ${path}.`);
                        resolve(await RequestController.create(requesterEntityId, path, 'standard-request', REQUEST_STATUS.PENDING));
                        return;
                    }
                    if (results[0] > 1) {
                        logger.warn(`More than 1 record was updated for ${requesterEntityId} for the path ${path}...`);
                    }
                    resolve(results);
                } else {
                    reject({
                        message: 'Unexpected response',
                        status: 400
                    });
                }
            })
            .catch(reject);
    });
};

/**
 * Updates standard requests by approver.
 *
 * @param {string} approverEntityId The approver entity id.
 * @param {string} requesterEntityId The requester entity id.
 * @param {string} path The request path.
 * @param {string} status The request status.
 * @returns {Promise}
 */
const updateStandardRequestByApprover = (approverEntityId, requesterEntityId, path, status) => {
    return new Promise(async (resolve, reject) => {
        const isApprover = await _checkIfApprover(approverEntityId);
        if (isApprover) {
            RequestController.updateStatusByApprover(approverEntityId, requesterEntityId, path, status)
                .then(resolve)
                .catch(reject);
        } else {
            reject({
                message: 'Unauthorized',
                statusCode: 403
            });
        }
    });
};

module.exports = {
    createOrUpdateStatusByRequester,
    getApprovedRequests,
    getRequests,
    updateStandardRequestByApprover
};
