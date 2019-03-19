import {withStyles} from '@material-ui/core/styles';
import {Button, Card, CardActions, CardContent, List, ListItem, ListItemText, Typography} from '@material-ui/core';
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
    }

    /**
     * Required React Component lifecycle method. Invoked once, only on the client (not on the server), immediately after the initial rendering occurs.
     *
     * @protected
     * @override
     */
    componentDidMount() {
        const {listSecrets, match, secretsMounts} = this.props;
        const {params} = match;
        const {mount: mountName} = params;
        const {path} = secretsMounts.find(mount => mount.name === `${mountName}/`) || {};
        listSecrets(path);
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {classes, match, secretsPaths = []} = this.props;
        const {params} = match;
        const {mount} = params;
        return <Card className={classes.card}>
            <CardContent>
                <Typography gutterBottom color='textSecondary' variant='h6'>
                    {mount}
                </Typography>
            </CardContent>
            <List>{
                secretsPaths.map(path => {
                    return <ListItem button component={(props) => <Link to='#' {...props} onClick={event => {
                        event.preventDefault();
                        /* eslint-disable no-alert */
                        window.alert(`Make me go to ${path}!`);
                        /* eslint-enable no-alert */
                    }}/>} key={path}>
                        <ListItemText primary={path}/>
                    </ListItem>;
                })
            }</List>
            <CardActions>
                <Button color='primary' size='small'>
                    Back
                </Button>
            </CardActions>
        </Card>;
    }
}

SecretsList.propTypes = {
    classes: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
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
        listSecrets: (path) => dispatch(kvAction.listSecrets(path))
    };
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({
    card: {
        width: '800px'
    }
});

export default withRouter(connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(SecretsList)));
