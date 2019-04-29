import {
    Avatar,
    Card,
    CardContent,
    CircularProgress,
    Fab,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemIcon,
    ListItemSecondaryAction,
    ListItemText,
    Paper,
    Tooltip,
    Typography
} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import FolderIcon from '@material-ui/icons/Folder';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import ListIcon from '@material-ui/icons/List';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import {Breadcrumbs} from '@material-ui/lab';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Link, withRouter} from 'react-router-dom';

import kvAction from 'app/core/actions/kvAction';
import Button from 'app/core/components/Button';
import CreateUpdateSecretModal from 'app/core/components/CreateUpdateSecretModal';
import ConfirmationModal from 'app/core/components/ConfirmationModal';
import SnackbarContent from 'app/core/components/SnackbarContent';
import Constants from 'app/util/Constants';

import {createErrorsSelector, createInProgressSelector} from 'app/util/actionStatusSelector';

/**
 * The secrets list container.
 */
class SecretsList extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {
            confirmationModalData: {},
            deleteSecretConfirmation: '',
            newSecretAnchorElement: null,
            secretModalInitialPath: '',
            secretModalMode: '',
            showConfirmationModal: false,
        };

        this._onBack = this._onBack.bind(this);
        this._onCreateUpdateSecretModalClose = this._onCreateUpdateSecretModalClose.bind(this);
    }

    /**
     * Returns the KV version number.
     *
     * @private
     * @param {string} mountName The mount name.
     * @returns {number}
     */
    _getVersionFromMount(mountName) {
        const {secretsMounts = {}} = this.props;
        const mount = (secretsMounts.data || []).find(m => mountName === m.name.slice(0, -1));
        if (mount) {
            return mount.options && mount.options.version === '2' ? 2 : 1;
        }
        return 1;
    }

    /**
     * Handle for when back button is pressed.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _onBack(event) {
        event.preventDefault();
        this.props.history.goBack();
    }

    /**
     * Sets the confirmation modal data in state for opening an approved secret.
     *
     * @param {string} mount The mount point.
     * @param {string} currentPath The current path.
     * @param {string} name The name of the secret to open.
     * @param {string} token The token to unwrap.
     * @private
     */
    _openApprovedRequestModal(mount, currentPath, name, token) {
        this.setState({
            showConfirmationModal: true,
            confirmationModalData: {
                title: `Open ${name}?`,
                content: `You have been granted access to ${name}. Be careful, you can only access this data once. If you need access again in the future you will need to get authorized again.`,
                onClose: (confirm) => {
                    this.setState({
                        showConfirmationModal: false
                    }, () => {
                        if (confirm) {
                            const {unwrapSecret} = this.props;
                            this._toggleCreateUpdateSecretModal(`${mount}/${currentPath}`, 'read');
                            unwrapSecret(name, token);
                        }
                    });
                }
            }
        });
    }

    /**
     * Sets the confirmation modal data in state for deleting a secret.
     *
     * @param {string} mount The mount point.
     * @param {string} name The name of the secret to delete.
     * @private
     */
    _openDeleteSecretConfirmationModal(mount, name) {
        this.setState({
            showConfirmationModal: true,
            confirmationModalData: {
                title: `Delete ${name}?`,
                content: `This will permanently delete ${name} and all its versions. Are you sure you want to do this?`,
                onClose: (confirm) => {
                    if (confirm) {
                        const {deleteSecrets} = this.props;
                        deleteSecrets(name, this._getVersionFromMount(mount));
                    }
                    this.setState({
                        showConfirmationModal: false
                    });
                }
            }
        });
    }

    /**
     * Sets the confirmation modal data in state for cancelling a secret request.
     *
     * @param {string} mount The mount point.
     * @param {string} name The name of the secret to cancel.
     * @param {string} [id] The request id in database.
     * @private
     */
    _openRequestCancellationModal(mount, name, id) {
        this.setState({
            showConfirmationModal: true,
            confirmationModalData: {
                title: 'Cancel Privilege Access Request',
                content: `Would you like to cancel your request to access ${name}?`,
                onClose: (confirm) => {
                    if (confirm) {
                        const {deleteRequest} = this.props;
                        deleteRequest(name, this._getVersionFromMount(mount), id);
                    }
                    this.setState({
                        showConfirmationModal: false
                    });
                }
            }
        });
    }

    /**
     * Sets the confirmation modal data in state for requesting a secret.
     *
     * @param {string} mount The mount point.
     * @param {string} name The name of the secret to request.
     * @param {boolean} isWrapped if request contains wrap token
     * @private
     */
    _openRequestModal(mount, name, isWrapped) {
        this.setState({
            showConfirmationModal: true,
            confirmationModalData: {
                title: 'Privilege Access Request',
                content: `The path ${name} has been locked through ${isWrapped ? 'Control Groups' : 'Standard Request'}. Request access?`,
                onClose: (confirm) => {
                    if (confirm) {
                        const {requestSecret} = this.props;
                        requestSecret(name, this._getVersionFromMount(mount), isWrapped ? 'control-groups' : 'standard-request');
                    }
                    this.setState({
                        showConfirmationModal: false
                    });
                }
            }
        });
    }

    /**
     * Toggles the create/update secret modal.
     *
     * @private
     * @param {string} secretModalInitialPath The initial path for the secrets modal.
     * @param {string} [secretModalMode] The secret modal mode. Valid values are 'create', 'read', or 'update'. No value will hide the modal.
     */
    _toggleCreateUpdateSecretModal(secretModalInitialPath = '', secretModalMode = '') {
        this.setState({
            secretModalInitialPath,
            secretModalMode
        });
    }

    /**
     * Called when the create/update secrets modal is closed.
     *
     * @private
     * @param {boolean} refresh Whether or not to refresh the secrets list.
     */
    _onCreateUpdateSecretModalClose(refresh) {
        if (refresh) {
            const {listSecretsAndCapabilities, match} = this.props;
            const {params} = match;
            const {mount, path} = params;
            listSecretsAndCapabilities(path, this._getVersionFromMount(mount));
        }
        this.setState({
            secretModalInitialPath: '',
            secretModalMode: ''
        });
    }

    /**
     * Required React Component lifecycle method. Invoked once, only on the client (not on the server), immediately after the initial rendering occurs.
     *
     * @protected
     * @override
     */
    componentDidMount() {
        const {dismissError, history, listMounts, listSecretsAndCapabilities, match, secretsMounts} = this.props;
        const {params} = match;
        const {mount, path} = params;
        if ((secretsMounts.data || []).length === 0) {
            listMounts().then(() => {
                listSecretsAndCapabilities(path, this._getVersionFromMount(mount));
            });
        } else {
            listSecretsAndCapabilities(path, this._getVersionFromMount(mount));
        }

        this.unlisten = history.listen((location, action) => {
            dismissError();
            if (action === 'POP') {
                const {match: newMatch} = this.props;
                const {params: newParams} = newMatch;
                const {path: newPath} = newParams;
                listSecretsAndCapabilities(newPath, this._getVersionFromMount(mount));
            }
        });
    }

    /**
     * Required React Component lifecycle method. Invoked immediately before a component is unmounted from the DOM. Perform any necessary cleanup in this method, such as invalidating timers or
     * cleaning up any DOM elements that were created in componentDidMount.
     *
     * @protected
     */
    componentWillUnmount() {
        this.unlisten();
    }

    /**
     * Renders the authorizations list.
     *
     * @private
     * @param {Array} authorizations The list of authorizations.
     * @returns {React.ReactElement}
     */
    _renderAuthorizations(authorizations) {
        const {classes} = this.props;
        // Exclude self from names list. If the user did approve the request, then that user will be listed first.
        const namesList = authorizations.map((authorization) => authorization.entity_name);
        return <Typography className={classes.block} color='textSecondary' component='span'>
            Approved by {namesList.join(', ')}.
        </Typography>;
    }

    /**
     * Renders the header containing breadcrumbs.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderBreadcrumbsArea() {
        const {classes, history, listSecretsAndCapabilities, match, secretsPaths} = this.props;
        const {params} = match;
        const {mount, path} = params;
        const paths = path ? [mount].concat(path.split('/')) : [mount];
        return <CardContent>{
            mount && <List disablePadding>
                <ListItem disableGutters className={classes.disablePadding}>
                    <Button
                        className={`${classes.disableMinWidth} ${classes.disablePadding}`}
                        color='inherit'
                        component={props => <Link to='/' {...props}/>} variant='text'
                    >
                        <ListItemIcon>
                            <ListIcon/>
                        </ListItemIcon>
                    </Button>
                    <Breadcrumbs arial-label='Breadcrumb' separator='>'>{
                        paths.map((folder, idx) => {
                            const currentPath = paths.slice(1, idx + 1).join('/');
                            const url = `/secrets/${mount}/${currentPath}`;
                            return idx !== paths.length - 1 ?
                                <Link key={folder} to={url} onClick={event => {
                                    event.preventDefault();
                                    history.push(url);
                                    listSecretsAndCapabilities(currentPath, this._getVersionFromMount(mount));
                                }}>
                                    <Typography color='textSecondary' variant='h6'>{folder}</Typography>
                                </Link>
                                :
                                <Typography color='textPrimary' key={folder} variant='h6'>{folder}</Typography>;
                        })
                    }</Breadcrumbs>
                    {
                        (secretsPaths.capabilities || []).some(capability => capability === 'create' || capability === 'root') &&
                        <React.Fragment>
                            <Fab
                                aria-label='new'
                                className={classes.fab}
                                color='primary' size='medium'
                                variant='extended'
                                onClick={() => this._toggleCreateUpdateSecretModal(paths.join('/'), 'create')}
                            >
                                <AddIcon className={classes.marginRight}/>
                                Create Secret
                            </Fab>
                        </React.Fragment>
                    }
                </ListItem>
            </List>
            ||
            <div>
                <CircularProgress className={classes.progress}/>
            </div>
        }</CardContent>;
    }

    /**
     * Renders the secondary action area for a secrets row.
     *
     * @private
     * @param {Object} secret The secrets data object.
     * @returns {React.ReactElement}
     */
    _renderSecondaryIcon(secret) {
        const {match} = this.props;
        const {params} = match;
        const {mount, path = ''} = params;
        const {capabilities = [], data = {}, name} = secret;
        const {request_info: requestInfo = {}, wrap_info: wrapInfo} = data;
        const isWrapped = !!wrapInfo;
        const isApproved = isWrapped && requestInfo.approved;
        const requiresRequest = !capabilities.includes('read') && !name.endsWith('/') || isWrapped;
        const canDelete = capabilities.includes('delete');
        const currentPath = path ? `${path}/${name}` : name;
        const isFolderPath = name.endsWith('/');
        if (isFolderPath) {
            return <IconButton>
                <KeyboardArrowRightIcon/>
            </IconButton>;
        } else if (requiresRequest) {
            if (isApproved) {
                const openLabel = 'Open';
                return <Tooltip aria-label={openLabel} title={openLabel}>
                    <IconButton
                        aria-label={openLabel}
                        onClick={() => this._openApprovedRequestModal(mount, currentPath, name, wrapInfo.token)}>
                        <LockOpenIcon/>
                    </IconButton>
                </Tooltip>;
            } else {
                const requestAccessLabel = 'Request Access';
                return <Tooltip aria-label={requestAccessLabel} title={requestAccessLabel}>
                    <IconButton
                        aria-label={requestAccessLabel}
                        onClick={() => data.request_info ? this._openRequestCancellationModal(mount, name) : this._openRequestModal(mount, name, isWrapped)}>
                        <LockIcon/>
                    </IconButton>
                </Tooltip>;
            }
        } else if (canDelete) {
            const deleteLabel = 'Delete';
            return <Tooltip aria-label={deleteLabel} title={deleteLabel}>
                <IconButton
                    aria-label={deleteLabel}
                    onClick={() => this._openDeleteSecretConfirmationModal(mount, name)}>
                    <DeleteIcon/>
                </IconButton>
            </Tooltip>;
        }
        return null;
    }

    /**
     * Renders the secrets list area.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderSecretsListArea() {
        const {classes, pageError, getSecrets, history, inProgress, listSecretsAndCapabilities, match, secretsPaths} = this.props;
        const {params} = match;
        const {mount, path = ''} = params;
        if (inProgress) {
            return <Grid container justify='center'>
                <Grid item>
                    <CircularProgress className={classes.progress}/>
                </Grid>
            </Grid>;
        } else if (pageError) {
            return <Paper className={classes.paper} elevation={2}>
                <Typography
                    className={classes.paperMessage}
                    color='textPrimary'>{pageError}
                </Typography>
            </Paper>;
        } else if ((secretsPaths.secrets || []).length > 0) {
            return <List>{
                (secretsPaths.secrets || []).map((secret, i) => {
                    const {capabilities, standardRequestData, data = {}, name} = secret;
                    const {createdAt, id, status} = standardRequestData || {};
                    const {request_info: requestInfo = {}, wrap_info: wrapInfo} = data;
                    const currentPath = path ? `${path}/${name}` : name;
                    const mountPath = `${mount}/${currentPath}`;
                    const url = `/secrets/${mountPath}`;
                    const isWrapped = !!wrapInfo;
                    const canOpen = capabilities.includes('read') && !name.endsWith('/') && !isWrapped || status === Constants.REQUEST_STATUS.APPROVED;
                    const canUpdate = capabilities.some(capability => capability === 'update' || capability === 'root');
                    const requiresRequest = !capabilities.includes('read') && !name.endsWith('/') || isWrapped;
                    const isApproved = isWrapped && requestInfo.approved;
                    const authorizations = isWrapped && requestInfo.authorizations;
                    const isPendingInDatabase = status === Constants.REQUEST_STATUS.PENDING;
                    const creationTime = data.request_info && isWrapped ? new Date(wrapInfo.creation_time) :
                        isPendingInDatabase ? new Date(createdAt).toLocaleString() :
                            null;
                    const secondaryText = `${requiresRequest && isWrapped ? 'Request type: Control Groups' : requiresRequest || isPendingInDatabase ? 'Request type: Standard Request' : ''}${creationTime ? ` (Requested at ${creationTime.toLocaleString()})` : ''}`;

                    return <ListItem button component={(props) => <Link to={url} {...props} onClick={event => {
                        event.preventDefault();
                        if (name.includes('/')) {
                            history.push(url);
                            listSecretsAndCapabilities(currentPath, this._getVersionFromMount(mount));
                        } else {
                            if (canUpdate) {
                                this._toggleCreateUpdateSecretModal(`${mount}/${currentPath}`, 'update');
                                getSecrets(name, this._getVersionFromMount(mount));
                            } else if (canOpen) {
                                this._toggleCreateUpdateSecretModal(`${mount}/${currentPath}`, 'read');
                                getSecrets(name, this._getVersionFromMount(mount));
                            } else if (isApproved) {
                                this._openApprovedRequestModal(mount, currentPath, name, wrapInfo.token);
                            } else {
                                if (data.request_info) {
                                    this._openRequestCancellationModal(mount, name);
                                } else if (status === Constants.REQUEST_STATUS.PENDING) {
                                    this._openRequestCancellationModal(mount, name, id);
                                } else {
                                    this._openRequestModal(mount, name, isWrapped);
                                }
                            }
                        }
                    }}/>} key={`key-${i}`}>
                        <ListItemAvatar>
                            <Avatar>{
                                name.endsWith('/') ? <FolderIcon/> : <FileCopyIcon/>
                            }</Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={name} secondary={
                            secondaryText && <React.Fragment>
                                <Typography className={classes.block} color='textSecondary' component='span'>
                                    {secondaryText}
                                </Typography>
                                {authorizations && this._renderAuthorizations(authorizations)}
                            </React.Fragment>
                        }/>
                        <ListItemSecondaryAction>
                            {this._renderSecondaryIcon(secret)}
                        </ListItemSecondaryAction>
                    </ListItem>;
                })
            }</List>;
        } else {
            return <Paper className={classes.paper} elevation={2}>
                <Typography className={classes.paperMessage} color='textSecondary' variant='h5'>
                    There appears to be no content in {mount}{path ? `/${path}` : ''}.
                </Typography>
            </Paper>;
        }
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, dismissError, dismissibleError} = this.props;
        const {confirmationModalData, secretModalMode, secretModalInitialPath, showConfirmationModal} = this.state;
        return <Card className={classes.card}>
            {this._renderBreadcrumbsArea()}
            {dismissibleError && <SnackbarContent message={dismissibleError} variant='error' onClose={dismissError}/>}
            {this._renderSecretsListArea()}
            <CreateUpdateSecretModal
                initialPath={secretModalInitialPath}
                mode={secretModalMode}
                open={!!secretModalMode}
                onClose={this._onCreateUpdateSecretModalClose}/>
            <ConfirmationModal
                {...confirmationModalData}
                open={showConfirmationModal && Object.keys(confirmationModalData).length > 0}
                onExited={() => {
                    this.setState({
                        confirmationModalData: {}
                    });
                }}/>
        </Card>;
    }
}

SecretsList.propTypes = {
    classes: PropTypes.object.isRequired,
    deleteRequest: PropTypes.func.isRequired,
    deleteSecrets: PropTypes.func.isRequired,
    dismissError: PropTypes.func.isRequired,
    dismissibleError: PropTypes.string,
    getSecrets: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
    inProgress: PropTypes.bool,
    listMounts: PropTypes.func.isRequired,
    listSecretsAndCapabilities: PropTypes.func.isRequired,
    match: PropTypes.object.isRequired,
    pageError: PropTypes.string,
    requestSecret: PropTypes.func.isRequired,
    secrets: PropTypes.object,
    secretsMounts: PropTypes.object,
    secretsPaths: PropTypes.object,
    secretsRequests: PropTypes.array,
    unwrapSecret: PropTypes.func.isRequired
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
        dismissibleError: createErrorsSelector([
            kvAction.ACTION_TYPES.DELETE_SECRETS,
            kvAction.ACTION_TYPES.REQUEST_SECRET
        ])(state.actionStatusReducer),
        pageError: createErrorsSelector([
            kvAction.ACTION_TYPES.LIST_MOUNTS,
            kvAction.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES
        ])(state.actionStatusReducer),
        inProgress: createInProgressSelector([
            kvAction.ACTION_TYPES.LIST_MOUNTS,
            kvAction.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES,
            kvAction.ACTION_TYPES.DELETE_SECRETS
        ])(state.actionStatusReducer),
        ...state.localStorageReducer,
        ...state.kvReducer,
        ...state.sessionReducer,
        ...state.systemReducer,
        ...state.userReducer
    };
};

/**
 * Returns a map of methods used for dispatching actions to the store.
 *
 * @private
 * @param {function} dispatch Redux dispatch function.
 * @param {Object} ownProps The own component props.
 * @returns {Object}
 */
