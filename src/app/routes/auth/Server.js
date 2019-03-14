import {withStyles} from '@material-ui/core/styles';
import {Button, CardActions, CardContent, TextField, Typography} from '@material-ui/core';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

import sessionAction from 'app/core/actions/sessionAction';
import localStorageUtil from 'app/util/localStorageUtil';

/**
 * The Vault server validation page.
 */
class Server extends Component {

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
            url: ''
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
            url: event.target.value
        });
    }

    /**
     * Handle for submitting the form.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _onSubmit(event) {
        event.preventDefault();
        const {history, setVaultDomain} = this.props;
        const {url} = this.state;
        if (!url) {
            this.setState({
                error: 'Please fill out this field.'
            });
        } else {
            setVaultDomain(url).then(() => {
                history.push('/auth/token');
            }).catch(() => {
                const {vaultSealStatus} = this.props;
                if (vaultSealStatus.errors) {
                    this.setState({
                        error: vaultSealStatus.errors[0]
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
        const {classes} = this.props;
        const {error} = this.state;
        const helperText = error || 'e.g. https://vault.mycompany.com:8200';
        return <form onSubmit={this._onSubmit}>
            <CardContent>
                <Typography gutterBottom className={classes.title} color='textSecondary' variant='h6'>
                    Initial Configuration
                </Typography>
                <TextField fullWidth required className={classes.textField} error={!!error} helperText={helperText} label='Vault Server URL' margin='normal' variant='outlined' onChange={this._onChange}/>
            </CardContent>
            <CardActions className={classes['card-action']}>
                <Button className={classes.button} color='primary' variant='contained' onClick={this._onSubmit}>
                    Next
                </Button>
            </CardActions>
        </form>;
    }
}

Server.propTypes = {
    classes: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    vaultSealStatus: PropTypes.object.isRequired,
    setVaultDomain: PropTypes.func.isRequired
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
        setVaultDomain: (url) => {
            return new Promise((resolve, reject) => {
                dispatch(sessionAction.validateServer(url)).then(() => {
                    localStorageUtil.setItem(localStorageUtil.KEY_NAMES.VAULT_DOMAIN, url);
                    dispatch(sessionAction.setDomain(url));
                    resolve();
                }).catch(reject);
            });
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
        justifyContent: 'flex-end'
    }
});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(Server));
