/* eslint-disable no-console */

const archive = require('archiver')('zip');
const chalk = require('chalk');
const {exec} = require('child_process');
const fs = require('fs');
const path = require('path');

const ZIP_FILE_NAME = 'vault-pam-ui.zip';

const premiumPackage = 'bitbucket:mountaingapsolutions/vault-pam-premium';
const installPath = path.join(__dirname, '../', 'dist', '/');
console.log(`Attempting to install ${chalk.bold.yellow.underline(premiumPackage)} within ${installPath}...`);

exec(`mkdir node_modules && npm install ${premiumPackage} --no-save`, {
    cwd: installPath
}, (error, stdout, stderr) => {
    if (error) {
        console.error(error);
    } else {
        console.log(stdout);
        console.warn(stderr);
        console.log(`Successfully installed ${chalk.bold.yellow.underline(premiumPackage)}!`);
    }

    archive.pipe(fs.createWriteStream(ZIP_FILE_NAME));
    archive.directory('dist/', false);
    archive.finalize();

    console.log(`\r\n${chalk.bold.yellow.underline('Successful build - congratulations!')}\r\n`);
});
