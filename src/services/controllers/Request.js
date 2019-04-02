const Request = require('../db/models/request');

/**
 * Create a Request.
 *
 * @param {string} requestId The request id.
 * @param {string} requesterEntityId The requester.
 * @param {string} requesteeEntityId The requestee.
 * @param {string} requestData The request data.
 * @param {string} type The type.
 * @param {string} status The status.
 * @param {string} engineType The engine type.
 * @returns {Object}
 */
const create = (requestId, requesterEntityId, requesteeEntityId, requestData, type, status, engineType) => {
    return Request.create({
        requestId,
        requesterEntityId,
        requesteeEntityId,
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
    return Request.findById(id).then(request => {
        return request;
    });
};

/**
 * Find requests by request id.
 *
 * @param {number} requestId The request db id.
 * @returns {Object}
 */
const findByRequestId = (requestId) => {
    return Request.findById(requestId).then(request => {
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
 * Find all requests by requestee.
 *
 * @param {string} entityId The requestee entity id.
 * @returns {Object}
 */
const findAllByRequestee = (entityId) => {
    return Request.findAll({
        where: {requesteeEntityId: entityId}
    }).then(requests => {
        return requests;
    });
};

/**
 * Update a Request Status by Request Id.
 *
 * @param {string} requestId The request id.
 * @param {string} status The request status.
 * @returns {Object}
 */
const updateStatus = (requestId, status) => {
    return Request.update({status},
        {where: {requestId}}
    ).then((request) => {
        return request;
    });
};

module.exports = {
    create,
    findAll,
    findAllByRequester,
    findAllByRequestee,
    findById,
    findByRequestId,
    updateStatus
};
