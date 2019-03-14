/* global window */

import {withStyles} from '@material-ui/core/styles';
import {AppBar, Button, Card, CardActionArea, CardActions, CardContent, Grid, Toolbar, Typography} from '@material-ui/core';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Redirect, Route, Switch, withRouter} from 'react-router-dom';

import localStorageUtil from 'app/util/localStorageUtil';

/**
 * The main container.
 */
class Main extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props - Props to initialize with.
     */
    constructor(props) {
        super(props);

        this._onLogOut = this._onLogOut.bind(this);
    }

    /**
     * Handle for when value change is triggered.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _onLogOut(event) {
        event.preventDefault();
        localStorageUtil.clear();
        window.location.href = '/';
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {classes} = this.props;
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
                <Switch>
                    <Route exact path='/'>
                        <Card className={classes.card}>
                            <CardActionArea>
                                <img alt='Homer' src='/assets/success.png'/>
                                <CardContent>
                                    <Typography gutterBottom className={classes.textCenter} component='h5' variant='h6'>
                                        Success!
                                    </Typography>
                                    <Typography component='p'>
                                        Unfortunately this is as far as we have for functionality. More to come soon.
                                    </Typography>
                                </CardContent>
                            </CardActionArea>
                            <CardActions>
                                <Button color='primary' size='small' onClick={this._onLogOut}>
                                    Log Out
                                </Button>
                            </CardActions>
                        </Card>
                    </Route>
                    <Redirect to='/'/>
                </Switch>
            </Grid>
        </div>;
    }
}

Main.propTypes = {
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
        width: '600px'
    },
    'mr-1': {
        marginRight: '1em'
    },
    'mt-1': {
        marginTop: '1em'
    },
    textCenter: {
        textAlign: 'center'
    }
});

export default withRouter(connect(_mapStateToProps)(withStyles(_styles)(Main)));
