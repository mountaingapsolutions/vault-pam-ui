module.exports = (sequelize) => {
    const Sequelize = require('sequelize');
    /* eslint-disable new-cap */
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
        type: Sequelize.CHAR(20),
        status: Sequelize.CHAR(20),
        engineType: Sequelize.CHAR(25),
    });
    /* eslint-enable new-cap */
};
