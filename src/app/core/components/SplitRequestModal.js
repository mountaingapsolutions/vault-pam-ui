import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Paper,
    Typography
} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles/index';
import Button from 'app/core/components/common/Button';
import GridCard from 'app/core/components/common/GridCard';


//TODO START - WIRE THE LIST SOURCE TO REDUCER
const splitList = [
    {Shard: 'ead33Dvx.Dea', Recipient: 'Approver 1', Email: 'approver1@gmail.com'},
    {Shard: 'esqwefDvx.Dea', Recipient: 'Approver 2', Email: 'approver2@gmail.com'}
];

const secretRequestInfo = {
    Requester: 'John Doe',
    Type: 'Token',
    Token: '*************'
};
//TODO END

/**
 * Split Request Modal component.
 */
class SplitRequestModal extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props Props to initialize with.
     */
    constructor(props) {
        super(props);
        this._onClick = this._onClick.bind(this);
    }

    /**
     * Handler for when button is clicked.
     *
     * @private
     */
    _onClick() {
        /* eslint-disable no-alert */
        window.alert('button clicked!');
        /* eslint-enable no-alert */
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, onAdd, onClose, open} = this.props;
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                fullWidth={true}
                maxWidth={'md'}
                open={open}>
                <DialogTitle>
                    <Typography color='textSecondary' variant='h6'>
                        Split Secret Request
                    </Typography>
                </DialogTitle>
                <DialogContent className={classes.dialogContent}>
                    <Paper className={classes.paper} elevation={2}>
                        <GridCard items={secretRequestInfo}/>
                        <Divider />
                        <Typography className={classes.alignLeft}>
                            Current Split
                        </Typography>
                        {splitList.map((items, index) => {
                            return <GridCard items={items} key={`${items}-${index}`}/>;
                        })}
                        <div className={classes.alignRight}>
                            <Button variant='text' onClick={onAdd}>Add</Button>
                        </div>
                    </Paper>
                </DialogContent>
                <DialogActions>
                    <Button variant='text' onClick={onClose}>Cancel</Button>
                    <Button onClick={this._onClick}>Apply</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

SplitRequestModal.defaultProps = {
    open: false
};

SplitRequestModal.propTypes = {
    classes: PropTypes.object.isRequired,
    onAdd: PropTypes.func.isRequired,
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
    alignLeft: {
        padding: 10,
        textAlign: 'left'
    },
    alignRight: {
        margin: 10,
        textAlign: 'right'
    },
    dialogContent: {
        flex: 1,
        flexDirection: 'row',
        textAlign: 'center'
    },
    paper: {
        marginTop: 20,
        paddingBottom: 5
    }
});

export default withStyles(_styles)(SplitRequestModal);
