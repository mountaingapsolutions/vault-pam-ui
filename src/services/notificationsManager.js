const chalk = require('chalk');
const {getSessionMiddleware} = require('services/utils');
const logger = require('services/logger');

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
    _io
        .use((socket, next) => {
            getSessionMiddleware(socket.request, socket.request.res, next);
        })
        .on('connection', (socket) => {
            logger.info('User connected: ', socket.id);
            socket.on('disconnect', () => {
                logger.info('User disconnected ', socket.id);
            });

            if (socket.request.session.user) {
                const {entityId, groups = []} = socket.request.session.user;
                logger.info(`Joining ${entityId} to its own user group.`);
                socket.join(entityId);

                if (groups.length === 0) {
                    logger.info(`${entityId} is not in an assigned group.`);
                }
                groups.forEach(group => {
                    logger.info(`Joining ${entityId} to ${group}.`);
                    socket.join(group);
                });
            } else {
                logger.info(`${chalk.bold.red('No session user found: ')}${socket.request.session}${chalk.bold.red(' ...disconnecting...')}`);
                socket.disconnect();
            }
        });
};

module.exports = {
    start,
    getInstance: () => _io
};
