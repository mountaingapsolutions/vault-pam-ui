module.exports = (sequelize) => {
    const Sequelize = require('sequelize');
    return sequelize.define('request', {
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
};
