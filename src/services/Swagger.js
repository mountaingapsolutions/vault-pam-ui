const swaggerJSDoc = require('swagger-jsdoc');

const options = {
    swaggerDefinition: {
        openapi: '3.0.1',
        info: {title: 'Vault PAM API', version: '1.0.0', description: 'Vault PAM API'},
        components: {
            securitySchemes: {
                'x-vault-token': {
                    type: 'apiKey',
                    name: 'x-vault-token',
                    in: 'header'
                },
                'x-vault-domain': {
                    type: 'apiKey',
                    name: 'x-vault-domain',
                    in: 'header'
                }
            }
        },
        security: [
            {
                'x-vault-token': [],
                'x-vault-domain': []
            }
        ]
    },
    apis: ['**/routes/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
    swaggerSpec
};
