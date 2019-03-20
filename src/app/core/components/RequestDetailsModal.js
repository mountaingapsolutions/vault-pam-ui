import {withStyles} from '@material-ui/core/styles';
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography} from '@material-ui/core';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

/**
 * The secrets key request details modal.
 */
class RequestDetailsModal extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {id, onClose, open} = this.props;
        return <Dialog aria-labelledby={id} open={open} onClose={onClose}>
            <DialogTitle id={id}>
                Request Details
            </DialogTitle>
            <DialogContent>
                <Typography gutterBottom>
                    Cras mattis consectetur purus sit amet fermentum. Cras justo odio, dapibus ac
                    facilisis in, egestas eget quam. Morbi leo risus, porta ac consectetur ac, vestibulum
                    at eros.
                </Typography>
                <Typography gutterBottom>
                    Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Vivamus sagittis
                    lacus vel augue laoreet rutrum faucibus dolor auctor.
                </Typography>
                <Typography gutterBottom>
                    Aenean lacinia bibendum nulla sed consectetur. Praesent commodo cursus magna, vel
                    scelerisque nisl consectetur et. Donec sed odio dui. Donec ullamcorper nulla non metus
                    auctor fringilla.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button color='primary' onClick={onClose}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>;
    }
}

RequestDetailsModal.defaultProps = {
    id: 'request-data-modal',
    open: false
};

RequestDetailsModal.propTypes = {
    id: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool
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
        ...state.localStorageReducer,
        ...state.sessionReducer,
        ...state.kvReducer,
        ...state.userReducer
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
    // TODO - Get request details.
    console.log(dispatch);
    return {};
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(RequestDetailsModal));
