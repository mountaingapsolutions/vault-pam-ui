const RequestController = require('services/controllers/Request');

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
    .post('/findOrCreate', (req, res) => {
        const {requesterEntityId, requestData, type, status, engineType} = req.body;
        RequestController.findOrCreate(requesterEntityId, requestData, type, status, engineType).then(request => {
            res.json(request);
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
        });
    });