const _mapDispatchToProps = (dispatch, ownProps) => {
    return {
        deleteRequest: (name, version, id) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}${path ? `/${path}` : ''}/${name}`;
            return new Promise((resolve, reject) => {
                dispatch(kvAction.deleteRequest(fullPath, '', id))
                    .then(() => {
                        dispatch(kvAction.listSecretsAndCapabilities(`${mount}${path ? `/${path}` : ''}`, version))
                            .then(resolve)
                            .catch(reject);
                    })
                    .catch(reject);
            });
        },
        dismissError: () => {
            return new Promise((resolve) => {
                [
                    kvAction.ACTION_TYPES.DELETE_SECRETS,
                    kvAction.ACTION_TYPES.REQUEST_SECRET
                ].forEach(type => {
                    dispatch({
                        type
                    });
                });
                resolve();
            });
        },
        listMounts: () => dispatch(kvAction.listMounts()),
        listSecretsAndCapabilities: (path = '', version) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount} = params;
            return dispatch(kvAction.listSecretsAndCapabilities(`${mount}/${path.endsWith('/') ? path.slice(0, -1) : path}`, version));
        },
        getSecrets: (name, version) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}${path ? `/${path}` : ''}/${name}`;
            return dispatch(kvAction.getSecrets(fullPath));
        },
        deleteSecrets: (name, version) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            return new Promise((resolve, reject) => {
                const fullPath = `${mount}${version === 2 ? '/metadata' : ''}${path ? `/${path}` : ''}/${name}`;
                dispatch(kvAction.deleteSecrets(fullPath))
                    .then(() => {
                        dispatch(kvAction.listSecretsAndCapabilities(`${mount}${path ? `/${path}` : ''}`, version))
                            .then(resolve)
                            .catch(reject);
                    })
                    .catch(reject);
            });
        },
        requestSecret: (name, version, type = 'standard-request') => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}${path ? `/${path}` : ''}/${name}`;
            return new Promise((resolve, reject) => {
                let requestData = {
                    path: fullPath,
                    type
                };
                dispatch(kvAction.requestSecret(requestData))
                    .then(() => {
                        dispatch(kvAction.listSecretsAndCapabilities(`${mount}${path ? `/${path}` : ''}`, version))
                            .then(resolve)
                            .catch(reject);
                    })
                    .catch(reject);
            });
        },
        unwrapSecret: (name, token) => dispatch(kvAction.unwrapSecret(name, token))
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
    block: {
        display: 'block',
    },
    card: {
        width: 800
    },
    disablePadding: {
        padding: 0
    },
    disableMinWidth: {
        minWidth: 0
    },
    paperMessage: {
        padding: 40
    },
    fab: {
        marginLeft: 'auto',
        whiteSpace: 'nowrap'
    },
    marginRight: {
        marginRight: theme.spacing.unit
    },
    paper: {
        margin: 50,
    },
    progress: {
        margin: 50,
    }
});

export default withRouter(connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(SecretsList)));
