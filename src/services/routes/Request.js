const RequestController = require('services/controllers/Request');

/* eslint-disable new-cap */
module.exports = require('express').Router()
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
    .get('/requestId/:requestId', (req, res) => {
        const requestId = req.params.requestId;
        RequestController.findByRequestId(requestId).then(request => {
            res.json(request);
        });
    })
    .get('/requester/:entityId', (req, res) => {
        const entityId = req.params.entityId;
        RequestController.findAllByRequester(entityId).then(requests => {
            res.json(requests);
        });
    })
    .get('/requestee/:entityId', (req, res) => {
        const entityId = req.params.entityId;
        RequestController.findAllByRequestee(entityId).then(requests => {
            res.json(requests);
        });
    })
    .post('/create', (req, res) => {
        const params = {
            requestId: req.body.requestId,
            requesterEntityId: req.body.requesterEntityId,
            requesteeEntityId: req.body.requesteeEntityId,
            requestData: req.body.requestData,
            type: req.body.type,
            status: req.body.status,
            engineType: req.body.engineType
        };
        RequestController.create(...params).then(request => {
            res.json(request);
        });
    })
    .put('/update', (req, res) => {
        const params = {
            requestId: req.body.requestId,
            status: req.body.status
        };
        RequestController.updateStatus(...params).then(user => {
            res.json(user);
        });
    });
