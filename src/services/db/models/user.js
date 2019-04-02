module.exports = (sequelize) => {
    const Sequelize = require('sequelize');
    /* eslint-disable new-cap */
    return sequelize.define('user', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        entityId: {
            type: Sequelize.CHAR(36),
            allowNull: false
        },
        firstName: Sequelize.CHAR(255),
        lastName: Sequelize.CHAR(255),
        email: Sequelize.CHAR(255),
        engineType: Sequelize.CHAR(25),
    });
    /* eslint-enable new-cap */
};
