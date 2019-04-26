const base64id = require('base64id');
const chalk = require('chalk');
const cookie = require('cookie');
const {getSessionMiddleware} = require('services/utils');
const logger = require('services/logger');

/**
 * Generates the id for the socket connection.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @returns {string}
 */
const _generateId = (req) => {
    const generatedId = `generated-${base64id.generateId()}`;
    const entityId = cookie.parse(req.headers.cookie || '').entity_id;
    if (!entityId) {
        logger.warn(chalk.bold.red(`No entity id found in session. Returning generated id ${generatedId}.`));
    }
    return entityId || generatedId;
};

let _io = null;

/**
 * Starts the notifications manager.
 *
 * @param {Object} server The HTTP server to bind to.
 */
const start = (server) => {
    _io = require('socket.io')(server, {
        path: '/notifications'
    });
    _io.engine.generateId = _generateId;
    _io
        .use((socket, next) => {
            getSessionMiddleware(socket.request, socket.request.res, next);
        })
        .on('connection', (socket) => {
            logger.info('User connected: ', socket.id);
            socket.on('disconnect', () => {
                logger.info('User disconnected ', socket.id);
            });

            if (socket.request.session.user && !socket.id.startsWith('generated')) {
                const {entityId, groups = []} = socket.request.session.user;
                if (groups.length === 0) {
                    logger.info(`${entityId} is not in an assigned group.`);
                }
                groups.forEach(group => {
                    logger.info(`Joining ${entityId} to ${group}.`);
                    socket.join(group);
                });
            } else {
                logger.info(chalk.bold.red('No session user found: '), socket.request.session, chalk.bold.red(' ...disconnecting...'));
                socket.disconnect();
            }
        });
};

module.exports = {
    start,
    getInstance: () => _io
};
