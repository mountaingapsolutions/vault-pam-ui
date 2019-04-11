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
import ListIcon from '@material-ui/icons/List';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import {Breadcrumbs} from '@material-ui/lab';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Link, withRouter} from 'react-router-dom';

import kvAction from 'app/core/actions/kvAction';
import Button from 'app/core/components/common/Button';
import ListModal from 'app/core/components/common/ListModal';
import CreateUpdateSecretModal from 'app/core/components/CreateUpdateSecretModal';
import ConfirmationModal from 'app/core/components/ConfirmationModal';
import SnackbarContent from 'app/core/components/SnackbarContent';
import Constants from 'app/util/Constants';

import {createErrorsSelector, createInProgressSelector} from 'app/util/actionStatusSelector';
import calendarUtil from 'app/util/CalendarUtil';

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
            deleteSecretConfirmation: '',
            newSecretAnchorElement: null,
            requestSecretCancellation: null,
            requestSecretConfirmation: null,
            secretModalInitialPath: '',
            secretModalMode: '',
            isListModalOpen: false
        };

        this._onBack = this._onBack.bind(this);
        this._onCreateUpdateSecretModalClose = this._onCreateUpdateSecretModalClose.bind(this);
        this._openListModal = this._openListModal.bind(this);
        this._closeListModal = this._closeListModal.bind(this);
    }

    /**
     * Construct query full path from mount name, path, and type of CRUD operation
     *
     * @private
     * @param {string} mountName - mount name from url
     * @param {string} path - path from URL
     * @param {string} [operation] - CRUD operation name
     * @returns {string}
     */
    _getQueryFullPath(mountName, path = '', operation) {
        let queryFullPath = '';
        const version = this._getVersionFromMount(mountName);
        if (version) {
            // See https://www.vaultproject.io/docs/secrets/kv/kv-v2.html for additional information. Version 2 KV secrets engine requires an additional /metadata in the query path.
            const queryMountPath = version === 2 ? `${mountName}/${operation === 'GET' ? 'data' : 'metadata'}` : mountName;
            queryFullPath = `${queryMountPath}/${path}`;
        }
        return queryFullPath;
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
     * Handle when a secret that requires a request is clicked.
     *
     * @private
     * @param {string} name The name of the secret.
     * @param {boolean} isRequest True if request, false if cancel.
     */
    _toggleRequestSecretModal(name, isRequest = true) {
        this.setState({
            [isRequest ? 'requestSecretConfirmation' : 'requestSecretCancellation']: name
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
     * Renders the secrets list area.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderSecretsListArea() {
        const {classes, pageError, getSecrets, groupData, history, inProgress, listSecretsAndCapabilities, match, requestListFromDatabase, secretsPaths, unwrapSecret, vaultLookupSelf} = this.props;
        const {params} = match;
        const {mount, path = ''} = params;
        const requestAccessLabel = 'Request Access';
        const deleteLabel = 'Delete';
        const openLabel = 'Open';
        const currentUserEntityId = vaultLookupSelf.data && vaultLookupSelf.data.data.entity_id;
        const approverEntityIds = groupData.data && groupData.data.member_entity_ids || [];
        const isApprover = approverEntityIds.includes(currentUserEntityId);
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
                    const {capabilities, data = {}, name} = secret;
                    const {wrap_info: wrapInfo} = data;
                    const currentPath = path ? `${path}/${name}` : name;
                    const mountPath = `${mount}/${currentPath}`;
                    const url = `/secrets/${mountPath}`;
                    const isWrapped = !!wrapInfo;
                    const canOpen = capabilities.includes('read') && !name.endsWith('/') && !isWrapped;
                    const canUpdate = capabilities.some(capability => capability === 'update' || capability === 'root');
                    const requiresRequest = capabilities.includes('deny') && !name.endsWith('/') || isWrapped;
                    const {request_info: requestInfo = {}} = data;
                    const isApproved = isWrapped && requestInfo.approved;
                    const authorizations = isWrapped && requestInfo.authorizations;
                    const canDelete = capabilities.includes('delete');
                    let isOwnRequest = false;
                    let isPendingInDatabase = false;
                    let requestStatus = null;
                    let databaseRequestTime = null;
                    requestListFromDatabase.map(request => {
                        const {createdAt, requestData, requesterEntityId, status} = request;
                        if (!isOwnRequest && requesterEntityId === currentUserEntityId && requestData === mountPath) {
                            requestStatus = status;
                            isOwnRequest = true;
                            databaseRequestTime = calendarUtil.dateFormat(createdAt);
                        }
                        if (!isApprover && !isPendingInDatabase && requestData === mountPath) {
                            isPendingInDatabase = true;
                        }
                    });
                    const creationTime = isPendingInDatabase ? databaseRequestTime : data.request_info && isWrapped ? new Date(wrapInfo.creation_time) : null;
                    let standardRequest = isPendingInDatabase ? `${!isOwnRequest ? Constants.REQUEST_STATUS.LOCKED : requestStatus} Request type: Standard Request` : null;
                    let secondaryText = !standardRequest ? requiresRequest ? `Request type: ${isWrapped ? 'Control Groups' : 'Default'}` : '' : standardRequest;
                    if (creationTime) {
                        secondaryText += ` (Requested at ${creationTime.toLocaleString()})`;
                    }
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
                                /* eslint-disable no-alert */
                                if (window.confirm(`You have been granted access to ${name}. Be careful, you can only access this data once. If you need access again in the future you will need to get authorized again.`)) {
                                    this._toggleCreateUpdateSecretModal(`${mount}/${currentPath}`, 'read');
                                    unwrapSecret(name, wrapInfo.token);
                                }
                                /* eslint-enable no-alert */
                            } else {
                                this._toggleRequestSecretModal(name, !data.request_info);
                            }
                        }
                    }}/>} disabled={isPendingInDatabase && requestStatus !== Constants.REQUEST_STATUS.APPROVED} key={`key-${i}`}>
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
                            {!isPendingInDatabase && requiresRequest && !isApproved &&
                            <Tooltip aria-label={requestAccessLabel} title={requestAccessLabel}>
                                <IconButton
                                    aria-label={requestAccessLabel}
                                    onClick={() => this._toggleRequestSecretModal(name, !data.request_info)}>
                                    <LockIcon/>
                                </IconButton>
                            </Tooltip>}
                            {!isPendingInDatabase && canOpen && <Tooltip aria-label={openLabel} title={openLabel}>
                                <IconButton aria-label={openLabel} onClick={() => {
                                    this._openListModal();
                                    getSecrets(name, this._getVersionFromMount(mount));
                                }}>
                                    <LockOpenIcon/>
                                </IconButton>
                            </Tooltip>}
                            {isApproved && <Tooltip aria-label={openLabel} title={openLabel}>
                                <IconButton aria-label={openLabel} onClick={() => {
                                    /* eslint-disable no-alert */
                                    if (window.confirm(`You have been granted access to ${name}. Be careful, you can only access this data once. If you need access again in the future you will need to get authorized again.`)) {
                                        window.alert('TODO: Unwrap secret and open modal.');
                                    }
                                    /* eslint-enable no-alert */
                                }}>
                                    <LockOpenIcon/>
                                </IconButton>
                            </Tooltip>}
                            {!isPendingInDatabase && canDelete && <Tooltip aria-label={deleteLabel} title={deleteLabel}>
                                <IconButton aria-label={deleteLabel} onClick={() => this.setState({
                                    deleteSecretConfirmation: name
                                })}>
                                    <DeleteIcon/>
                                </IconButton>
                            </Tooltip>}
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
        const {deleteRequest, classes, deleteSecrets, dismissError, dismissibleError, isEnterprise, match, requestSecret, secrets, vaultLookupSelf} = this.props;
        const requesterEntityId = vaultLookupSelf.data && vaultLookupSelf.data.data.entity_id;
        const {params} = match;
        const {mount} = params;
        const {deleteSecretConfirmation, isListModalOpen, requestSecretCancellation, requestSecretConfirmation, secretModalMode, secretModalInitialPath} = this.state;
        return <Card className={classes.card}>
            {this._renderBreadcrumbsArea()}
            {dismissibleError && <SnackbarContent message={dismissibleError} variant='error' onClose={dismissError}/>}
            {this._renderSecretsListArea()}
            <ListModal
                buttonTitle={'Request Secret'}
                items={(secrets || {}).data ? secrets.data : secrets}
                listTitle={'Secrets'}
                open={isListModalOpen}
                onClick={() => {
                    /* eslint-disable no-alert */
                    window.alert('button clicked!');
                    /* eslint-enable no-alert */
                }} onClose={this._closeListModal}/>
            <CreateUpdateSecretModal
                initialPath={secretModalInitialPath}
                mode={secretModalMode}
                open={!!secretModalMode}
                onClose={this._onCreateUpdateSecretModalClose}/>
            <ConfirmationModal
                confirmButtonLabel='Delete'
                content={`This will permanently delete ${deleteSecretConfirmation} and all its versions. Are you sure you want to do this?`}
                open={!!deleteSecretConfirmation}
                title={`Delete ${deleteSecretConfirmation}?`}
                onClose={confirm => {
                    if (confirm) {
                        deleteSecrets(deleteSecretConfirmation, this._getVersionFromMount(mount));
                    }
                    this.setState({
                        deleteSecretConfirmation: ''
                    });
                }}
            />
            <ConfirmationModal
                content={`The path ${requestSecretConfirmation} has been locked through Control Groups. Request access?`}
                open={!!requestSecretConfirmation}
                title='Privilege Access Request'
                onClose={confirm => {
                    if (confirm) {
                        requestSecret(requestSecretConfirmation, isEnterprise, requesterEntityId, this._getVersionFromMount(mount));
                    }
                    this.setState({
                        requestSecretConfirmation: null
                    });
                }}
            />
            <ConfirmationModal
                content={`Would you like to cancel your request to access ${requestSecretCancellation}?`}
                open={!!requestSecretCancellation}
                title='Cancel Privilege Access Request'
                onClose={confirm => {
                    if (confirm) {
                        deleteRequest(requestSecretCancellation, this._getVersionFromMount(mount));
                    }
                    this.setState({
                        requestSecretCancellation: null
                    });
                }}
            />
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
    groupData: PropTypes.object,
    history: PropTypes.object.isRequired,
    inProgress: PropTypes.bool,
    isEnterprise: PropTypes.bool,
    listMounts: PropTypes.func.isRequired,
    listSecretsAndCapabilities: PropTypes.func.isRequired,
    match: PropTypes.object.isRequired,
    pageError: PropTypes.string,
    requestListFromDatabase: PropTypes.array,
    requestSecret: PropTypes.func.isRequired,
    secrets: PropTypes.object,
    secretsMounts: PropTypes.object,
    secretsPaths: PropTypes.object,
    unwrapSecret: PropTypes.func.isRequired,
    vaultLookupSelf: PropTypes.object
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
        deleteRequest: (name, version) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}${path ? `/${path}` : ''}/${name}`;
            return new Promise((resolve, reject) => {
                dispatch(kvAction.deleteRequest(fullPath))
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
        requestSecret: (name, isEnterprise, requesterEntityId, version) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? isEnterprise ? '/data' : '' : ''}${path ? `/${path}` : ''}/${name}`;
            return new Promise((resolve, reject) => {
                let requestData = isEnterprise ? {'path': fullPath} : {
                    requesterEntityId: requesterEntityId,
                    requestData: fullPath,
                    status: Constants.REQUEST_STATUS.PENDING,
                    type: null, // nothing here yet.
                    engineType: null // nothing here yet.
                };
                dispatch(kvAction.requestSecret(requestData, isEnterprise))
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
