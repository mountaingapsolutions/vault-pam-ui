import {IconButton, SnackbarContent as MuiSnackbarContent} from '@material-ui/core';
import {amber, green} from '@material-ui/core/colors';
import {CheckCircle, Close, Error, Info, Warning} from '@material-ui/icons';
import {withStyles} from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import React, {Component} from 'react';

const variantIcon = {
    success: CheckCircle,
    warning: Warning,
    error: Error,
    info: Info,
};

/**
 * Base snackbar content component.
 */
class SnackbarContent extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, message, onClose, variant} = this.props;
        const id = `snackbar-${variant}-content`;
        const Icon = variantIcon[variant];
        return <MuiSnackbarContent
            action={onClose && [
                <IconButton aria-label='close' color='inherit' key='close' onClick={onClose}>
                    <Close/>
                </IconButton>,
            ]}
            aria-describedby={id}
            className={`${classes.root} ${classes[variant]}`}
            message={
                <span className={classes.message} id={id}>
                    <Icon className={classes.icon}/> {message}
                </span>
            }
        />;
    }
}

SnackbarContent.propTypes = {
    classes: PropTypes.object.isRequired,
    message: PropTypes.string.isRequired,
    onClose: PropTypes.func,
    variant: PropTypes.oneOf(['success', 'warning', 'error', 'info']).isRequired
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @param {Object} theme The theme object.
 * @returns {Object}
 */
const _styles = (theme) => ({
    root: {
        maxWidth: 'inherit',
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1)
    },
    success: {
        backgroundColor: green[600],
    },
    error: {
        backgroundColor: theme.palette.error.dark,
    },
    info: {
        backgroundColor: theme.palette.primary.dark,
    },
    warning: {
        backgroundColor: amber[700],
    },
    icon: {
        marginRight: theme.spacing(1)
    },
    message: {
        display: 'flex',
        alignItems: 'center',
    }
});

export default withStyles(_styles)(SnackbarContent);
