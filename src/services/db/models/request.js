module.exports = (sequelize) => {
    const Sequelize = require('sequelize');
    return sequelize.define('request', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        requesterEntityId: {
            type: Sequelize.UUID,
            allowNull: false
        },
        approverEntityId: Sequelize.UUID,
        requestData: Sequelize.STRING,
        type: Sequelize.STRING,
        status: Sequelize.STRING,
        engineType: Sequelize.STRING
    });
};
