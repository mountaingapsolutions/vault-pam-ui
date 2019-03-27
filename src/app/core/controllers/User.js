const User = require('../../../db/models/user');

/**
 * Create a User.
 *
 * @param {string} uid The UID.
 * @param {string} firstname The first name.
 * @param {string} lastname The last name.
 */
const create = (uid, firstname, lastname) => {
    User.create({
        uid: uid,
        firstName: firstname,
        lastName: lastname
    }).then(user => {
        // Send created user to client
        return user;
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
 * @param {number} id The HTTP request object.
 * @returns {Object}
 */
const findById = (id) => {
    return User.findById(id).then(user => {
        return user;
    });
};

/**
 * Update a User.
 *
 * @param {string} uid The UID.
 * @param {string} firstname The first name.
 * @param {string} lastname The last name.
 * @returns {Object}
 */
const update = (uid, firstname, lastname) => {
    return User.update( { firstName: firstname, lastName: lastname },
        { where: {uid: uid} }
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
const deleteUserByUid = (uid) => {
    return User.destroy({
        where: { uid: uid }
    }).then(() => {
        return { status: 'ok'};
    });
};

module.exports = {
    create,
    findAll,
    findById,
    update,
    deleteUserByUid
};
