const RequestController = require('services/controllers/Request');

/**
 * @swagger
 * definitions:
 *   request:
 *     type: object
 *     properties:
 *       requestId:
 *         type: string
 *       requesterEntityId:
 *         type: string
 *       requesteeEntityId:
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
 *       - requestId
 *       - requesterEntityId
 *       - requesteeEntityId
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
     * /rest/request/requestId/{requestId}:
     *   get:
     *     tags:
     *       - Request
     *     name: Get request by requestId
     *     summary: Get request by requestId
     *     parameters:
     *       - name: requestId
     *         in: path
     *         schema:
     *           type: number
     *         required:
     *           - requestId
     *     responses:
     *       200:
     *         description: Request found
     *       404:
     *         description: Request not found
     */
    .get('/requestId/:requestId', (req, res) => {
        const requestId = req.params.requestId;
        RequestController.findByRequestId(requestId).then(request => {
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
     * /rest/request/requestee/{entityId}:
     *   get:
     *     tags:
     *       - Request
     *     name: Get all requests by requestee entityId
     *     summary: Get all requests by requestee entityId
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
    .get('/requestee/:entityId', (req, res) => {
        const entityId = req.params.entityId;
        RequestController.findAllByRequestee(entityId).then(requests => {
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
        const {requestId, requesterEntityId, requesteeEntityId, requestData, type, status, engineType} = req.body;
        RequestController.create(requestId, requesterEntityId, requesteeEntityId, requestData, type, status, engineType).then(request => {
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
     *               requestId:
     *                 type: string
     *               status:
     *                 type: string
     *             required:
     *               - requestId
     *               - status
     *     responses:
     *       200:
     *         description: User updated
     */
    .put('/update', (req, res) => {
        const {requestId, status} = req.body;
        RequestController.updateStatus(requestId, status).then(user => {
            res.json(user);
        });
    });
