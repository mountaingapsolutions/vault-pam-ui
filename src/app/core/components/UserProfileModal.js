import {
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    InputAdornment,
    Link,
    List,
    ListItem,
    ListItemText,
    Paper,
    TextField
} from '@material-ui/core';
import {
    AccountCircle,
    Email,
    ExpandLess,
    ExpandMore,
    Lock,
    Visibility,
    VisibilityOff
} from '@material-ui/icons';
import {withStyles} from '@material-ui/core/styles/index';
import md5 from 'md5';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import isEmail from 'validator/lib/isEmail';

import userAction from 'app/core/actions/userAction';
import Button from 'app/core/components/Button';
import SnackbarContent from 'app/core/components/SnackbarContent';
import {createErrorsSelector, createInProgressSelector} from 'app/util/actionStatusSelector';

/**
 * Settings with Change Password Modal component.
 */
class UserProfileModal extends Component {

    _defaultState = {
        errors: {},
        loaded: false,
        password: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            showCurrentPassword: false,
            showNewPassword: false,
            showConfirmPassword: false,
            open: false
        },
        user: {
            firstName: '',
            lastName: '',
            email: ''
        },
        useDefaultImage: false
    };

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {
            ...this._defaultState
        };

        this._mapPropsToState = this._mapPropsToState.bind(this);
        this._handleChange = this._handleChange.bind(this);
        this._handleChangePassword = this._handleChangePassword.bind(this);
        this._resetState = this._resetState.bind(this);
        this._togglePasswordVisibility = this._togglePasswordVisibility.bind(this);
        this._updateProfile = this._updateProfile.bind(this);
        this._handleTogglePassword = this._handleTogglePassword.bind(this);

    }

    /**
     * Maps user metadata from props to state.
     *
     * @private
     */
    _mapPropsToState() {
        const {userMetadata} = this.props;
        const {user} = this.state;
        this.setState({
            user: {
                ...user,
                ...userMetadata
            }
        });
    }

    /**
     * Handle for user field updates.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _handleChange(event) {
        const {name, value} = event.target;
        const {errors, user} = this.state;
        this.setState({
            errors: {
                ...errors,
                [name]: ''
            },
            user: {
                ...user,
                [name]: value
            }
        });
    }

    /**
     * Handle for password field updates.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _handleChangePassword(event) {
        const {name, value} = event.target;
        const {errors, password} = this.state;
        const updatedErrors = {
            ...errors,
            [name]: ''
        };
        if (name === 'newPassword' || name === 'confirmPassword') {
            updatedErrors.newPassword = updatedErrors.confirmPassword = '';
        } else {
            updatedErrors.currentPassword = '';
        }
        this.setState({
            errors: updatedErrors,
            password: {
                ...password,
                [name]: value
            }
        });
    }

    /**
     * Resets the internal state.
     *
     * @private
     */
    _resetState() {
        this.setState({
            ...this._defaultState
        });
    }

    /**
     * Handle for toggling the password masking.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _togglePasswordVisibility(event) {
        event.stopPropagation();
        const {name} = event.currentTarget;
        const ariaLabel = event.currentTarget.getAttribute('aria-label');
        this.setState({
            password: {
                ...this.state.password,
                [name]: ariaLabel.startsWith('Show')
            }
        });
    }

    /**
     * Handle for when save button is pressed.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _updateProfile(event) {
        event.preventDefault();

        const {onClose, updateUser} = this.props;
        const {password, user} = this.state;
        const {email, firstName, lastName} = user;
        const {currentPassword, newPassword, confirmPassword} = password;
        const errors = {};
        // Validate required fields.
        ['email', 'firstName', 'lastName'].forEach((field) => {
            if (!user[field]) {
                errors[field] = 'Please fill out this field.';
            }
        });
        // Validate email.
        if (email && !isEmail(email)) {
            errors.email = `${email} does not appear to be a valid email.`;
        }
        // Validate password.
        if (currentPassword) {
            ['newPassword', 'confirmPassword'].forEach((field) => {
                if (!password[field]) {
                    errors[field] = 'Please fill out this field.';
                }
            });
            if (newPassword !== confirmPassword) {
                errors.newPassword = errors.confirmPassword = 'Your new password and confirmation password do not match.';
            }
        }
        this.setState({
            errors
        });
        if (Object.values(errors).every((error) => !error)) {
            updateUser({
                firstName,
                lastName,
                email,
                password: currentPassword,
                newPassword
            }).then(onClose);
        }
    }

    /**
     * Handle for when collapsing password list.
     *
     * @private
     */
    _handleTogglePassword() {
        const {password} = this.state;
        this.setState({
            password: {
                open: !password.open
            }
        });
    }

    /**
     * Helper method to render profile details card.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderProfileDetails() {
        const {classes, message} = this.props;
        const {errors, password, user} = this.state;
        const {email, firstName, lastName} = user;
        const {currentPassword, newPassword, confirmPassword, open, showCurrentPassword, showNewPassword, showConfirmPassword} = password;
        return (
            <Paper>
                {message && <SnackbarContent message={message} variant='info'/>}
                <List>
                    <ListItem dense>
                        {this._renderProfileIcon()}
                        <ListItemText primary={<React.Fragment>
                            <TextField
                                autoFocus
                                required
                                className={`${classes.inlineNameFields} ${classes.paddingRight}`}
                                error={!!errors.firstName}
                                helperText={errors.firstName}
                                label='First Name'
                                margin='normal'
                                name='firstName'
                                value={firstName}
                                variant='outlined'
                                onChange={this._handleChange}/>
                            <TextField
                                required
                                className={classes.inlineNameFields}
                                error={!!errors.lastName}
                                helperText={errors.lastName}
                                label='Last Name'
                                margin='normal'
                                name='lastName'
                                value={lastName}
                                variant='outlined'
                                onChange={this._handleChange}/>
                            <Link href='https://en.gravatar.com/emails' rel='noopener noreferrer' style={{marginTop: '8px'}} target='_blank' title='Change your Gravatar'>
                                Change your Gravatar</Link>
                        </React.Fragment>}/>
                    </ListItem>
                    <ListItem dense>
                        <Email color='primary' fontSize='large'/>
                        <ListItemText primary={
                            <TextField
                                fullWidth
                                required
                                error={!!errors.email}
                                helperText={errors.email}
                                label='Email'
                                name='email'
                                value={email}
                                variant='outlined'
                                onChange={this._handleChange}/>}/>
                    </ListItem>
                    <ListItem button className={classes.passwordItem} onClick={this._handleTogglePassword}>
                        <Lock className={classes.passwordIcon} color='primary' fontSize='large'/>
                        <ListItemText primary="Change Password"/>
                        {open ? <ExpandLess /> : <ExpandMore />}
                    </ListItem>
                    <Collapse unmountOnExit in={open} timeout="auto">
                        <ListItem dense>
                            <ListItemText primary={
                                <React.Fragment>
                                    <TextField
                                        fullWidth
                                        autoComplete='current-password'
                                        className={classes.passwordPadding}
                                        error={!!errors.currentPassword}
                                        helperText={errors.currentPassword}
                                        InputProps={{
                                            endAdornment: <InputAdornment position='end'>
                                                <IconButton
                                                    aria-label={`${showCurrentPassword ? 'Hide' : 'Show'} current password`}
                                                    className={classes.iconButton}
                                                    name='showCurrentPassword'
                                                    onClickCapture={this._togglePasswordVisibility}>
                                                    {showCurrentPassword ? <VisibilityOff/> : <Visibility/>}
                                                </IconButton>
                                            </InputAdornment>
                                        }}
                                        label='Current password'
                                        name='currentPassword'
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        variant='outlined'
                                        onChange={this._handleChangePassword}/>
                                    <TextField
                                        fullWidth
                                        autoComplete='new-password'
                                        className={classes.passwordPadding}
                                        disabled={!password.currentPassword}
                                        error={!!errors.newPassword}
                                        helperText={errors.newPassword}
                                        InputProps={{
                                            endAdornment: <InputAdornment position='end'>
                                                <IconButton
                                                    aria-label={`${showNewPassword ? 'Hide' : 'Show'} new password`}
                                                    className={classes.iconButton}
                                                    disabled={!password.currentPassword}
                                                    name='showNewPassword'
                                                    onClickCapture={this._togglePasswordVisibility}>
                                                    {showNewPassword ? <VisibilityOff/> : <Visibility/>}
                                                </IconButton>
                                            </InputAdornment>
                                        }}
                                        label='New password'
                                        name='newPassword'
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        variant='outlined'
                                        onChange={this._handleChangePassword}/>
                                    <TextField
                                        fullWidth
                                        autoComplete='new-password'
                                        className={classes.passwordPadding}
                                        disabled={!password.currentPassword}
                                        error={!!errors.confirmPassword}
                                        helperText={errors.confirmPassword}
                                        InputProps={{
                                            endAdornment: <InputAdornment position='end'>
                                                <IconButton
                                                    aria-label={`${showConfirmPassword ? 'Hide' : 'Show'} confirm password`}
                                                    className={classes.iconButton}
                                                    disabled={!password.currentPassword}
                                                    name='showConfirmPassword'
                                                    onClickCapture={this._togglePasswordVisibility}>
                                                    {showConfirmPassword ? <VisibilityOff/> : <Visibility/>}
                                                </IconButton>
                                            </InputAdornment>
                                        }}
                                        label='Confirm new password'
                                        name='confirmPassword'
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        variant='outlined'
                                        onChange={this._handleChangePassword}/>
                                </React.Fragment>}/>
                        </ListItem>
                    </Collapse>
                </List>
            </Paper>
        );
    }

    /**
     * Renders the profile image element.
     *
     * @private
     * @returns {Element}
     */
    _renderProfileIcon() {
        const {useDefaultImage} = this.state;
        const {userMetadata = {}} = this.props;
        const {email} = userMetadata;
        let element;
        if (useDefaultImage || !email) {
            element = <AccountCircle color='primary' fontSize='large'/>;
        } else {
            element = <img alt='profile' src={`//www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?s=35&d=404`} onError={() => {
                this.setState({
                    useDefaultImage: true
                });
            }}/>;
        }
        return <a href='https://en.gravatar.com/emails' rel='noopener noreferrer' style={{marginTop: '8px'}} target='_blank' title='Change your Gravatar'>{element}</a>;
    }

    /**
     * Required React Component lifecycle method. Invoked right before calling the render method, both on the initial mount and on subsequent updates.
     *
     * @protected
     * @override
     * @param {Object} props - Next set of updated props.
     * @param {Object} state - The current state.
     * @returns {Object}
     */
    static getDerivedStateFromProps(props, state) {
        const {dismissUpdateUserError, updateUserError} = props;
        if (updateUserError && updateUserError.indexOf('password') > 0) {
            // Can immediately clear out the error in props since it will get set in state.
            dismissUpdateUserError();
            return {
                errors: {
                    ...state.errors,
                    currentPassword: updateUserError
                }
            };
        }
        return null;
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @protected
     * @override
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, closeable, inProgress, onClose, open} = this.props;
        return <Dialog
            fullWidth
            aria-labelledby='modal-title'
            classes={{paper: classes.dialogPaper}}
            maxWidth={'sm'}
            open={open}
            onClose={closeable ? onClose : null}
            onEnter={this._mapPropsToState}
            onExit={this._resetState}>
            <form onSubmit={this._updateProfile}>
                <DialogTitle id='modal-title'>
                    Edit User Profile
                </DialogTitle>
                <DialogContent>
                    {inProgress ?
                        <Grid container justify='center'>
                            <Grid item>
                                <CircularProgress className={classes.loader}/>
                            </Grid>
                        </Grid>
                        :
                        this._renderProfileDetails()
                    }
                </DialogContent>
                <DialogActions>
                    {closeable && <Button variant='text' onClick={onClose}>
                        Close
                    </Button>}
                    <Button disabled={inProgress} type='submit' onClick={this._updateProfile}>
                        Save
                    </Button>
                </DialogActions>
            </form>
        </Dialog>;
    }
}

