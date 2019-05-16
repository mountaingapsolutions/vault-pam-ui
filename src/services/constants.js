// Secret requests status
const REQUEST_STATUS = {
    APPROVED: 'APPROVED',
    CANCELED: 'CANCELED',
    LOCKED: 'LOCKED',
    OPENED: 'OPENED',
    PENDING: 'PENDING',
    REJECTED: 'REJECTED',
    REVOKED: 'REVOKED'
};

const REQUEST_TYPES = {
    CONTROL_GROUP: 'control-group',
    DYNAMIC_REQUEST: 'dynamic-request',
    STANDARD_REQUEST: 'standard-request'
};
const DYNAMIC_ENGINES = [
    'aws'
];

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
    DYNAMIC_ENGINES,
    LOG_LEVELS,
    REQUEST_STATUS,
    REQUEST_TYPES
};
