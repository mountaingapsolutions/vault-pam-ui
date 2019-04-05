import {
    Avatar,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    ListSubheader,
    Paper,
    Tooltip,
    Typography
} from '@material-ui/core';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import CheckIcon from '@material-ui/icons/Check';
import ClearIcon from '@material-ui/icons/Clear';
import {withStyles} from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import React, {Component} from 'react';

import Button from 'app/core/components/common/Button';
import {connect} from 'react-redux';

/**
 * Notifications modal.
 */
class NotificationsModal extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, onClose, open, secretsRequests = []} = this.props;
        return <Dialog
            fullWidth
            aria-describedby='notifications-dialog-description'
            aria-labelledby='notifications-dialog-title'
            maxWidth='md'
            open={open}
            onClose={() => onClose(false)}>
            <DialogTitle id='notifications-dialog-title'>Notifications</DialogTitle>
            <DialogContent>
                <List className={classes.listContainer}>
                    <ListSubheader>
                        Pending requests
                    </ListSubheader>
                    {
                        secretsRequests.length > 0 ?
                            secretsRequests.map(requestData => {
                                const {data = {}, request_id: requestId} = requestData.request_info;
                                const {creation_time: creationTime} = requestData.wrap_info;
                                const {request_entity: requestEntity, request_path: requestPath} = data;
                                const requestType = requestData.wrap_info ? 'Control Groups' : 'Standard Request';
                                return <React.Fragment key={requestId}>
                                    <ListItem alignItems='flex-start'>
                                        <ListItemAvatar>
                                            <Avatar>
                                                <AccountCircleIcon/>
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={requestEntity.name}
                                            secondary={
                                                <React.Fragment>
                                                    <Typography
                                                        className={classes.block}
                                                        color='textPrimary'
                                                        component='span'>
                                                        {requestPath}
                                                    </Typography>
                                                    <Typography
                                                        className={classes.block}
                                                        color='textSecondary'
                                                        component='span'>
                                                        {`Requested at ${new Date(creationTime).toLocaleString()} via ${requestType}`}
                                                    </Typography>
                                                </React.Fragment>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <Tooltip aria-label='Approve' title='Approve'>
                                                <IconButton color='primary'>
                                                    <CheckIcon/>
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip aria-label='Reject' title='Reject'>
                                                <IconButton>
                                                    <ClearIcon/>
                                                </IconButton>
                                            </Tooltip>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    <Divider/>
                                </React.Fragment>;
                            })
                            :
                            <Paper className={classes.paper} elevation={2}>
                                <Typography className={classes.paperMessage} color='textSecondary' variant='h5'>
                                    There are no notifications at this time.
                                </Typography>
                            </Paper>
                    }
                </List>
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={() => onClose()}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>;
    }
}

NotificationsModal.defaultProps = {
    open: false
};

NotificationsModal.propTypes = {
    authorizeRequest: PropTypes.func.isRequired,
    classes: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool,
    rejectRequest: PropTypes.func.isRequired,
    secretsRequests: PropTypes.array
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
        ...state.kvReducer
    };
};

/**
 * Returns a map of methods used for dispatching actions to the store.
 *
 * @private
 * @param {function} dispatch Redux dispatch function.
 * @param {Object} ownProps The own component props.
 * @returns {Object}
 */
const _mapDispatchToProps = (dispatch, ownProps) => {
    return {
        authorizeRequest: () => {
            console.warn('dispatch ', dispatch, ownProps);
        },
        rejectRequest: () => {
        }
    };
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @param {Object} theme The theme object.
 * @returns {Object}
 */
const _styles = (theme) => ({
    block: {
        display: 'block',
    },
    listContainer: {
        backgroundColor: theme.palette.background.paper
    },
    paperMessage: {
        padding: 40
    }
});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(NotificationsModal));
