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
    const {createdAt, entityId, requestData, referenceId, RequestResponses: responses, type, updatedAt} = result.get({
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
 * Create a request.
 *
 * @param {Object} params The data params.
 * @returns {Promise}
 */
const createRequest = (params) => {
    return requests.create(params).then((results) => {
        return {
            dataValues: results.get({
                plain: true
            })
        };
    });
};

/**
 * Create a request.
 *
 * @param {Object} params The data params.
 * @returns {Promise}
 */
const getRequests = async (params) => {
    const results = await requests.findAll({
        where: {
            ...params
        },
        include: [{
            model: requestResponses
        }]
    });
    return results.map((result) => _getPlainResult(result));
};

/**
 * Find all requests by requester.
 *
 * @param {string} entityId The requester entity id.
 * @returns {Promise}
 */
const findAllByRequester = (entityId) => {
    return requests.findAll({
        where: {
            entityId
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
    return requests.findAll({
        where: {
            ...params
        }
    });
};

/**
 * Updates the request with the specified response.
 *
 * @param {Object} requestParams The params for the requests table.
 * @param {Object} responseParams The params for the associated requestResponses table.
 * @returns {Promise}
 */
const updateRequestResponse = async (requestParams, responseParams) => {
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
    const response = request.get('RequestResponses').filter((r) => r.get('entityId') === entityId && r.get('requestId') === request.get('id'))[0];
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

/**
 * Updates request status by requester.
 *
 * @param {string} entityId The requester entity id.
 * @param {string} requestData The request data.
 * @param {string} status The request status.
 * @returns {Promise}
 */
const updateStatusByRequester = (entityId, requestData, status) => {
    return requests.update({status},
        {
            where: {
                entityId,
                requestData
            },
            returning: true,
            plain: true
        });
};

/**
 * Update a Request Status by Approver.
 *
 * @param {string} approverEntityId The approver entity id.
 * @param {string} entityId The requester entity id.
 * @param {string} requestData The request data.
 * @param {string} status The request status.
 * @returns {Promise}
 */
const updateStatusByApprover = (approverEntityId, entityId, requestData, status) => {
    return requests.update({approverEntityId, status},
        {
            where: {
                entityId,
                requestData
            },
            returning: true,
            plain: true
        }
    );
};

module.exports = {
    createRequest,
    findAllByRequester,
    findByParams,
    getRequests,
    updateRequestResponse,
    updateStatusByRequester,
    updateStatusByApprover
};
