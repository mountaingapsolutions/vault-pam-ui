import PropTypes from 'prop-types';
import React, {Component} from 'react';
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

//TODO - WIRE THE DATA SOURCE TO REDUCER
const userInfo = {
    name: 'John Doe',
    email: 'john_doe@gmail.com',
    password: '*************'
};

/**
 * Settings with Change Password Modal component.
 */
class SettingsModal extends Component {

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
            isChangePasswordOnDisplay: false,
            newPassword: '',
            showPassword: false
        };
        this._onCloseOpenChangePassword = this._onCloseOpenChangePassword.bind(this);
        this._onHideShowPassword = this._onHideShowPassword.bind(this);
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
                            variant='text'
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
            <Button variant='text' onClick={this._onCloseOpenChangePassword}>
                CHANGE PASSWORD
            </Button>
        </div>;
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
        const {isChangePasswordOnDisplay} = this.state;
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                maxWidth={'md'}
                open={open}>
                <DialogTitle disableTypography className={classes.title}>
                    <Typography color='textSecondary'>
                        SETTINGS
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Paper className={classes.paperChangePassword}>
                        <Typography className={classes.alignLeft} color='primary'>
                            USER DETAILS:
                        </Typography>
                        <GridTextField items={userInfo} margin='normal'/>
                    </Paper>
                    {isChangePasswordOnDisplay ?
                        this._renderChangePassword() :
                        this._renderChangePasswordButton()}
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

SettingsModal.propTypes = {
    classes: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired
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
        textAlign: 'left'
    },
    buttonCancel: {
        color: COLORS.ERROR_RED
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
        paddingRight: 10
    },
    title: {
        backgroundColor: COLORS.LIGHT_GREY
    }
});

export default withStyles(_styles)(SettingsModal);
