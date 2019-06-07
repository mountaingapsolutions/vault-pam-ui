/* global window */

import {withStyles} from '@material-ui/core/styles';
import {AppBar, CardActions, CardContent, CircularProgress, FormControl, FormLabel, Grid, Modal, Paper, Tab, Tabs, TextField, Typography} from '@material-ui/core';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

import sessionAction from 'app/core/actions/sessionAction';
import localStorageUtil from 'app/util/localStorageUtil';
import constants from 'app/util/constants';

import Button from 'app/core/components/Button';
import Footer from 'app/core/components/Footer';
import {createInProgressSelector} from 'app/util/actionStatusSelector';

/**
 * The Vault token validation page.
 */
class Login extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props Props to initialize with.
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
     * @param {SyntheticMouseEvent} event The event.
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
     * @param {SyntheticMouseEvent} event The event.
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
     * @param {SyntheticMouseEvent} event The event.
     */
    _onSubmit(event) {
        event.preventDefault();
        const {tabValue, token, username, password} = this.state;
        const errorMessage = 'Please fill out this field.';
        const errors = {};
        let fieldsToValidate;
        let authenticationMap;
        const authMethod = constants.AUTH_METHODS[tabValue].type || 'token';
        // Collect the errors and field values.
        switch (authMethod) {
            case 'token':
            case 'github':
                fieldsToValidate = ['token'];
                authenticationMap = {
                    authMethod,
                    token
                };
                break;
            case 'userpass':
            case 'ldap':
            case 'okta':
                fieldsToValidate = ['username', 'password'];
                authenticationMap = {
                    authMethod,
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
                const {vaultLookupSelf} = this.props;
                if (vaultLookupSelf.errors) {
                    this.setState({
                        errors: {
                            form: vaultLookupSelf.errors[0]
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
     * @returns {React.ReactElement}
     */
    _renderTabContent(tab) {
        switch (constants.AUTH_METHODS[tab].type) {
            case 'token':
            case 'github':
                return this._renderTokenEntry();
            case 'userpass':
            case 'ldap':
            case 'okta':
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
     * @returns {React.ReactElement}
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
     * @returns {React.ReactElement}
     */
    _renderUsernamePasswordEntry() {
        const {errors, password, username} = this.state;
        const {password: passwordError, username: usernameError} = errors;
        return <React.Fragment>
            <TextField
                required
                className='m-1'
                error={!!usernameError}
                helperText={usernameError}
                key='username'
                label='Username'
                margin='normal'
                name='username'
                value={username}
                variant='outlined'
                onChange={this._onValueChange}/>
            <TextField
                required
                className='m-1'
                error={!!passwordError}
                helperText={passwordError}
                label='Password'
                margin='normal'
                name='password'
                type='password'
                value={password}
                variant='outlined'
                onChange={this._onValueChange}/>
        </React.Fragment>;
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, history, inProgress} = this.props;
        const {tabValue, errors} = this.state;
        const {form: formError} = errors;
        return <form onSubmit={this._onSubmit}>
            <Modal open={inProgress}>
                <Grid container justify='center'>
                    <Grid item>
                        <CircularProgress className={classes.loader}/>
                    </Grid>
                </Grid>
            </Modal>
            <CardContent>
                <Typography gutterBottom color='textSecondary' variant='h6'>
                    Sign in to Vault
                </Typography>
                <Paper>
                    <AppBar color='default' position='static'>
                        <Tabs value={tabValue} onChange={this._onTabChange}>
                            {constants.AUTH_METHODS.map((method, index) => {
                                return <Tab key={`${index}-${method}`} label={method.label}/>;
                            })}
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
                <Button variant='text' onClick={() => history.push('/auth/server')}>
                    Back
                </Button>
                <Button type='submit' onClick={this._onSubmit}>
                    Next
                </Button>
            </CardActions>
            <Footer/>
        </form>;
    }
}

Login.propTypes = {
    authenticate: PropTypes.func.isRequired,
    classes: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    inProgress: PropTypes.bool,
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
    const actionsUsed = [
        sessionAction.ACTION_TYPES.LOGIN
    ];
    return {
        ...state.sessionReducer,
        inProgress: createInProgressSelector(actionsUsed)(state.actionStatusReducer)
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
            return new Promise((resolve, reject) => {
                dispatch(sessionAction.login(authenticationMap)).then((response) => {
                    const {id: clientToken} = (response.data || {}).data;
                    if (clientToken) {
                        localStorageUtil.setItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN, clientToken);
                        dispatch(sessionAction.setToken(clientToken));

                        resolve();
                    } else {
                        reject();
                    }
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
    fieldLabel: {
        backgroundColor: 'white'
    },
    formLabel: {
        padding: '0 24px'
    },
    loader: {
        color: 'white',
        position: 'absolute',
        top: 200
    }
});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(Login));
