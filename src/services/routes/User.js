const UserController = require('../controllers/User');

/* eslint-disable new-cap */
const UserService = require('express').Router()
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
    .get('/uid/:uid', (req, res) => {
        const uid = req.params.uid;
        UserController.findByUid(uid).then(user => {
            res.json(user);
        });
    })
    .post('/create', (req, res) => {
        const userParam = {
            uid: req.body.uid,
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
            uid: req.body.uid,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email
        };
        UserController.update(...userParam).then(user => {
            res.json(user);
        });
    })
    .delete('/delete', (req, res) => {
        const uid = req.params.uid;
        UserController.deleteByUid(uid).then(status => {
            res.json(status);
        });
    });

module.exports = {
    UserService
};
