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
 * Updates the request with the specified response.
 *
 * @param {Object} requestParams The params for the requests table.
 * @param {Object} responseParams The params for the associated requestResponses table.
 * @returns {Promise}
 */
const updateOrCreateRequest = async (requestParams, responseParams) => {
    const {entityId, requestData, type} = requestParams;
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

    // Check if there is currently an existing response.
    const response = (request.get('RequestResponses') || []).filter((r) => r.get('entityId') === responseParams.entityId)[0];
    // Create the associated request response if no record found.
    if (!response) {
        await request.createRequestResponse(responseParams);
    }
    // Otherwise, update the existing record.
    else {
        Object.keys(responseParams).forEach((key) => response.set(key, responseParams[key]));
        await response.save();
    }
    return _getPlainResult(await request.reload());
};

module.exports = {
    getRequests,
    updateOrCreateRequest
};
