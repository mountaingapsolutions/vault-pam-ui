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

/**
 * List modal class that can be extended.
 *
 * @author Mountain Gap Solutions
 * @copyright ©2019 Mountain Gap Solutions
 */
class ListModal extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
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
                <DialogTitle>{listTitle}</DialogTitle>
                <DialogContent>
                    {Object.keys(items).filter(item => item !== '_meta').map((item, index) => {
                        return (
                            <ListItem dense key={index}>
                                <ListItemText primary={item} secondary={items[item]} />
                                <Button
                                    color='primary'
                                    size='small'
                                    onClick={onClick}>
                                    {buttonTitle}
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
    lineDivider: {
        borderTop: '1px solid gray',
        paddingTop: 10
    }
});

export default withStyles(_styles)(ListModal);
