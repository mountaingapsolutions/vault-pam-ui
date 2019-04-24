/* eslint-disable no-console */
/* global process, __dirname */

const port = process.env.PORT || 80;
const bodyParser = require('body-parser');
const chalk = require('chalk');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const express = require('express');
const path = require('path');
const hsts = require('hsts');

// Import any environment variables.
require('dotenv').config();

// Add the root project directory to the app module search path:
require('app-module-path').addPath(path.join(__dirname));

const {api, config, login, logout, authenticatedRoutes} = require('services/routes');

// Overcome the DEPTH_ZERO_SELF_SIGNED_CERT error.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const {getSessionMiddleware, validateDomain} = require('services/utils');
if (!process.env.VAULT_DOMAIN) {
    console.error('No Vault domain configured.');
    process.exit(9);
}
validateDomain(process.env.VAULT_DOMAIN)
    .then((isValid) => {
        if (!isValid) {
            console.error(`Invalid Vault domain "${process.env.VAULT_DOMAIN}".`);
            process.exit(9);
        } else {
            _startServer();
        }
    })
    .catch((err) => {
        console.error(`Invalid Vault domain "${process.env.VAULT_DOMAIN}": `, err);
        process.exit(9);
    });

/**
 * Starts the prod server.
 *
 * @private
 */
const _startServer = () => {
    const useHsts = process.env.USE_HSTS !== null && process.env.USE_HSTS !== undefined ? !!process.env.USE_HSTS && process.env.USE_HSTS !== 'false' : true;
    console.log(`Starting server on port ${chalk.yellow(port)}...`);

    const noCacheUrls = ['/'];
    const app = express();
    const server = app.use(compression())
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
        .use(getSessionMiddleware)
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
        .get('/config', config)
        .post('/login', login)
        .post('/logout', logout)
        .use('/rest', authenticatedRoutes)
        .get('/*', (req, res) => {
            res.sendFile(path.join(__dirname, 'build', 'index.html'));
        })
        .listen(port, () => {
            console.log(`Server is now listening on port ${chalk.yellow(port)}...`);

            if (!process.env.SESSION_SECRET) {
                console.warn(`The environment variable ${chalk.yellow.bold('SESSION_SECRET')} was not set. Defaulting to the classic xkcd password...`);
            }

            // Notification manager startup.
            require('services/notificationsManager').start(server);

            // Database startup.
            const connection = require('services/db/connection');
            connection.start()
                .then(() => {
                    console.info('DB connection successful. ᕕ( ᐛ )ᕗ\r\n');
                    // DB migrations
                    // const {migrate} = require('services/db/migrate');
                    // migrate('up');
                })
                .catch((error) => {
                    console.error(error);
                    process.exit(1);
                });
        });

    try {
        const {validate} = require('vault-pam-premium');
        console.log('Premium features available.');
        validate().then((results) => {
            app.locals.features = results ? {
                ...results
            } : {};
        });
    } catch (err) {
        console.log('Premium features unavailable.');
        app.locals.features = {};
    }
};