UserProfileModal.defaultProps = {
    closeable: true
};

UserProfileModal.propTypes = {
    classes: PropTypes.object.isRequired,
    closeable: PropTypes.bool,
    dismissUpdateUserError: PropTypes.func.isRequired,
    inProgress: PropTypes.bool,
    message: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
    updateUser: PropTypes.func.isRequired,
    updateUserError: PropTypes.string,
    userMetadata: PropTypes.object,
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @param {Object} theme The theme object.
 * @returns {Object}
 */
const _styles = (theme) => ({
    iconItem: {
        verticalAlign: 'top'
    },
    inlineNameFields: {
        boxSizing: 'border-box',
        width: '50%'
    },
    loader: {
        margin: 50
    },
    paddingRight: {
        paddingRight: theme.spacing.unit
    },
    paperChangePassword: {
        marginTop: 10,
        padding: 20
    },
    passwordItem: {
        verticalAlign: 'center'
    },
    passwordIcon: {
        paddingTop: theme.spacing.unit
    },
    passwordPadding: {
        padding: theme.spacing.unit
    }
});

/**
 * Returns a map of methods used for dispatching actions to the store.
 *
 * @private
 * @param {function} dispatch Redux dispatch function.
 * @param {Object} props components props.
 * @returns {Object}
 */
const _mapDispatchToProps = (dispatch) => {
    return {
        dismissUpdateUserError: () => {
            return new Promise((resolve) => {
                dispatch({
                    type: userAction.ACTION_TYPES.UPDATE_USER
                });
                resolve();
            });
        },
        updateUser: (userData) => {
            return new Promise((resolve, reject) => {
                const {firstName, lastName, email, test, password, newPassword} = userData;
                dispatch(userAction.updateUser({
                    password,
                    newPassword,
                    metadata: {
                        firstName,
                        lastName,
                        email,
                        test
                    }
                }))
                    .then(() => {
                        dispatch(userAction.getUser())
                            .then(resolve)
                            .catch(reject);
                    })
                    .catch(reject);
            });
        }
    };
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
        userMetadata: {
            ...((state.userReducer.user || {}).data || {}).metadata || {}
        },
        updateUserError: createErrorsSelector([
            userAction.ACTION_TYPES.UPDATE_USER
        ])(state.actionStatusReducer),
        inProgress: createInProgressSelector([
            userAction.ACTION_TYPES.GET_USER,
            userAction.ACTION_TYPES.UPDATE_USER
        ])(state.actionStatusReducer),
    };
};

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(UserProfileModal));
