const path = require('path');
const child_process = require('child_process');
const Promise = require('bluebird');
const Umzug = require('umzug');
const connection = require('./connection');
const sequelize = connection.getSequelize();

const umzug = new Umzug({
    storage: 'sequelize',
    storageOptions: {
        sequelize: sequelize,
    },

    // see: https://github.com/sequelize/umzug/issues/17
    migrations: {
        params: [
            sequelize.getQueryInterface(), // queryInterface
            sequelize.constructor, // DataTypes
            () => {
                throw new Error('Migration tried to use old style "done" callback. Please upgrade to "umzug" and return a promise instead.');
            }
        ],
        path: `${path.resolve(__dirname)}/migrations`,
        pattern: /\.js$/
    },
    logging: (...args) => {
        /* eslint-disable no-console */
        console.log(args);
        /* eslint-enable no-console */
    },
});

/**
 * Gets the migration status.
 *
 * @return {Promise}.
 * @private
 */
const _status = () => {
    let result = {};

    return umzug.executed()
        .then(executed => {
            result.executed = executed;
        }).then(pending => {
            result.pending = pending;
            return result;
        }).then(({executed, pending}) => {

            executed = executed.map(m => {
                m.name = path.basename(m.file, '.js');
                return m;
            });
            pending = pending && pending.map(m => {
                m.name = path.basename(m.file, '.js');
                return m;
            });

            const current = executed.length > 0 ? executed[0].file : '<NO_MIGRATIONS>';
            const umugStatus = {
                current: current,
                executed: executed.map(m => m.file),
                pending: pending && pending.map(m => m.file),
            };
            /* eslint-disable no-console */
            console.log(JSON.stringify(umugStatus, null, 2));
            /* eslint-enable no-console */
            return {executed, pending};
        });
};

/**
 * Executes migration process.
 *
 * @return {Promise}.
 * @private
 */
const _migrate = () => {
    return umzug.up();
};

/**
 * Executes the next migration in que.
 *
 * @return {Promise}.
 * @private
 */
const _migrateNext = () => {
    return _status()
        .then(({pending}) => {
            if (pending.length === 0) {
                return Promise.reject(new Error('No pending migrations'));
            }
            const next = pending[0].name;
            return umzug.up({to: next});
        });
};

/**
 * Reverts the migration.
 *
 * @return {Promise}.
 * @private
 */
const _reset = () => {
    return umzug.down({to: 0});
};

/**
 * Reverts the previous migration.
 *
 * @return {Promise}.
 * @private
 */
const _resetPrev = () => {
    return _status()
        .then(({executed}) => {
            if (executed.length === 0) {
                return Promise.reject(new Error('Already at initial state'));
            }
            const prev = executed[executed.length - 1].name;
            return umzug.down({to: prev});
        });
};

/**
 * Resets the migration.
 *
 * @return {Promise}.
 * @private
 */
const _hardReset = () => {
    return new Promise((resolve, reject) => {
        setImmediate(() => {
            /* eslint-disable no-console */
            try {
                const {PAM_DATABASE, PAM_DATABASE_USER} = process.env;
                console.log(`dropdb ${PAM_DATABASE}`);
                child_process.spawnSync(`dropdb ${PAM_DATABASE}`);
                console.log(`createdb ${PAM_DATABASE} --username ${PAM_DATABASE_USER}`);
                child_process.spawnSync(`createdb ${PAM_DATABASE} --username ${PAM_DATABASE_USER}`);
                resolve();
            } catch (e) {
                console.error(e);
                reject(e);
            }
            /* eslint-enable no-console */
        });
    });
};

/**
 * Executes migration process.
 *
 * @param {string} cmd The migration command.
 * @private
 */
const migrate = (cmd) => {
    let executedCmd;
    /* eslint-disable no-console */
    console.log(`${ cmd.toUpperCase() } BEGIN`);
    /* eslint-enable no-console */
    switch (cmd) {
        case 'status':
            executedCmd = _status();
            break;

        case 'up':
        case 'migrate':
            executedCmd = _migrate();
            break;

        case 'next':
        case 'migrate-next':
            executedCmd = _migrateNext();
            break;

        case 'down':
        case 'reset':
            executedCmd = _reset();
            break;

        case 'prev':
        case 'reset-prev':
            executedCmd = _resetPrev();
            break;

        case 'reset-hard':
            executedCmd = _hardReset();
            break;

        default:
            /* eslint-disable no-console */
            console.log(`invalid cmd: ${cmd}`);
            /* eslint-enable no-console */
            process.exit(1);
    }

    if (executedCmd) {
        executedCmd
            .then(() => {
                const doneStr = `${ cmd.toUpperCase() } DONE`;
                /* eslint-disable no-console */
                console.log(doneStr);
                console.log('='.repeat(doneStr.length));
                /* eslint-enable no-console */
            })
            .catch(err => {
                /* eslint-disable no-console */
                const errorStr = `${ cmd.toUpperCase() } ERROR`;
                console.log(errorStr);
                console.log('='.repeat(errorStr.length));
                console.log(err);
                console.log('='.repeat(errorStr.length));
                /* eslint-enable no-console */
            })
            .then(() => {
                if (cmd !== 'status' && cmd !== 'reset-hard') {
                    return _status();
                }
                return Promise.resolve();
            });
    }
};

module.exports = {
    migrate
};
