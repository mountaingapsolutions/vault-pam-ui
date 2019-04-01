const RequestController = require('../../../services/controllers/Request');

/* eslint-disable new-cap */
const RequestService = require('express').Router()
/* eslint-enable new-cap */
    .use((req, res, next) => {
        console.log('Request service was called: ', Date.now());
        next();
    })
    .get('/id/:id', (req, res) => {
        const id = req.params.id;
        RequestController.findById(id).then(request => {
            res.json(request);
        });
    })
    .get('/requester/:uid', (req, res) => {
        const uid = req.params.uid;
        RequestController.findAllByRequester(uid).then(requests => {
            res.json(requests);
        });
    })
    .get('/requestee/:uid', (req, res) => {
        const uid = req.params.uid;
        RequestController.findAllByRequestee(uid).then(requests => {
            res.json(requests);
        });
    })
    .post('/create', (req, res) => {
        const params = {
            requesterUid: req.body.requesterUid,
            requesteeUid: req.body.requesteeUid,
            requestData: req.body.requestData,
            type: req.body.type,
            status: req.body.status,
            engineType: req.body.engineType
        };
        RequestController.create(...params).then(request => {
            res.json(request);
        });
    });

module.exports = {
    RequestService
};
