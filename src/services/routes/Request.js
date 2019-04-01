const RequestController = require('../controllers/Request');

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
    });

module.exports = {
    RequestService
};
