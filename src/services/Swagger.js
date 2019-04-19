/* global localStorage, window */

const swaggerJSDoc = require('swagger-jsdoc');

//swagger-ui-express custom options
const disableAuthorizePlugin = () => {
    return {
        wrapComponents: {
            authorizeBtn: () => () => false
        }
    };
};

const hideOperationsUntilAuthorized = () => {
    return {
        wrapComponents: {
            operation: (Ori, system) => (props) => {
                const isOperationSecured = !!props.operation.get('security').size;
                const isOperationAuthorized = props.operation.get('isAuthorized');
                const isAuthenticated = typeof localStorage !== undefined &&
                    localStorage.getItem('vault-token') &&
                    localStorage.getItem('vault-domain');
                if (!isOperationSecured || isOperationAuthorized && isAuthenticated) {
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
            disableAuthorizePlugin,
            hideOperationsUntilAuthorized
        ],
        onComplete: () => {
            if (window && window.ui && typeof localStorage !== undefined) {
                window.ui.authActions.authorize({
                    'x-vault-token': {
                        name: 'x-vault-token',
                        schema: {type: 'apiKey', in: 'header', name: 'x-vault-token'},
                        value: localStorage.getItem('vault-token')
                    }
                });
            }
        },
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
                }
            }
        },
        security: [
            {
                'x-vault-token': []
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
