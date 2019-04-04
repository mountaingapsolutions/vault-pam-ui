const UserController = require('services/controllers/User');

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
 *     required:
 *       - entityId
 *       - firstName
 *       - lastName
 *       - email
 */

/* eslint-disable new-cap */
module.exports = require('express').Router()
/* eslint-enable new-cap */
    .use((req, res, next) => {
        console.log('User service was called: ', Date.now());
        next();
    })
    /**
     * @swagger
     * /rest/user/id/{id}:
     *   get:
     *     tags:
     *       - User
     *     name: Get user by id
     *     summary: Get user by id
     *     parameters:
     *       - name: id
     *         in: path
     *         schema:
     *           type: number
     *         required:
     *           - id
     *     responses:
     *       200:
     *         description: User found
     *       404:
     *         description: User not found
     */
    .get('/id/:id', (req, res) => {
        const id = req.params.id;
        UserController.findById(id).then(user => {
            res.json(user);
        });
    })
    /**
     * @swagger
     * /rest/user/entityId/{entityId}:
     *   get:
     *     tags:
     *       - User
     *     name: Get user by entityId
     *     summary: Get user by entityId
     *     parameters:
     *       - name: entityId
     *         in: path
     *         schema:
     *           type: string
     *         required:
     *           - entityId
     *     responses:
     *       200:
     *         description: User found
     *       404:
     *         description: User not found
     */
    .get('/entityId/:entityId', (req, res) => {
        const entityId = req.params.entityId;
        UserController.findByEntityId(entityId).then(user => {
            res.json(user);
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
     *     name: Update user
     *     summary: Update user
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/definitions/user'
     *     responses:
     *       200:
     *         description: User updated
     */
    .put('/update', (req, res) => {
        const {entityId, firstName, lastName, email} = req.body;
        UserController.update(entityId, firstName, lastName, email).then(user => {
            res.json(user);
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
    })
    /**
     * @swagger
     * /rest/user/logout:
     *   post:
     *     tags:
     *       - User
     *     name: Logout user
     *     summary: Logout user
     *     responses:
     *       200:
     *         description: User logged out
     */
    .post('/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) {
                res.json({err});
            } else {
                req.session = null;
                res.json({status: 'ok'});
            }
        });
    });
