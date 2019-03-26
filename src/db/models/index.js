const connection = require('../connection');

// Database models to be declared here.
const User = require('./user');
const Request = require('./request');

const models = {
    User: User,
    Request: Request
};

module.exports = {
    connection,
    models
};
