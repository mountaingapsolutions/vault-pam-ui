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
            listSecretsAndCapabilities(mount, path, this._getVersionFromMount(mount));
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
        const {history, listMounts, listSecretsAndCapabilities, match, secretsMounts} = this.props;
        const {params} = match;
        const {mount, path} = params;

        if ((secretsMounts.data || []).length === 0) {
            listMounts().then(() => {
                listSecretsAndCapabilities(mount, path, this._getVersionFromMount(mount));
            });
        } else {
            listSecretsAndCapabilities(mount, path, this._getVersionFromMount(mount));
        }

        this.unlisten = history.listen((location, action) => {
            if (action === 'POP') {
                const {match: newMatch} = this.props;
                const {params: newParams} = newMatch;
                const {path: newPath} = newParams;
                listSecretsAndCapabilities(mount, newPath, this._getVersionFromMount(mount));
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
                                    listSecretsAndCapabilities(mount, currentPath, this._getVersionFromMount(mount));
                                }}>
                                    <Typography color='textSecondary' variant='h6'>{folder}</Typography>
                                </Link>
                                :
                                <Typography color='textPrimary' key={folder} variant='h6'>{folder}</Typography>;
                        })
                    }</Breadcrumbs>
                    {
                        (secretsPaths.capabilities || []).includes('create') && <React.Fragment>
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
        const {classes, history, getSecrets, listSecretsAndCapabilities, match, secretsMounts = {}, secretsPaths} = this.props;
        const {params} = match;
        const {mount, path = ''} = params;
        const loading = (secretsMounts._meta || {}).inProgress === true || (secretsPaths._meta || {}).inProgress === true;
        const requestAccessLabel = 'Request Access';
        const deleteLabel = 'Delete';
        const openLabel = 'Open';
        if (loading) {
            return <Grid container justify='center'>
                <Grid item>
                    <CircularProgress className={classes.progress}/>
                </Grid>
            </Grid>;
        } else if (secretsPaths._meta && Array.isArray(secretsPaths._meta.errors) && secretsPaths._meta.errors.length > 0) {
            return <Paper className={classes.paper} elevation={2}>
                <Typography
                    className={classes.paperMessage}
                    color='textPrimary'>{secretsPaths._meta.errors[0]}
                </Typography>
            </Paper>;
        } else if ((secretsPaths.secrets || []).length > 0) {
            return <List>{
                (secretsPaths.secrets || []).map((secret, i) => {
                    const {capabilities, name} = secret;
                    const currentPath = path ? `${path}/${name}` : name;
                    const url = `/secrets/${mount}/${currentPath}`;
                    return <ListItem button component={(props) => <Link to={url} {...props} onClick={event => {
                        event.preventDefault();
                        if (name.includes('/')) {
                            history.push(url);
                            listSecretsAndCapabilities(mount, currentPath, this._getVersionFromMount(mount));
                        } else {
                            if (capabilities.includes('update')) {
                                this._toggleCreateUpdateSecretModal(`${mount}/${currentPath}`, 'update');
                                getSecrets(mount, currentPath, this._getVersionFromMount(mount));
                            } else if (capabilities.includes('read')) {
                                this._openListModal();
                                getSecrets(mount, currentPath, this._getVersionFromMount(mount));
                            } else {
                                /* eslint-disable no-alert */
                                window.alert('TODO: Launch request access modal.');
                                /* eslint-enable no-alert */
                            }
                        }
                    }}/>} key={`key-${i}`}>
                        <ListItemAvatar>
                            <Avatar>{
                                name.endsWith('/') ? <FolderIcon/> : <FileCopyIcon/>
                            }</Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={name}/>
                        {capabilities.includes('deny') && !name.endsWith('/') && <ListItemSecondaryAction>
                            <Tooltip aria-label={requestAccessLabel} title={requestAccessLabel}>
                                <IconButton aria-label={requestAccessLabel} onClick={() => {
                                    /* eslint-disable no-alert */
                                    window.alert('TODO: Launch request access modal.');
                                    /* eslint-enable no-alert */
                                }}>
                                    <LockIcon/>
                                </IconButton>
                            </Tooltip>
                        </ListItemSecondaryAction>}
                        {capabilities.includes('read') && !name.endsWith('/') && <ListItemSecondaryAction>
                            <Tooltip aria-label={openLabel} title={openLabel}>
                                <IconButton aria-label={openLabel} onClick={() => {
                                    this._openListModal();
                                    getSecrets(mount, currentPath, this._getVersionFromMount(mount));
                                }}>
                                    <LockOpenIcon/>
                                </IconButton>
                            </Tooltip>
                        </ListItemSecondaryAction>}
                        {capabilities.includes('delete') && !name.endsWith('/') && <ListItemSecondaryAction>
                            <Tooltip aria-label={deleteLabel} title={deleteLabel}>
                                <IconButton aria-label={deleteLabel} onClick={() => this.setState({
                                    deleteSecretConfirmation: name
                                })}>
                                    <DeleteIcon/>
                                </IconButton>
                            </Tooltip>
                        </ListItemSecondaryAction>}
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
        const {classes, deleteSecrets, match, secrets} = this.props;
        const {params} = match;
        const {mount, path = ''} = params;
        const {deleteSecretConfirmation, isListModalOpen, secretModalMode, secretModalInitialPath} = this.state;
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
                        deleteSecrets(mount, path, deleteSecretConfirmation, this._getVersionFromMount(mount));
                    }
                    this.setState({
                        deleteSecretConfirmation: ''
                    });
                }}
            />
        </Card>;
    }
}

SecretsList.propTypes = {
    classes: PropTypes.object.isRequired,
    deleteSecrets: PropTypes.func.isRequired,
    getSecrets: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
    listMounts: PropTypes.func.isRequired,
    listSecretsAndCapabilities: PropTypes.func.isRequired,
    match: PropTypes.object.isRequired,
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
    return {
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
 * @returns {Object}
 */
const _mapDispatchToProps = (dispatch) => {
    return {
        listMounts: () => dispatch(kvAction.listMounts()),
        listSecretsAndCapabilities: (mount, path = '', version) => {
            return dispatch(kvAction.listSecretsAndCapabilities(`${mount}/${path.endsWith('/') ? path.slice(0, -1) : path}`, version));
        },
        getSecrets: (mount, path = '', version) => {
            return dispatch(kvAction.getSecrets(`${mount}/${version === 2 ? 'data/' : ''}${path.endsWith('/') ? path.slice(0, -1) : path}`));
        },
        deleteSecrets: (mount, path = '', secret, version) => {
            return new Promise((resolve, reject) => {
                const parsedPath = path.endsWith(0, -1) ? path.slice(0, -1) : path;
                const deletePath = `${mount}${version === 2 ? '/metadata' : ''}${parsedPath ? `/${parsedPath}` : ''}/${secret}`;
                dispatch(kvAction.deleteSecrets(deletePath))
                    .then(() => {
                        const listPath = `${mount}/${parsedPath}`;
                        dispatch(kvAction.listSecretsAndCapabilities(listPath, version))
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
        marginLeft: 'auto'
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
