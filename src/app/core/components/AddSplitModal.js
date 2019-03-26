import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Paper,
    TextField,
    Typography
} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles/index';
import Button from 'app/core/components/common/Button';

//TODO - WIRE DATA SOURCE TO REDUCER
const GROUP_MEMBERS = [
    {
        id: '123456',
        name: 'John Smith',
        email: 'john_smith@gmail.com'
    },
    {
        id: '542355',
        name: 'Thoman A. Anderson',
        email: 'thomas_anderson@gmail.com'
    }
];

/**
 * Add Split Modal component.
 */
class AddSplitModal extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props - Props to initialize with.
     */
    constructor(props) {
        super(props);
        this.state = {
            selectedControlGroupMember: '',
            controlGroupMemberEmail: ''
        };
        this._handleChange = this._handleChange.bind(this);
    }

    /**
     * Handle for when item select is changed.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _handleChange(event) {
        this.setState({
            selectedControlGroupMember: event.target.value,
            controlGroupMemberEmail: event.target.value});
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {classes, onClose, open} = this.props;
        const {controlGroupMemberEmail, selectedControlGroupMember} = this.state;
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                defaultValue='Default Value'
                fullWidth={true}
                maxWidth={'sm'}
                open={open}>
                <DialogTitle disableTypography>
                    <Typography color='textSecondary' variant='h6'>
                        Add Split
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Paper className={classes.paper} elevation={2}>
                        <TextField
                            fullWidth
                            select
                            helperText='Please select from Control Group'
                            label='Recipient'
                            margin='normal'
                            SelectProps={{
                                MenuProps: {
                                    className: classes.menu
                                },
                            }}
                            value={selectedControlGroupMember}
                            variant='outlined'
                            onChange={this._handleChange}>
                            {GROUP_MEMBERS.map(option =>
                                <MenuItem key={option.id} value={option.email}>
                                    {option.name}
                                </MenuItem>
                            )}
                        </TextField>
                        <TextField
                            disabled
                            fullWidth
                            className={classes.textField}
                            id='standard-disabled'
                            label='Email'
                            margin='normal'
                            value={controlGroupMemberEmail}
                            variant='outlined'/>
                    </Paper>
                </DialogContent>
                <DialogActions>
                    <Button
                        className={classes.button}
                        variant='text'
                        onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        className={classes.button}>
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

AddSplitModal.propTypes = {
    classes: PropTypes.object.isRequired,
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({
    paper: {
        padding: 10,
        marginTop: 10
    }
});

export default withStyles(_styles)(AddSplitModal);
