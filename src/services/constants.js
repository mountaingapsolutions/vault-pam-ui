// Secret requests status
const REQUEST_STATUS = {
    APPROVED: 'APPROVED',
    CANCELED: 'CANCELED',
    LOCKED: 'LOCKED',
    OPENED: 'OPENED',
    PENDING: 'PENDING',
    REJECTED: 'REJECTED',
    REQUESTED: 'REQUESTED',
    REVOKED: 'REVOKED'
};

const REQUEST_TYPES = {
    CONTROL_GROUP: 'control-group',
    DYNAMIC_REQUEST: 'dynamic-request',
    STANDARD_REQUEST: 'standard-request'
};
const DYNAMIC_ENGINES = [
    'aws',
    'azure'
];

const AUTH_TYPES = {
    AUTH_TOKEN: 'auth-token',
    TOKEN: 'token',
    USER_PASSWORD: 'user-password'
};

const AUTH_METHODS = {
    github: AUTH_TYPES.AUTH_TOKEN,
    ldap: AUTH_TYPES.USER_PASSWORD,
    okta: AUTH_TYPES.USER_PASSWORD,
    token: AUTH_TYPES.TOKEN,
    userpass: AUTH_TYPES.USER_PASSWORD
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
    AUTH_METHODS,
    AUTH_TYPES,
    DYNAMIC_ENGINES,
    LOG_LEVELS,
    REQUEST_STATUS,
    REQUEST_TYPES
};
