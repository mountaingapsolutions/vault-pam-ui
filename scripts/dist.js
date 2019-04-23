/* eslint-disable no-console */

const archive = require('archiver')('zip');
const chalk = require('chalk');
const {exec} = require('child_process');
const fs = require('fs');
const path = require('path');

const ZIP_FILE_NAME = 'vault-pam-ui.zip';

const installPath = path.join(__dirname, '../', 'dist', '/');
console.log(`Attempting to install ${chalk.bold.yellow.underline('vault-pam-premium')} within ${installPath}...`);

const bitbucketUser = process.env.BITBUCKET_USER;
const bitbucketAccessToken = process.env.BITBUCKET_ACCESS_TOKEN;
let npmInstallUrl = 'bitbucket:mountaingapsolutions/vault-pam-premium';
console.log('Bitbucket user: ', bitbucketUser);
if (bitbucketUser && bitbucketAccessToken) {
    console.log('Running npm install using Bitbucket access token... ');
    npmInstallUrl = `git+https://${bitbucketUser}:${bitbucketAccessToken}@bitbucket.org/mountaingapsolutions/vault-pam-premium.git`;
}
exec(`mkdir node_modules && npm install ${npmInstallUrl} --no-save`, {
    cwd: installPath
}, (error, stdout, stderr) => {
    if (error) {
        console.error(error);
    } else {
        console.log(stdout);
        console.warn(stderr);
        console.log(`Successfully installed ${chalk.bold.yellow.underline('vault-pam-premium')}!`);
    }

    archive.pipe(fs.createWriteStream(ZIP_FILE_NAME));
    archive.directory('dist/', false);
    archive.finalize();

    console.log(`\r\n${chalk.bold.yellow.underline('Successful build - congratulations!')}\r\n`);
});
