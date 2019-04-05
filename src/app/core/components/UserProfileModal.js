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
    Paper,
    TextField,
    Typography
} from '@material-ui/core';
import {
    AccountCircle,
    Email,
    VpnKey
} from '@material-ui/icons';
import {withStyles} from '@material-ui/core/styles/index';
import {COLORS} from 'app/core/assets/Styles';
import Button from 'app/core/components/common/Button';

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
            email: null,
            firstName: null,
            isUpdatePending: false,
            lastName: null
        };
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
        const isUserProfileUpdated = user && (user.email !== prevProps.user.email || user.firstName !== prevProps.user.firstName || user.lastName !== prevProps.user.lastName);
        entityId !== prevProps.entityId && getUser(entityId);
        isUserProfileUpdated && this.setState({isUpdatePending: false});
        user && prevProps.user.email !== user.email && this._mapPropsToState();
    }

    /**
     * Handle for when back button is pressed.
     *
     * @private
     * @param {Event} prop The event.
     * @returns {Object}
     */
    _handleChange = prop => event => {
        const {isUpdatePending} = this.state;
        !isUpdatePending && this.setState({isUpdatePending: true});
        this.setState({[prop]: event.target.value});
    };

    /**
     * Helper method to map app state to component state.
     *
     * @private
     */
    _mapPropsToState() {
        const {email, firstName, lastName} = this.props.user;
        this.setState({
            email,
            firstName,
            lastName
        });
    }

    /**
     * Handle for when save button is pressed.
     *
     * @private
     */
    _updateProfile() {
        const {email, firstName, lastName} = this.state;
        const {entityId, updateUser} = this.props;
        const data = {
            entityId,
            email,
            firstName,
            lastName
        };
        updateUser(data);
    }

    /**
     * Helper method to render profile details card.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderProfileDetails() {
        const {classes, user} = this.props;
        const {email, firstName, lastName} = this.state;
        return (
            <Paper className={classes.paperChangePassword}>
                <Grid container>
                    <Grid container>
                        <Grid item className={classes.gridIconItem} xs={1}>
                            <AccountCircle
                                color='primary'
                                fontSize='large'/>
                        </Grid>
                        <Grid item className={classes.gridTextFieldItem} xs={11}>
                            <TextField
                                label='First Name'
                                margin='normal'
                                style={{marginRight: 10}}
                                value={firstName}
                                variant='outlined'
                                onChange={this._handleChange('firstName')}/>
                            <TextField
                                label='Last Name'
                                margin='normal'
                                value={lastName}
                                variant='outlined'
                                onChange={this._handleChange('lastName')}/>
                        </Grid>
                    </Grid>
                    <Grid container>
                        <Grid item className={classes.gridIconItem} xs={1}>
                            <Email
                                color='primary'
                                fontSize='large'/>
                        </Grid>
                        <Grid item className={classes.gridTextFieldItem} xs={11}>
                            <TextField
                                fullWidth
                                label='Email'
                                value={email}
                                variant='outlined'
                                onChange={this._handleChange('email')}/>
                        </Grid>
                    </Grid>
                    <Grid container>
                        <Grid item className={classes.gridIconItem} xs={1}>
                            <VpnKey
                                color='primary'
                                fontSize='large'/>
                        </Grid>
                        <Grid item className={classes.gridTextFieldItem} xs={11}>
                            <TextField
                                disabled
                                fullWidth
                                label='Engine'
                                value={user && user.engine}
                                variant='outlined'/>
                        </Grid>
                    </Grid>
                </Grid>
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
        const {isUpdatePending} = this.state;
        const {classes, onClose, open} = this.props;
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                fullWidth
                classes={{paper: classes.dialogPaper}}
                maxWidth={'sm'}
                open={open}>
                <DialogTitle disableTypography className={classes.title}>
                    <Typography color='textSecondary'>
                        USER PROFILE
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {this._renderProfileDetails()}
                </DialogContent>
                <DialogActions>
                    <Button
                        variant='text'
                        onClick={onClose}>
                        CLOSE
                    </Button>
                    <Button
                        disabled={!isUpdatePending}
                        onClick={this._updateProfile}>
                        SAVE
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
    dialogPaper: {
        minWidth: 400,
        maxWidth: 610
    },
    gridIconItem: {
        alignSelf: 'center',
        textAlign: 'center'
    },
    gridTextFieldItem: {
        padding: 10
    },
    paperChangePassword: {
        marginTop: 10,
        padding: 20
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
