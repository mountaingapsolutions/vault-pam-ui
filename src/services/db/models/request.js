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
            allowNull: false,
            unique: 'compositeIndex'
        },
        approverEntityId: Sequelize.UUID,
        requestData: {
            type: Sequelize.STRING,
            unique: 'compositeIndex'
        },
        type: Sequelize.STRING,
        status: Sequelize.STRING,
        engineType: Sequelize.STRING
    });
};
