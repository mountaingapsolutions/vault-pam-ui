import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    ListItem,
    ListItemText,
    Paper,
    Typography
} from '@material-ui/core';
import Button from 'app/core/components/Button';
import {withStyles} from '@material-ui/core/styles/index';

/**
 * Generic list modal.
 */
class ListModal extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {buttonTitle, classes, onClick, onClose, open, items, listTitle} = this.props;
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                fullWidth={true}
                maxWidth={'sm'}
                open={open}>
                <DialogTitle disableTypography>
                    <Typography color='textSecondary' variant='h6'>
                        {listTitle}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Paper className={classes.paper} elevation={2}>
                        {Object.keys(items).map((item, index) => {
                            return (
                                <ListItem dense divider key={index}>
                                    <ListItemText primary={item} secondary={items[item]} />
                                    <Button
                                        variant='text'
                                        onClick={onClick}>
                                        {buttonTitle}
                                    </Button>
                                </ListItem>
                            );
                        })}
                    </Paper>
                </DialogContent>
                <DialogActions>
                    <Button
                        className={classes.button}
                        onClick={onClose}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

ListModal.defaultProps = {
    open: false
};

ListModal.propTypes = {
    buttonTitle: PropTypes.string.isRequired,
    classes: PropTypes.object.isRequired,
    items: PropTypes.object.isRequired,
    listTitle: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
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
    button: {
        marginTop: 20
    },
    paper: {
        margin: 10
    }
});

export default withStyles(_styles)(ListModal);