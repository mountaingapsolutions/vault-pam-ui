const {Model, DataTypes} = require('sequelize');

module.exports = class Requests extends Model {

    /**
     * Initializes the data model.
     *
     * @param {Object} sequelize The Sequelize instance.
     * @returns {Object}
     */
    static init(sequelize) {
        return super.init({
            entityId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            referenceId: {
                type: DataTypes.UUID,
                allowNull: true
            },
            requestData: {
                type: DataTypes.STRING,
                allowNull: false
            },
            type: {
                type: DataTypes.STRING,
                allowNull: true
            }
        }, {
            tableName: 'requestsNew',
            sequelize
        });
    }

    /**
     * Creates the required association.
     *
     * @param {Object} models The initialized Sequelize models.
     */
    static associate(models) {
        this.hasMany(models.requestResponses, {
            foreignKey: {
                name: 'requestId',
                type: DataTypes.INTEGER,
                allowNull: false,
                onDelete: 'CASCADE'
            }
        });
    }
};
