const {api, validate, login, authenticatedRoutes, userService} = require('./restServiceMethods');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

module.exports = (app) => {
    app.use(cookieParser());
    app.use(session({
        key: 'entity_id',
        secret: process.env.SESSION_SECRET || 'correct horse battery staple',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 600000
        }
    }));
    app.use('/api', api);
    // The /api endpoint is just a straight pass-through to Vault API. Using bodyParser on it is not supported.
    app.use(bodyParser.json());
    app.get('/validate', validate);
    app.post('/login', login);
    app.use('/rest', authenticatedRoutes);
    app.use('/user', userService);
};
