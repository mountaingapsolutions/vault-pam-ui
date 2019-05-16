const connection = require('services/db/connection');
const Request = connection.getModel('Request');
const {REQUEST_STATUS} = require('services/constants');

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
    //TODO SHOULD NEW PENDING INSERT A NEW RECORD? TEMP FIX FOR NOW
    let updateData = {status};
    if (status === REQUEST_STATUS.PENDING) {
        updateData.approverEntityId = null;
    }
    return Request.update(updateData,
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
 * @param {string} referenceData Reference data for the secret
 * @returns {Promise}
 */
const updateStatusByApprover = (approverEntityId, requesterEntityId, path, status, referenceData) => {
    return Request.update({approverEntityId, status, engineType: referenceData},
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

/**
 * Update a Request Status by Id.
 *
 * @param {number} id The request id.
 * @param {Object} data The new data values.
 * @returns {Promise}
 */
const updateDataById = (id, data) => {
    return Request.update(data,
        {
            where: {
                id
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
    updateDataById,
    updateStatusByRequester,
    updateStatusByApprover
};
