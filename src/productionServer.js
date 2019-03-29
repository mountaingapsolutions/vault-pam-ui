/* eslint-disable no-console */
/* global process, __dirname */

const port = process.env.PORT || 80;
const bodyParser = require('body-parser');
const chalk = require('chalk');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const express = require('express');
const session = require('express-session');
const path = require('path');
const hsts = require('hsts');
const {api, validate, login, authenticatedRoutes, userService} = require('./restServiceMethods');

// Overcome the DEPTH_ZERO_SELF_SIGNED_CERT error.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();

const useHsts = process.env.USE_HSTS !== null && process.env.USE_HSTS !== undefined ? !!process.env.USE_HSTS && process.env.USE_HSTS !== 'false' : true;
console.log(`Starting server on port ${chalk.yellow(port)}...`);

const noCacheUrls = ['/'];
express().use(compression())
    .disable('x-powered-by')
    .use((req, res, next) => {
        // Debugging snippet to figure out exactly what the proxy request header contains.
        // const logObject = {
        //     headerData: JSON.parse(JSON.stringify(req.headers)),
        //     message: `Request made for: ${req.headers.host}${req.url}`,
        //     useHsts: useHsts,
        //     reqSecure: req.secure,
        //     reqProtocol: req.protocol
        // };
        // console.log(logObject);

        // If requesting http, forward to https.
        if (useHsts && req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(307, `https://${req.headers.host}${req.url}`);
        }
        return next();
    })
    .use(hsts({
        force: true,
        preload: true
    }))
    .use(cookieParser())
    .use(session({
        key: 'entity_id',
        secret: process.env.SESSION_SECRET || 'correct horse battery staple',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 600000
        }
    }))
    .use('/', (req, res, next) => {
        if (noCacheUrls.includes(req.originalUrl)) {
            res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.header('Pragma', 'no-cache');
            res.header('Expires', 0);
        }
        express.static(path.join(__dirname, 'build')).call(this, req, res, next);
    })
    .use('/api', api)
    // The /api endpoint is just a straight pass-through to Vault API. Using bodyParser on it is not supported.
    .use(bodyParser.json())
    .get('/validate', validate)
    .post('/login', login)
    .use('/rest', authenticatedRoutes)
    .use('/user', userService)
    .get('/*', (req, res) => {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    })
    .listen(port, () => {
        console.log(`Server is now listening on port ${chalk.yellow(port)}...`);

        if (!process.env.SESSION_SECRET) {
            console.warn(`The environment variable ${chalk.yellow.bold('SESSION_SECRET')} was not set. Defaulting to the classic xkcd password...`);
        }

        // Database startup.
        const connection = require('./services/db/connection');
        connection.start()
            .then(() => {
                console.info('DB connection successful. ᕕ( ᐛ )ᕗ\r\n');
            })
            .catch((error) => {
                console.error(error);
                process.exit(1);
            });
    });
