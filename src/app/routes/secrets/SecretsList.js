import {withStyles} from '@material-ui/core/styles';
import {Button, Card, CardActions, CircularProgress, List, ListItem, ListItemText, Paper, Typography} from '@material-ui/core';
import {Breadcrumbs} from '@material-ui/lab';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Link, withRouter} from 'react-router-dom';

import kvAction from 'app/core/actions/kvAction';

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

        this._onBack = this._onBack.bind(this);
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
     * Required React Component lifecycle method. Invoked once, only on the client (not on the server), immediately after the initial rendering occurs.
     *
     * @protected
     * @override
     */
    componentDidMount() {
        const {listMounts, listSecrets, match, secretsMounts} = this.props;
        const {params} = match;
        const {mount: mountName} = params;
        // If no mounts, try fetching again. Typically this means coming from a refresh scenario.
        if (secretsMounts.length === 0) {
            listMounts().then(() => {
                const {secretsMounts: newSecretMounts} = this.props;
                const {path} = newSecretMounts.find(mount => mount.name === `${mountName}/`) || {};
                listSecrets(path);
            });
        } else {
            const {path} = secretsMounts.find(mount => mount.name === `${mountName}/`) || {};
            listSecrets(path);
        }
    }


    componentDidUpdate() {
        window.onpopstate = () => {
            // Update secretsPaths on browser back button
            const {listSecrets, match} = this.props;
            const {params} = match;
            const {mount} = params;
            listSecrets(mount);
        };
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {classes, history, listSecrets, match, secretsPaths = []} = this.props;
        const {params} = match;
        const {mount} = params;
        const folders = (mount || '').split('/');
        return <Card className={classes.card}>
            <Paper className={classes.paper}>
                {mount ?
                    <Breadcrumbs arial-label='Breadcrumb' separator='>'>
                        {
                            folders.map((folder, idx) => {
                                return idx !== folders.length - 1 ?
                                    <Link key={folder} to='#' onClick={event => {
                                        const currentPath = folders.slice(0, idx + 1).join('/');
                                        event.preventDefault();
                                        history.push(`/secrets/list/${currentPath}`);
                                        listSecrets(`${currentPath}`);
                                    }}>
                                        <Typography color='textSecondary' variant='h6'>{folder}</Typography>
                                    </Link>
                                    :
                                    <Typography color='textPrimary' key={folder} variant='h6'>{folder}</Typography>;
                            })
                        }
                    </Breadcrumbs>
                    :
                    <div>
                        <CircularProgress className={classes.progress}/>
                    </div>
                }
            </Paper>
            {
                secretsPaths.length > 0 ?
                    <List>{
                        secretsPaths.map(path => {
                            return <ListItem button component={(props) => <Link to='#' {...props} onClick={event => {
                                event.preventDefault();
                                if (path.includes('/')) {
                                    history.push(`/secrets/list/${mount}/${path}`);
                                    listSecrets(`${mount}/${path}`);
                                } else {
                                    /* eslint-disable no-alert */
                                    window.alert(`Make me go to ${path}!`);
                                    /* eslint-enable no-alert */
                                }
                            }}/>} key={path}>
                                <ListItemText primary={path}/>
                            </ListItem>;
                        })
                    }</List>
                    :
                    <div>
                        <CircularProgress className={classes.progress}/>
                    </div>
            }

            <CardActions>
                <Button color='primary' size='small' onClick={this._onBack}>
                    Back
                </Button>
            </CardActions>
        </Card>;
    }
}

SecretsList.propTypes = {
    classes: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    listMounts: PropTypes.func.isRequired,
    listSecrets: PropTypes.func.isRequired,
    match: PropTypes.object.isRequired,
    secretsMounts: PropTypes.array,
    secretsPaths: PropTypes.array
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
        listMounts: () => dispatch(kvAction.listMounts()),
        listSecrets: (path) => dispatch(kvAction.listSecrets(path))
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
