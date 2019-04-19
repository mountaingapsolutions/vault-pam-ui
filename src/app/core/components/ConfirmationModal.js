import {Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import React, {Component} from 'react';

import Button from 'app/core/components/Button';

/**
 * Generic confirmation modal.
 */
class ConfirmationModal extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {cancelButtonLabel, confirmButtonLabel, content, onClose, onExited, open, title} = this.props;
        return <Dialog
            aria-describedby='confirmation-dialog-description'
            aria-labelledby='confirmation-dialog-title'
            open={open}
            onClose={() => onClose(false)}
            onExited={onExited}>
            {title && <DialogTitle id='confirmation-dialog-title'>{title}</DialogTitle>}
            <DialogContent>
                <DialogContentText id='confirmation-dialog-description'>
                    {content}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button variant='text' onClick={() => onClose(false)}>
                    {cancelButtonLabel}
                </Button>
                <Button autoFocus onClick={() => onClose(true)}>
                    {confirmButtonLabel}
                </Button>
            </DialogActions>
        </Dialog>;
    }
}

ConfirmationModal.defaultProps = {
    cancelButtonLabel: 'Cancel',
    confirmButtonLabel: 'Confirm',
    content: 'Are you sure?',
    open: false,
    onClose: () => {},
    onExited: () => {}
};

ConfirmationModal.propTypes = {
    cancelButtonLabel: PropTypes.string,
    classes: PropTypes.object.isRequired,
    confirmButtonLabel: PropTypes.string,
    content: PropTypes.string,
    onClose: PropTypes.func,
    onExited: PropTypes.func,
    open: PropTypes.bool,
    title: PropTypes.string
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({});

export default withStyles(_styles)(ConfirmationModal);
