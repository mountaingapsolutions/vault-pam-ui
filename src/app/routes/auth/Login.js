/* global window */

import {withStyles} from '@material-ui/core/styles';
import {AppBar, Button, CardActions, CardContent, FormControl, FormLabel, Paper, Tab, Tabs, TextField, Typography} from '@material-ui/core';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

import sessionAction from 'app/core/actions/sessionAction';
import localStorageUtil from 'app/util/localStorageUtil';

/**
 * The Vault token validation page.
 */
class Login extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props - Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {
            errors: {},
            password: '',
            tabValue: 0,
            token: '',
            username: ''
        };

        this._onSubmit = this._onSubmit.bind(this);
        this._onTabChange = this._onTabChange.bind(this);
        this._onValueChange = this._onValueChange.bind(this);
    }

    /**
     * Handle for when a value change is triggered.
     *
     * @private
     * @param {SyntheticMouseEvent} event - The event.
     */
    _onValueChange(event) {
        event.preventDefault();
        const {errors} = this.state;
        const fieldName = event.target.name;
        this.setState({
            errors: {
                ...errors,
                form: '',
                [fieldName]: ''
            },
            [fieldName]: event.target.value
        });
    }

    /**
     * Handle for the tab value change.
     *
     * @private
     * @param {SyntheticMouseEvent} event - The event.
     * @param {number} value - The tab index selected.
     */
    _onTabChange(event, value) {
        this.setState({
            errors: {},
            password: '',
            tabValue: value,
            token: '',
            username: ''
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
        const {tabValue, token, username, password} = this.state;
        const errorMessage = 'Please fill out this field.';
        const errors = {};
        let fieldsToValidate;
        let authenticationMap;
        // Collect the errors and field values.
        switch (tabValue) {
            case 0:
                fieldsToValidate = ['token'];
                authenticationMap = {
                    token
                };
                break;
            case 1:
            case 2:
                fieldsToValidate = ['username', 'password'];
                authenticationMap = {
                    authType: tabValue === 1 ? 'userpass' : 'ldap',
                    username,
                    password
                };
                break;
            default:
                fieldsToValidate = [];
        }
        fieldsToValidate.forEach(field => {
            if (!this.state[field]) {
                errors[field] = errorMessage;
            }
        });

        // Check the errors and field values.
        if (Object.keys(errors).some(key => !!errors[key])) {
            this.setState({
                errors
            });
        } else {
            const {authenticate} = this.props;
            authenticate(authenticationMap).then(() => {
                // Redirect!
                window.location.href = '/';
            }).catch(() => {
                const {authUser, vaultLookupSelf} = this.props;
                if (token && vaultLookupSelf.errors) {
                    this.setState({
                        errors: {
                            form: vaultLookupSelf.errors[0]
                        }
                    });
                } else if (username && password && authUser.errors) {
                    this.setState({
                        errors: {
                            form: authUser.errors[0]
                        }
                    });
                }
            });
        }
    }

    /**
     * Returns the corresponding tab content based on its tab value.
     *
     * @private
     * @param {number} tab The tab index selected.
     * @returns {ReactElement}
     */
    _renderTabContent(tab) {
        switch (tab) {
            case 0:
                return this._renderTokenEntry();
            case 1:
            case 2:
                return this._renderUsernamePasswordEntry();
            default:
                return <Typography gutterBottom color='textPrimary' variant='h6'>
                    {`Invalid tab selection: ${tab}`}
                </Typography>;
        }
    }

    /**
     * Renders the tab content for token.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderTokenEntry() {
        const {errors, token} = this.state;
        const {token: tokenError} = errors;
        return <TextField
            required
            className='m-1'
            error={!!tokenError}
            helperText={tokenError}
            label='Token'
            margin='normal'
            name='token'
            type='password'
            value={token}
            variant='outlined'
            onChange={this._onValueChange}/>;
    }

    /**
     * Renders the tab content for username and password.
     *
     * @private
     * @returns {Array<ReactElement>}
     */
    _renderUsernamePasswordEntry() {
        const {errors, password, username} = this.state;
        const {password: passwordError, username: usernameError} = errors;
        return [
            <TextField
                required
                className='m-1'
                error={!!usernameError}
                helperText={usernameError}
                key='username-field'
                label='Username'
                margin='normal'
                name='username'
                value={username}
                variant='outlined'
                onChange={this._onValueChange}/>,
            <TextField
                required
                className='m-1'
                error={!!passwordError}
                helperText={passwordError}
                key='password-field'
                label='Password'
                margin='normal'
                name='password'
                type='password'
                value={password}
                variant='outlined'
                onChange={this._onValueChange}/>
        ];
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
        const {tabValue, errors} = this.state;
        const {form: formError} = errors;
        return <form onSubmit={this._onSubmit}>
            <CardContent>
                <Typography gutterBottom color='textSecondary' variant='h6'>
                    Sign in to Vault
                </Typography>
                <Paper>
                    <AppBar color='default' position='static'>
                        <Tabs value={tabValue} onChange={this._onTabChange}>
                            <Tab label='Token'/>
                            <Tab label='Userpass'/>
                            <Tab label='LDAP'/>
                        </Tabs>
                    </AppBar>
                    <FormControl className={classes.formContainer} component='fieldset' error={!!formError}>
                        <FormLabel className={classes.formLabel} component='legend'>
                            {formError}
                        </FormLabel>
                        <div className={classes.contentContainer}>{
                            this._renderTabContent(tabValue)
                        }</div>
                    </FormControl>
                </Paper>
            </CardContent>
            <CardActions className={classes.cardAction}>
                <Button color='primary' onClick={() => history.push('/auth/server')}>
                    Back
                </Button>
                <Button color='primary' type='submit' variant='contained' onClick={this._onSubmit}>
                    Next
                </Button>
            </CardActions>
        </form>;
    }
}

Login.propTypes = {
    authenticate: PropTypes.func.isRequired,
    authUser: PropTypes.object.isRequired,
    classes: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
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
        /**
         * A facade method to authenticate via by token or by username and password.
         *
         * @param {Object} authenticationMap The authentication object map containing wither a token key or username and password keys.
         * @returns {function} Redux dispatch function.
         */
        authenticate: (authenticationMap) => {
            const {authType, token, username, password} = authenticationMap;
            if (token) {
                localStorageUtil.setItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN, token);
                dispatch(sessionAction.setToken(token));
                return dispatch(sessionAction.validateToken());
            } else if (username && password) {
                localStorageUtil.removeItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN);
                return new Promise((resolve, reject) => {
                    dispatch(sessionAction.authenticateUserPass(username, password, authType)).then((response) => {
                        const {client_token: clientToken} = response.data.auth;
                        localStorageUtil.setItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN, clientToken);
                        dispatch(sessionAction.setToken(clientToken));
                        dispatch(sessionAction.validateToken()).then(resolve).catch(reject);
                    }).catch(reject);
                });
            } else {
                /* eslint-disable no-console */
                console.error('Invalid auth data: ', authenticationMap);
                /* eslint-enable no-console */
                return null;
            }
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
    cardAction: {
        justifyContent: 'space-between'
    },
    contentContainer: {
        display: 'flex',
        flexDirection: 'column'
    },
    formContainer: {
        display: 'flex',
        margin: '24px'
    },
    formLabel: {
        padding: '0 24px'
    }
});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(Login));
