const connection = require('services/db/connection');
const Request = connection.getModel('Request');
/**
 * Create a Request.
 *
 * @param {string} requesterEntityId The requester.
 * @param {string} requestData The request data.
 * @param {string} type The type.
 * @param {string} status The status.
 * @param {string} engineType The engine type.
 * @returns {Object}
 */
const create = (requesterEntityId, requestData, type, status, engineType) => {
    return Request.create({
        requesterEntityId,
        requestData,
        type,
        status,
        engineType
    }).then(request => {
        return request;
    });
};

/**
 * Find all the Requests.
 *
 * @returns {Object}
 */
const findAll = () => {
    return Request.findAll().then(requests => {
        return requests;
    });
};

/**
 * Find requests by id.
 *
 * @param {number} id The request db id.
 * @returns {Object}
 */
const findById = (id) => {
    return Request.findByPk(id).then(request => {
        return request;
    });
};

/**
 * Find all requests by requester.
 *
 * @param {string} entityId The requester entity id.
 * @returns {Object}
 */
const findAllByRequester = (entityId) => {
    return Request.findAll({
        where: {requesterEntityId: entityId}
    }).then(requests => {
        return requests;
    });
};

/**
 * Find all requests by approver.
 *
 * @param {string} entityId The approver entity id.
 * @returns {Object}
 */
const findAllByApprover = (entityId) => {
    return Request.findAll({
        where: {approverEntityId: entityId}
    }).then(requests => {
        return requests;
    });
};

/**
 * Find all requests by status.
 *
 * @param {string} status The request status.
 * @returns {Object}
 */
const findAllByStatus = (status) => {
    return Request.findAll({
        where: {status}
    }).then(requests => {
        return requests;
    });
};

/**
 * Update a Request Status by Request Id.
 *
 * @param {string} id The request id.
 * @param {string} status The request status.
 * @returns {Object}
 */
const updateStatus = (id, status) => {
    return Request.update({status},
        {
            where: {id},
            returning: true,
            plain: true
        }
    ).then((request) => {
        return request;
    });
};

/**
 * Update a Request Status by Approver.
 *
 * @param {string} id The request id.
 * @param {string} approverEntityId The approver entity id.
 * @param {string} status The request status.
 * @returns {Object}
 */
const updateStatusByApprover = (id, approverEntityId, status) => {
    return Request.update({approverEntityId, status},
        {
            where: {id},
            returning: true,
            plain: true
        }
    ).then((request) => {
        return request;
    });
};

/**
 * Find or Create a Request.
 *
 * @param {string} requesterEntityId The requester.
 * @param {string} requestData The request data.
 * @param {string} type The type.
 * @param {string} status The status.
 * @param {string} engineType The engine type.
 * @returns {Object}
 */
const findOrCreate = (requesterEntityId, requestData, type, status, engineType) => {
    return Request.findOne({
        where: {requesterEntityId, requestData, type, status, engineType}
    }).then(request => {
        if (request) {
            return request;
        } else {
            return create(requesterEntityId, requestData, type, status, engineType);
        }
    });
};

module.exports = {
    create,
    findAll,
    findAllByApprover,
    findAllByRequester,
    findAllByStatus,
    findById,
    findOrCreate,
    updateStatus,
    updateStatusByApprover
};
