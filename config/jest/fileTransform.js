/* global module, process, require */
const path = require('path');

// This is a custom Jest transformer turning file imports into filenames.
// http://facebook.github.io/jest/docs/en/webpack.html

module.exports = {

    /**
     * Processes module.exports.
     * @param {string} src - The src.
     * @param {string} filename - The filename.
     * @returns {string}
     */
    process(src, filename) {
        return `module.exports = ${JSON.stringify(path.basename(filename))};`;
    }
};
