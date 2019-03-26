import {Card, CardContent, CircularProgress, Fab, Grid, List, ListItem, ListItemIcon, ListItemText, Paper, Typography} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import FolderIcon from '@material-ui/icons/Folder';
import ListIcon from '@material-ui/icons/List';
import {Breadcrumbs} from '@material-ui/lab';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Link, withRouter} from 'react-router-dom';

import kvAction from 'app/core/actions/kvAction';
import systemAction from 'app/core/actions/systemAction';
import Button from 'app/core/components/common/Button';
import ListModal from 'app/core/components/common/ListModal';
import CreateUpdateSecretModal from 'app/core/components/CreateUpdateSecretModal';

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
        console.warn('refresh: ', refresh);
        if (refresh) {
            const {listSecrets, match, secretsMounts} = this.props;
            const {params} = match;
            const {mount, path} = params;
            listSecrets(secretsMounts, mount, path);
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
        const {history, listSecrets, match, secretsMounts} = this.props;
        const {params} = match;
        const {mount} = params;
        listSecrets(secretsMounts, mount);
        this.unlisten = history.listen((location, action) => {
            if (action === 'POP') {
                const {match: newMatch} = this.props;
                const {params: newParams} = newMatch;
                const {path} = newParams;
                listSecrets(secretsMounts, mount, path);
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
        const {classes, history, listSecrets, match, secretsMounts = {}, selfCapabilities = {}} = this.props;
        const {params} = match;
        const {mount, path} = params;
        const paths = path ? [mount].concat(path.split('/')) : [mount];
        return <CardContent>{
            mount && <List disablePadding>
                <ListItem disableGutters className={classes.disablePadding}>
                    <Button className={`${classes.disableMinWidth} ${classes.disablePadding}`} color='inherit' component={props => <Link to='/' {...props}/>} variant='text'>
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
                                    listSecrets(secretsMounts, mount, currentPath);
                                }}>
                                    <Typography color='textSecondary' variant='h6'>{folder}</Typography>
                                </Link>
                                :
                                <Typography color='textPrimary' key={folder} variant='h6'>{folder}</Typography>;
                        })
                    }</Breadcrumbs>
                    {
                        (selfCapabilities.capabilities || []).includes('create') && <React.Fragment>
                            <Fab aria-label='new' className={classes.fab} color='primary' size='medium' variant='extended' onClick={() => this._toggleCreateUpdateSecretModal(paths.join('/'), 'create')}>
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
        const {classes, history, getSecrets, listSecrets, match, secretsMounts = {}, secretsPaths = {}, selfCapabilities = {}} = this.props;
        const {params} = match;
        const {mount, path = ''} = params;
        if (secretsPaths._meta && secretsPaths._meta.inProgress === true) {
            return <Grid container justify='center'>
                <Grid item>
                    <CircularProgress className={classes.progress}/>
                </Grid>
            </Grid>;
        } else if (secretsPaths._meta && secretsPaths._meta.errors && Array.isArray(secretsPaths._meta.errors) && secretsPaths._meta.errors.length > 0) {
            return <Paper className={classes.paper} elevation={2}>
                <Typography className={classes.paperMessage} color='textPrimary'>{secretsPaths._meta.errors[0]}</Typography>
            </Paper>;
        } else if ((secretsPaths.keys || []).length > 0) {
            return <List>{
                (secretsPaths.keys || []).map((key, i) => {
                    const currentPath = path ? `${path}/${key}` : key;
                    const url = `/secrets/${mount}/${currentPath}`;
                    return <ListItem button component={(props) => <Link to={url} {...props} onClick={event => {
                        event.preventDefault();
                        if (key.includes('/')) {
                            history.push(url);
                            listSecrets(secretsMounts, mount, currentPath);
                        } else {
                            if ((selfCapabilities.capabilities || []).includes('update')) {
                                this._toggleCreateUpdateSecretModal(`${mount}/${currentPath}`, 'update');
                            } else {
                                this._openListModal();
                            }
                            getSecrets(secretsMounts, mount, currentPath);
                        }
                    }}/>} key={`key-${i}`}>
                        <ListItemIcon>{
                            key.endsWith('/') ? <FolderIcon/> : <FileCopyIcon/>
                        }</ListItemIcon>
                        <ListItemText primary={key}/>
                    </ListItem>;
                })
            }</List>;
        } else {
            return <Paper className={classes.paper} elevation={2}>
                <Typography className={classes.paperMessage} color='textSecondary' variant='h5' >
                    There appears to be no content in {mount}.
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
        const {classes, secrets} = this.props;
        const {isListModalOpen, secretModalMode, secretModalInitialPath} = this.state;
        return <Card className={classes.card}>
            {this._renderBreadcrumbsArea()}
            {this._renderSecretsListArea()}
            <ListModal buttonTitle={'Request Secret'} items={secrets} listTitle={'Secrets'} open={isListModalOpen} onClick={() => {
                /* eslint-disable no-alert */
                window.alert('button clicked!');
                /* eslint-enable no-alert */
            }} onClose={this._closeListModal}/>
            <CreateUpdateSecretModal initialPath={secretModalInitialPath} mode={secretModalMode} open={!!secretModalMode} onClose={this._onCreateUpdateSecretModalClose}/>
        </Card>;
    }
}

SecretsList.propTypes = {
    classes: PropTypes.object.isRequired,
    getSecrets: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
    listSecrets: PropTypes.func.isRequired,
    match: PropTypes.object.isRequired,
    secrets: PropTypes.object,
    secretsMounts: PropTypes.array,
    secretsPaths: PropTypes.object,
    selfCapabilities: PropTypes.object
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
        ...state.systemReducer,
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
        listSecrets: (secretsMounts = [], mountName, path = '') => {
            return new Promise((resolve, reject) => {
                const mount = secretsMounts.find(m => mountName === m.name.slice(0, -1));
                if (mount) {
                    // See https://www.vaultproject.io/docs/secrets/kv/kv-v2.html for additional information. Version 2 KV secrets engine requires an additional /metadata in the query path.
                    const queryMountPath = mount.options && mount.options.version === '2' ? `${mountName}/metadata` : mountName;
                    const queryFullPath = `${queryMountPath}/${path}`;
                    Promise.all([
                        dispatch(kvAction.listSecrets(queryFullPath)),
                        dispatch(systemAction.checkSelfCapabilities(queryFullPath))
                    ]).then(resolve).catch(reject);
                } else {
                    reject();
                }
            });
        },
        getSecrets: (secretsMounts = [], mountName, path = '') => {
            return new Promise((resolve, reject) => {
                const mount = secretsMounts.find(m => mountName === m.name.slice(0, -1));
                if (mount) {
                    const queryMountPath = mount.options && mount.options.version === '2' ? `${mountName}/data` : mountName;
                    const queryFullPath = `${queryMountPath}/${path}`;
                    dispatch(kvAction.getSecrets(queryFullPath)).then(resolve).catch(reject);
                } else {
                    reject();
                }
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
