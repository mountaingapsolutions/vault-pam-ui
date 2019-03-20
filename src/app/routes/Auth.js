import {withStyles} from '@material-ui/core/styles';
import {AppBar, Card, Grid, Toolbar, Typography} from '@material-ui/core';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Redirect, Route, Switch, withRouter} from 'react-router-dom';

import Server from 'app/routes/auth/Server';
import Login from 'app/routes/auth/Login';
import Constants from 'app/util/Constants';

/**
 * The authentication container.
 */
class Auth extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {classes, history, location, vaultDomain} = this.props;
        // If attempting to go to the login page with no domain set, go back to the initial set domain page.
        if (location.pathname === '/auth/login' && !vaultDomain.data) {
            history.push('/auth/server');
        }
        return <div>
            <AppBar position='static'>
                <Toolbar>
                    <img alt='logo' className='mr-1' src='/assets/vault-dark.svg'/>
                    <Typography noWrap color='inherit' variant='h6'>
                        {Constants.APP_TITLE}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Grid container className='mt-1' justify='center'>
                <Card className={classes.card}>
                    <Switch>
                        <Redirect exact from='/' to='/auth/server'/>
                        <Route exact component={Server} path='/auth/server'/>
                        <Route exact component={Login} path='/auth/login'/>
                        <Redirect to='/auth/server'/>
                    </Switch>
                </Card>
            </Grid>
        </div>;
    }
}

Auth.propTypes = {
    classes: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    vaultDomain: PropTypes.object.isRequired
};

/**
 * Returns the Redux store's state that is relevant to this class as props.
 *
 * @private
 * @param {Object} state - The initial state.
 * @returns {Object}
 */
const _mapStateToProps = (state) => {
    return {
        ...state.sessionReducer
    };
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({
    card: {
        width: '800px'
    }
});

export default withRouter(connect(_mapStateToProps)(withStyles(_styles)(Auth)));
