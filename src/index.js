import loadable from '@loadable/component';
import {blue, indigo} from '@material-ui/core/colors';
import {createMuiTheme, MuiThemeProvider} from '@material-ui/core/styles';
import {createBrowserHistory} from 'history';
import React from 'react';
import {render} from 'react-dom';
import {Provider} from 'react-redux';
import {Router} from 'react-router-dom';
import * as serviceWorker from 'serviceWorker';
import localStorageUtil from 'app/util/localStorageUtil';

const theme = createMuiTheme({
    palette: {
        primary: blue,
        secondary: indigo
    },
    typography: {
        useNextVariants: true
    },
});

/**
 * Entry-point class.
 *
 */
class Index {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     */
    constructor() {
        const hasToken = localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN);
        if (!hasToken) {
            const Auth = loadable(() => import('app/routes/Auth'));
            import('app/core/stores/configureAuthStore').then(store => {
                window.app = {
                    store: store.default()
                };
                this._render(<Auth/>);
            });
        } else {
            const Main = loadable(() => import('app/routes/Main'));
            import('app/core/stores/configureMainStore').then(store => {
                window.app = {
                    store: store.default()
                };
                this._render(<Main/>);
            });
        }
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @param {Object} appComponent The component to render.
     * @private
     */
    _render(appComponent) {
        const history = createBrowserHistory({
            basename: '/'
        });
        render(<Provider store={window.app.store}>
            <Router history={history}>
                <MuiThemeProvider theme={theme}>
                    {appComponent}
                </MuiThemeProvider>
            </Router>
        </Provider>, document.getElementById('root'));

        // If you want your app to work offline and load faster, you can change
        // unregister() to register() below. Note this comes with some pitfalls.
        // Learn more about service workers: https://bit.ly/CRA-PWA
        serviceWorker.unregister();
    }
}

export default new Index();
