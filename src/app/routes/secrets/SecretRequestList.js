import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    ListItem,
    ListItemText
} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles/index';

//TODO - WIRE THE LIST SOURCE TO REDUCER
const REQUEST_LIST = [
    {secret: '/secret/Request 1', requestor: 'John Ho'},
    {secret: '/secret/Request 2', requestor: 'Jerry Lam'},
    {secret: '/secret/Request 3', requestor: 'Jay Ramirez'},
    {secret: '/secret/Request 4', requestor: 'Russell de Castro'},
    {secret: '/secret/Request 5', requestor: 'Aldo'},
    {secret: '/secret/Request 6', requestor: 'Hakan'},
    {secret: '/secret/Request 7', requestor: 'Jane Doe'},
    {secret: '/secret/Request 8', requestor: 'John Doe'}
];

/**
 * The Secret Request container.
 */
class SecretRequestList extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {classes} = this.props;
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                fullWidth={true}
                maxWidth={'sm'}
                open={this.props.open}>
                <DialogTitle>Request Queue</DialogTitle>
                <DialogContent>
                    {REQUEST_LIST.map((item, index) => {
                        return (
                            <ListItem dense key={index}>
                                <ListItemText primary={item.secret} secondary={item.requestor} />
                                <Button
                                    color='primary'
                                    size='small'>
                                    DETAILS
                                </Button>
                            </ListItem>
                        );
                    })}
                </DialogContent>
                <DialogActions className={classes.lineDivider}>
                    <Button
                        className={classes.button}
                        color='primary'
                        size='small'
                        variant='contained'
                        onClick={this.props.onClose}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

SecretRequestList.propTypes = {
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
    lineDivider: {
        borderTop: '1px solid gray',
        paddingTop: 10
    }
});

export default withStyles(_styles)(SecretRequestList);
