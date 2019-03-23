import {withStyles} from '@material-ui/core/styles';
import {Card, CardActions, CircularProgress, List, ListItem, ListItemText, Paper, Typography} from '@material-ui/core';
import {Breadcrumbs} from '@material-ui/lab';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Link, withRouter} from 'react-router-dom';

import Button from 'app/core/components/common/Button';
import kvAction from 'app/core/actions/kvAction';
import ListModal from 'app/core/components/common/ListModal';

/**
 * The secrets list container.
 */
class SecretsList extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props - Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {isListModalOpen: false};

        this._onBack = this._onBack.bind(this);
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
     * Required React Component lifecycle method. Invoked once, only on the client (not on the server), immediately after the initial rendering occurs.
     *
     * @protected
     * @override
     */
    componentDidMount() {
        const {history, listSecrets, match, secretsMounts} = this.props;
        const {params} = match;
        const {mount} = params;
        // Find the mount data object from the URL mount path.
        const mountPath = (secretsMounts.find(m => m.name.endsWith('/') ? mount === m.name.slice(0, -1) : mount === m.name) || {}).path;
        listSecrets(mountPath);
        this.unlisten = history.listen((location, action) => {
            if (action === 'POP') {
                const {match: newMatch} = this.props;
                const {params: newParams} = newMatch;
                const {mount: newMount} = newParams;
                const folders = (newMount || '').split('/');
                const listSecretsCurrentQueryPath = folders.length > 1 ? `${mountPath}/${folders.slice(1).join('/')}` : mountPath;
                listSecrets(listSecretsCurrentQueryPath);
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
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, history, getSecrets, listSecrets, match, secrets, secretsMounts, secretsPaths = {}} = this.props;
        const {isListModalOpen} = this.state;
        const {params} = match;
        const {mount} = params;
        const folders = (mount || '').split('/');
        const initialMount = folders[0];
        const mountPath = (secretsMounts.find(m => m.name.endsWith('/') ? initialMount === m.name.slice(0, -1) : initialMount === m.name) || {}).path;
        const listSecretsCurrentQueryPath = folders.length > 1 ? `${mountPath}/${folders.slice(1).join('/')}` : mountPath;
        return <Card className={classes.card}>
            <Paper className={classes.paper}>
                {mount ?
                    <Breadcrumbs arial-label='Breadcrumb' separator='>'>{
                        folders.map((folder, idx) => {
                            const currentPath = folders.slice(0, idx + 1).join('/');
                            const listingPath = `${mountPath}/${folders.slice(1, idx + 1).join('/')}`;
                            const url = `/secrets/list/${currentPath}`;
                            return idx !== folders.length - 1 ?
                                <Link key={folder} to={url} onClick={event => {
                                    event.preventDefault();
                                    history.push(url);
                                    listSecrets(`${listingPath}`);
                                }}>
                                    <Typography color='textSecondary' variant='h6'>{folder}</Typography>
                                </Link>
                                :
                                <Typography color='textPrimary' key={folder} variant='h6'>{folder}</Typography>;
                        })
                    }</Breadcrumbs>
                    :
                    <div>
                        <CircularProgress className={classes.progress}/>
                    </div>
                }
            </Paper>
            {
                secretsPaths && secretsPaths._meta && secretsPaths._meta.inProgress === true > 0 ?
                    <div>
                        <CircularProgress className={classes.progress}/>
                    </div>
                    :
                    <List>{
                        secretsPaths && secretsPaths._meta && secretsPaths && secretsPaths._meta.errors && Array.isArray(secretsPaths._meta.errors) ?
                            <div>
                                <Typography color='textPrimary'>{secretsPaths._meta.errors[0]}</Typography>
                            </div>
                            :
                            (secretsPaths.keys || []).map(path => {
                                const url = `/secrets/list/${mount}/${path}`;
                                return <ListItem button component={(props) => <Link to={url} {...props} onClick={event => {
                                    event.preventDefault();
                                    if (path.includes('/')) {
                                        history.push(url);
                                        listSecrets(`${listSecretsCurrentQueryPath}/${path}`);
                                    } else {
                                        this._openListModal();
                                        getSecrets(`${mount}/${path}`);
                                    }
                                }}/>} key={path}>
                                    <ListItemText primary={path}/>
                                </ListItem>;
                            })
                    }</List>
            }
            <CardActions>
                <Button variant='text' onClick={this._onBack}>
                    Back
                </Button>
            </CardActions>
            <ListModal buttonTitle={'Request Secret'} items={secrets} listTitle={'Secrets'} open={isListModalOpen} onClick={() => {
                /* eslint-disable no-alert */
                window.alert('button clicked!');
                /* eslint-enable no-alert */
            }} onClose={this._closeListModal}/>
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
        listSecrets: (path) => dispatch(kvAction.listSecrets(path)),
        getSecrets: (path) => dispatch(kvAction.getSecrets(path))
    };
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @param {Object} theme theme
 * @returns {Object}
 */
const _styles = (theme) => ({
    card: {
        width: '800px'
    },
    paper: {
        padding: `${theme.spacing.unit}px ${theme.spacing.unit * 2}px`,
    },
    progress: {
        margin: theme.spacing.unit * 2,
    }
});

export default withRouter(connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(SecretsList)));
