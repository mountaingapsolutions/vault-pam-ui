// Database models to be declared here.
const User = require('services/db/models/user');
const Request = require('services/db/models/request');

const models = {
    User,
    Request
};

module.exports = {
    models
};
