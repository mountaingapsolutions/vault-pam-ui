const {REQUEST_STATUS} = require('services/constants');
const requests = require('services/db/models/requests');
const requestResponses = require('services/db/models/requestResponses');

/**
 * Returns the POJO version of the sequelize query result.
 *
 * @private
 * @param {Object} result The sequelize query result.
 * @returns {Object}
 */
const _getPlainResult = (result) => {
    const {createdAt, entityId, requestData, referenceId, RequestResponses: responses = [], type, updatedAt} = result.get({
        plain: true
    });
    return {
        dataValues: {
            createdAt,
            entityId,
            requestData,
            referenceId,
            responses,
            type,
            updatedAt
        }
    };
};

/**
 * Helper method to update a request's associated request response DAO.
 *
 * @private
 * @param {Object} request The requester's request DAO.
 * @param {string} entityId The entity id of the associated request response.
 * @param {string} requestResponseType The request response type.
 * @returns {Promise}
 */
const _updateOrCreateRequestResponse = async (request, entityId, requestResponseType) => {
    // Check if there is currently an existing response.
    const ownResponse = (request.get('RequestResponses') || []).filter((r) => r.get('entityId') === entityId)[0];
    // Create the associated request response if no record found.
    if (!ownResponse) {
        await request.createRequestResponse({
            entityId,
            type: requestResponseType
        });
    }
    // Otherwise, update the existing record.
    else {
        ownResponse.set('type', requestResponseType);
        await ownResponse.save();
    }
};

/**
 * Updates the request and associated response.
 *
 * @private
 * @param {string} requesterEntityId The requester's entity id.
 * @param {string} requestData The request data/path.
 * @param {string} responderEntityId The response's entity id.
 * @param {string} responseType The response type.
 * @returns {Promise}
 */
const _updateRequestResponseType = async (requesterEntityId, requestData, responderEntityId, responseType) => {
    const request = (await requests.findCreateFind({
        where: {
            entityId: requesterEntityId,
            requestData
        },
        include: [{
            model: requestResponses
        }]
    }))[0];

    // Update the requester's request response status.
    await _updateOrCreateRequestResponse(request, responderEntityId, responseType);

    return _getPlainResult(await request.reload());
};

/**
 * Approves a request from the approver's perspective
 *
 * @param {Object} req The HTTP request object.
 * @param {string} requesterEntityId The requester's entity id.
 * @param {string} requestData The request data/path.
 * @returns {Promise}
 */
const approveRequest = async (req, requesterEntityId, requestData) => {
    const {entityId} = req.session.user;

    return await _updateRequestResponseType(requesterEntityId, requestData, entityId, REQUEST_STATUS.APPROVED);
};

/**
 * Retrieves requests.
 *
 * @param {Object} requestParams The params for the requests table.
 * @param {Object} [responseParams] The params for the associated requestResponses table.
 * @returns {Promise}
 */
const getRequests = async (requestParams, responseParams) => {
    const includeQuery = {
        model: requestResponses
    };
    if (responseParams) {
        includeQuery.where = {
            ...responseParams
        };
    }
    const results = await requests.findAll({
        where: {
            ...requestParams
        },
        include: [includeQuery]
    });
    return results.map((result) => _getPlainResult(result));
};

/**
 * Cancels a request from the requester's perspective
 *
 * @param {Object} req The HTTP request object.
 * @param {string} requestData The request data/path.
 * @returns {Promise}
 */
const cancelRequest = async (req, requestData) => {
    const {entityId} = req.session.user;

    return await _updateRequestResponseType(entityId, requestData, entityId, REQUEST_STATUS.CANCELED);
};

/**
 * Initiates a request from the requester's perspective
 *
 * @param {Object} req The HTTP request object.
 * @param {string} requestData The request data/path.
 * @param {string} type The request type.
 * @returns {Promise}
 */
const initiateRequest = async (req, requestData, type = 'standard-request') => {
    const {entityId} = req.session.user;
    const request = (await requests.findCreateFind({
        where: {
            entityId,
            requestData,
            type
        },
        include: [{
            model: requestResponses
        }]
    }))[0];

    const otherResponses = (request.get('RequestResponses') || []).filter((r) => r.get('entityId') !== entityId);

    // Update the requester's request response status.
    await _updateOrCreateRequestResponse(request, entityId, REQUEST_STATUS.REQUESTED);

    // Remove previously recorded response records (i.e. REJECTED or APPROVED responses).
    await new Promise((resolve) => {
        Promise.all(otherResponses.map((otherResponse) => otherResponse.destroy())).then(resolve);
    });
    return _getPlainResult(await request.reload());
};

/**
 * Rejects a request from the approver's perspective
 *
 * @param {Object} req The HTTP request object.
 * @param {string} requesterEntityId The requester's entity id.
 * @param {string} requestData The request data/path.
 * @returns {Promise}
 */
const rejectRequest = async (req, requesterEntityId, requestData) => {
    const {entityId} = req.session.user;

    return await _updateRequestResponseType(requesterEntityId, requestData, entityId, REQUEST_STATUS.REJECTED);
};

module.exports = {
    approveRequest,
    cancelRequest,
    getRequests,
    initiateRequest,
    rejectRequest
};
