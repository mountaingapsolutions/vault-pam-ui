module.exports = (sequelize) => {
    const Sequelize = require('sequelize');
    return sequelize.define('user', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        uid: {
            type: Sequelize.STRING,
            allowNull: false
        },
        firstName: Sequelize.STRING,
        lastName: Sequelize.STRING,
        email: Sequelize.STRING,
        engineType: Sequelize.STRING
    });
};
