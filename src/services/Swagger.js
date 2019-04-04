const swaggerJSDoc = require('swagger-jsdoc');

//swagger-ui-express custom options
const hideOperationsUntilAuthorized = () => {
    return {
        wrapComponents: {
            operation: (Ori, system) => (props) => {
                const isOperationSecured = !!props.operation.get('security').size;
                const isOperationAuthorized = props.operation.get('isAuthorized');

                if (!isOperationSecured || isOperationAuthorized) {
                    return system.React.createElement(Ori, props);
                }
                return null;
            }
        }
    };
};

const options = {
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
        plugins: [
            hideOperationsUntilAuthorized
        ]
    }
};


// swaggerJSDoc setup
const swaggerJsDocOptions = {
    swaggerDefinition: {
        openapi: '3.0.2',
        info: {title: 'Vault PAM API', version: '1.0.0'},
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
const swaggerDoc = swaggerJSDoc(swaggerJsDocOptions);


module.exports = {
    options,
    swaggerDoc
};
