const Request = require('../db/models/request');

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
 * Find or create a Request.
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
    return Request.find({
        where: {requesterEntityId, requesteeEntityId, engineType}
    }).then(request => {
        if (request) {
            return request;
        } else {
            return create(requesterEntityId, requesteeEntityId, requestData, type, status, engineType);
        }
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
 * Update a Request by Requester.
 *
 * @param {string} requesterEntityId The requester.
 * @param {string} requesteeEntityId The requestee.
 * @param {string} requestData The request data.
 * @param {string} type The request type.
 * @param {string} status The request status.
 * @param {string} engineType The secret engine type.
 * @returns {Object}
 */
const updateByRequester = (requesterEntityId, requesteeEntityId, requestData, type, status, engineType) => {
    return Request.update({requesteeEntityId, requestData, type, status, engineType},
        {where: {requesterEntityId}}
    ).then((request) => {
        return request;
    });
};

/**
 * Update a Request by Requestee.
 *
 * @param {string} requesterEntityId The requester.
 * @param {string} requesteeEntityId The requestee.
 * @param {string} requestData The request data.
 * @param {string} type The type.
 * @param {string} status The status.
 * @param {string} engineType The engine type.
 * @returns {Object}
 */
const updateByRequestee = (requesterEntityId, requesteeEntityId, requestData, type, status, engineType) => {
    return Request.update({requesterEntityId, requestData, type, status, engineType},
        {where: {requesteeEntityId}}
    ).then((request) => {
        return request;
    });
};


module.exports = {
    create,
    findAll,
    findOrCreate,
    findAllByRequester,
    findAllByRequestee,
    findById,
    updateByRequester,
    updateByRequestee
};
