import {
    Avatar,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
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
import {safeWrap, unwrap} from '@mountaingapsolutions/objectutil';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import kvAction from 'app/core/actions/kvAction';
import Button from 'app/core/components/common/Button';
import {createErrorsSelector, createInProgressSelector} from 'app/util/actionStatusSelector';
import {connect} from 'react-redux';

/**
 * Notifications modal.
 */
class NotificationsModal extends Component {

    /**
     * Renders the authorizations list.
     *
     * @private
     * @param {Array} authorizations The list of authorizations.
     * @returns {React.ReactElement}
     */
    _renderAuthorizations(authorizations) {
        const {classes, vaultLookupSelf} = this.props;
        const {entity_id: entityIdSelf} = unwrap(safeWrap(vaultLookupSelf).data.data) || {};
        // Exclude self from names list. If the user did approve the request, then that user will be listed first.
        const namesList = authorizations.filter((authorization) => authorization.entity_id !== entityIdSelf).map((authorization) => authorization.entity_name);
        const alreadyAuthorizedBySelf = authorizations && authorizations.some((authorization) => authorization.entity_id === entityIdSelf);
        if (alreadyAuthorizedBySelf) {
            namesList.unshift('you');
        }
        return <Typography className={classes.block} color='textSecondary' component='span'>
            Already approved by {namesList.join(', ')}.
        </Typography>;
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {authorizeRequest, classes, inProgress, onClose, open, rejectRequest, secretsRequests = [], vaultLookupSelf} = this.props;
        const {entity_id: entityIdSelf} = unwrap(safeWrap(vaultLookupSelf).data.data) || {};
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
                                const {accessor, creation_time: creationTime} = requestData.wrap_info;
                                const {authorizations, request_entity: requestEntity, request_path: requestPath} = data;
                                const {id: entityId, name: entityName} = requestEntity || {};
                                const requestType = requestData.wrap_info ? 'Control Groups' : 'Standard Request';
                                const alreadyAuthorizedBySelf = authorizations && authorizations.some((authorization) => authorization.entity_id === entityIdSelf);
                                return <React.Fragment key={requestId}>
                                    <ListItem alignItems='flex-start'>
                                        <ListItemAvatar>
                                            <Avatar>
                                                <AccountCircleIcon/>
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={entityName}
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
                                                    {authorizations && this._renderAuthorizations(authorizations)}
                                                </React.Fragment>
                                            }
                                        />
                                        {
                                            alreadyAuthorizedBySelf ?
                                                <ListItemSecondaryAction>
                                                    <IconButton disabled color='primary'>
                                                        <CheckIcon/>
                                                    </IconButton>
                                                    <IconButton disabled>
                                                        <ClearIcon/>
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                                :
                                                <ListItemSecondaryAction>
                                                    <Tooltip aria-label='Approve' title='Approve'>
                                                        <IconButton
                                                            color='primary'
                                                            disabled={alreadyAuthorizedBySelf}
                                                            onClick={() => authorizeRequest(accessor)}>
                                                            <CheckIcon/>
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip aria-label='Reject' title='Reject'>
                                                        <IconButton disabled={alreadyAuthorizedBySelf} onClick={() => {
                                                            /* eslint-disable no-alert */
                                                            if (window.confirm(`Are you sure you want to reject ${entityName}'s request to ${requestPath}?`)) {
                                                                rejectRequest(requestPath, entityId);
                                                            }
                                                            /* eslint-enable no-alert */
                                                        }}>
                                                            <ClearIcon/>
                                                        </IconButton>
                                                    </Tooltip>
                                                </ListItemSecondaryAction>
                                        }
                                    </ListItem>
                                    <Divider/>
                                </React.Fragment>;
                            })
                            :
                            <Paper className={classes.paper} elevation={2}>
                                {
                                    inProgress ?
                                        <Grid container justify='center'>
                                            <Grid item>
                                                <CircularProgress className={classes.loader}/>
                                            </Grid>
                                        </Grid>
                                        :
                                        <Typography className={classes.paperMessage} color='textSecondary' variant='h5'>
                                            There are no notifications at this time.
                                        </Typography>
                                }
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
    errors: PropTypes.string,
    inProgress: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool,
    rejectRequest: PropTypes.func.isRequired,
    secretsRequests: PropTypes.array,
    vaultLookupSelf: PropTypes.object.isRequired
};

/**
 * Returns the Redux store's state that is relevant to this class as props.
 *
 * @private
 * @param {Object} state - The initial state.
 * @returns {Object}
 */
const _mapStateToProps = (state) => {
    const actionsUsed = [
        kvAction.ACTION_TYPES.DELETE_REQUEST,
        kvAction.ACTION_TYPES.LIST_REQUESTS
    ];
    return {
        errors: createErrorsSelector(actionsUsed)(state.actionStatusReducer),
        inProgress: createInProgressSelector(actionsUsed)(state.actionStatusReducer),
        ...state.kvReducer,
        ...state.sessionReducer
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
    return {
        authorizeRequest: (path, entityId) => {
            return new Promise((resolve, reject) => {
                dispatch(kvAction.authorizeRequest(path, entityId))
                    .then(() => {
                        dispatch(kvAction.listRequests())
                            .then(resolve)
                            .catch(reject);
                    })
                    .catch(reject);
            });
        },
        rejectRequest: (path, entityId) => {
            return new Promise((resolve, reject) => {
                dispatch(kvAction.deleteRequest(path, entityId))
                    .then(() => {
                        dispatch(kvAction.listRequests())
                            .then(resolve)
                            .catch(reject);
                    })
                    .catch(reject);
            });
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
    loader: {
        margin: 50
    },
    listContainer: {
        backgroundColor: theme.palette.background.paper
    },
    paperMessage: {
        padding: 40
    }
});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(NotificationsModal));
