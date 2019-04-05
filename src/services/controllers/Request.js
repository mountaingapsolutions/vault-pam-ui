const connection = require('services/db/connection');
const Request = connection.getModel('Request');
/**
 * Create a Request.
 *
 * @param {string} requesterEntityId The requester.
 * @param {string} requesteeEntityId The requestee.
 * @param {string} requestData The request data.
 * @param {string} type The type.
 * @param {string} status The status.
 * @param {string} engineType The engine type.
 * @returns {Object}
 */
const create = (requesterEntityId, requesteeEntityId, requestData, type, status, engineType) => {
    return Request.create({
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
 * @param {string} id The request id.
 * @param {string} status The request status.
 * @returns {Object}
 */
const updateStatus = (id, status) => {
    return Request.update({status},
        {where: {id}}
    ).then((request) => {
        return request;
    });
};

/**
 * Find or Create a Request.
 *
 * @param {string} requesterEntityId The requester.
 * @param {string} requesteeEntityId The requestee.
 * @param {string} requestData The request data.
 * @param {string} type The type.
 * @param {string} status The status.
 * @param {string} engineType The engine type.
 * @returns {Object}
 */
const findOrCreate = (requesterEntityId, requesteeEntityId, requestData, type, status, engineType) => {
    return Request.findOne({
        where: {requesterEntityId, requesteeEntityId, requestData, type, status, engineType}
    }).then(request => {
        if (request) {
            return request;
        } else {
            return create(requesterEntityId, requesteeEntityId, requestData, type, status, engineType);
        }
    });
};

module.exports = {
    create,
    findAll,
    findAllByRequester,
    findAllByRequestee,
    findById,
    findOrCreate,
    updateStatus
};
