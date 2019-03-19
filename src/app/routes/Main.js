/* global window */

import {withStyles} from '@material-ui/core/styles';
import {AppBar, Button, Card, CardActions, CardContent, Grid, IconButton, List, ListItem, ListItemIcon, ListItemSecondaryAction, ListItemText, Snackbar, Toolbar, Typography} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import ListIcon from '@material-ui/icons/List';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Link, Redirect, Route, Switch, withRouter} from 'react-router-dom';
import kvAction from 'app/core/actions/kvAction';
import sessionAction from 'app/core/actions/sessionAction';
import userAction from 'app/core/actions/userAction';
import SecretsList from 'app/routes/secrets/SecretsList';
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

        this.state = {
            showRootWarning: false
        };
        this._onClose = this._onClose.bind(this);
        this._onLogOut = this._onLogOut.bind(this);
    }

    /**
     * Handle for when a close event from the snackbar is triggered.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     * @param {string} reason The close reason.
     */
    _onClose(event, reason) {
        if (reason !== 'clickaway') {
            this.setState({
                showRootWarning: false
            });
        }
    }

    /**
     * Handle for when value change is triggered.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _onLogOut(event) {
        event.preventDefault();
        localStorageUtil.removeItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN);
        window.location.href = '/';
    }

    /**
     * Required React Component lifecycle method. Invoked once, only on the client (not on the server), immediately after the initial rendering occurs.
     *
     * @protected
     * @override
     */
    componentDidMount() {
        const {checkSession} = this.props;
        checkSession().then(() => {
            const {listMounts, listUsers, vaultLookupSelf} = this.props;

            if (vaultLookupSelf.data.data.policies.includes('root')) {
                localStorageUtil.removeItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN);
                this.setState({
                    showRootWarning: true
                });
            }
            listMounts();
            // TODO Display the result of listUsers
            listUsers().then(() => {
                const {users} = this.props;
                console.log('Users returned: ', users);
            });
        });
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {classes, secretsMounts = []} = this.props;
        const {showRootWarning} = this.state;
        const rootMessage = 'You have logged in with a root token. As a security precaution, this root token will not be stored by your browser and you will need to re-authenticate after the window is closed or refreshed.';
        return <div className={classes.root}>
            <AppBar position='static'>
                <Toolbar>
                    <img alt='logo' className='mr-1' src='/assets/vault-dark.svg'/>
                    <Typography noWrap className={classes.title} color='inherit' variant='h6'>
                        Vault Web UI
                    </Typography>
                </Toolbar>
            </AppBar>
            <Grid container className='mt-1' justify='center'>
                <Switch>
                    <Route exact path='/'>
                        <Card className={classes.card}>
                            <CardContent>
                                <Typography gutterBottom color='textSecondary' variant='h6'>
                                    Secrets Engines
                                </Typography>
                            </CardContent>
                            <List>{
                                secretsMounts.map(mount => {
                                    const {description, name, type} = mount;
                                    return <ListItem button component={(props) => <Link to={`secrets/${name}list`} {...props}/>} key={name}>
                                        <ListItemIcon>
                                            {type === 'cubbyhole' ? <LockOpenIcon/> : <ListIcon/>}
                                        </ListItemIcon>
                                        <ListItemText primary={name} secondary={description}/>
                                        <ListItemSecondaryAction>
                                            <IconButton>
                                                <KeyboardArrowRightIcon/>
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>;
                                })
                            }</List>
                            <CardActions>
                                <Button color='primary' size='small' onClick={this._onLogOut}>
                                    Log Out
                                </Button>
                            </CardActions>
                        </Card>
                    </Route>
                    <Route exact component={SecretsList} path='/secrets/:mount/list'/>
                    <Redirect to='/'/>
                </Switch>
            </Grid>
            <Snackbar action={
                <IconButton aria-label='Close' className={classes.close} color='inherit' onClick={this._onClose}>
                    <CloseIcon/>
                </IconButton>} anchorOrigin={{
                horizontal: 'left',
                vertical: 'bottom'
            }} autoHideDuration={12000} ContentProps={{
                classes: {message: classes.warningMessageContentWidth}
            }} message={rootMessage} open={showRootWarning} onClose={this._onClose}/>
        </div>;
    }
}

Main.propTypes = {
    checkSession: PropTypes.func.isRequired,
    classes: PropTypes.object.isRequired,
    listMounts: PropTypes.func.isRequired,
    listUsers: PropTypes.func.isRequired,
    secretsMounts: PropTypes.array,
    vaultDomain: PropTypes.object.isRequired,
    vaultLookupSelf: PropTypes.object.isRequired,
    users: PropTypes.array
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
        ...state.localStorageReducer,
        ...state.sessionReducer,
        ...state.kvReducer,
        ...state.userReducer
    };
};

/**
 * Returns a map of methods used for dispatching actions to the store.
 *
 * @private
 * @param {function} dispatch Redux dispatch function.
 * @returns {Object}
 */
const _mapDispatchToProps = (dispatch) => {
    return {
        checkSession: () => {
            return new Promise((resolve, reject) => {
                dispatch(sessionAction.validateToken()).then(() => {
                    dispatch(sessionAction.setToken(localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN)));
                    resolve();
                }).catch(reject);
            });
        },
        listMounts: () => dispatch(kvAction.listMounts()),
        listUsers: () => dispatch(userAction.listUsers())
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
    },
    textCenter: {
        textAlign: 'center'
    },
    warningMessageContentWidth: {
        width: 'calc(100% - 70px)'
    }
});

export default withRouter(connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(Main)));
