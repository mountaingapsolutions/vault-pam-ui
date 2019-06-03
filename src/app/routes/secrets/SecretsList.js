import {
    Avatar,
    Breadcrumbs,
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
import Cloud from '@material-ui/icons/Cloud';
import DeleteIcon from '@material-ui/icons/Delete';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import FolderIcon from '@material-ui/icons/Folder';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import ListIcon from '@material-ui/icons/List';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Link, withRouter} from 'react-router-dom';

import secretAction from 'app/core/actions/secretAction';
import Button from 'app/core/components/Button';
import CreateUpdateSecretModal from 'app/core/components/CreateUpdateSecretModal';
import ConfirmationModal from 'app/core/components/ConfirmationModal';
import ListModal from 'app/core/components/ListModal';
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
            dynamicEnginePath: '',
            newSecretAnchorElement: null,
            refreshSecretsListOnClose: false,
            secretModalInitialPath: '',
            secretModalMode: '',
            showConfirmationModal: false,
            showLeaseListModal: false
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
     * Handle for when a secret item is pressed.
     *
     * @private
     * @param {SyntheticMouseEvent} secret The secret object.
     * @param {SyntheticMouseEvent} event The event.
     */
    _onClickSecret(secret, event) {
        event.preventDefault();
        const {canOpen, canUpdate, isApproved, isDynamicSecret, isPending, isWrapped, name, requiresRequest, secretsData, secretsPath, url} = secret;
        const {getSecrets, history, getLeaseList, listSecretsAndCapabilities, match, openApprovedSecret, setSecretsData} = this.props;
        const {params} = match;
        const {mount} = params;
        if (name.includes('/')) {
            history.push(url);
            listSecretsAndCapabilities(secretsPath, this._getVersionFromMount(mount));
        } else {
            if (isDynamicSecret && canUpdate) {
                getLeaseList(mount, name);
                this._toggleLeaseListModal(`${mount}/${name}`);
            } else if (canUpdate) {
                this._toggleCreateUpdateSecretModal(`${mount}/${secretsPath}`, 'update');
                getSecrets(name, this._getVersionFromMount(mount));
            } else if (canOpen) {
                this._toggleCreateUpdateSecretModal(`${mount}/${secretsPath}`, 'read');
                secretsData ? setSecretsData(secretsData) : getSecrets(name, this._getVersionFromMount(mount));
            } else if (isApproved) {
                if (isDynamicSecret) {
                    this._openApprovedRequestModal(mount, name, name);
                } else if (isWrapped) {
                    this._openApprovedRequestModal(mount, secretsPath, name);
                } else {
                    this._toggleCreateUpdateSecretModal(`${mount}/${secretsPath}`, 'read');
                    openApprovedSecret(name, this._getVersionFromMount(mount));
                }
            } else if (requiresRequest) {
                const requestType = this._getRequestType(secret);
                if (isPending) {
                    this._openRequestCancellationModal(mount, name, requestType);
                } else {
                    this._openRequestModal(mount, name, requestType);
                }
            }
        }
    }

    /**
     * Sets the confirmation modal data in state for opening an approved secret.
     *
     * @param {string} mount The mount point.
     * @param {string} currentPath The current path.
     * @param {string} name The name of the secret to open.
     * @private
     */
    _openApprovedRequestModal(mount, currentPath, name) {
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
                            unwrapSecret(name, this._getVersionFromMount(mount));
                            this._toggleCreateUpdateSecretModal(`${mount}/${currentPath}`, 'read', true);
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
     * @param {string} requestType The type of secret being requested.
     * @private
     */
    _openRequestModal(mount, name, requestType) {
        const {CONTROL_GROUP, DYNAMIC_REQUEST, STANDARD_REQUEST} = Constants.REQUEST_TYPES;
        let typeLabel = '';
        switch (requestType) {
            case CONTROL_GROUP:
                typeLabel = 'Control Group';
                break;
            case DYNAMIC_REQUEST:
                typeLabel = 'Dynamic Request';
                break;
            case STANDARD_REQUEST:
                typeLabel = 'Standard Request';
                break;
        }
        this.setState({
            showConfirmationModal: true,
            confirmationModalData: {
                title: 'Privilege Access Request',
                content: `The path ${name} has been locked through ${typeLabel}. Request access?`,
                onClose: (confirm) => {
                    if (confirm) {
                        const {requestSecret} = this.props;
                        requestSecret(name, this._getVersionFromMount(mount), requestType);
                    }
                    this.setState({
                        showConfirmationModal: false
                    });
                }
            }
        });
    }

    /**
     * Returns a static Link component
     *
     * @private
     * @param {string|Object} to path to link to.
     * @returns {React.ReactElement}
     */
    // eslint-disable-next-line react/display-name
    _renderLink = React.forwardRef((itemProps, ref) =>
        <Link {...itemProps} ref={ref}/>
    );

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
            const {listRequests, location, listSecretsAndCapabilities, match} = this.props;
            const type = ((location || {}).state || {}).type || null;
            const {params} = match;
            const {mount, path} = params;
            listRequests();
            listSecretsAndCapabilities(path, this._getVersionFromMount(mount), type);
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
        const {dismissError, history, listMounts, listSecretsAndCapabilities, location: locProp, match, secretsMounts} = this.props;
        const {params} = match;
        const {mount, path} = params;
        const type = ((locProp || {}).state || {}).type || null;
        if ((secretsMounts.data || []).length === 0) {
            listMounts().then(() => {
                listSecretsAndCapabilities(path, this._getVersionFromMount(mount), type);
            });
        } else {
            listSecretsAndCapabilities(path, this._getVersionFromMount(mount), type);
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
     * Returns the corresponding type of the request data.
     *
     * @private
     * @param {Object} requestData The request data object.
     * @returns {string}
     */
    _getRequestType(requestData) {
        const {isDynamicSecret, isWrapped} = requestData;
        const {CONTROL_GROUP, DYNAMIC_REQUEST, STANDARD_REQUEST} = Constants.REQUEST_TYPES;
        let type;
        if (isDynamicSecret) {
            type = DYNAMIC_REQUEST;
        } else if (isWrapped) {
            type = CONTROL_GROUP;
        } else {
            type = STANDARD_REQUEST;
        }
        return type;
    }

    /**
     * Returns the proper icon from the provided request data object.
     *
     * @private
     * @param {Object} requestData The request data object.
     * @returns {React.ReactElement}
     */
    _getSecretsIcon(requestData) {
        const {isDynamicSecret, name} = requestData;
        const isNotEndOfPath = name.endsWith('/');
        let icon;
        if (isDynamicSecret) {
            icon = <Cloud/>;
        } else if (isNotEndOfPath) {
            icon = <FolderIcon/>;
        } else {
            icon = <FileCopyIcon/>;
        }
        return icon;
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
                        component={this._renderLink} variant='text'
                        {...{to: '/'}}>
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
        const {isApproved, isPending, canOpen, canDelete, name, isWrapped, requiresRequest, secretsData, secretsPath} = secret;
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
                            this._openApprovedRequestModal(mount, secretsPath, name);
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
            const requestType = this._getRequestType(secret);
            return <Tooltip aria-label={requestAccessLabel} title={requestAccessLabel}>
                <IconButton
                    aria-label={requestAccessLabel}
                    onClick={() => isPending ? this._openRequestCancellationModal(mount, name, requestType) : this._openRequestModal(mount, name, requestType)}>
                    <LockIcon/>
                </IconButton>
            </Tooltip>;
        }
        return null;
    }

    /**
     * Toggles Lease List modal.
     *
     * @param {string} mountPath The mount path.
     * @private
     */
    _toggleLeaseListModal(mountPath = '') {
        this.setState({
            showLeaseListModal: !this.state.showLeaseListModal,
            dynamicEnginePath: mountPath
        });
    }

    /**
     * Revokes lease.
     *
     * @param {Object} item The Lease object.
     * @private
     */
    _revokeLease(item) {
        this.props.revokeLease(item);
    }

    /**
     * Renders the secrets list area.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderSecretsListArea() {
        const {classes, pageError, inProgress, match, secretsList} = this.props;
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
                    const {authorizationsText, isDynamicSecret, name, secondaryText, url} = secret;
                    return <ListItem button component={this._renderLink} key={`key-${i}`} {...{onClick: this._onClickSecret.bind(this, secret), to: url}}>
                        <ListItemAvatar>
                            <Avatar>{
                                this._getSecretsIcon({isDynamicSecret, name})
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
        const {classes, dismissError, dismissibleError, leaseList, leaseModalInProgress} = this.props;
        const {confirmationModalData, dynamicEnginePath, secretModalMode, secretModalInitialPath, showConfirmationModal, showLeaseListModal} = this.state;
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
            <ListModal
                buttonTitle='Revoke'
                isLoading={leaseModalInProgress}
                items={leaseList}
                listTitle={`Active lease in ${dynamicEnginePath}`}
                open={showLeaseListModal}
                primaryTextPropName='requesterName'
                secondaryTextPropName='leaseId'
                onClick={item => this._revokeLease(item)}
                onClose={() => this._toggleLeaseListModal()}
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
    getLeaseList: PropTypes.func.isRequired,
    getSecrets: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
    inProgress: PropTypes.bool,
    leaseList: PropTypes.object,
    leaseModalInProgress: PropTypes.bool,
    listMounts: PropTypes.func.isRequired,
    listRequests: PropTypes.func.isRequired,
    listSecretsAndCapabilities: PropTypes.func.isRequired,
    location: PropTypes.object.isRequired,
    match: PropTypes.object.isRequired,
    openApprovedSecret: PropTypes.func.isRequired,
    pageError: PropTypes.string,
    requestSecret: PropTypes.func.isRequired,
    revokeLease: PropTypes.func.isRequired,
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
    const {location, match} = ownProps;
    const {params} = match;
    const {mount, path = ''} = params;
    const {secretsMounts, secretsPaths, secretsRequests} = state.secretReducer;
    let isV2 = false;
    const mountData = (secretsMounts.data || []).find(m => mount === m.name.slice(0, -1));
    if (mountData) {
        isV2 = mountData.options && mountData.options.version === '2';
    }
    const type = ((location || {}).state || {}).type || null;
    const isDynamicSecret = Constants.DYNAMIC_ENGINES.some(engine => engine === type);
    const secretsList = (secretsPaths.secrets || []).map((secret) => {
        const {capabilities, data = {}, name} = secret;
        const {wrap_info: wrapInfo} = data;
        const currentPath = path ? `${path}/${name}` : name;
        const mountPath = `${mount}/${currentPath}`;
        const isWrapped = !!wrapInfo;
        let isApproved = false;
        let isOpened = false;
        let isDynamicAndCanOpen = false;
        const requiresRequest = !capabilities.includes('read') && !name.endsWith('/') || isWrapped;
        let activeRequest;
        let secondaryText;
        let authorizationsText;
        if (requiresRequest) {
            secondaryText = `Request type: ${isWrapped ? 'Control Groups' : isDynamicSecret ? 'Dynamic Request' : 'Standard Request'}`;
            // Check for any active requests.
            const secretsPath = `${mount}${isV2 ? '/data/' : '/'}${currentPath}`;
            activeRequest = secretsRequests.find((request) => request.path === secretsPath);
            if (activeRequest) {
                const {approved, authorizations, creationTime, opened} = activeRequest;
                isOpened = opened;
                isDynamicAndCanOpen = isDynamicSecret ? !isOpened : true;
                isApproved = approved && isDynamicAndCanOpen;
                if (isApproved) {
                    const namesList = authorizations.map((authorization) => authorization.name);
                    authorizationsText = `Approved by ${namesList.join(', ')}.`;
                }
                if (creationTime && isDynamicAndCanOpen) {
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
            isDynamicSecret,
            isPending: !!activeRequest && !isApproved && isDynamicAndCanOpen,
            isWrapped,
            name,
            requiresRequest,
            secondaryText: isDynamicSecret && !requiresRequest ? 'Click to open the active leases' : secondaryText,
            secretsData: !isWrapped && secret.data ? secret.data : undefined,
            secretsPath: currentPath,
            url: `/secrets/${mountPath}`
        };
    });
    return {
        dismissibleError: createErrorsSelector([
            secretAction.ACTION_TYPES.DELETE_SECRETS,
            secretAction.ACTION_TYPES.REQUEST_SECRET
        ])(state.actionStatusReducer),
        pageError: createErrorsSelector([
            secretAction.ACTION_TYPES.LIST_MOUNTS,
            secretAction.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES
        ])(state.actionStatusReducer),
        inProgress: createInProgressSelector([
            secretAction.ACTION_TYPES.DELETE_SECRETS,
            secretAction.ACTION_TYPES.LIST_MOUNTS,
            secretAction.ACTION_TYPES.LIST_SECRETS_AND_CAPABILITIES
        ])(state.actionStatusReducer),
        leaseModalInProgress: createInProgressSelector([
            secretAction.ACTION_TYPES.REVOKE_LEASE,
            secretAction.ACTION_TYPES.LIST_LEASE
        ])(state.actionStatusReducer),
        ...state.localStorageReducer,
        ...state.secretReducer,
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
        deleteRequest: (name, version, type = Constants.REQUEST_TYPES.STANDARD_REQUEST) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}${path ? `/${path}` : ''}/${name}`;
            return new Promise((resolve, reject) => {
                dispatch(secretAction.deleteRequest(fullPath, '', type))
                    .then(resolve)
                    .catch(reject);
            });
        },
        dismissError: () => {
            return new Promise((resolve) => {
                [
                    secretAction.ACTION_TYPES.DELETE_SECRETS,
                    secretAction.ACTION_TYPES.REQUEST_SECRET
                ].forEach(type => {
                    dispatch({
                        type
                    });
                });
                resolve();
            });
        },
        listMounts: () => dispatch(secretAction.listMounts()),
        listRequests: () => dispatch(secretAction.listRequests()),
        listSecretsAndCapabilities: (path = '', version, type = 'kv') => {
            const {match} = ownProps;
            const {params} = match;
            const {mount} = params;
            return dispatch(secretAction.listSecretsAndCapabilities(`${mount}/${path.endsWith('/') ? path.slice(0, -1) : path}`, version, type));
        },
        getSecrets: (name, version) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}${path ? `/${path}` : ''}/${name}`;
            return dispatch(secretAction.getSecrets(fullPath));
        },
        deleteSecrets: (name, version) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            return new Promise((resolve, reject) => {
                const fullPath = `${mount}${version === 2 ? '/metadata' : ''}${path ? `/${path}` : ''}/${name}`;
                dispatch(secretAction.deleteSecrets(fullPath))
                    .then(() => {
                        dispatch(secretAction.listSecretsAndCapabilities(`${mount}${path ? `/${path}` : ''}`, version))
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
            return dispatch(secretAction.openApprovedSecret(fullPath));
        },
        requestSecret: (name, version, type = Constants.REQUEST_TYPES.STANDARD_REQUEST) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}${path ? `/${path}` : ''}/${name}`;
            return new Promise((resolve, reject) => {
                let requestData = {
                    path: fullPath,
                    type
                };
                dispatch(secretAction.requestSecret(requestData))
                    .then(resolve)
                    .catch(reject);
            });
        },
        setSecretsData: (data) => dispatch(secretAction.setSecretsData(data)),
        unwrapSecret: (name, version) => {
            const {match} = ownProps;
            const {params} = match;
            const {mount, path} = params;
            const fullPath = `${mount}${version === 2 ? '/data' : ''}${path ? `/${path}` : ''}/${name}`;
            dispatch(secretAction.unwrapSecret(fullPath));
        },
        getLeaseList: (engineName, role) => {
            return new Promise((resolve, reject) => {
                dispatch(secretAction.getLeaseList(engineName, role))
                    .then(resolve)
                    .catch(reject);
            });
        },
        revokeLease: leaseData => {
            return new Promise((resolve, reject) => {
                const data = leaseData.leaseId.split('/');
                dispatch(secretAction.revokeLease(leaseData))
                    .then(() => {
                        dispatch(secretAction.getLeaseList(data[0], data[2]))
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
