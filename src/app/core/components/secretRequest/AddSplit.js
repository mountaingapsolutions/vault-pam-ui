import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {
    MenuItem,
    Paper,
    Typography,
    TextField
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
 * Add Split component.
 */
class AddSplit extends Component {

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
        const {classes, onCancelAddSplit} = this.props;
        const {controlGroupMemberEmail, selectedControlGroupMember} = this.state;
        return (
            <Paper className={classes.paper} elevation={2}>
                <Typography className={classes.alignLeft} color='primary'>
                    ADD SPLIT
                </Typography>
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
                <div className={classes.alignRight}>
                    <Button variant='text' onClick={onCancelAddSplit}>
                        CANCEL
                    </Button>
                    <Button>
                        SAVE
                    </Button>
                </div>
            </Paper>
        );
    }
}

AddSplit.propTypes = {
    classes: PropTypes.object.isRequired,
    onCancelAddSplit: PropTypes.func.isRequired
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
    paper: {
        marginTop: 10,
        padding: 10
    }
});

export default withStyles(_styles)(AddSplit);
