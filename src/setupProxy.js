const {api, config, login, authenticatedRoutes} = require('services/routes');
const {getSessionMiddleware} = require('services/utils');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const cookieParser = require('cookie-parser');

module.exports = (app) => {
    app.disable('x-powered-by');
    app.use(cookieParser());
    app.use(getSessionMiddleware);
    app.use('/api', api);
    // The /api endpoint is just a straight pass-through to Vault API. Using bodyParser on it is not supported.
    app.use(bodyParser.json());
    app.get('/config', config);
    app.post('/login', login);
    app.use('/rest', authenticatedRoutes);

    try {
        const {validate} = require('vault-pam-premium');
        console.log(chalk.bold.green('Premium features available.'));
        validate().then((results) => {
            app.locals.features = results ? {
                ...results
            } : {};
        });
    } catch (packageError) {
        console.log(chalk.bold.red('Premium features unavailable.'));
        app.locals.features = {};
    }
};
