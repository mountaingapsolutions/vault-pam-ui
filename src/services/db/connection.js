let promise;
let sequelize = null;
let dataModel = {};

const {PAM_DATABASE, PAM_DATABASE_USER, PAM_DATABASE_PASSWORD, PAM_DATABASE_URL, PAM_DATABASE_PORT} = process.env;
const logger = require('services/logger');

if (PAM_DATABASE && PAM_DATABASE_USER && PAM_DATABASE_PASSWORD && PAM_DATABASE_URL && PAM_DATABASE_PORT) {
    logger.info('All required database variables found. Attempting to establish connection...');
    promise = new Promise((resolve, reject) => {
        const Sequelize = require('sequelize');
        const {models} = require('services/db/models');
        sequelize = new Sequelize(
            PAM_DATABASE,
            PAM_DATABASE_USER,
            PAM_DATABASE_PASSWORD,
            {
                dialect: 'postgres',
                host: PAM_DATABASE_URL,
                port: PAM_DATABASE_PORT
            }
        );
        logger.info('Initializing models...');
        Object.keys(models).map(key => {
            logger.info(`Initializing ${key}...`);
            const model = models[key](sequelize);
            dataModel[key] = model;
            return model;
        });
        sequelize.sync({
            logging: true
        }).then(resolve()).catch(reject);
    });
} else {
    promise = new Promise((resolve, reject) => {
        reject('Required database variables have not been set. (╯°□°)╯︵ ┻━┻');
    });
}

/**
 * Starts the database connection.
 *
 * @return {Promise}
 * @private
 */
const start = () => {
    logger.info('Detecting database configuration...');
    return promise;
};

/**
 * Gets the database table instance.
 *
 * @param {string} modelName The name of the table.
 * @return {Object} The data model object.
 * @private
 */
const getModel = (modelName) => {
    logger.info(`Fetching data model ${modelName}`);
    return dataModel[modelName];
};

/**
 * Gets the sequelize instance.
 *
 * @return {Object} The sequelize instance.
 * @private
 */
const getSequelize = () => {
    return sequelize;
};

module.exports = {
    start,
    getModel,
    getSequelize
};
