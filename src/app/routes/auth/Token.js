/* global window */

import {withStyles} from '@material-ui/core/styles';
import {Button, CardActions, CardContent, TextField, Typography} from '@material-ui/core';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

import sessionAction from 'app/core/actions/sessionAction';
import localStorageUtil from 'app/util/localStorageUtil';

/**
 * The Vault token validation page.
 */
class Token extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props - Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {
            error: '',
            token: ''
        };

        this._onChange = this._onChange.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
    }

    /**
     * Handle for when value change is triggered.
     *
     * @private
     * @param {SyntheticMouseEvent} event - The event.
     */
    _onChange(event) {
        event.preventDefault();
        this.setState({
            error: '',
            token: event.target.value
        });
    }

    /**
     * Handle for submitting the form.
     *
     * @private
     * @param {SyntheticMouseEvent} event - The event.
     */
    _onSubmit(event) {
        event.preventDefault();
        const {setVaultToken} = this.props;
        const {token} = this.state;
        if (!token) {
            this.setState({
                error: 'Please fill out this field.'
            });
        } else {
            setVaultToken(token).then(() => {
                // Redirect!
                window.location.href = '/';
            }).catch(() => {
                const {vaultLookupSelf} = this.props;
                if (vaultLookupSelf.errors) {
                    this.setState({
                        error: vaultLookupSelf.errors[0]
                    });
                }
            });
        }
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {classes, history} = this.props;
        const {error} = this.state;
        return <form onSubmit={this._onSubmit}>
            <CardContent>
                <Typography gutterBottom className={classes.title} color='textSecondary' variant='h6'>
                    Initial Configuration
                </Typography>
                <TextField fullWidth required className={classes.textField} error={!!error} helperText={error} label='Token' margin='normal' type='password' variant='outlined' onChange={this._onChange}/>
            </CardContent>
            <CardActions className={classes['card-action']}>
                <Button className={classes.button} color='primary' onClick={() => history.push('/auth/server')}>
                    Back
                </Button>
                <Button className={classes.button} color='primary' variant='contained' onClick={this._onSubmit}>
                    Next
                </Button>
            </CardActions>
        </form>;
    }
}

Token.propTypes = {
    classes: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    setVaultToken: PropTypes.func.isRequired,
    vaultLookupSelf: PropTypes.object.isRequired
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
        ...state.sessionReducer
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
        setVaultToken: (token) => {
            localStorageUtil.setItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN, token);
            dispatch(sessionAction.setToken(token));
            return dispatch(sessionAction.validateToken());
        }
    };
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({
    'card-action': {
        justifyContent: 'space-between'
    }
});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(Token));
