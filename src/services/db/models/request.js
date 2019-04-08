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
            allowNull: true,
            type: Sequelize.STRING,
            unique: 'compositeIndex'
        },
        type: {
            type: Sequelize.STRING,
            allowNull: true
        },
        status: {
            type: Sequelize.STRING,
            allowNull: false
        },
        engineType: {
            type: Sequelize.STRING,
            allowNull: true
        }
    });
};
