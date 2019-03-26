/* eslint-disable no-console */
/* global process, __dirname */

const port = process.env.PORT || 80;
const chalk = require('chalk');
const compression = require('compression');
const express = require('express');
const path = require('path');
const hsts = require('hsts');
const {api, validate} = require('./restServiceMethods');

// Overcome the DEPTH_ZERO_SELF_SIGNED_CERT error.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const useHsts = process.env.USE_HSTS !== null && process.env.USE_HSTS !== undefined ? !!process.env.USE_HSTS && process.env.USE_HSTS !== 'false' : true;
console.log(`Starting server on port ${chalk.yellow(port)}...`);

// Database Init
const { connection } = require('./db/models');
connection.sync().then(() => {
    console.info('DB connection successful.');
}, (err) => {
    console.error(err);
});

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
    .use('/', (req, res, next) => {
        if (noCacheUrls.includes(req.originalUrl)) {
            res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.header('Pragma', 'no-cache');
            res.header('Expires', 0);
        }
        express.static(path.join(__dirname, 'build')).call(this, req, res, next);
    })
    .use('/api', api)
    .get('/validate', validate)
    .get('/*', (req, res) => {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    })
    .listen(port, () => {
        console.log(`Server is now listening on port ${chalk.yellow(port)}...`);
    });
