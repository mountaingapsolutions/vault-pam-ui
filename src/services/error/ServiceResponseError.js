/*
   This is a custom error class extension
   Usage:
   const ServiceResponseError = require('services/error/ServiceResponseError');
   try {
        throw new ServiceResponseError('Error Message', 1234);
    }
    catch (e) {
        console.log('name:', e.name);
        console.log('message:', e.message);
        console.log('statusCode:', e.statusCode);
        console.log('stack:', e.stack);
    }
*/

module.exports = class ServiceResponseError extends Error {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @param {string} message The error message.
     * @param {number} statusCode The status code.
     * @public
     */
    constructor (message, statusCode = null) {
        super();
        this.message = message;
        this.name = this.constructor.name;
        this.statusCode = statusCode || 500;
        Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);
    }
};
