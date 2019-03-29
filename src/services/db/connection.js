let promise;
let sequelize = null;
let dataModel = {};

const {PAM_DATABASE, PAM_DATABASE_USER, PAM_DATABASE_PASSWORD, PAM_DATABASE_URL, PAM_DATABASE_PORT} = process.env;
if (PAM_DATABASE && PAM_DATABASE_USER && PAM_DATABASE_PASSWORD && PAM_DATABASE_URL && PAM_DATABASE_PORT) {
    console.info('All required database variables found. Attempting to establish connection...');

    promise = new Promise((resolve, reject) => {
        const Sequelize = require('sequelize');
        const {models} = require('./models');
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
        console.info('Initializing models...');
        Object.keys(models).map(key => {
            console.info(`Initializing ${key}...`);
            const model = models[key](sequelize);
            dataModel[key] = model;
            return model;
        });
        sequelize.sync({
            logging: true
        }).then(resolve).catch(reject);
    });
} else {
    promise = new Promise((resolve, reject) => {
        reject('Required database variables have not been set. (╯°□°)╯︵ ┻━┻');
    });
}

const start = () => {
    console.info('Detecting database configuration...');
    return promise;
};

const getModel = (modelName) => {
    console.info(`Fetching data model ${modelName}`);
    return dataModel[modelName];
};

module.exports = {
    start,
    getModel
};
