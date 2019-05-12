const {Model, DataTypes} = require('sequelize');

module.exports = class RequestResponses extends Model {

    /**
     * Initializes the data model.
     *
     * @param {Object} sequelize The Sequelize instance.
     * @returns {Object}
     */
    static init(sequelize) {
        return super.init({
            entityId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            type: {
                /* eslint-disable new-cap */
                type: DataTypes.ENUM('APPROVED', 'CANCELED', 'DELETED', 'PENDING', 'REQUESTED', 'REJECTED'),
                /* eslint-enable new-cap */
                allowNull: true
            }
        }, {
            tableName: 'requestResponses',
            sequelize
        });
    }
};
