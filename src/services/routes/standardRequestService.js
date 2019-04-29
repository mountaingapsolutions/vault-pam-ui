const RequestController = require('services/controllers/Request');
const {getUserIds} = require('services/routes/userService');
const requestLib = require('request');
const {initApiRequest, getDomain, sendError} = require('services/utils');
const {REQUEST_STATUS} = require('services/constants');
/**
 * @swagger
 * definitions:
 *   request:
 *     type: object
 *     properties:
 *       requestData:
 *         type: string
 *       type:
 *         type: string
 *       status:
 *         type: string
 *       engineType:
 *         type: string
 *     required:
 *       - requestData
 *       - type
 *       - status
 *       - engineType
 */

/**
 * Check if user is a member of approver group
 *
 * @param {Object} req The HTTP request object.
 * @param {string} entityId user's entityId.
 * @returns {Promise}
 */
const checkIfApprover = async (req, entityId) => {
    return await new Promise((resolve, reject) => {
        const {VAULT_API_TOKEN: apiToken} = process.env;

        if (!apiToken) {
            reject('No API token configured.');
        }

        const groupName = 'pam-approver';
        requestLib(initApiRequest(apiToken, `${getDomain()}/v1/identity/group/name/${groupName}`), (error, response, body) => {
            if (body && body.data) {
                const {member_entity_ids = []} = body.data || {};
                resolve(member_entity_ids.includes(entityId));
            } else {
                reject(`${groupName} group not found.`);
            }
        });
    });
};

/**
 * Creates standard requests.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const createStandardRequest = (req) => {
    return new Promise((resolve, reject) => {
        const {requestData, type, status, engineType} = req.body;
        const {entityId: requesterEntityId} = req.session.user;
        RequestController.create(requesterEntityId, requestData, type, status, engineType).then(request => {
            resolve(request);
        }).catch((error) => {
            reject(error);
        });
    });
};

/**
 * Create or get standard requests.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const createOrGetStandardRequest = (req) => {
    const {requestData, type, status, engineType} = req.body;
    const {entityId: requesterEntityId} = req.session.user;
    return new Promise((resolve, reject) => {
        RequestController.findOrCreate(requesterEntityId, requestData, type, status, engineType)
            .then(resolve)
            .catch(reject);
    });
};

/**
 * Get standard requests by approver.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const getStandardRequestsByApprover = (req) => {
    const {entityId} = req.session.user;
    return new Promise((resolve, reject) => {
        RequestController.findAllByApprover(entityId).then(requests => {
            resolve(requests);
        }).catch((error) => {
            reject(error);
        });
    });
};

/**
 * Get user secret access.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} param The table condition for query.
 * @returns {Promise}
 */
const getUserSecretsAccess = (req, param) => {
    const {entityId} = req.session.user;
    return new Promise(async (resolve, reject) => {
        let isApprover = false;
        let result = false;
        try {
            isApprover = await checkIfApprover(req, entityId);
            const requestDBRec = await RequestController.findByParams(param);
            result = isApprover || requestDBRec.length > 0;
        } catch (err) {
            reject({message: err});
        }
        resolve(result);
    });
};

/**
 * Get standard requests by status.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} status The request status in database.
 * @returns {Promise}
 */
const getStandardRequestsByStatus = async (req, status) => {
    return new Promise(async (finalResolve, finalReject) => {

        const standardRequestsPromise = new Promise((resolve, reject) => {
            RequestController.findAllByStatus(status).then(requests => {
                resolve(requests);
            }).catch((error) => {
                reject(error);
            });
        });
        const getUserIdsPromise = getUserIds();

        Promise.all([standardRequestsPromise, getUserIdsPromise]).then((results) => {
            const standardRequests = (Array.isArray(results) && results[0] ? results[0] : []).map(standardRequest => {
                if (Array.isArray(results) && results[1]) {
                    (standardRequest.dataValues || {}).requesterName = ((((results[1].body || {}).data || {}).key_info || {})[(standardRequest.dataValues || {}).requesterEntityId] || {}).name;
                }
                return standardRequest;
            });
            finalResolve(standardRequests);
        }).catch(error => {
            finalReject(error);
        });
    });
};

/**
 * Get standard requests by user type.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const getStandardRequestsByUserType = (req) => {
    const {entityId} = req.session.user;
    return new Promise(async (resolve, reject) => {
        let isApprover = false;
        try {
            isApprover = await checkIfApprover(req, entityId);
        } catch (err) {
            reject({message: err});
        }
        let result = [];
        try {
            const data = isApprover ? await getStandardRequestsByStatus(req, REQUEST_STATUS.PENDING) : await getStandardRequestsByRequester(req);
            result = result.concat(data);
        } catch (err) {
            reject({message: err});
        }
        resolve(result);
    });
};

/**
 * Get all standard requests.
 *
 * @returns {Promise}
 */
const getStandardRequests = () => {
    return new Promise((resolve, reject) => {
        RequestController.findAll().then(requests => {
            resolve(requests);
        }).catch((error) => {
            reject(error);
        });
    });
};

