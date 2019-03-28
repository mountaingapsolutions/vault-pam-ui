const Request = require('../../../db/models/request');

/**
 * Create a Request.
 *
 * @param {string} requesterUid The requester.
 * @param {string} requesteeUid The requestee.
 * @param {string} requestData The request data.
 * @param {string} type The type.
 * @param {string} status The status.
 * @param {string} engineType The engine type.
 * @returns {Object}
 */
const create = (requesterUid, requesteeUid, requestData, type, status, engineType) => {
    return Request.create({
        requesterUid,
        requesteeUid,
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
 * @param {string} requesterUid The requester.
 * @param {string} requesteeUid The requestee.
 * @param {string} requestData The request data.
 * @param {string} type The type.
 * @param {string} status The status.
 * @param {string} engineType The engine type.
 * @returns {Object}
 */
const findOrCreate = (requesterUid, requesteeUid, requestData, type, status, engineType) => {
    return Request.find({
        where: {requesterUid, requesteeUid, engineType}
    }).then(request => {
        if (request) {
            return request;
        } else {
            return create(requesterUid, requesteeUid, requestData, type, status, engineType);
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
 * Find all requests by requester uid.
 *
 * @param {string} uid The requester uid.
 * @returns {Object}
 */
const findAllByRequester = (uid) => {
    return Request.findAll({
        where: {requesterUid: uid}
    }).then(requests => {
        return requests;
    });
};

/**
 * Find all requests by requestee uid.
 *
 * @param {string} uid The requestee uid.
 * @returns {Object}
 */
const findAllByRequestee = (uid) => {
    return Request.findAll({
        where: {requesteeUid: uid}
    }).then(requests => {
        return requests;
    });
};

/**
 * Update a Request by Requester.
 *
 * @param {string} requesterUid The requester.
 * @param {string} requesteeUid The requestee.
 * @param {string} requestData The request data.
 * @param {string} type The request type.
 * @param {string} status The request status.
 * @param {string} engineType The secret engine type.
 * @returns {Object}
 */
const updateByRequester = (requesterUid, requesteeUid, requestData, type, status, engineType) => {
    return Request.update({requesteeUid, requestData, type, status, engineType},
        {where: {requesterUid}}
    ).then((request) => {
        return request;
    });
};

/**
 * Update a Request by Requestee.
 *
 * @param {string} requesterUid The requester.
 * @param {string} requesteeUid The requestee.
 * @param {string} requestData The request data.
 * @param {string} type The type.
 * @param {string} status The status.
 * @param {string} engineType The engine type.
 * @returns {Object}
 */
const updateByRequestee = (requesterUid, requesteeUid, requestData, type, status, engineType) => {
    return Request.update({requesterUid, requestData, type, status, engineType},
        {where: {requesteeUid}}
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
