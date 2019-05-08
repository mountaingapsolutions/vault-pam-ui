const connection = require('services/db/connection');
const Request = connection.getModel('Request');

/**
 * Create a Request.
 *
 * @param {string} requesterEntityId The requester.
 * @param {string} requestData The request data.
 * @param {string} type The type.
 * @param {string} status The status.
 * @returns {Promise}
 */
const create = (requesterEntityId, requestData, type, status) => {
    return Request.create({
        requesterEntityId,
        requestData,
        type,
        status
    });
};

/**
 * Find all requests by requester.
 *
 * @param {string} entityId The requester entity id.
 * @returns {Promise}
 */
const findAllByRequester = (entityId) => {
    return Request.findAll({
        where: {
            requesterEntityId: entityId
        }
    });
};

/**
 * Find requests by parameters.
 *
 * @param {Object} params The request params.
 * @returns {Promise}
 */
const findByParams = (params) => {
    return Request.findAll({
        where: {
            ...params
        }
    });
};

/**
 * Updates request status by requester.
 *
 * @param {string} requesterEntityId The requester entity id.
 * @param {string} path The request path.
 * @param {string} status The request status.
 * @returns {Promise}
 */
const updateStatusByRequester = (requesterEntityId, path, status) => {
    return Request.update({status},
        {
            where: {
                requesterEntityId,
                requestData: path
            },
            returning: true,
            plain: true
        });
};

/**
 * Update a Request Status by Approver.
 *
 * @param {string} approverEntityId The approver entity id.
 * @param {string} requesterEntityId The requester entity id.
 * @param {string} path The request path.
 * @param {string} status The request status.
 * @returns {Promise}
 */
const updateStatusByApprover = (approverEntityId, requesterEntityId, path, status) => {
    return Request.update({approverEntityId, status},
        {
            where: {
                requesterEntityId,
                requestData: path
            },
            returning: true,
            plain: true
        }
    );
};

module.exports = {
    create,
    findAllByRequester,
    findByParams,
    updateStatusByRequester,
    updateStatusByApprover
};
