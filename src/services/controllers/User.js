const connection = require('../db/connection');
const User = connection.getModel('User');

/**
 * Create a User.
 *
 * @param {string} entityId The entity id.
 * @param {string} firstName The first name.
 * @param {string} lastName The last name.
 * @param {string} email The email.
 * @param {string} engineType The engine type used to login.
 * @returns {Object}
 */
const create = (entityId, firstName, lastName, email, engineType) => {
    return User.create({
        entityId,
        firstName,
        lastName,
        email,
        engineType
    }).then(user => {
        return user;
    });
};

/**
 * Find or create a User.
 *
 * @param {string} entityId The entity id.
 * @param {string} firstName The first name.
 * @param {string} engineType The engine type used to login.
 * @param {string} lastName The last name.
 * @param {string} email The email.
 * @returns {Object}
 */
const findOrCreate = (entityId, firstName = undefined, engineType = undefined, lastName = undefined, email = undefined) => {
    return findByEntityId(entityId).then(user => {
        if (user) {
            return user;
        } else {
            return create(entityId, firstName, lastName, email, engineType);
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
    return User.findByPk(id).then(user => {
        return user;
    });
};

/**
 * Find a User by entity id.
 *
 * @param {string} entityId The entity id.
 * @returns {Object}
 */
const findByEntityId = (entityId) => {
    return User.findOne({
        where: {entityId}
    }).then(user => {
        return user;
    });
};

/**
 * Update a User.
 *
 * @param {string} entityId The entity id.
 * @param {string} firstName The first name.
 * @param {string} lastName The last name.
 * @param {string} email The email.
 * @returns {Object}
 */
const update = (entityId, firstName, lastName, email) => {
    return User.update({firstName, lastName, email},
        {where: {entityId}}
    ).then((user) => {
        return user;
    });
};

/**
 * Delete a User by entity id.
 *
 * @param {string} entityId The entity id.
 * @returns {Object}
 */
const deleteByEntityId = (entityId) => {
    return User.destroy({
        where: {entityId}
    }).then(() => {
        return {status: 'ok', entityId};
    });
};

module.exports = {
    create,
    findAll,
    findOrCreate,
    findById,
    findByEntityId,
    update,
    deleteByEntityId
};
