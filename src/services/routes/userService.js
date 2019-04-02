const UserController = require('services/controllers/User');

/* eslint-disable new-cap */
module.exports = require('express').Router()
/* eslint-enable new-cap */
    .use((req, res, next) => {
        console.log('User service was called: ', Date.now());
        next();
    })
    .get('/id/:id', (req, res) => {
        const id = req.params.id;
        UserController.findById(id).then(user => {
            res.json(user);
        });
    })
    .get('/entityId/:entityId', (req, res) => {
        const entityId = req.params.entityId;
        UserController.findByEntityId(entityId).then(user => {
            res.json(user);
        });
    })
    .post('/create', (req, res) => {
        const userParam = {
            entityId: req.body.entityId,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email
        };
        UserController.create(...userParam).then(user => {
            res.json(user);
        });
    })
    .put('/update', (req, res) => {
        const userParam = {
            entityId: req.body.entityId,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email
        };
        UserController.update(...userParam).then(user => {
            res.json(user);
        });
    })
    .delete('/delete', (req, res) => {
        const entityId = req.params.entityId;
        UserController.deleteByEntityId(entityId).then(status => {
            res.json(status);
        });
    });
