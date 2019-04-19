const {api, validate, login, authenticatedRoutes} = require('services/routes');
const {getSessionMiddleware} = require('services/utils');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

module.exports = (app) => {
    app.disable('x-powered-by');
    app.use(cookieParser());
    app.use(getSessionMiddleware);
    app.use('/api', api);
    // The /api endpoint is just a straight pass-through to Vault API. Using bodyParser on it is not supported.
    app.use(bodyParser.json());
    app.get('/validate', validate);
    app.post('/login', login);
    app.use('/rest', authenticatedRoutes);
};
