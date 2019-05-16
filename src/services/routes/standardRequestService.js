const request = require('request');

const RequestController = require('services/controllers/Request');
const requestLib = require('request');
const logger = require('services/logger');
const {initApiRequest, getDomain} = require('services/utils');
const {REQUEST_STATUS, REQUEST_TYPES} = require('services/constants');

/**
 * Retrieves all user entity ids.
 *
 * @private
 * @param {string} entityId the user's entity id
 * @param {string} token the user's Vault token.
 * @returns {Promise}
 */
const _getUserIds = (entityId, token) => {
    return new Promise((resolve) => {
        request(initApiRequest(token, `${getDomain()}/v1/identity/entity/id?list=true`, entityId, true), (error, response, body) => {
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
 * @param {string} token the user's Vault token.
 * @returns {Promise}
 */
const _checkIfApprover = (entityId, token) => {
    return new Promise((resolve) => {
        const groupName = 'pam-approver';
        requestLib(initApiRequest(token, `${getDomain()}/v1/identity/group/name/${groupName}`, entityId, true), (error, response, body) => {
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
 * @param {string} token the user's Vault token.
 * @param {string|Array} status The request status in database.
 * @returns {Promise}
 */
const _getRequestsByStatus = (entityId, token, status) => {
    return new Promise(async (resolve, reject) => {
        const isApprover = await _checkIfApprover(entityId, token);
        let params;
        if (Array.isArray(status)) {
            params = {
                [Symbol.for('or')]: status.map(s => {
                    return {
                        status: s
                    };
                })
            };
        } else {
            params = {
                status,

            };
        }
        // If not an approver, only retrieve user's own requests.
        if (!isApprover) {
            params.requesterEntityId = entityId;
        }
        Promise.all([RequestController.findByParams(params), _getUserIds(entityId, token)]).then((results) => {
            const standardRequests = Array.isArray(results) && results[0] ? results[0] : [];
            const userIdMap = results[1];
            // Inject the requester name into each data value row.
            standardRequests.forEach((standardRequest) => {
                if (standardRequest.dataValues) {
                    const {approverEntityId, requesterEntityId} = standardRequest.dataValues;
                    standardRequest.dataValues.requesterName = (userIdMap[requesterEntityId] || {}).name || `<${requesterEntityId}>`;
                    if (approverEntityId) {
                        standardRequest.dataValues.approverName = (userIdMap[approverEntityId] || {}).name || `<${approverEntityId}>`;
                    }
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
 * Get standard pending and approved requests.
 *
 * @param {Object} req The HTTP request object.
 * @param {Array} otherStatus Other status type to return.
 * @returns {Promise}
 */
const getRequests = (req, otherStatus = []) => {
    return new Promise(async (resolve, reject) => {
        let result = [];
        try {
            const {entityId, token} = req.session.user;
            const data = await _getRequestsByStatus(entityId, token, [REQUEST_STATUS.PENDING, REQUEST_STATUS.APPROVED, ...otherStatus]);
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
 * @param {Object} req The HTTP request object.
 * @param {string} requesterEntityId The requester entity id.
 * @param {string} path The request path.
 * @param {string} status The request status.
 * @param {string} type The request type.
 * @returns {Promise}
 */
const createOrUpdateStatusByRequester = (req, requesterEntityId, path, status, type = REQUEST_TYPES.STANDARD_REQUEST) => {
    return new Promise((resolve, reject) => {
        const {entityId, token} = req.session.user;
        let standardRequest;
        let requestError;
        let userIdMap;
        // Get user id map and invoke update status in parallel.
        const promises = [
            _getUserIds(entityId, token)
                .then((results) => {
                    userIdMap = results;
                }),
            new Promise((updateResolve) => {
                RequestController.updateStatusByRequester(requesterEntityId, path, status)
                    .then((results) => {
                        if (results && Array.isArray(results)) {
                            if (results[0] > 1) {
                                logger.warn(`More than 1 record was updated for ${requesterEntityId} for the path ${path}...`);
                            }
                            standardRequest = results[1];
                            updateResolve();
                        } else {
                            requestError = {
                                message: 'Unexpected response',
                                status: 400
                            };
                        }
                    })
                    .catch((err) => {
                        logger.info(`No existing status request: ${err.message}`);
                        if (status === REQUEST_STATUS.CANCELED) {
                            requestError = {
                                message: 'Request not found',
                                status: 404
                            };
                        } else {
                            logger.info(`Creating new request for ${requesterEntityId} for the path ${path}.`);
                            RequestController.create(requesterEntityId, path, type, REQUEST_STATUS.PENDING).then((createResults) => {
                                standardRequest = createResults;
                                updateResolve();
                            });
                        }
                    });
            })
        ];
        Promise.all(promises)
            .then(() => {
                if (requestError) {
                    reject(requestError);
                } else {
                    // Inject the requester name into the data value.
                    if (standardRequest && standardRequest.dataValues && userIdMap) {
                        standardRequest.dataValues.requesterName = (userIdMap[requesterEntityId] || {}).name || `<${requesterEntityId}>`;
                    }
                    resolve(standardRequest);
                }
            });
    });
};

/**
 * Updates standard requests by approver.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} requesterEntityId The requester entity id.
 * @param {string} path The request path.
 * @param {string} status The request status.
 * @param {string} data lease info.
 * @returns {Promise}
 */
const updateStandardRequestByApprover = (req, requesterEntityId, path, status, data = null) => {
    return new Promise(async (resolve, reject) => {
        const {entityId: approverEntityId, token} = req.session.user;
        const isApprover = await _checkIfApprover(approverEntityId, token);
        if (isApprover) {
            let standardRequest;
            let requestError;
            let userIdMap;
            Promise.all([
                _getUserIds(approverEntityId, token)
                    .then((results) => {
                        userIdMap = results;
                    }),
                RequestController.updateStatusByApprover(approverEntityId, requesterEntityId, path, status, data)
                    .then((results) => {
                        standardRequest = results[1];
                    })
                    .catch((error) => {
                        requestError = error;
                    })
            ]).then(() => {
                if (requestError) {
                    reject(requestError);
                } else {
                    // Inject the requester name into the data value.
                    if (standardRequest.dataValues && userIdMap) {
                        standardRequest.dataValues.approverName = (userIdMap[approverEntityId] || {}).name || `<${approverEntityId}>`;
                    }
                    resolve(standardRequest);
                }
            });
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
