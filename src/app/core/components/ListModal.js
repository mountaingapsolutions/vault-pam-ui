import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
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
     * Helper method to render content.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderContent() {
        const {classes, buttonTitle, items, onClick, primaryTextPropName, secondaryTextPropName} = this.props;
        return <Paper className={classes.paper} elevation={2}>
            {Object.keys(items).map((item, index) => {
                const data = items[item];
                const primary = primaryTextPropName ? data[primaryTextPropName] : item;
                const secondary = typeof data === 'object' ? secondaryTextPropName ? data[secondaryTextPropName] : data[Object.keys(data)[0]] : data;
                return (
                    <ListItem dense divider key={index}>
                        <ListItemText primary={primary} secondary={secondary} />
                        <Button
                            variant='text'
                            onClick={() => onClick(data)}>
                            {buttonTitle}
                        </Button>
                    </ListItem>
                );})}
        </Paper>;
    }

    /**
     * Helper method to render loading indicator.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderLoader() {
        const {classes} = this.props;
        return <Grid container justify='center'>
            <Grid item>
                <CircularProgress className={classes.loader}/>
            </Grid>
        </Grid>;
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, onClose, open, isLoading, listTitle} = this.props;
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
                    {isLoading ? this._renderLoader() : this._renderContent()}
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
    isLoading: false,
    items: {},
    open: false
};

ListModal.propTypes = {
    buttonTitle: PropTypes.string.isRequired,
    classes: PropTypes.object.isRequired,
    isLoading: PropTypes.bool.isRequired,
    items: PropTypes.object.isRequired,
    listTitle: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
    primaryTextPropName: PropTypes.string,
    secondaryTextPropName: PropTypes.string
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
