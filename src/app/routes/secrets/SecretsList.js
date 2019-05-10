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
            refreshSecretsListOnClose: false,
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
                            this._toggleCreateUpdateSecretModal(`${mount}/${currentPath}`, 'read', true);
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
     * @param {string} type The request type.
     * @private
     */
    _openRequestCancellationModal(mount, name, type) {
        this.setState({
            showConfirmationModal: true,
            confirmationModalData: {
                title: 'Cancel Privilege Access Request',
                content: `Would you like to cancel your request to access ${name}?`,
                onClose: (confirm) => {
                    if (confirm) {
                        const {deleteRequest} = this.props;
                        deleteRequest(name, this._getVersionFromMount(mount), type);
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
                        requestSecret(name, this._getVersionFromMount(mount), isWrapped ? 'control-group' : 'standard-request');
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
     * @param {boolean} [refreshSecretsListOnClose] Whether to refresh the secrets list on modal close.
     */
    _toggleCreateUpdateSecretModal(secretModalInitialPath = '', secretModalMode = '', refreshSecretsListOnClose = false) {
        this.setState({
            secretModalInitialPath,
            secretModalMode,
            refreshSecretsListOnClose
        });
    }

    /**
     * Called when the create/update secrets modal is closed.
     *
     * @private
     */
    _onCreateUpdateSecretModalClose() {
        const {refreshSecretsListOnClose} = this.state;
        if (refreshSecretsListOnClose) {
            const {listRequests, listSecretsAndCapabilities, match} = this.props;
            const {params} = match;
            const {mount, path} = params;
            listRequests();
            listSecretsAndCapabilities(path, this._getVersionFromMount(mount));
        }
        this.setState({
            secretModalInitialPath: '',
            secretModalMode: '',
            refreshSecretsListOnClose: false
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
                                onClick={() => this._toggleCreateUpdateSecretModal(paths.join('/'), 'create', true)}
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
        const {match, openApprovedSecret, setSecretsData} = this.props;
        const {params} = match;
        const {mount} = params;
        const {isApproved, isPending, canOpen, canDelete, name, isWrapped, requiresRequest, secretsData, secretsPath, wrapInfoToken} = secret;
        const isFolderPath = name.endsWith('/');
        if (isFolderPath) {
            return <IconButton>
                <KeyboardArrowRightIcon/>
            </IconButton>;
        } else if (canDelete) {
            const deleteLabel = 'Delete';
            return <Tooltip aria-label={deleteLabel} title={deleteLabel}>
                <IconButton
                    aria-label={deleteLabel}
                    onClick={() => this._openDeleteSecretConfirmationModal(mount, name)}>
                    <DeleteIcon/>
                </IconButton>
            </Tooltip>;
        } else if (canOpen || isApproved) {
            const openLabel = 'Open';
            return <Tooltip aria-label={openLabel} title={openLabel}>
                <IconButton
                    aria-label={openLabel}
                    onClick={() => {
                        if (isWrapped) {
                            this._openApprovedRequestModal(mount, secretsPath, name, wrapInfoToken);
                        } else {
                            this._toggleCreateUpdateSecretModal(`${mount}/${secretsPath}`, 'read');
                            secretsData ? setSecretsData(secretsData) : openApprovedSecret(name, this._getVersionFromMount(mount));
                        }
                    }}>
                    <LockOpenIcon/>
                </IconButton>
            </Tooltip>;
        } else if (requiresRequest) {
            const requestAccessLabel = isPending ? 'Cancel Request' : 'Request Access';
            const type = isWrapped ? 'control-group' : 'standard-request';
            return <Tooltip aria-label={requestAccessLabel} title={requestAccessLabel}>
                <IconButton
                    aria-label={requestAccessLabel}
                    onClick={() => isPending ? this._openRequestCancellationModal(mount, name, type) : this._openRequestModal(mount, name, isWrapped)}>
                    <LockIcon/>
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
        const {classes, pageError, getSecrets, history, inProgress, listSecretsAndCapabilities, match, openApprovedSecret, secretsList, setSecretsData} = this.props;
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
        } else if (secretsList.length > 0) {
            return <List>{
                secretsList.map((secret, i) => {
                    const {authorizationsText, canOpen, canUpdate, isApproved, isPending, isWrapped, name, requiresRequest, secondaryText, secretsData, secretsPath, url, wrapInfoToken} = secret;
                    return <ListItem button component={(props) => <Link to={url} {...props} onClick={event => {
                        event.preventDefault();
                        if (name.includes('/')) {
                            history.push(url);
                            listSecretsAndCapabilities(secretsPath, this._getVersionFromMount(mount));
                        } else {
                            if (canUpdate) {
                                this._toggleCreateUpdateSecretModal(`${mount}/${secretsPath}`, 'update');
                                getSecrets(name, this._getVersionFromMount(mount));
                            } else if (canOpen) {
                                this._toggleCreateUpdateSecretModal(`${mount}/${secretsPath}`, 'read');
                                secretsData ? setSecretsData(secretsData) : getSecrets(name, this._getVersionFromMount(mount));
                            } else if (isApproved) {
                                if (isWrapped) {
                                    this._openApprovedRequestModal(mount, secretsPath, name, wrapInfoToken);
                                } else {
                                    this._toggleCreateUpdateSecretModal(`${mount}/${secretsPath}`, 'read');
                                    openApprovedSecret(name, this._getVersionFromMount(mount));
                                }
                            } else if (requiresRequest) {
                                if (isPending) {
                                    this._openRequestCancellationModal(mount, name, isWrapped ? 'control-group' : 'standard-request');
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
                                {authorizationsText &&
                                <Typography className={classes.block} color='textSecondary' component='span'>
                                    {authorizationsText}
                                </Typography>}
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
    listRequests: PropTypes.func.isRequired,
    listSecretsAndCapabilities: PropTypes.func.isRequired,
    match: PropTypes.object.isRequired,
    openApprovedSecret: PropTypes.func.isRequired,
    pageError: PropTypes.string,
    requestSecret: PropTypes.func.isRequired,
    secrets: PropTypes.object,
    secretsList: PropTypes.array,
    secretsMounts: PropTypes.object,
    secretsPaths: PropTypes.object,
    secretsRequests: PropTypes.array,
    setSecretsData: PropTypes.func.isRequired,
    unwrapSecret: PropTypes.func.isRequired
};

/**
 * Returns the Redux store's state that is relevant to this class as props.
 *
 * @private
 * @param {Object} state - The initial state.
 * @param {Object} ownProps The own component props.
 * @returns {Object}
 */
const _mapStateToProps = (state, ownProps) => {
    const {match} = ownProps;
    const {params} = match;
    const {mount, path = ''} = params;
    const {secretsMounts, secretsPaths, secretsRequests} = state.kvReducer;
    let isV2 = false;
    const mountData = (secretsMounts.data || []).find(m => mount === m.name.slice(0, -1));
    if (mountData) {
        isV2 = mountData.options && mountData.options.version === '2';
    }
    const secretsList = (secretsPaths.secrets || []).map((secret) => {
        const {capabilities, data = {}, name} = secret;
        const {wrap_info: wrapInfo} = data;
        const currentPath = path ? `${path}/${name}` : name;
        const mountPath = `${mount}/${currentPath}`;
        const isWrapped = !!wrapInfo;
        let isApproved = false;
        const requiresRequest = !capabilities.includes('read') && !name.endsWith('/') || isWrapped;
        let activeRequest;
        let secondaryText;
        let authorizationsText;
        let wrapInfoToken;
        if (requiresRequest) {
            secondaryText = `Request type: ${isWrapped ? 'Control Groups' : 'Standard Request'}`;
            // Check for any active requests.
            const requestPath = `${mount}${isV2 ? '/data/' : '/'}${currentPath}`;
            activeRequest = secretsRequests.find((request) => request.requestPath === requestPath);
            if (activeRequest) {
                const {approved, authorizations, creationTime, token} = activeRequest;
                isApproved = approved;
                wrapInfoToken = token;
                if (approved) {
                    const namesList = authorizations.map((authorization) => authorization.name);
                    authorizationsText = `Approved by ${namesList.join(', ')}.`;
                }
                if (creationTime) {
                    secondaryText += ` (Requested at ${new Date(creationTime).toLocaleString()})`;
                }
            }

        }
        return {
            authorizationsText,
            canDelete: capabilities.includes('delete'),
            canOpen: capabilities.includes('read') && !name.endsWith('/') && !isWrapped,
            canUpdate: capabilities.some(capability => capability === 'update' || capability === 'root'),
            isApproved,
            isPending: !!activeRequest && !isApproved,
            isWrapped,
            name,
            requiresRequest,
            secondaryText,
            secretsData: !isWrapped && secret.data ? secret.data : undefined,
            secretsPath: currentPath,
            url: `/secrets/${mountPath}`,
            wrapInfoToken
        };
    });
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
            kvAction.ACTION_TYPES.DELETE_SECRETS,
            kvAction.ACTION_TYPES.LIST_MOUNTS,
            kvAction.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES
        ])(state.actionStatusReducer),
        ...state.localStorageReducer,
        ...state.kvReducer,
        ...state.sessionReducer,
        ...state.systemReducer,
        ...state.userReducer,
        secretsList
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
        deleteRequest: (name, version, type = 'standard-request') => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}${path ? `/${path}` : ''}/${name}`;
            return new Promise((resolve, reject) => {
                dispatch(kvAction.deleteRequest(fullPath, '', type))
                    .then(resolve)
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
        listRequests: () => dispatch(kvAction.listRequests()),
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
        openApprovedSecret: (name, version) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}${path ? `/${path}` : ''}/${name}`;
            return dispatch(kvAction.openApprovedSecret(fullPath));
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
                    .then(resolve)
                    .catch(reject);
            });
        },
        setSecretsData: (data) => dispatch(kvAction.setSecretsData(data)),
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
