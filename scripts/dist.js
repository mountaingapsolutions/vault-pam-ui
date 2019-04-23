/* eslint-disable no-console */

const archive = require('archiver')('zip');
const chalk = require('chalk');
const fs = require('fs');

const ZIP_FILE_NAME = 'vault-pam-ui.zip';

archive.pipe(fs.createWriteStream(ZIP_FILE_NAME));
archive.directory('dist/', false);
archive.finalize();

console.log(`\r\n${chalk.bold.yellow.underline('Successful build - congratulations!')}\r\n`);
