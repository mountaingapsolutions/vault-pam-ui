module.exports = (sequelize) => {
    const Sequelize = require('sequelize');
    return sequelize.define('request', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        requestId: {
            type: Sequelize.UUID,
            allowNull: false
        },
        requesterEntityId: {
            type: Sequelize.UUID,
            allowNull: false
        },
        requesteeEntityId: {
            type: Sequelize.UUID,
            allowNull: false
        },
        requestData: Sequelize.STRING,
        type: Sequelize.STRING,
        status: Sequelize.STRING,
        engineType: Sequelize.STRING
    });
};
