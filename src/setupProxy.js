const {api, validate} = require('./restServiceMethods');

module.exports = (app) => {
    app.use('/api', api);
    app.get('/validate', validate);
};
