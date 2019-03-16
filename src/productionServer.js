/* eslint-disable no-console */
/* global process, __dirname */

const port = process.env.PORT || 80;
const chalk = require('chalk');
const compression = require('compression');
const express = require('express');
const path = require('path');
const hsts = require('hsts');
const {api, validate} = require('./restServiceMethods');

console.log(`Starting server on port ${chalk.yellow(port)}...`);

const noCacheUrls = ['/'];
express().use(compression())
    .disable('x-powered-by')
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
