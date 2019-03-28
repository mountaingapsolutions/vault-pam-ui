const connection = require('../connection');
const {Sequelize} = connection;

const User = connection.define('user', {
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

module.exports = User;
