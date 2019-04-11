const RequestController = require('services/controllers/Request');
const {initApiRequest, sendEmail, sendError} = require('services/utils');
const {getRequestEmailContent} = require('services/mail/templates');
const requestLib = require('request');
const UserController = require('services/controllers/User');

/**
 * Retrieves the active Control Group requests from group metadata.
 *
 * @param {Object} req The HTTP request object.
 * @returns {Promise}
 */
const _getApproverGroupMembers = async (req) => {
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
 * @swagger
 * definitions:
 *   request:
 *     type: object
 *     properties:
 *       requesterEntityId:
 *         type: string
 *       approverEntityId:
 *         type: string
 *       requestData:
 *         type: string
 *       type:
 *         type: string
 *       status:
 *         type: string
 *       engineType:
 *         type: string
 *     required:
 *       - requesterEntityId
 *       - approverEntityId
 *       - requestData
 *       - type
 *       - status
 *       - engineType
 */

/* eslint-disable new-cap */
module.exports = require('express').Router()
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
     *       - Request
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
     *       - Request
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
     * /rest/request/requester/{entityId}:
     *   get:
     *     tags:
     *       - Request
     *     name: Get all requests by requester entityId
     *     summary: Get all requests by requester entityId
     *     parameters:
     *       - name: entityId
     *         in: path
     *         schema:
     *           type: string
     *         required:
     *           - entityId
     *     responses:
     *       200:
     *         description: Requests found
     *       404:
     *         description: Requests not found
     */
    .get('/requester/:entityId', (req, res) => {
        const entityId = req.params.entityId;
        RequestController.findAllByRequester(entityId).then(requests => {
            res.json(requests);
        }).catch((error) => {
            const {url} = req;
            sendError(url, res, error);
        });
    })
    /**
     * @swagger
     * /rest/request/approver/{entityId}:
     *   get:
     *     tags:
     *       - Request
     *     name: Get all requests by approver entityId
     *     summary: Get all requests by approver entityId
     *     parameters:
     *       - name: entityId
     *         in: path
     *         schema:
     *           type: string
     *         required:
     *           - entityId
     *     responses:
     *       200:
     *         description: Requests found
     *       404:
     *         description: Requests not found
     */
    .get('/approver/:entityId', (req, res) => {
        const entityId = req.params.entityId;
        RequestController.findAllByApprover(entityId).then(requests => {
            res.json(requests);
        }).catch((error) => {
            const {url} = req;
            sendError(url, res, error);
        });
    })
    /**
     * @swagger
     * /rest/request/create:
     *   post:
     *     tags:
     *       - Request
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
    .post('/create', (req, res) => {
        const {requesterEntityId, requestData, type, status, engineType} = req.body;
        RequestController.create(requesterEntityId, requestData, type, status, engineType).then(request => {
            res.json(request);
        });
    })
    /**
     * @swagger
     * /rest/request/findOrCreate:
     *   post:
     *     tags:
     *       - Request
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
        const {requesterEntityId, requestData, type, status, engineType} = req.body;
        const {domain} = req.session.user;
        RequestController.findOrCreate(requesterEntityId, requestData, type, status, engineType).then(request => {
            // if a new request, send email to approvers
            if (request._options.isNewRecord === true) {
                _getApproverGroupMembers(req).then((approvers) => {
                    const emailData = {
                        domain,
                        requesterEntityId,
                        requestData,
                        type,
                        status,
                        engineType,
                        approvers
                    };
                    const {subject, body} = getRequestEmailContent(emailData);
                    sendEmail(approvers, subject, body);
                });
            }
            res.json(request);
        }).catch((error) => {
            const {url} = req;
            sendError(url, res, error);
        });
    })
    /**
     * @swagger
     * /rest/request/update:
     *   put:
     *     tags:
     *       - Request
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
     *               approverEntityId:
     *                 type: string
     *               status:
     *                 type: string
     *             required:
     *               - id
     *               - status
     *     responses:
     *       200:
     *         description: User updated
     */
    .put('/updateByApprover', (req, res) => {
        const {id, approverEntityId, status} = req.body;
        RequestController.updateStatusByApprover(id, approverEntityId, status).then(request => {
            res.json(request);
        }).catch((error) => {
            const {url} = req;
            sendError(url, res, error);
        });
    })
    /**
     * @swagger
     * /rest/request/update:
     *   put:
     *     tags:
     *       - Request
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
     *         description: User updated
     */
    .put('/update', (req, res) => {
        const {id, status} = req.body;
        RequestController.updateStatus(id, status).then(request => {
            res.json(request);
        }).catch((error) => {
            const {url} = req;
            sendError(url, res, error);
        });
    });
