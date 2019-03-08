const chalk = require('react-dev-utils/chalk');
const request = require('request');

module.exports = (app) => {
    app.use('/api', (req, res) => {
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
};
