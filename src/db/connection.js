const Sequelize = require('sequelize');

const connection = new Sequelize(
    process.env.PAM_DATABASE,
    process.env.PAM_DATABASE_USER,
    process.env.PAM_DATABASE_PASSWORD,
    {
        dialect: 'postgres',
        host: process.env.PAM_DATABASE_URL,
        port: process.env.PAM_DATABASE_PORT
    }
);

module.exports = connection;
