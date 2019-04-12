const RequestController = require('services/controllers/Request');
const {initApiRequest, sendEmail, sendError} = require('services/utils');
const {getRequestEmailContent} = require('services/mail/templates');
const requestLib = require('request');
const UserController = require('services/controllers/User');

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
 * Retrieves the approver group members' emails
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const _getApproverGroupMemberEmails = async (req) => {
    const result = await new Promise( (resolve, reject) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        if (!apiToken) {
            reject('No API token configured.');
            return;
        }
        const {domain} = req.session.user;
        const groupName = 'pam-approver';
        let groupMembersEmail = [];

        requestLib(initApiRequest(apiToken, `${domain}/v1/identity/group/name/${groupName}`), (error, response, body) => {
            if (body && body.data) {
                const member_entity_ids = body.data.member_entity_ids;
                const {type} = body.data.metadata;
                if (type === 'admin' && member_entity_ids) {
                    Promise.all(member_entity_ids.map(entityId => {
                        return new Promise((memberResolve, memberReject) => {
                            UserController.findByEntityId(entityId).then(user => {
                                if (user) {
                                    const userData = user.dataValues;
                                    const {email} = userData;
                                    groupMembersEmail.push(email);
                                    memberResolve();
                                } else {
                                    memberReject();
                                }
                            });
                        });
                    })).then(() => {
                        resolve(groupMembersEmail);
                    }).catch((err) => {
                        console.error(err);
                    });
                }
            }
        });
    });
    return result;
};

/**
 * Check if user is a member of approver group
 *
 * @param {Object} req The HTTP request object.
 * @param {string} entityId user's entityId.
 * @returns {Promise}
 */
const _isApprover = async (req, entityId) => {
    return await new Promise( (resolve, reject) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;

        if (!apiToken) {
            reject('No API token configured.');
        }

        const {domain} = req.session.user;
        const groupName = 'pam-approver';

        requestLib(initApiRequest(apiToken, `${domain}/v1/identity/group/name/${groupName}`), (error, response, body) => {
            if (body && body.data) {
                const {member_entity_ids} = body.data;
                const {type} = body.data.metadata;

                if (type === 'admin' && member_entity_ids) {
                    resolve(member_entity_ids.includes(entityId));
                } else {
                    reject(error);
                }
            }
        });
    });
};

const createStandardRequest = (req) => {
    return new Promise( (resolve, reject) => {
        const {requestData, type, status, engineType} = req.body;
        const {entityId: requesterEntityId} = req.session.user;
        RequestController.create(requesterEntityId, requestData, type, status, engineType).then(request => {
            resolve(request);
        }).catch((error) => {
            reject(error);
        });
    });
};

const createOrGetStandardRequest = (req) => {
    const {requestData, type, status, engineType} = req.body;
    const {domain, entityId: requesterEntityId} = req.session.user;
    return new Promise((resolve, reject) => {
        RequestController.findOrCreate(requesterEntityId, requestData, type, status, engineType).then(request => {
            // if a new request, send email to approvers
            if (request._options.isNewRecord === true) {
                _getApproverGroupMemberEmails(req).then((approvers) => {
                    const emailData = {
                        domain,
                        requesterEntityId,
                        requestData,
                        type,
                        status,
                        engineType,
                        approvers
                    };
                    const emailContents = getRequestEmailContent(emailData);
                    sendEmail(approvers, emailContents.subject, emailContents.body);
                });
            }
            resolve(request);
        }).catch((error) => {
            reject(error);
        });
    });
};

const getStandardRequestsByApprover = (req) => {
    const {entityId} = req.session.user;
    return new Promise( (resolve, reject) => {
        RequestController.findAllByApprover(entityId).then(requests => {
            resolve(requests);
        }).catch((error) => {
            reject(error);
        });
    });
};

const getStandardRequestsByRequester = (req) => {
    const {entityId} = req.session.user;
    return new Promise( (resolve, reject) => {
        RequestController.findAllByRequester(entityId).then(requests => {
            resolve(requests);
        }).catch((error) => {
            reject(error);
        });
    });
};

const updateStandardRequestByApprover = async (req) => {
    const {id, status} = req.body;
    const {entityId: approverEntityId} = req.session.user;
    return await new Promise( async (resolve, reject) => {
        let isApprover = false;
        try {
            isApprover = await _isApprover(req, approverEntityId);
        } catch (err) {
            reject({message: err});
        }

        if (isApprover) {
            RequestController.updateStatusByApprover(id, approverEntityId, status).then(request => {
                resolve(request);
            });
        } else {
            reject({message: 'Unauthorized', statusCode: 403});
        }
    });
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .use((req, res, next) => {
        console.log('Request service was called: ', Date.now());
        next();
    })
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
    createStandardRequest,
    createOrGetStandardRequest,
    router,
    getStandardRequestsByApprover,
    getStandardRequestsByRequester,
    updateStandardRequestByApprover
};
