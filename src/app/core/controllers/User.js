const connection = require('../../../db/connection');
const User = connection.getModel('User');

/**
 * Create a User.
 *
 * @param {string} uid The UID.
 * @param {string} firstName The first name.
 * @param {string} lastName The last name.
 * @param {string} email The email.
 * @returns {Object}
 */
const create = (uid, firstName, lastName, email) => {
    return User.create({
        uid,
        firstName,
        lastName,
        email
    }).then(user => {
        return user;
    });
};

/**
 * Find or create a User.
 *
 * @param {string} uid The UID.
 * @param {string} firstName The first name.
 * @param {string} lastName The last name.
 * @param {string} email The email.
 * @returns {Object}
 */
const findOrCreate = (uid, firstName, lastName, email) => {
    return findByUid(uid).then(user => {
        if (user) {
            return user;
        } else {
            return create(uid, firstName, lastName, email);
        }
    });
};

/**
 * Find all the Users.
 *
 * @returns {Object}
 */
const findAll = () => {
    return User.findAll().then(users => {
        // Send all users to Client
        return users;
    });
};

/**
 * Find a User by Id.
 *
 * @param {number} id The user db id.
 * @returns {Object}
 */
const findById = (id) => {
    return User.findById(id).then(user => {
        return user;
    });
};

/**
 * Find a User by Uid.
 *
 * @param {string} uid The user db id.
 * @returns {Object}
 */
const findByUid = (uid) => {
    return User.findOne({
        where: {uid}
    }).then(user => {
        return user;
    });
};

/**
 * Update a User.
 *
 * @param {string} uid The UID.
 * @param {string} firstName The first name.
 * @param {string} lastName The last name.
 * @param {string} email The email.
 * @returns {Object}
 */
const update = (uid, firstName, lastName, email) => {
    return User.update({firstName, lastName, email},
        {where: {uid}}
    ).then((user) => {
        return user;
    });
};

/**
 * Delete a User by Id.
 *
 * @param {string} uid The UID.
 * @returns {Object}
 */
const deleteByUid = (uid) => {
    return User.destroy({
        where: {uid}
    }).then(() => {
        return {status: 'ok'};
    });
};

module.exports = {
    create,
    findAll,
    findOrCreate,
    findById,
    findByUid,
    update,
    deleteByUid
};
