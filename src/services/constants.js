// Secret requests status
const REQUEST_STATUS = {
    APPROVED: 'APPROVED',
    CANCELED: 'CANCELED',
    LOCKED: 'LOCKED',
    PENDING: 'PENDING',
    REJECTED: 'REJECTED'
};
const REQUEST_TYPES = {
    CONTROL_GROUP: 'control-group',
    DYNAMIC_REQUEST: 'dynamic-request',
    STANDARD_REQUEST: 'standard-request'
};
const DYNAMIC_ENGINES = [
    'aws'
];
module.exports = {
    DYNAMIC_ENGINES,
    REQUEST_STATUS,
    REQUEST_TYPES
};
