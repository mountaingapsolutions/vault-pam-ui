module.exports = (sequelize) => {
    const Sequelize = require('sequelize');
    return sequelize.define('request', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        requesterEntityId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        requesteeEntityId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        requestData: Sequelize.STRING,
        type: Sequelize.STRING,
        status: Sequelize.STRING,
        engineType: Sequelize.STRING
    });
};
