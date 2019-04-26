import {
    Avatar,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    GridList,
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
import KeyboardArrowLeftIcon from '@material-ui/icons/KeyboardArrowLeft';
import CheckIcon from '@material-ui/icons/Check';
import ClearIcon from '@material-ui/icons/Clear';
import {withStyles} from '@material-ui/core/styles';
import {safeWrap, unwrap} from '@mountaingapsolutions/objectutil';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import kvAction from 'app/core/actions/kvAction';
import Button from 'app/core/components/Button';
import {createErrorsSelector, createInProgressSelector} from 'app/util/actionStatusSelector';
import {connect} from 'react-redux';
import Constants from 'app/util/Constants';

/**
 * Notifications modal.
 */
class NotificationsModal extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {
            selectedRequestId: null
        };

        this._onRequestDetails = this._onRequestDetails.bind(this);
    }

    /**
     * Selects a request
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     * @param {string} requestId Therequest id.
     */
    _onRequestDetails(event, requestId) {
        event.preventDefault();
        this.setState({
            selectedRequestId: requestId
        });
    }

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
     * Renders request details
     *
     * @private
     * @param {Object} selectedRequest selected request object
     * @returns {React.ReactElement}
     */
    _renderRequestDetails(selectedRequest) {
        const {classes} = this.props;
        const {data = {}} = selectedRequest.request_info;
        const {accessor, creation_time: creationTime} = selectedRequest.wrap_info || selectedRequest.request_info;
        const {approved, request_entity: requestEntity, request_path: requestPath} = data;
        const {id: entityId, name: entityName} = requestEntity || {};
        return <GridList cellHeight={'auto'} className={classes.listContainer} cols={2}>
            <ListItem alignItems='flex-start'>
                <ListItemText
                    primary={'Requester Name:'}
                    secondary={
                        <React.Fragment>
                            <Typography
                                className={classes.block}
                                color='textSecondary'
                                component='span'>
                                {entityName}
                            </Typography>
                        </React.Fragment>
                    }
                />
            </ListItem>
            <ListItem alignItems='flex-start'>
                <ListItemText
                    primary={'Requester ID:'}
                    secondary={
                        <React.Fragment>
                            <Typography
                                className={classes.block}
                                color='textSecondary'
                                component='span'>
                                {entityId}
                            </Typography>
                        </React.Fragment>
                    }
                />
            </ListItem>
            <ListItem alignItems='flex-start'>
                <ListItemText
                    primary={'Approval Status:'}
                    secondary={
                        <React.Fragment>
                            <Typography
                                className={classes.block}
                                color='textSecondary'
                                component='span'>
                                {typeof approved === 'string' ? approved : approved.toString()}
                            </Typography>
                        </React.Fragment>
                    }
                />
            </ListItem>
            <ListItem alignItems='flex-start'>
                <ListItemText
                    primary={'Request Creation Time:'}
                    secondary={
                        <React.Fragment>
                            <Typography
                                className={classes.block}
                                color='textSecondary'
                                component='span'>
                                {new Date(creationTime).toLocaleString()}
                            </Typography>
                        </React.Fragment>
                    }
                />
            </ListItem>
            <ListItem alignItems='flex-start'>
                <ListItemText
                    primary={'Requested Path:'}
                    secondary={
                        <React.Fragment>
                            <Typography
                                className={classes.block}
                                color='textSecondary'
                                component='span'>
                                {requestPath}
                            </Typography>
                        </React.Fragment>
                    }
                />
            </ListItem>
            <ListItem alignItems='flex-start'>
                <ListItemText
                    primary={'Accessor:'}
                    secondary={
                        <React.Fragment>
                            <Typography
                                className={classes.block}
                                color='textSecondary'
                                component='span'>
                                {accessor}
                            </Typography>
                        </React.Fragment>
                    }
                />
            </ListItem>
        </GridList>;
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
        const {selectedRequestId} = this.state;
        const {entity_id: entityIdSelf} = unwrap(safeWrap(vaultLookupSelf).data.data) || {};
        const selectedRequest = secretsRequests.length > 0 ? secretsRequests.find(request => (request.request_info || {}).request_id === selectedRequestId) : undefined;
        return <Dialog
            fullWidth
            aria-describedby='notifications-dialog-description'
            aria-labelledby='notifications-dialog-title'
            maxWidth='md'
            open={open}
            onClose={() => onClose(false)}>
            <DialogTitle id='notifications-dialog-title'>{selectedRequest ?
                <div>
                    <IconButton onClick={() => {
                        this.setState({
                            selectedRequestId: undefined
                        });
                    }}>
                        <KeyboardArrowLeftIcon/>
                    </IconButton>
                    Request Details
                </div>
                :
                'Notifications'}</DialogTitle>
            {selectedRequest ?
                <DialogContent>
                    {this._renderRequestDetails(selectedRequest)}
                </DialogContent>
                :
                <DialogContent>
                    <List className={classes.listContainer}>
                        <ListSubheader>
                            Pending requests
                        </ListSubheader>
                        {
                            secretsRequests.length > 0 ?
                                secretsRequests.map(requestData => {
                                    const {data = {}, request_id: requestId} = requestData.request_info;
                                    const {accessor, creation_time: creationTime} = requestData.wrap_info || requestData.request_info;
                                    const {approved, approver_entity: approverEntity, authorizations, request_entity: requestEntity, request_path: requestPath} = data;
                                    const {id: entityId, name: entityName} = requestEntity || {};
                                    const requestType = requestData.wrap_info ? 'Control Groups' : 'Standard Request';
                                    const isOwnRequest = entityId === entityIdSelf;
                                    const cancelText = isOwnRequest ? 'Cancel' : 'Reject';
                                    const alreadyAuthorizedBySelf = requestData.wrap_info ? authorizations && authorizations.some((authorization) => authorization.entity_id === entityIdSelf) :
                                        approverEntity === entityIdSelf && approved === Constants.REQUEST_STATUS.APPROVED;
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
                                                        <Button variant='text' onClick={(e) => {
                                                            this._onRequestDetails(e, requestId);
                                                        }}>
                                                            Details
                                                        </Button>
                                                        <IconButton disabled color='primary'>
                                                            <CheckIcon/>
                                                        </IconButton>
                                                        <IconButton disabled>
                                                            <ClearIcon/>
                                                        </IconButton>
                                                    </ListItemSecondaryAction>
                                                    :
                                                    <ListItemSecondaryAction>
                                                        <Button variant='text' onClick={(e) => {
                                                            this._onRequestDetails(e, requestId);
                                                        }}>
                                                            Details
                                                        </Button>
                                                        {!isOwnRequest &&
                                                            <Tooltip aria-label='Approve' title='Approve'>
                                                                <IconButton
                                                                    color='primary'
                                                                    disabled={alreadyAuthorizedBySelf}
                                                                    onClick={() => authorizeRequest(accessor, requestId)}>
                                                                    <CheckIcon/>
                                                                </IconButton>
                                                            </Tooltip>}
                                                        <Tooltip aria-label={cancelText} title={cancelText}>
                                                            <IconButton disabled={alreadyAuthorizedBySelf}
                                                                onClick={() => {
                                                                    /* eslint-disable no-alert */
                                                                    if (window.confirm(`Are you sure you want to ${cancelText.toLowerCase()} ${isOwnRequest ? 'your' : `${entityName}'s`} request to ${requestPath}?`)) {
                                                                        rejectRequest(requestPath, entityId, requestId);
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
                                            <Typography className={classes.paperMessage} color='textSecondary'
                                                variant='h5'>
                                                There are no notifications at this time.
                                            </Typography>
                                    }
                                </Paper>
                        }
                    </List>
                </DialogContent>
            }
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
        authorizeRequest: (path, entityId, requestId) => {
            return new Promise((resolve, reject) => {
                dispatch(kvAction.authorizeRequest(path, entityId, requestId))
                    .then(() => {
                        dispatch(kvAction.listRequests())
                            .then(resolve)
                            .catch(reject);
                    })
                    .catch(reject);
            });
        },
        rejectRequest: (path, entityId, requestId) => {
            return new Promise((resolve, reject) => {
                dispatch(kvAction.deleteRequest(path, entityId, requestId))
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
