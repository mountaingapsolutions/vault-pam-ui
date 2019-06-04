import {withStyles} from '@material-ui/core/styles';
import {AppBar, Card, Grid, Toolbar, Typography} from '@material-ui/core';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Redirect, Route, Switch, withRouter} from 'react-router-dom';

import Login from 'app/routes/auth/Login';
import constants from 'app/util/constants';

/**
 * The authentication container.
 */
class Auth extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes} = this.props;
        return <div>
            <AppBar position='static'>
                <Toolbar>
                    <img alt='logo' className='mr-1' src='/assets/vault-dark.svg'/>
                    <Typography noWrap color='inherit' variant='h6'>
                        {constants.APP_TITLE}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Grid container className='mt-1' justify='center'>
                <Card className={classes.card}>
                    <Switch>
                        <Redirect exact from='/' to='/auth/login'/>
                        <Route exact component={Login} path='/auth/login'/>
                        <Redirect to='/auth/login'/>
                    </Switch>
                </Card>
            </Grid>
        </div>;
    }
}

Auth.propTypes = {
    classes: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired
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
