const {safeWrap, unwrap} = require('@mountaingapsolutions/objectutil');
const request = require('request');
const logger = require('services/logger');
const {asyncRequest, initApiRequest, getDomain, sendJsonResponse} = require('services/utils');
const {sendError} = require('services/error/errorHandler');

/**
 * @swagger
 * definitions:
 *   user:
 *     type: object
 *     properties:
 *       name:
 *         type: string
 *       id:
 *         type: string
 *       password:
 *         type: string
 *         format: password
 *       metadata:
 *         type: object
 *         properties:
 *           firstName:
 *             type: string
 *           lastName:
 *             type: string
 *           email:
 *             type: string
 *             format: email
 *       policies:
 *         type: array
 *         items:
 *           type: string
 */

/**
 * Helper method to initialize a newly created userpass with an entity.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @param {string} username The userpass user name.
 * @param {string} password The userpass password.
 * @returns {Promise}
 */
const _initializeEntity = async (req, username, password) => {
    const loginResponse = await _login(req, username, password);
    const {entity_id: id} = loginResponse.body.auth;
    const saveUserResponse = await saveUser(req, {
        id,
        name: username
    });
    logger.log(`Updating entity ${id} with the name ${username}. Status code: ${saveUserResponse.statusCode}`);
    return saveUserResponse;
};

/**
 * Helper method to initialize a newly created userpass with an entity.
 *
 * @private
 * @param {Object} req The HTTP request object.
 * @param {string} username The userpass user name.
 * @param {string} password The userpass password.
 * @returns {Promise}
 */
const _login = (req, username, password) => {
    return new Promise((resolve, reject) => {
        const apiUrl = `${getDomain()}/v1/auth/userpass/login/${username}`;
        request({
            uri: apiUrl,
            method: 'POST',
            json: {
                password
            }
        }, (error, response) => {
            if (error) {
                reject(error);
            } else if (response.statusCode === 200) {
                resolve(response);
            } else {
                reject(response);
            }
        });
    });
};

/**
 * Gets a user by optional entity id. If no entity id is provided, defaults to current session user's entity id.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} [id] The entity id.
 * @returns {Promise}
 */
const getUser = async (req, id) => {
    const domain = getDomain();
    const {entityId: sessionUserEntityId, token: sessionUserToken} = req.session.user;
    let apiRequest;
    // If entity id is provided, use the session user token to handle proper permissions. Otherwise, use the admin token to fetch the session user data.
    if (id) {
        apiRequest = initApiRequest(sessionUserToken, `${domain}/v1/identity/entity/id/${id}`, sessionUserEntityId);
    } else {
        apiRequest = initApiRequest(sessionUserToken, `${domain}/v1/identity/entity/id/${sessionUserEntityId}`, sessionUserEntityId, true);
    }
    const userResponse = await asyncRequest(apiRequest);
    if (Array.isArray(unwrap(safeWrap(userResponse.body).data.aliases))) {
        const userpassAlias = userResponse.body.data.aliases.filter((alias) => alias.mount_type === 'userpass' && alias.name)[0];
        if (userpassAlias) {
            const userpassResponse = await getUserpass(req, userpassAlias.name);
            // Inject the policies array from userpass.
            if (Array.isArray(unwrap(safeWrap(userpassResponse.body).data.policies))) {
                userpassAlias.policies = userpassResponse.body.data.policies;
            }
        }
    }
    return userResponse;
};

/**
 * Gets a user by name.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} name The user name.
 * @returns {Promise}
 */
const getUserByName = async (req, name) => {
    const {entityId, token} = req.session.user;
    return await asyncRequest(initApiRequest(token, `${getDomain()}/v1/identity/entity/name/${name}`, entityId));
};

/**
 * Updates an existing user.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} userData The user data to save.
 * @returns {Promise}
 */
