import {
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    List,
    ListItem,
    ListItemText,
    Paper,
    TextField
} from '@material-ui/core';
import {
    AccountCircle,
    Email
} from '@material-ui/icons';
import {withStyles} from '@material-ui/core/styles/index';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import isEmail from 'validator/lib/isEmail';

import userAction from 'app/core/actions/userAction';
import Button from 'app/core/components/common/Button';
import SnackbarContent from 'app/core/components/SnackbarContent';
import {createInProgressSelector} from 'app/util/actionStatusSelector';

/**
 * Settings with Change Password Modal component.
 */
class UserProfileModal extends Component {

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
            loaded: false,
            user: {
                firstName: '',
                lastName: '',
                email: '',
                ...props.userMetadata
            }
        };

        this._mapPropsToState = this._mapPropsToState.bind(this);
        this._handleChange = this._handleChange.bind(this);
        this._updateProfile = this._updateProfile.bind(this);
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
     * Handle for when back button is pressed.
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
     * Handle for when save button is pressed.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _updateProfile(event) {
        event.preventDefault();

        const {onClose, updateUser} = this.props;
        const {user} = this.state;
        const {email, firstName, lastName} = user;
        const errors = {};
        ['email', 'firstName', 'lastName'].forEach((field) => {
            if (!user[field]) {
                errors[field] = 'Please fill out this field.';
            }
        });
        if (email && !isEmail(email)) {
            errors.email = `${email} does not appear to be a valid email.`;
        }
        this.setState({
            errors
        });
        if (Object.values(errors).every((error) => !error)) {
            updateUser({
                firstName,
                lastName,
                email
            }).then(onClose);
        }
    }

    /**
     * Helper method to render profile details card.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderProfileDetails() {
        const {classes, message} = this.props;
        const {errors, user} = this.state;
        const {email, firstName, lastName} = user;
        return (
            <Paper>
                {message && <SnackbarContent message={message} variant='info'/>}
                <List>
                    <ListItem dense>
                        <AccountCircle color='primary' fontSize='large'/>
                        <ListItemText primary={<React.Fragment>
                            <TextField
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
                </List>
            </Paper>
        );
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
            onEnter={this._mapPropsToState}>
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
    inProgress: PropTypes.bool,
    message: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
    updateUser: PropTypes.func.isRequired,
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
        updateUser: (metadata) => {
            return new Promise((resolve, reject) => {
                dispatch(userAction.updateUser(metadata))
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
        inProgress: createInProgressSelector([
            userAction.ACTION_TYPES.GET_USER,
            userAction.ACTION_TYPES.UPDATE_USER
        ])(state.actionStatusReducer),
    };
};

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(UserProfileModal));
