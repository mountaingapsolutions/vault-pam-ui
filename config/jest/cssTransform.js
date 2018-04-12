// This is a custom Jest transformer turning style imports into empty objects.
// http://facebook.github.io/jest/docs/en/webpack.html

module.exports = {
    /**
     * Processes the module exports.
     *
     * @returns {string}
     */
    process() {
        return 'module.exports = {};';
    },
    /**
     * Returns the cache key.
     *
     * @returns {string}
     */
    getCacheKey() {
        // The output is always the same.
        return 'cssTransform';
    }
};
