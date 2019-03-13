const chalk = require('react-dev-utils/chalk');
const request = require('request');

module.exports = (app) => {
    app.use('/api', (req, res) => {
        _disableCache(res);
        const {'x-vault-domain': domain, 'x-vault-token': token} = req.headers;
        // Check if the domain has been provided.
        if (!domain) {
            res.status(400).json({errors: ['No Vault server domain provided.']});
        } else {
            const uri = `${domain.endsWith('/') ? domain.slice(0, -1) : domain}${req.url}`;
            console.log(`Proxy the request from ${chalk.yellow(chalk.bold(req.originalUrl))} to ${chalk.yellow(chalk.bold(uri))}.`);
            req.pipe(request({
                headers: {
                    'x-vault-token': token
                },
                uri
            }, (err) => {
                if (err) {
                    res.status(500).json({errors: [err]});
                }
            }))
            // .on('response', response => {
            //     // Do interstitial logic here such as setting cookies. E.g.
            //     // response.headers['set-cookie'] = response.headers['set-cookie'].map(value => value.replace(/secure(;)?/, '').replace(/HttpOnly(;)?/, ''));
            // })
                .pipe(res);
        }
    });
    app.get('/validate', (req, res) => {
        _disableCache(res);
        const domain = req.query.domain;
        if (!domain) {
            res.status(400).json({errors: ['No domain provided.']});
        } else {
            const url = `${domain.endsWith('/') ? domain.slice(0, -1) : domain}/v1/sys/seal-status`;
            request(url, (error, response, body) => {
                if (error) {
                    _sendError(url, res, error);
                } else {
                    try {
                        const sealStatusResponse = JSON.parse(body);
                        if (sealStatusResponse && sealStatusResponse.initialized) {
                            res.json(sealStatusResponse);
                        } else {
                            _sendError(url, res, sealStatusResponse);
                        }
                    } catch (err) {
                        _sendError(url, res, err);
                    }
                }
            });
        }
    });
};

/**
 * Sends the standard error response.
 *
 * @private
 * @param {Object} url The requested Vault server url.
 * @param {Object} res The response object.
 * @param {Object} error The error.
 */
const _sendError = (url, res, error) => {
    console.warn(`Error in retrieving url "${url}": `, error);
    res.status(400).json({
        errors: ['Invalid Vault server domain.']
    });
};

/**
 * Disables cache for the response.
 *
 * @private
 * @param {Object} res The response object.
 */
const _disableCache = (res) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', 0);
};
