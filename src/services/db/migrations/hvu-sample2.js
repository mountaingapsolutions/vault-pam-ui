
module.exports = {
    up: (query, DataTypes) => {
        return query.addColumn(
            'sample', 'email',
            {
                type: DataTypes.TEXT,
                allowNull: true,
                defaultValue: 'test@email.com'
            }
        ).then(() => {
            return query.sequelize.query(
                'UPDATE "sample" SET "email"=\'test@email.com\' WHERE "email" IS NULL;',
                {raw: true});
        });
    },

    down: (query) => {
        return query.sequelize.query([
            'ALTER TABLE "sample" DROP COLUMN "email";'
        ].join(''), {raw: true});

    }
};
