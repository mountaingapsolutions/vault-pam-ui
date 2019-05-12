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
            selectedRequestPath: null
        };

        this._onRequestDetails = this._onRequestDetails.bind(this);
    }

    /**
     * Selects a request
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     * @param {string} requestPath The request path.
     */
    _onRequestDetails(event, requestPath) {
        event.preventDefault();
        this.setState({
            selectedRequestPath: requestPath
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
        const namesList = authorizations.filter((authorization) => authorization.entityId !== entityIdSelf).map((authorization) => authorization.name);
        const alreadyAuthorizedBySelf = authorizations && authorizations.some((authorization) => authorization.entityId === entityIdSelf);
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
     * @param {Object} selectedRequest The selected request object.
     * @returns {React.ReactElement}
     */
    _renderRequestDetails(selectedRequest) {
        const {classes} = this.props;
        const {accessor, approved, creationTime, requestEntity = {}, requestPath} = selectedRequest;
        const {id, name} = requestEntity;
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
                                {name}
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
                                {id}
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
                            <Typography className={classes.block} color='textSecondary' component='span'>
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
                            <Typography className={classes.block} color='textSecondary' component='span'>
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
                            <Typography className={classes.block} color='textSecondary' component='span'>
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
                            <Typography className={classes.block} color='textSecondary' component='span'>
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
        const {authorizeRequest, classes, inProgress, onClose, open, deleteRequest, secretsRequests = [], vaultLookupSelf} = this.props;
        const {selectedRequestPath} = this.state;
        const {entity_id: entityIdSelf} = unwrap(safeWrap(vaultLookupSelf).data.data) || {};
        const selectedRequest = secretsRequests.length > 0 ? secretsRequests.find((request) => request.requestPath === selectedRequestPath) : undefined;
        return <Dialog
            fullWidth
            aria-describedby='notifications-dialog-description'
            aria-labelledby='notifications-dialog-title'
            maxWidth='md'
            open={open}
            onClose={() => onClose(false)}
            onExit={() => {
                this.setState({
                    selectedRequestPath: undefined
                });
            }}>
            <DialogTitle id='notifications-dialog-title'>{selectedRequest ?
                <div>
                    <IconButton onClick={() => {
                        this.setState({
                            selectedRequestPath: undefined
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
                                    const {accessor, approved, authorizations, creationTime, isWrapped, requestEntity = {}, requestPath} = requestData;
                                    const {id, name} = requestEntity;
                                    const requestType = isWrapped ? 'Control Groups' : 'Standard Request';
                                    const isOwnRequest = id === entityIdSelf;
                                    const deleteText = isOwnRequest ? 'Cancel' : 'Reject';
                                    const alreadyApprovedBySelf = authorizations && authorizations.some((authorization) => authorization.entityId === entityIdSelf);
                                    return <React.Fragment key={requestPath}>
                                        <ListItem alignItems='flex-start'>
                                            <ListItemAvatar>
                                                <Avatar>
                                                    <AccountCircleIcon/>
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={name}
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
                                                        {authorizations && authorizations.length > 0 && this._renderAuthorizations(authorizations)}
                                                    </React.Fragment>
                                                }
                                            />
                                            {
                                                alreadyApprovedBySelf ?
                                                    <ListItemSecondaryAction>
                                                        <Button variant='text' onClick={(e) => {
                                                            this._onRequestDetails(e, requestPath);
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
                                                            this._onRequestDetails(e, requestPath);
                                                        }}>
                                                            Details
                                                        </Button>
                                                        {!isOwnRequest &&
                                                            <Tooltip aria-label='Approve' title='Approve'>
                                                                <IconButton
                                                                    color='primary'
                                                                    onClick={() => authorizeRequest(accessor, requestPath, id, isWrapped ? 'control-group' : 'standard-request')}>
                                                                    <CheckIcon/>
                                                                </IconButton>
                                                            </Tooltip>}
                                                        <Tooltip aria-label={deleteText} title={deleteText}>
                                                            <IconButton disabled={approved}
                                                                onClick={() => {
                                                                    /* eslint-disable no-alert */
                                                                    if (window.confirm(`Are you sure you want to ${isOwnRequest ? 'cancel your' : `reject ${name}'s`} request to ${requestPath}?`)) {
                                                                        deleteRequest(requestPath, id, isWrapped ? 'control-group' : 'standard-request');
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
    deleteRequest: PropTypes.func.isRequired,
    errors: PropTypes.string,
    inProgress: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool,
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
        authorizeRequest: (path, entityId, requestId, type) => dispatch(kvAction.authorizeRequest(path, entityId, requestId, type)),
        deleteRequest: (path, entityId, type = 'standard-request') => dispatch(kvAction.deleteRequest(path, entityId, type))
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
