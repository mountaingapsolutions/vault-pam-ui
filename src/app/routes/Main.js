/* global window */

import {withStyles} from '@material-ui/core/styles';
import {AppBar, Badge, Card, CardActions, CardContent, Grid, IconButton, List, ListItem, ListItemIcon, ListItemSecondaryAction, ListItemText, Snackbar, Toolbar, Typography} from '@material-ui/core';
import AccountCircle from '@material-ui/icons/AccountCircle';
import Button from 'app/core/components/common/Button';
import CloseIcon from '@material-ui/icons/Close';
import LockIcon from '@material-ui/icons/Lock';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import ListIcon from '@material-ui/icons/List';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import NotificationsIcon from '@material-ui/icons/Notifications';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Link, Redirect, Route, Switch, withRouter} from 'react-router-dom';
import kvAction from 'app/core/actions/kvAction';
import sessionAction from 'app/core/actions/sessionAction';
import systemAction from 'app/core/actions/systemAction';
import userAction from 'app/core/actions/userAction';
import ListModal from 'app/core/components/common/ListModal';
import SplitRequestModal from 'app/core/components/SplitRequestModal';
import SecretsList from 'app/routes/secrets/SecretsList';
import Constants from 'app/util/Constants';
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
            isMenuOpen: false,
            isSplitRequestModalOpen: false,
            isSecretRequestListOpen: false,
            //TODO - WIRE THE LIST SOURCE TO REDUCER
            requestList: {
                '/secret/Request 1': 'John Ho',
                '/secret/Request 2': 'Jerry Lam',
                '/secret/Request 3': 'Jay Ramirez',
                '/secret/Request 4': 'Russell de Castro',
                '/secret/Request 5': 'Aldo',
                '/secret/Request 6': 'Hakan',
                '/secret/Request 7': 'Jane Doe',
                '/secret/Request 8': 'John Doe'
            },
            showRootWarning: false
        };
        this._closeListModal = this._closeListModal.bind(this);
        this._closeSplitRequestModal = this._closeSplitRequestModal.bind(this);
        this._onClose = this._onClose.bind(this);
        this._onLogOut = this._onLogOut.bind(this);
        this._openListModal = this._openListModal.bind(this);
        this._openSplitRequestModal = this._openSplitRequestModal.bind(this);
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
     * Handle for when split request modal open button is triggered.
     *
     * @private
     */
    _openSplitRequestModal() {
        this.setState({isSplitRequestModalOpen: true});
    }

    /**
     * Handle for when split request modal close button is triggered.
     *
     * @private
     */
    _closeSplitRequestModal() {
        this.setState({isSplitRequestModalOpen: false});
    }

    /**
     * Handle for Notification click is triggered.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _openListModal() {
        this.setState({
            isListModalOpen: true
        });
    }

    /**
     * Handle for when list modal close button is triggered.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _closeListModal() {
        this.setState({
            isListModalOpen: false
        });
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
            const {listMounts, getVaultSealStatus, vaultLookupSelf} = this.props;

            if (vaultLookupSelf.data.data.policies.includes('root')) {
                localStorageUtil.removeItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN);
                this.setState({
                    showRootWarning: true
                });
            }
            getVaultSealStatus();
            listMounts();
            // TODO Display the result of listUsers
            // listUsers().then(() => {
            //     const {users} = this.props;
            //     console.log('Users returned: ', users);
            // });
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
        const {classes, secretsMounts = [], vaultSealStatus} = this.props;
        const isVaultSealed = vaultSealStatus && vaultSealStatus.sealed;
        const {isListModalOpen, isMenuOpen, isSplitRequestModalOpen, showRootWarning} = this.state;
        const rootMessage = 'You have logged in with a root token. As a security precaution, this root token will not be stored by your browser and you will need to re-authenticate after the window is closed or refreshed.';
        return <div className={classes.root}>
            <AppBar position='static'>
                <Toolbar>
                    <img alt='logo' className='mr-1' src='/assets/vault-dark.svg'/>
                    <Typography noWrap className={classes.title} color='inherit' variant='h6'>
                        {Constants.APP_TITLE}
                    </Typography>
                    <div className={classes.grow}/>
                    <Typography color={isVaultSealed ? 'secondary' : 'inherit'}>
                        Status:
                    </Typography>
                    <div className={classes.sealStatusDivider}>
                        {isVaultSealed ? <LockIcon/> : <LockOpenIcon/>}
                    </div>
                    <div className={classes.sectionDesktop}>
                        <IconButton color='inherit' onClick={this._openListModal}>
                            <Badge badgeContent={17} color='secondary'>
                                <NotificationsIcon/>
                            </Badge>
                        </IconButton>
                        <IconButton aria-haspopup='true' aria-owns={isMenuOpen ? 'material-appbar' : undefined} color='inherit' onClick={event => event.preventDefault()}>
                            <AccountCircle/>
                        </IconButton>
                    </div>
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
                                    return <ListItem button component={(props) => <Link to={`secrets/list/${name}`} {...props}/>} key={name}>
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
                                <Button variant='text' onClick={this._onLogOut}>
                                    Log Out
                                </Button>
                            </CardActions>
                        </Card>
                    </Route>
                    <Route component={SecretsList} path='/secrets/list/:mount*'/>
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
            <ListModal
                buttonTitle={'DETAILS'}
                items={this.state.requestList}
                listTitle={'Request Queue'}
                open={isListModalOpen}
                onClick={this._openSplitRequestModal}
                onClose={this._closeListModal}/>
            <SplitRequestModal
                open={isSplitRequestModalOpen}
                onClose={this._closeSplitRequestModal}/>
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
    users: PropTypes.array,
    getVaultSealStatus: PropTypes.func.isRequired,
    vaultSealStatus: PropTypes.object.isRequired
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
        listUsers: () => dispatch(userAction.listUsers()),
        getVaultSealStatus: () => dispatch(systemAction.getVaultSealStatus())
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
    grow: {
        flexGrow: 1,
    },
    sealStatusDivider: {
        borderRight: '0.1em solid white',
        padding: '0.5em'
    },
    sectionDesktop: {
        display: 'flex'
    },
    textCenter: {
        textAlign: 'center'
    },
    warningMessageContentWidth: {
        width: 'calc(100% - 70px)'
    }
});

export default withRouter(connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(Main)));
