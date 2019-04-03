import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import userAction from 'app/core/actions/userAction';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    Grow,
    IconButton,
    Paper,
    TextField,
    Typography
} from '@material-ui/core';
import {
    Visibility,
    VisibilityOff
} from '@material-ui/icons';
import {withStyles} from '@material-ui/core/styles/index';
import {COLORS} from 'app/core/assets/Styles';
import Button from 'app/core/components/common/Button';
import GridTextField from 'app/core/components/common/GridTextField';

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
            confirmPassword: '',
            email: '',
            firstName: '',
            isChangePasswordOnDisplay: false,
            isEditProfileOnDisplay: false,
            lastName: '',
            newPassword: '',
            showPassword: false
        };
        this._onCloseOpenChangePassword = this._onCloseOpenChangePassword.bind(this);
        this._onCloseOpenEditProfile = this._onCloseOpenEditProfile.bind(this);
        this._onHideShowPassword = this._onHideShowPassword.bind(this);
        this._updateProfile = this._updateProfile.bind(this);
    }

    /**
     * Required React Component lifecycle method. Invoked when a component did update. This method is not called for the initial render.
     *
     * @protected
     * @override
     * @param {Object} prevProps - previous set of props.
     */
    componentDidUpdate(prevProps) {
        const {entityId, getUser, user} = this.props;
        const isUserProfileUpdated = user.Email !== prevProps.user.Email || user.Name !== prevProps.user.Name;
        entityId !== prevProps.entityId && getUser(entityId);
        isUserProfileUpdated && this.setState({isEditProfileOnDisplay: false});
    }

    /**
     * Handle for when change password and cancel is pressed.
     *
     * @private
     */
    _onCloseOpenChangePassword() {
        this.setState({isChangePasswordOnDisplay: !this.state.isChangePasswordOnDisplay});
    }

    /**
     * Handle for when edit and cancel edit is pressed.
     *
     * @private
     */
    _onCloseOpenEditProfile() {
        this.setState({isEditProfileOnDisplay: !this.state.isEditProfileOnDisplay});
    }

    /**
     * Handle for when back button is pressed.
     *
     * @private
     * @param {Event} prop The event.
     * @returns {Object}
     */
    _handleChange = prop => event => {
        this.setState({[prop]: event.target.value});
    };

    /**
     * Handle for when hide/show password is pressed.
     *
     * @private
     */
    _onHideShowPassword() {
        this.setState({showPassword: !this.state.showPassword});
    }

    /**
     * Handle for when save button is pressed.
     *
     * @private
     */
    _updateProfile() {
        const {email, firstName, lastName} = this.state;
        const {entityId, updateUser} = this.props;
        if (email !== '' && firstName !== '' && lastName !== '') {
            const data = {
                entityId,
                email,
                firstName,
                lastName
            };
            updateUser(data);
        } else {
            //TODO add custom alert dialog box?
            alert('Please complete the information.');// eslint-disable-line no-alert
        }
    }

    /**
     * Helper method to render change password card.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderChangePassword() {
        const {classes} = this.props;
        const {confirmPassword, newPassword, showPassword} = this.state;
        return (
            <Grow in={true}>
                <Paper className={classes.paperChangePassword}>
                    <Typography className={classes.cardTitle} color='primary'>
                        CHANGE PASSWORD:
                    </Typography>
                    <Grid container justify='center' spacing={8}>
                        <Grid item>
                            <TextField
                                className={classes.textField}
                                InputProps={{classes: {input: classes.textField}}}
                                label='New Password'
                                margin='none'
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                variant='outlined'
                                onChange={this._handleChange('newPassword')}/>
                        </Grid>
                        <Grid item>
                            <TextField
                                className={classes.textField}
                                InputProps={{classes: {input: classes.textField}}}
                                label='Confirm Password'
                                margin='none'
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                variant='outlined'
                                onChange={this._handleChange('confirmPassword')}/>
                        </Grid>
                        <Grid item>
                            <IconButton
                                onClick={this._onHideShowPassword}>
                                {showPassword ? <VisibilityOff/> : <Visibility/>}
                            </IconButton>
                        </Grid>
                    </Grid>
                    <div className={classes.buttonsContainer}>
                        <Button variant='text'>
                            APPLY
                        </Button>
                        <Button
                            className={classes.buttonCancel}
                            onClick={this._onCloseOpenChangePassword}>
                            CANCEL
                        </Button>
                    </div>
                </Paper>
            </Grow>
        );
    }

    /**
     * Helper method to render change password button.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderChangePasswordButton() {
        const {classes} = this.props;
        return <div className={classes.alignRight}>
            <Button variant='text' onClick={this._onCloseOpenEditProfile}>
                EDIT
            </Button>
            <Button variant='text' onClick={this._onCloseOpenChangePassword}>
                CHANGE PASSWORD
            </Button>
        </div>;
    }

    /**
     * Helper method to render edit profile card.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderEditProfile() {
        const {classes} = this.props;
        const {email, firstName, lastName} = this.state;
        return (
            <Grow in={true}>
                <Paper className={classes.paperChangePassword}>
                    <Typography className={classes.cardTitle} color='primary'>
                        EDIT PROFILE:
                    </Typography>
                    <Grid container justify='center' spacing={8}>
                        <Grid item>
                            <TextField
                                label='First Name'
                                margin='none'
                                value={firstName}
                                variant='outlined'
                                onChange={this._handleChange('firstName')}/>
                        </Grid>
                        <Grid item>
                            <TextField
                                label='Last Name'
                                margin='none'
                                value={lastName}
                                variant='outlined'
                                onChange={this._handleChange('lastName')}/>
                        </Grid>
                        <Grid item>
                            <TextField
                                label='Email'
                                margin='none'
                                value={email}
                                variant='outlined'
                                onChange={this._handleChange('email')}/>
                        </Grid>
                    </Grid>
                    <div className={classes.buttonsContainer}>
                        <Button
                            variant='text'
                            onClick={this._updateProfile}>
                            SAVE
                        </Button>
                        <Button
                            className={classes.buttonCancel}
                            onClick={this._onCloseOpenEditProfile}>
                            CANCEL
                        </Button>
                    </div>
                </Paper>
            </Grow>
        );
    }

    /**
     * Helper method to render profile details card.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderProfileDetails() {
        const {classes, user} = this.props;
        return (
            <Paper className={classes.paperChangePassword}>
                <Typography className={classes.alignLeft} color='primary'>
                    USER DETAILS:
                </Typography>
                <GridTextField items={user} margin='none'/>
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
        const {classes, onClose, open} = this.props;
        const {isChangePasswordOnDisplay, isEditProfileOnDisplay} = this.state;
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                maxWidth={'md'}
                open={open}>
                <DialogTitle disableTypography className={classes.title}>
                    <Typography color='textSecondary'>
                        USER PROFILE
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {isEditProfileOnDisplay ? this._renderEditProfile() : this._renderProfileDetails()}
                    {isChangePasswordOnDisplay ?
                        this._renderChangePassword() :
                        !isEditProfileOnDisplay && this._renderChangePasswordButton()}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>
                        CLOSE
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

UserProfileModal.defaultProps = {
    entityId: ''
};

UserProfileModal.propTypes = {
    classes: PropTypes.object.isRequired,
    entityId: PropTypes.string.isRequired,
    getUser: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
    updateUser: PropTypes.func.isRequired,
    user: PropTypes.object,
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({
    alignRight: {
        textAlign: 'right'
    },
    alignLeft: {
        paddingBottom: 20,
        textAlign: 'left'
    },
    buttonsContainer: {
        textAlign: 'right',
        marginTop: 10
    },
    cardTitle: {
        textAlign: 'left',
        paddingBottom: 20
    },
    paperChangePassword: {
        marginTop: 10,
        padding: 20,
        textAlign: 'center'
    },
    textField: {
        fontSize: 14,
        padding: 10,
        width: 250
    },
    title: {
        backgroundColor: COLORS.LIGHT_GREY
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
        getUser: entityId => dispatch(userAction.getUser(entityId)),
        updateUser: data => dispatch(userAction.updateUser(data))
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
    const {data} = state.sessionReducer.vaultLookupSelf;
    return {
        user: state.userReducer && state.userReducer.user,
        entityId: data && data.data.entity_id
    };
};

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(UserProfileModal));
