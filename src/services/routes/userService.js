const request = require('request');
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
    .use((req, res, next) => {
        next();
    })
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
     * /rest/user:
     *   post:
     *     tags:
     *       - User
     *     name: Create user.
     *     summary: Create user.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/definitions/user'
     *           type: object
     *     responses:
     *       200:
     *         description: User created.
     */
    .post('/', (req, res) => {
        const {domain, token} = req.session.user;
        const apiUrl = `${domain}/v1/identity/entity`;

        request({
            ...initApiRequest(token, apiUrl),
            method: 'POST',
            json: {
                ...req.body
            }
        }, (error, response, body) => {
            if (error) {
                sendError(apiUrl, res, error);
                return;
            }
            res.status(response.statusCode).json(body);
        });
    })
    /**
     * @swagger
     * /rest/user:
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
            } else if (body.errors) {
                sendError(apiUrl, res, body.errors, response.statusCode);
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
                } else if (updateBody.errors) {
                    sendError(apiUrl, res, updateBody.errors, updateResponse.statusCode);
                    return;
                }
                res.status(updateResponse.statusCode).json(updateBody);
            });
        });
    })
    /**
     * @swagger
     * /rest/user:
     *   put:
     *     tags:
     *       - User
     *     name: Update user by entity id.
     *     summary: Update user by entity id.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/definitions/user'
     *     responses:
     *       200:
     *         description: User updated.
     *       403:
     *         description: Unauthorized.
     */
    .put('/:entityId', (req, res) => {
        const entityId = req.params.entityId;
        const {domain, token} = req.session.user;
        const apiUrl = `${domain}/v1/identity/entity/id/${entityId}`;

        request(initApiRequest(token, apiUrl), (error, response, body) => {
            if (error) {
                sendError(apiUrl, res, error);
                return;
            } else if (body.errors) {
                sendError(apiUrl, res, body.errors, response.statusCode);
                return;
            }
            const {metadata = {}} = body.data || {};
            request({
                ...initApiRequest(token, apiUrl),
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
                } else if (updateBody.errors) {
                    sendError(apiUrl, res, updateBody.errors, updateResponse.statusCode);
                    return;
                }
                res.status(updateResponse.statusCode).json(updateBody);
            });
        });
    })
    /**
     * @swagger
     * /rest/user/{entityId}:
     *   delete:
     *     tags:
     *       - User
     *     name: Delete user by entity id.
     *     summary: Delete user by entity id.
     *     parameters:
     *       - name: entityId
     *         in: path
     *         schema:
     *           type: string
     *         required:
     *           - entityId
     *     responses:
     *       200:
     *         description: User deleted.
     */
    .delete('/:entityId', (req, res) => {
        const entityId = req.params.entityId;
        const {domain, token} = req.session.user;
        const apiUrl = `${domain}/v1/identity/entity/id/${entityId}`;

        request({
            ...initApiRequest(token, apiUrl),
            method: 'DELETE'
        }, (error, response, body) => {
            if (error) {
                sendError(apiUrl, res, error);
                return;
            } else if (body.errors) {
                sendError(apiUrl, res, body.errors, response.statusCode);
                return;
            }
            res.status(response.statusCode).json(body);
        });
    });
