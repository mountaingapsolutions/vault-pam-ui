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
import localStorageUtil from 'app/util/localStorageUtil';

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
     * @param {string} [secretModalMode] The secret modal mode. Either 'create' or 'update'. No value will hide the modal.
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
        const {history, listMounts, listSecretsAndCapabilities, match, secretsMounts} = this.props;
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
        const {classes, errors, getSecrets, history, inProgress, listSecretsAndCapabilities, match, secretsPaths} = this.props;
        const {params} = match;
        const {mount, path = ''} = params;
        const requestAccessLabel = 'Request Access';
        const deleteLabel = 'Delete';
        const openLabel = 'Open';
        if (inProgress) {
            return <Grid container justify='center'>
                <Grid item>
                    <CircularProgress className={classes.progress}/>
                </Grid>
            </Grid>;
        } else if (errors) {
            return <Paper className={classes.paper} elevation={2}>
                <Typography
                    className={classes.paperMessage}
                    color='textPrimary'>{errors}
                </Typography>
            </Paper>;
        } else if ((secretsPaths.secrets || []).length > 0) {
            return <List>{
                (secretsPaths.secrets || []).map((secret, i) => {
                    const {capabilities, data = {}, name} = secret;
                    const currentPath = path ? `${path}/${name}` : name;
                    const url = `/secrets/${mount}/${currentPath}`;
                    const isWrapped = !!data.wrap_info;
                    const canOpen = capabilities.includes('read') && !name.endsWith('/') && !isWrapped;
                    const canUpdate = capabilities.some(capability => capability === 'update' || capability === 'root');
                    const requiresRequest = capabilities.includes('deny') && !name.endsWith('/') || isWrapped;
                    const isApproved = isWrapped && (data.request_info || {}).approved;
                    const creationTime = data.request_info && isWrapped ? new Date(data.wrap_info.creation_time) : null;
                    const canDelete = capabilities.includes('delete');
                    let secondaryText = requiresRequest ? `Request type: ${isWrapped ? 'Control Groups' : 'Default'}` : '';
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
                                this._openListModal();
                                getSecrets(name, this._getVersionFromMount(mount));
                            } else if (isApproved) {
                                /* eslint-disable no-alert */
                                if (window.confirm(`You have been granted access to ${name}. Be careful, you can only access this data once. If you need access again in the future you will need to get authorized again.`)) {
                                    window.alert('TODO: Unwrap secret and open modal.');
                                }
                                /* eslint-enable no-alert */
                            } else {
                                this._toggleRequestSecretModal(name, !data.request_info);
                            }
                        }
                    }}/>} key={`key-${i}`}>
                        <ListItemAvatar>
                            <Avatar>{
                                name.endsWith('/') ? <FolderIcon/> : <FileCopyIcon/>
                            }</Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={name} secondary={secondaryText}/>
                        <ListItemSecondaryAction>
                            {requiresRequest && !isApproved &&
                            <Tooltip aria-label={requestAccessLabel} title={requestAccessLabel}>
                                <IconButton
                                    aria-label={requestAccessLabel}
                                    onClick={() => this._toggleRequestSecretModal(name, !data.request_info)}>
                                    <LockIcon/>
                                </IconButton>
                            </Tooltip>}
                            {canOpen && <Tooltip aria-label={openLabel} title={openLabel}>
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
                            {canDelete && <Tooltip aria-label={deleteLabel} title={deleteLabel}>
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
        const {cancelRequest, classes, deleteSecrets, match, requestSecret, secrets} = this.props;
        const {params} = match;
        const {mount} = params;
        const {deleteSecretConfirmation, isListModalOpen, requestSecretCancellation, requestSecretConfirmation, secretModalMode, secretModalInitialPath} = this.state;
        return <Card className={classes.card}>
            {this._renderBreadcrumbsArea()}
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
                        requestSecret(requestSecretConfirmation, this._getVersionFromMount(mount));
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
                        cancelRequest(requestSecretCancellation, this._getVersionFromMount(mount));
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
    cancelRequest: PropTypes.func.isRequired,
    classes: PropTypes.object.isRequired,
    deleteSecrets: PropTypes.func.isRequired,
    errors: PropTypes.string,
    getSecrets: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
    inProgress: PropTypes.bool,
    listMounts: PropTypes.func.isRequired,
    listSecretsAndCapabilities: PropTypes.func.isRequired,
    match: PropTypes.object.isRequired,
    requestSecret: PropTypes.func.isRequired,
    secrets: PropTypes.object,
    secretsMounts: PropTypes.object,
    secretsPaths: PropTypes.object
};

/**
 * Returns the Redux store's state that is relevant to this class as props.
 *
 * @private
 * @param {Object} state - The initial state.
 * @returns {Object}
 */
const _mapStateToProps = (state) => {
    const actionsUsed = [kvAction.ACTION_TYPES.LIST_MOUNTS,
        kvAction.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES,
        kvAction.ACTION_TYPES.DELETE_SECRETS
    ];
    return {
        errors: createErrorsSelector(actionsUsed)(state.actionStatusReducer),
        inProgress: createInProgressSelector(actionsUsed)(state.actionStatusReducer),
        ...state.localStorageReducer,
        ...state.kvReducer,
        ...state.sessionReducer,
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
        cancelRequest: (name, version) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}${path ? `/${path}` : ''}/${name}`;
            return new Promise((resolve, reject) => {
                dispatch(kvAction.cancelRequest(fullPath))
                    .then(() => {
                        dispatch(kvAction.listSecretsAndCapabilities(`${mount}${path ? `/${path}` : ''}`, version))
                            .then(resolve)
                            .catch(reject);
                    })
                    .catch(reject);
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
        requestSecret: (name, version) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}/${path}/${name}`;
            // TODO: implement this
            const isEnterprise = localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_ENTERPRISE) === 'true';
            const entity_id = window.app.store.getState().sessionReducer.vaultLookupSelf.data.data.entity_id;
            return new Promise((resolve, reject) => {
                let requestData = isEnterprise ? {'path': fullPath} : {
                    requesterEntityId: entity_id,
                    requesteeEntityId: 'a62df1b7-3136-6573-a40d-a24692d11a94',
                    requestData: fullPath,
                    type: '',
                    status: kvAction.KEY_NAMES.STATUS_PENDING,
                    engineType: ''
                };
                dispatch(kvAction.requestSecret(requestData, isEnterprise))
                    .then(() => {
                        dispatch(kvAction.listSecretsAndCapabilities(`${mount}${path ? `/${path}` : ''}`, version))
                            .then(resolve)
                            .catch(reject);
                    })
                    .catch(reject);
            });
        }
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
