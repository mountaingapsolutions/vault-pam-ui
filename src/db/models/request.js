const connection = require('../connection');
const { Sequelize } = connection;

const Request = connection.define('request', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    requesterUid: {
        type: Sequelize.STRING,
        allowNull: false
    },
    requesteeUid: {
        type: Sequelize.STRING,
        allowNull: false
    },
    requestData: Sequelize.STRING,
    type: Sequelize.STRING,
    status: Sequelize.STRING,
    engineType: Sequelize.STRING
});

module.exports = Request;
