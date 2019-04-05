/* global window */

import {withStyles} from '@material-ui/core/styles';
import {
    AppBar,
    Badge,
    Card,
    CardContent,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemSecondaryAction,
    ListItemText,
    Menu,
    MenuItem,
    Snackbar,
    Toolbar,
    Typography
} from '@material-ui/core';
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
import SecretRequestQueueModal from 'app/core/components/secretRequest/SecretRequestQueueModal';
import UserProfileModal from 'app/core/components/UserProfileModal';
import Footer from 'app/core/components/common/Footer';
import NotificationsModal from 'app/core/components/NotificationsModal';
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
     * @param {Object} props Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {
            accountAnchorElement: null,
            isSecretRequestsModalOpen: false,
            isUserProfileModalOpen: false,
            notificationAnchorElement: null,
            showRootWarning: false
        };
        this._closeModal = this._closeModal.bind(this);
        this._onClose = this._onClose.bind(this);
        this._openModal = this._openModal.bind(this);
        this._toggleAccountMenu = this._toggleAccountMenu.bind(this);
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
     * Handle for when a close event from the modal is clicked.
     *
     * @private
     * @param {string} modalState The close reason.
     */
    _closeModal(modalState) {
        this.setState({[modalState]: false});
    }

    /**
     * Handle for when a modal is opened.
     *
     * @private
     * @param {string} modalState The close reason.
     */
    _openModal(modalState) {
        this.setState({[modalState]: true, accountAnchorElement: null});
    }

    /**
     * Toggles the account menu.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _toggleAccountMenu(event) {
        const {accountAnchorElement} = this.state;
        this.setState({
            accountAnchorElement: accountAnchorElement ? null : event.currentTarget
        });
    }

    /**
     * Returns the proper icon from the provided mount type.
     *
     * @private
     * @param {string} type The mount type.
     * @returns {Element}
     */
    _renderIconFromType(type) {
        switch (type) {
            case 'aws':
                return <img alt='aws' src='/assets/aws-icon.svg'/>;
            case 'cubbyhole':
                return <LockOpenIcon/>;
            case 'azure':
                return <img alt='azure' src='/assets/azure-icon.svg'/>;
            default:
                return <ListIcon/>;
        }
    }

    /**
     * Required React Component lifecycle method. Invoked once, only on the client (not on the server), immediately after the initial rendering occurs.
     *
     * @protected
     * @override
     */
    componentDidMount() {
        const {checkSession, listRequests} = this.props;
        checkSession().then(() => {
            const {listMounts, getSealStatus, vaultLookupSelf} = this.props;

            if (vaultLookupSelf.data.data.policies.includes('root')) {
                localStorageUtil.removeItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN);
                this.setState({
                    showRootWarning: true
                });
            }
            getSealStatus();
            listMounts();
        });
        listRequests();
    }

    /**
     * Required React Component lifecycle method. Invoked when a component did update. This method is not called for the initial render.
     *
     * @protected
     * @override
     * @param {Object} prevProps - previous set of props.
     */
    componentDidUpdate(prevProps) {
        const {isLoggedIn, vaultLookupSelf} = this.props;
        const isRootLoggedIn = vaultLookupSelf.data && vaultLookupSelf.data.data.policies.includes('root');
        if (prevProps.isLoggedIn !== isLoggedIn || !isRootLoggedIn && localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN) === null) {
            localStorageUtil.removeItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN);
            window.location.href = '/';
        }
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @protected
     * @override
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, logout, secretsMounts = {}, secretsRequests = [], sealStatus} = this.props;
        const isVaultSealed = sealStatus && sealStatus.sealed;
        const {accountAnchorElement, isSecretRequestsModalOpen, isUserProfileModalOpen, notificationAnchorElement, showRootWarning} = this.state;
        const rootMessage = 'You have logged in with a root token. As a security precaution, this root token will not be stored by your browser and you will need to re-authenticate after the window is closed or refreshed.';
        return <div>
            <AppBar position='static'>
                <Toolbar>
                    <Button color='inherit' component={props => <Link to='/' {...props}/>} variant='text'>
                        <img alt='logo' className='mr-1' src='/assets/vault-dark.svg'/>
                        <Typography noWrap className={classes.title} color='inherit' variant='h6'>{
                            Constants.APP_TITLE
                        }</Typography>
                    </Button>
                    <div className={classes.grow}/>
                    <Typography color={isVaultSealed ? 'secondary' : 'inherit'}>
                        Status:
                    </Typography>
                    <div className={classes.sealStatusDivider}>
                        {isVaultSealed ? <LockIcon/> : <LockOpenIcon/>}
                    </div>
                    <div className={classes.sectionDesktop}>
                        <IconButton color='inherit' onClick={() => this._openModal('isSecretRequestsModalOpen')}>
                            <Badge badgeContent='Mock data!' color='secondary'>
                                <NotificationsIcon/>
                            </Badge>
                        </IconButton>
                        <IconButton color='inherit' onClick={(event) => {
                            this.setState({
                                notificationAnchorElement: event.currentTarget
                            });
                        }}>
                            {
                                secretsRequests && secretsRequests.length > 0 ?
                                    <Badge badgeContent={secretsRequests.length} color='secondary'>
                                        <NotificationsIcon/>
                                    </Badge> :
                                    <NotificationsIcon/>
                            }
                        </IconButton>
                        <IconButton
                            aria-haspopup='true'
                            aria-owns={accountAnchorElement ? 'material-appbar' : undefined}
                            color='inherit'
                            onClick={this._toggleAccountMenu}>
                            <AccountCircle/>
                        </IconButton>
                        <Menu
                            anchorEl={accountAnchorElement}
                            open={!!accountAnchorElement}
                            onClose={this._toggleAccountMenu}>
                            <MenuItem onClick={() => this._openModal('isUserProfileModalOpen')}>
                                <img
                                    className={classes.marginRight}
                                    src='/assets/settings-icon.svg'
                                    width='20'/> Profile
                            </MenuItem>
                            <MenuItem onClick={logout}>
                                <img className={classes.marginRight} src='/assets/logout-icon.svg' width='20'/> Log Out
                            </MenuItem>
                        </Menu>
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
                                (secretsMounts.data || []).map(mount => {
                                    const {description, name, type} = mount;
                                    return <ListItem
                                        button
                                        component={(props) => <Link to={`secrets/${name}`} {...props}/>}
                                        key={name}>
                                        <ListItemIcon>{
                                            this._renderIconFromType(type)
                                        }</ListItemIcon>
                                        <ListItemText primary={name} secondary={description}/>
                                        <ListItemSecondaryAction>
                                            <IconButton>
                                                <KeyboardArrowRightIcon/>
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>;
                                })
                            }</List>
                        </Card>
                    </Route>
                    <Route component={SecretsList} path='/secrets/:mount/:path*'/>
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
            <SecretRequestQueueModal
                open={isSecretRequestsModalOpen}
                onClose={() => this._closeModal('isSecretRequestsModalOpen')}/>
            <UserProfileModal
                open={isUserProfileModalOpen}
                onClose={() => this._closeModal('isUserProfileModalOpen')}/>
            <NotificationsModal open={!!notificationAnchorElement} onClose={() => this.setState({
                notificationAnchorElement: null
            })}/>
            <Footer/>
        </div>;
    }
}

Main.propTypes = {
    checkSession: PropTypes.func.isRequired,
    classes: PropTypes.object.isRequired,
    getSealStatus: PropTypes.func.isRequired,
    isLoggedIn: PropTypes.bool,
    listMounts: PropTypes.func.isRequired,
    listRequests: PropTypes.func.isRequired,
    logout: PropTypes.func.isRequired,
    sealStatus: PropTypes.object.isRequired,
    secretsMounts: PropTypes.object,
    secretsRequests: PropTypes.array,
    vaultDomain: PropTypes.object.isRequired,
    vaultLookupSelf: PropTypes.object.isRequired
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
        listRequests: () => dispatch(kvAction.listRequests()),
        getSealStatus: () => dispatch(systemAction.getSealStatus()),
        logout: () => dispatch(userAction.logout())
    };
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @param {Object} theme The theme object.
 * @returns {Object}
 */
const _styles = (theme) => ({
    card: {
        width: '800px'
    },
    grow: {
        flexGrow: 1,
    },
    marginRight: {
        marginRight: theme.spacing.unit
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
