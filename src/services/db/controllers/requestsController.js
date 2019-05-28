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
    const {createdAt, entityId, id, path, referenceData, RequestResponses: responses = [], type, updatedAt} = result.get({
        plain: true
    });
    return {
        dataValues: {
            createdAt,
            entityId,
            id,
            path,
            referenceData,
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
 * @param {string} path The request secrets path.
 * @param {string} responderEntityId The response's entity id.
 * @param {string} responseType The response type.
 * @returns {Promise}
 */
const _updateRequestResponseType = async (requesterEntityId, path, responderEntityId, responseType) => {
    const request = (await requests.findCreateFind({
        where: {
            entityId: requesterEntityId,
            path
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
 * @param {string} path The request secrets path.
 * @param {Object} [referenceData] The reference data of approved request.
 * @returns {Promise}
 */
const approveRequest = async (req, requesterEntityId, path, referenceData) => {
    const {entityId} = req.session.user;

    if (referenceData) {
        const request = (await requests.findCreateFind({
            where: {
                entityId: requesterEntityId,
                path
            }
        }))[0];
        const previousReferenceData = request.get('referenceData') || {};
        request.set('referenceData', {
            ...previousReferenceData,
            ...referenceData
        });
        await request.save();
    }

    return await _updateRequestResponseType(requesterEntityId, path, entityId, REQUEST_STATUS.APPROVED);
};

/**
 * Cancels a request from the requester's perspective
 *
 * @param {Object} req The HTTP request object.
 * @param {string} path The request secrets path.
 * @returns {Promise}
 */
const cancelRequest = async (req, path) => {
    const {entityId} = req.session.user;

    return await _updateRequestResponseType(entityId, path, entityId, REQUEST_STATUS.CANCELED);
};

/**
 * Deletes a request from the database.
 *
 * @param {Object} requestParams The params for the requests table.
 * @returns {Promise}
 */
const deleteRequest = async (requestParams) => {
    return await requests.destroy({
        where: {
            ...requestParams
        }
    });
};

/**
 * Retrieves the specified request.
 *
 * @param {Object} requestParams The params for the requests table.
 * @param {Object} [responseParams] The params for the associated requestResponses table.
 * @returns {Promise}
 */
const getRequest = async (requestParams, responseParams) => {
    const includeQuery = {
        model: requestResponses
    };
    if (responseParams) {
        includeQuery.where = {
            ...responseParams
        };
    }
    const result = await requests.findOne({
        where: {
            ...requestParams
        },
        include: [includeQuery]
    });
    return _getPlainResult(result);
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
 * Initiates a request from the requester's perspective.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} requestParams The request params.
 * @param {string} [requestParams.referenceData] The various reference data of the external record.
 * @param {string} requestParams.path The request secrets path.
 * @param {string} requestParams.type The request type.
 * @returns {Promise}
 */
const initiateRequest = async (req, requestParams) => {
    const {entityId} = req.session.user;
    const request = (await requests.findCreateFind({
        where: {
            entityId,
            ...requestParams
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
 * @param {string} path The request secrets path.
 * @returns {Promise}
 */
const rejectRequest = async (req, requesterEntityId, path) => {
    const {entityId} = req.session.user;

    return await _updateRequestResponseType(requesterEntityId, path, entityId, REQUEST_STATUS.REJECTED);
};

/**
 * Revoke a lease from the approver's perspective
 *
 * @param {Object} requestParams The request parameters.
 * @returns {Promise}
 */
const revokeRequest = async (requestParams) => {
    const {approverId, entityId, path} = requestParams;
    return await _updateRequestResponseType(entityId, path, approverId, REQUEST_STATUS.REVOKED);
};

/**
 * Revoke a lease from the approver's perspective
 *
 * @param {Object} requestParams The request parameters.
 * @returns {Promise}
 */
const openRequest = async (requestParams) => {
    const {entityId, path} = requestParams;
    return await _updateRequestResponseType(entityId, path, entityId, REQUEST_STATUS.OPENED);
};

module.exports = {
    approveRequest,
    cancelRequest,
    deleteRequest,
    getRequest,
    getRequests,
    initiateRequest,
    openRequest,
    rejectRequest,
    revokeRequest
};
