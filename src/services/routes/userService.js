const request = require('request');
const UserController = require('services/controllers/User');
const {initApiRequest, sendError} = require('services/utils');

/**
 * @swagger
 * definitions:
 *   user:
 *     type: object
 *     properties:
 *       entityId:
 *         type: string
 *       firstName:
 *         type: string
 *       lastName:
 *         type: string
 *       email:
 *         type: string
 */

/* eslint-disable new-cap */
module.exports = require('express').Router()
/* eslint-enable new-cap */
/**
 * @swagger
 * /rest/user:
 *   get:
 *     tags:
 *       - User
 *     name: Get current session user.
 *     summary: Get current session user.
 *     responses:
 *       200:
 *         description: User found.
 */
    .get('/', (req, res) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        const {domain, entityId} = req.session.user;
        const apiUrl = `${domain}/v1/identity/entity/id/${entityId}`;

        request(initApiRequest(apiToken, apiUrl), (error, response, body) => {
            if (error) {
                sendError(apiUrl, res, error);
                return;
            }
            res.status(response.statusCode).json(body);
        });
    })
    /**
     * @swagger
     * /rest/user/{entityId}:
     *   get:
     *     tags:
     *       - User
     *     name: Get user by entity id.
     *     summary: Get user by entity id. If the id is not provided, defaults to the current session user.
     *     parameters:
     *       - name: entityId
     *         in: path
     *         schema:
     *           type: string
     *         required:
     *           - entityId
     *     responses:
     *       200:
     *         description: User found.
     *       403:
     *         description: Unauthorized.
     */
    .get('/:entityId', (req, res) => {
        const {domain, token} = req.session.user;
        const apiUrl = `${domain}/v1/identity/entity/id/${req.params.entityId}`;

        request(initApiRequest(token, apiUrl), (error, response, body) => {
            if (error) {
                sendError(apiUrl, res, error);
                return;
            }
            res.status(response.statusCode).json(body);
        });
    })
    /**
     * @swagger
     * /rest/user/create:
     *   post:
     *     tags:
     *       - User
     *     name: Create user
     *     summary: Create user
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/definitions/user'
     *           type: object
     *           properties:
     *             engineType:
     *               type: string
     *         required:
     *           - engineType
     *     responses:
     *       200:
     *         description: User created
     */
    .post('/create', (req, res) => {
        const {entityId, firstName, lastName, email, engineType} = req.body;
        UserController.create(entityId, firstName, lastName, email, engineType).then(user => {
            res.json(user);
        });
    })
    /**
     * @swagger
     * /rest/user/update:
     *   put:
     *     tags:
     *       - User
     *     name: Update current session user.
     *     summary: Update current session user.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/definitions/user'
     *     responses:
     *       200:
     *         description: User updated.
     */
    .put('/', (req, res) => {
        const {REACT_APP_API_TOKEN: apiToken} = process.env;
        const {domain, entityId} = req.session.user;
        const apiUrl = `${domain}/v1/identity/entity/id/${entityId}`;

        request(initApiRequest(apiToken, apiUrl), (error, response, body) => {
            if (error) {
                sendError(apiUrl, res, error);
                return;
            }
            const {metadata = {}} = body.data || {};
            request({
                ...initApiRequest(apiToken, apiUrl),
                method: 'POST',
                json: {
                    metadata: {
                        ...metadata,
                        ...req.body
                    }
                }
            }, (updateError, updateResponse, updateBody) => {
                if (error) {
                    sendError(apiUrl, res, updateError);
                    return;
                }
                res.status(updateResponse.statusCode).json(updateBody);
            });
        });
    })
    /**
     * @swagger
     * /rest/user/delete/{entityId}:
     *   delete:
     *     tags:
     *       - User
     *     name: Delete user by entityId
     *     summary: Delete user by entityId
     *     parameters:
     *       - name: entityId
     *         in: path
     *         schema:
     *           type: string
     *         required:
     *           - entityId
     *     responses:
     *       200:
     *         description: User deleted
     */
    .delete('/delete/:entityId', (req, res) => {
        const entityId = req.params.entityId;
        UserController.deleteByEntityId(entityId).then(status => {
            res.json(status);
        });
    });
