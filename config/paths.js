const path = require('path');
const fs = require('fs');
const url = require('url');

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());

/**
 * Resolves the app directory.
 *
 * @param {string} relativePath - The relative path.
 * @returns {function}
 */
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const envPublicUrl = process.env.PUBLIC_URL;

/**
 * Ensures the slash exists.
 *
 * @param {string} currentPath - The current path.
 * @param {boolean} needsSlash - Indicator on whether or not it needs a slash.
 * @returns {*}
 */
const ensureSlash = (currentPath, needsSlash) => {
    const hasSlash = currentPath.endsWith('/');
    if (hasSlash && !needsSlash) {
        return currentPath.substr(currentPath, currentPath.length - 1);
    } else if (!hasSlash && needsSlash) {
        return `${currentPath}/`;
    } else {
        return currentPath;
    }
};

/**
 * Returns the public URL.
 *
 * @param {Object} appPackageJson - The application package JSON.
 * @returns {string}
 */
const getPublicUrl = appPackageJson => envPublicUrl || require(appPackageJson).homepage;

/**
 * We use `PUBLIC_URL` environment variable or "homepage" field to infer "public path" at which the app is served. Webpack needs to know it to put the right <script> hrefs into HTML even in
 * single-page apps that may serve index.html for nested URLs like /todos/42. We can't use a relative path in HTML because we don't want to load something like /todos/42/static/js/bundle.7289d.js. We
 * have to know the root.
 *
 * @param {Object} appPackageJson - Application package JSON.
 * @returns {Object}
 */
const getServedPath = appPackageJson => {
    const publicUrl = getPublicUrl(appPackageJson);
    const servedUrl =
        envPublicUrl || (publicUrl ? url.parse(publicUrl).pathname : '/');
    return ensureSlash(servedUrl, true);
};

// config after eject: we're in ./config/
module.exports = {
    dotenv: resolveApp('.env'),
    appBuild: resolveApp('build'),
    appPublic: resolveApp('public'),
    appHtml: resolveApp('src/index.html'),
    appIndexJs: resolveApp('src/index.js'),
    appPackageJson: resolveApp('package.json'),
    appSrc: resolveApp('src'),
    yarnLockFile: resolveApp('yarn.lock'),
    testsSetup: resolveApp('src/setupTests.js'),
    appNodeModules: resolveApp('node_modules'),
    publicUrl: getPublicUrl(resolveApp('package.json')),
    servedPath: getServedPath(resolveApp('package.json')),
};
