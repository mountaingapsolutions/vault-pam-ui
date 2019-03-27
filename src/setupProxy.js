const {api, validate, login, authenticatedRoutes} = require('./restServiceMethods');
const bodyParser = require('body-parser');
module.exports = (app) => {
    app.use('/api', api);
    // The /api endpoint is just a straight pass-through to Vault API. Using bodyParser on it is not supported.
    app.use(bodyParser.json());
    app.get('/validate', validate);
    app.post('/login', login);
    app.use('/rest', authenticatedRoutes);
};
