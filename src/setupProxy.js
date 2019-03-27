const {api, validate, login, authenticatedRoutes} = require('./restServiceMethods');

module.exports = (app) => {
    app.use('/api', api);
    app.get('/validate', validate);
    app.post('/login', login);
    app.use('/rest', authenticatedRoutes);
};
