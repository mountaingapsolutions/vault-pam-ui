// Secret requests status
const REQUEST_STATUS = {
    APPROVED: 'APPROVED',
    CANCELED: 'CANCELED',
    LOCKED: 'LOCKED',
    PENDING: 'PENDING',
    REJECTED: 'REJECTED'
};

// Logger levels
const LOG_LEVELS = {
    'error': 0,
    'warn': 1,
    'info': 2,
    'http': 3,
    'verbose': 4,
    'debug': 5,
    'silly': 6,
    'audit': 7
};

module.exports = {
    LOG_LEVELS,
    REQUEST_STATUS
};
