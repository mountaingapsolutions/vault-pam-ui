import {withStyles} from '@material-ui/core/styles';
import {AppBar, Card, Grid, Toolbar, Typography} from '@material-ui/core';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Redirect, Route, Switch, withRouter} from 'react-router-dom';

import Server from 'app/routes/auth/Server';
import Token from 'app/routes/auth/Token';

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
        // If attempting to go to the token page with no domain set, go back to the initial set domain page.
        if (location.pathname === '/auth/token' && !vaultDomain.data) {
            history.push('/auth/server');
        }
        return <div className={classes.root}>
            <AppBar position='static'>
                <Toolbar>
                    <img alt='logo' className={classes['mr-1']} src='/assets/vault-dark.svg'/>
                    <Typography noWrap className={classes.title} color='inherit' variant='h6'>
                        Vault Web UI
                    </Typography>
                </Toolbar>
            </AppBar>
            <Grid container className={classes['mt-1']} justify='center'>
                <Card className={classes.card}>
                    <Switch>
                        <Redirect exact from='/' to='/auth/server'/>
                        <Route exact component={Server} path='/auth/server'/>
                        <Route exact component={Token} path='/auth/token'/>
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
        width: '500px'
    },
    'mr-1': {
        marginRight: '1em'
    },
    'mt-1': {
        marginTop: '1em'
    }
});

export default withRouter(connect(_mapStateToProps)(withStyles(_styles)(Auth)));