/**
 * Get standard requests by requester.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const getStandardRequestsByRequester = async (req) => {
    const {entityId} = req.session.user;
    return new Promise(async (finalResolve, finalReject) => {

        const standardRequestsPromise = new Promise((resolve, reject) => {
            RequestController.findAllByRequester(entityId).then(requests => {
                resolve(requests);
            }).catch((error) => {
                reject(error);
            });
        });
        const getUserIdsPromise = getUserIds();

        Promise.all([standardRequestsPromise, getUserIdsPromise]).then((results) => {
            const standardRequests = (Array.isArray(results) && results[0] ? results[0] : []).map(standardRequest => {
                if (Array.isArray(results) && results[1]) {
                    (standardRequest.dataValues || {}).requesterName = ((((results[1].body || {}).data || {}).key_info || {})[entityId] || {}).name;
                }
                return standardRequest;
            });
            finalResolve(standardRequests);
        }).catch(error => {
            finalReject(error);
        });
    });
};

/**
 * Update standard request by Id.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const updateStandardRequestById = async req => {
    const {id, status} = req.body;
    return new Promise((resolve, reject) => {
        RequestController.updateStatus(id, status).then(resolve).catch(reject);
    });
};

/**
 * Updates standard requests by approver.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const updateStandardRequestByApprover = async (req) => {
    const {id, status} = req.body;
    const {entityId: approverEntityId} = req.session.user;
    return await new Promise(async (resolve, reject) => {
        let isApprover = false;
        try {
            isApprover = await checkIfApprover(req, approverEntityId);
        } catch (err) {
            reject({message: err});
        }
        if (isApprover) {
            RequestController.updateStatusByApprover(id, approverEntityId, status).then(resolve).catch(reject);
        } else {
            reject({message: 'Unauthorized', statusCode: 403});
        }
    });
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
/**
 * @swagger
 * /rest/request:
 *   get:
 *     tags:
 *       - Standard Requests
 *     name: Get requests
 *     summary: Get requests
 *     responses:
 *       200:
 *         description: Request found
 *       404:
 *         description: Request not found
 */
    .get('/', (req, res) => {
        RequestController.findAll().then(request => {
            res.json(request);
        });
    })
    /**
     * @swagger
     * /rest/request/id/{id}:
     *   get:
     *     tags:
     *       - Standard Requests
     *     name: Get request by id
     *     summary: Get request by id
     *     parameters:
     *       - name: id
     *         in: path
     *         schema:
     *           type: number
     *         required:
     *           - id
     *     responses:
     *       200:
     *         description: Request found
     *       404:
     *         description: Request not found
     */
    .get('/id/:id', (req, res) => {
        const id = req.params.id;
        RequestController.findById(id).then(request => {
            res.json(request);
        }).catch((error) => {
            const {url} = req;
            sendError(url, res, error);
        });
    })
    /**
     * @swagger
     * /rest/request/requester:
     *   get:
     *     tags:
     *       - Standard Requests
     *     name: Get all requests that current user created
     *     summary: Get all requests that current user created
     *     responses:
     *       200:
     *         description: Requests found
     */
    .get('/requester', async (req, res) => {
        let result;
        try {
            result = await getStandardRequestsByRequester(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }
        res.json(result);
    })
    /**
     * @swagger
     * /rest/request/approver:
     *   get:
     *     tags:
     *       - Standard Requests
     *     name: Get all requests for which current user is an approver
     *     summary: Get all requests for which current user is an approver
     *     responses:
     *       200:
     *         description: Requests found
     */
    .get('/approver', async (req, res) => {
        let result;
        try {
            result = await getStandardRequestsByApprover(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }
        res.json(result);
    })
    /**
     * @swagger
     * /rest/request/create:
     *   post:
     *     tags:
     *       - Standard Requests
     *     name: Create Request
     *     summary: Create Request
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/definitions/request'
     *     responses:
     *       200:
     *         description: Request created
     */
    .post('/create', async (req, res) => {
        let result;
        try {
            result = await createStandardRequest(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }
        res.json(result);
    })
    /**
     * @swagger
     * /rest/request/findOrCreate:
     *   post:
     *     tags:
     *       - Standard Requests
     *     name: Create Request
     *     summary: Create Request
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/definitions/request'
     *     responses:
     *       200:
     *         description: Request created
     */
    .post('/findOrCreate', async (req, res) => {
        let result;
        try {
            result = await createOrGetStandardRequest(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }
        res.json(result);
    })
    /**
     * @swagger
     * /rest/request/updateByApprover:
     *   put:
     *     tags:
     *       - Standard Requests
     *     name: Update request by approver
     *     summary: Update request by approver
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               id:
     *                 type: string
     *               status:
     *                 type: string
     *             required:
     *               - id
     *               - status
     *     responses:
     *       200:
     *         description: Request updated by approver
     */
    .put('/updateByApprover', async (req, res) => {
        let result;
        try {
            result = await updateStandardRequestByApprover(req);
        } catch (err) {
            sendError(req.originalUrl, res, err);
            return;
        }
        res.json(result);
    })
    /**
     * @swagger
     * /rest/request/update:
     *   put:
     *     tags:
     *       - Standard Requests
     *     name: Update request
     *     summary: Update request
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               id:
     *                 type: string
     *               status:
     *                 type: string
     *             required:
     *               - id
     *               - status
     *     responses:
     *       200:
     *         description: Request updated
     */
    .put('/update', (req, res) => {
        const {id, status} = req.body;
        RequestController.updateStatus(id, status).then(request => {
            res.json(request);
        });
    });

module.exports = {
    checkIfApprover,
    createStandardRequest,
    createOrGetStandardRequest,
    router,
    getUserSecretsAccess,
    getStandardRequests,
    getStandardRequestsByApprover,
    getStandardRequestsByRequester,
    getStandardRequestsByUserType,
    getStandardRequestsByStatus,
    updateStandardRequestByApprover,
    updateStandardRequestById
};
