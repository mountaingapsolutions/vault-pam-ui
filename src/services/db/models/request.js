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
            type: Sequelize.CHAR(36),
            allowNull: false
        },
        requesterEntityId: {
            type: Sequelize.CHAR(36),
            allowNull: false
        },
        requesteeEntityId: {
            type: Sequelize.CHAR(36),
            allowNull: false
        },
        requestData: Sequelize.STRING,
        type: Sequelize.CHAR(20),
        status: Sequelize.CHAR(20),
        engineType: Sequelize.CHAR(25),
    });
    /* eslint-enable new-cap */
};
