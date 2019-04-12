
module.exports = {
    up: (query, DataTypes) => {
        return query.createTable('sample', {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true
            },
            firstName: {
                type: DataTypes.TEXT
            },
            lastName: {
                type: DataTypes.TEXT
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        });
    },

    down: (query) => {
        // return query.dropAllTables();
        return query.dropTable('sample');
    }
};