const updateUser = (req, userData) => {
    return new Promise(async (resolve, reject) => {
        try {
            const getUserResponse = await getUser(req, userData.id);
            if (getUserResponse.statusCode !== 200) {
                resolve(getUserResponse);
            } else {
                const {data: currentData} = getUserResponse.body;
                const {password, newPassword} = userData;
                if (password && newPassword) {
                    // Validate password.
                    try {
                        // Verify by attempting to log in using the current password. If incorrect, it'll fall into the catch block.
                        await _login(req, currentData.name, password);

                        await saveUserpass(req, {
                            name: currentData.name,
                            password: newPassword
                        });
                    } catch (err) {
                        // Massage the error message.
                        if (Array.isArray(err.body.errors)) {
                            err.body.errors[0] = 'The current password is incorrect.';
                        }
                        reject(err.body.errors);
                        return;
                    }
                }

                // Merge the existing metadata with metadata in the request.
                const metadata = {
                    ...currentData.metadata || {},
                    ...userData.metadata || {}
                };
                const updatedData = {
                    id: currentData.id,
                    metadata
                };
                if (Array.isArray(currentData.policies)) {
                    updatedData.policies = currentData.policies;
                }
                const updatedUserResponse = await saveUser(req, updatedData);
                resolve(updatedUserResponse);
            }
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Creates or updates a user. Note - this method will overwrite any existing metadata if metadata is provided. Metadata merging should be handled prior to invoking this method.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} userData The user data to save.
 * @returns {Promise}
 */
const saveUser = (req, userData) => {
    return new Promise((resolve, reject) => {
        const {entityId: id, token} = req.session.user;
        const isSelf = id === userData.id;
        // Use the API token if saving/updating self.
        request({
            ...initApiRequest(token, `${getDomain()}/v1/identity/entity`, id, isSelf),
            method: 'POST',
            json: userData
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

/**
 * Gets a userpass authentication method by name.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} name The user data to save.
 * @returns {Promise}
 */
const getUserpass = async (req, name) => {
    const {entityId, token} = req.session.user;
    return await asyncRequest(initApiRequest(token, `${getDomain()}/v1/auth/userpass/users/${name}`, entityId));
};

/**
 * Deletes a userpass authentication method by name.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} name The user data to delete.
 * @returns {Promise}
 */
const deleteUserpass = (req, name) => {
    return new Promise((resolve, reject) => {
        const {entityId, token} = req.session.user;
        const apiUrl = `${getDomain()}/v1/auth/userpass/users/${name}`;
        request({
            ...initApiRequest(token, apiUrl, entityId),
            method: 'DELETE'
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                logger.log(`Deleted userpass ${apiUrl}.`);
                resolve(response);
            }
        });
    });
};

/**
 * Creates or updates a userpass authentication method.
 *
 * @param {Object} req The HTTP request object.
 * @param {Object} userData The user data to save.
 * @returns {Promise}
 */
const saveUserpass = (req, userData) => {
    return new Promise((resolve, reject) => {
        const {entityId: id, token} = req.session.user;
        const isSelf = id === userData.id;
        const {name, password, policies} = userData;
        const postData = {
            username: name,
            password
        };
        if (Array.isArray(policies)) {
            // The /auth/userpass/users/:username endpoint handles takes policies as a comma-separated string.
            postData.policies = policies.join(',');
        }
        request({
            ...initApiRequest(token, `${getDomain()}/v1/auth/userpass/users/${name}`, id, isSelf),
            method: 'POST',
            json: postData
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

/**
 * Delete user by entity id.
 *
 * @param {Object} req The HTTP request object.
 * @param {string} id The id of the user to delete.
 * @returns {Promise}
 */
const deleteUser = (req, id) => {
    return new Promise((resolve, reject) => {
        const {entityId, token} = req.session.user;
        const apiUrl = `${getDomain()}/v1/identity/entity/id/${id}`;
        request({
            ...initApiRequest(token, apiUrl, entityId),
            method: 'DELETE'
        }, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

/* eslint-disable new-cap */
const router = require('express').Router()
/* eslint-enable new-cap */
    .use((req, res, next) => {
        next();
    })
    /**
     * @swagger
     * /rest/user:
     *   get:
     *     tags:
     *       - User
     *     summary: Get current session user.
     *     responses:
     *       200:
     *         description: User found.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/definitions/user'
     */
    .get('/', async (req, res) => {
        try {
            const response = await getUser(req);
            sendJsonResponse(req, res, response.body, response.statusCode);
        } catch (err) {
            sendError(req, res, err);
        }
    })
    /**
     * @swagger
     * /rest/user/{id}:
     *   get:
     *     tags:
     *       - User
     *     summary: Get user by entity id.
     *     parameters:
     *       - name: id
     *         in: path
     *         description: The user entity id.
     *         schema:
     *           type: string
     *         required:
     *           - id
     *     responses:
     *       200:
     *         description: User found.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/definitions/user'
     *       403:
     *         description: Unauthorized.
     */
    .get('/:id', async (req, res) => {
        try {
            const response = await getUser(req, req.params.id);
            sendJsonResponse(req, res, response.body, response.statusCode);
        } catch (err) {
            sendError(req, res, err);
        }
    })
    /**
     * @swagger
     * /rest/user:
     *   post:
     *     tags:
     *       - User
     *     summary: Create user.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/definitions/user'
     *           example:
     *             name: john.doe
     *             password: password
     *             policies: ["base-policy"]
     *           type: object
     *           required:
     *             - name
     *             - password
     *     responses:
     *       201:
     *         description: User created.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/definitions/user'
     *       400:
     *         description: Bad request.
     *       403:
     *         description: Unauthorized.
     *       409:
     *         description: User name already exists.
     */
    .post('/', async (req, res) => {
        const {id, name, password} = req.body;
        if (!name) {
            sendError(req, res, 'Required name field not provided.');
            return;
        } else if (!password) {
            sendError(req, res, 'Required password field not provided.');
            return;
        } else if (id) {
            sendError(req, res, 'Use PUT when attempting to update an existing user.');
            return;
        }

        try {
            // Check to see if there is already an existing user by that name.
            const userpassResponse = await getUserpass(req, name);
            // If no user found, then go ahead and proceed to create user using that name.
            if (userpassResponse.statusCode === 404) {
                await saveUserpass(req, req.body);

                // Also need to initialize the entity.
                await _initializeEntity(req, name, password);

                // Return the newly created entity.
                const userResponse = await getUserByName(req, name);
                sendJsonResponse(req, res, userResponse.body, 201);
            } else if (userpassResponse.statusCode === 200) {
                sendError(req, res, `User ${name} is already in use.`, null, 409);
            } else {
                sendError(req, res, userpassResponse.body.errors || 'Error in saving user.', null, userpassResponse.statusCode);
            }
        } catch (err) {
            sendError(req, res, err);
        }
    })
    /**
     * @swagger
     * /rest/user:
     *   put:
     *     tags:
     *       - User
     *     summary: Update current session user. If id is provided in the request body, it will be ignored.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/definitions/user'
     *     responses:
     *       204:
     *         description: User updated.
     */
    .put('/', async (req, res) => {
        // Delete the id from the request body in case it's erroneously added.
        if (req.body.id) {
            logger.log(`Ignoring user id ${req.body.id} in user PUT request.`);
            delete req.body.id;
        }
        try {
            const response = await updateUser(req, req.body);
            sendJsonResponse(req, res, response.body, response.statusCode);
        } catch (err) {
            sendError(req, res, err);
        }
    })
    /**
     * @swagger
     * /rest/user/{id}:
     *   put:
     *     tags:
     *       - User
     *     summary: Update user by entity id.
     *     parameters:
     *       - name: id
     *         in: path
     *         schema:
     *           type: string
     *         required:
     *           - id
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/definitions/user'
     *     responses:
     *       204:
     *         description: User updated.
     *       403:
     *         description: Unauthorized.
     *       404:
     *         description: User not found.
     */
    .put('/:id', async (req, res) => {
        try {
            // Set the entity id from params.
            req.body.id = req.params.id;
            const response = await updateUser(req, req.body);
            sendJsonResponse(req, res, response.body, response.statusCode);
        } catch (err) {
            sendError(req, res, err);
        }
    })
    /**
     * @swagger
     * /rest/user/{id}:
     *   delete:
     *     tags:
     *       - User
     *     summary: Delete user by entity id.
     *     parameters:
     *       - name: id
     *         in: path
     *         schema:
     *           type: string
     *         required:
     *           - id
     *     responses:
     *       204:
     *         description: User deleted.
     *       403:
     *         description: Unauthorized.
     *       404:
     *         description: User not found.
     */
    .delete('/:id', async (req, res) => {
        const {id} = req.params;
        try {
            const userResponse = await getUser(req, id);
            if (userResponse.statusCode === 404) {
                sendJsonResponse(req, res, userResponse.body, userResponse.statusCode);
            } else {
                const deleteUserResponse = await deleteUser(req, id);

                // Also make sure to delete the corresponding userpass authentication method.
                await deleteUserpass(req, userResponse.body.data.name);
                sendJsonResponse(req, res, deleteUserResponse.body, deleteUserResponse.statusCode);
            }
        } catch (err) {
            sendError(req, res, err);
        }
    });

module.exports = {
    router,
    getUser
};
