let promise;
let sequelize = null;
let dataModel = {};

const logger = require('services/logger');

/**
 * Starts the database connection.
 *
 * @return {Promise}
 * @private
 */
const start = () => {
    if (promise) {
        logger.info('Database start already called previously...');
        return promise;
    }
    logger.info('Detecting database configuration...');
    promise = new Promise((resolve, reject) => {
        const {PAM_DATABASE, PAM_DATABASE_USER, PAM_DATABASE_PASSWORD, PAM_DATABASE_URL, PAM_DATABASE_PORT} = process.env;
        if (PAM_DATABASE && PAM_DATABASE_USER && PAM_DATABASE_PASSWORD && PAM_DATABASE_URL && PAM_DATABASE_PORT) {
            logger.info('All required database variables found. Attempting to establish connection...');
            const Sequelize = require('sequelize');
            const {models} = require('services/db/models');
            sequelize = new Sequelize(PAM_DATABASE, PAM_DATABASE_USER, PAM_DATABASE_PASSWORD, {
                dialect: 'postgres',
                host: PAM_DATABASE_URL,
                port: PAM_DATABASE_PORT,
                define: {
                    // Disable the modification of table names; By default, sequelize will automatically transform all
                    // passed model names (first parameter of define) into plural.
                    freezeTableName: true,
                    // Add the timestamp attributes (updatedAt, createdAt).
                    timestamps: true
                }
            });
            logger.info('Initializing models...');
            Object.keys(models).forEach(key => {
                logger.info(`Initializing ${key}...`);
                dataModel[key] = models[key].init(sequelize);
            });
            logger.info('Setting up associations...');
            Object.values(dataModel).forEach((model) => {
                if (typeof model.associate === 'function') {
                    logger.info(`Initializing associations for ${model.name}.`);
                    model.associate(dataModel);
                }
            });
            sequelize.sync({
                logging: true
            }).then(resolve).catch(reject);
        } else {
            reject('Required database variables have not been set. (╯°□°)╯︵ ┻━┻');
        }
    });
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
