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
    Menu,
    MenuItem,
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
import secretAction from 'app/core/actions/secretAction';
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
            anchorEl: null,
            selectedFilterIndex: 0,
            selectedRequestPath: null,
        };

        this._onRequestDetails = this._onRequestDetails.bind(this);
        this._handleFilterClickListItem = this._handleFilterClickListItem.bind(this);
        this._handleFilterMenuItemClick = this._handleFilterMenuItemClick.bind(this);
        this._handleFilterClose = this._handleFilterClose.bind(this);
    }

    /**
     * Returns the corresponding label of the request data.
     *
     * @private
     * @param {Object} requestData The request data object.
     * @returns {string}
     */
    _getRequestTypeLabel(requestData) {
        const {isWrapped, type} = requestData;
        let label;
        if (isWrapped) {
            label = 'Control Groups';
        } else if (type === Constants.REQUEST_TYPES.STANDARD_REQUEST) {
            label = 'Standard Request';
        } else if (type === Constants.REQUEST_TYPES.DYNAMIC_REQUEST) {
            label = 'Dynamic Request';
        }
        return label;
    }

    /**
     * Selects a request
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     * @param {string} secretsPath The request secrets path.
     * @param {number} requestId The request id.
     */
    _onRequestDetails(event, secretsPath, requestId) {
        const {getRequestApprovers} = this.props;
        getRequestApprovers(requestId);
        event.preventDefault();
        this.setState({
            selectedRequestPath: secretsPath
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
     * Handle for filter click.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _handleFilterClickListItem(event) {
        this.setState({anchorEl: event.currentTarget});
    }

    /**
     * Handle for filter select.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     * @param {number} index The filter option index.
     */
    _handleFilterMenuItemClick(event, index) {
        this.setState({selectedFilterIndex: index, anchorEl: null});
    }

    /**
     * Handle for filter close.
     *
     * @private
     */
    _handleFilterClose() {
        this.setState({anchorEl: null});
    }

    /**
     * Renders the reject button.
     *
     * @private
     * @param {Object} buttonData Request data.
     * @returns {React.ReactElement}
     */
    _renderRejectButton(buttonData = {}) {
        const {alreadyApprovedBySelf, approved, isOwnRequest, path, id, type} = buttonData;
        const {deleteRequest} = this.props;
        const deleteText = isOwnRequest ? 'Cancel' : 'Reject';

        return <Tooltip aria-label={deleteText} title={deleteText}>
            <IconButton disabled={alreadyApprovedBySelf ? !approved : approved}
                onClick={() => {
                    /* eslint-disable no-alert */
                    if (window.confirm(`Are you sure you want to ${isOwnRequest ? 'cancel your' : `reject ${name}'s`} request to ${path}?`)) {
                        deleteRequest(path, id, type);
                    }
                    /* eslint-enable no-alert */
                }}>
                <ClearIcon/>
            </IconButton>
        </Tooltip>;
    }

    /**
     * Renders request details
     *
     * @private
     * @param {Object} selectedRequest The selected request object.
     * @returns {React.ReactElement}
     */
    _renderRequestDetails(selectedRequest) {
        const {classes, approvers} = this.props;
        const {approved, creationTime, path, requestEntity} = selectedRequest;
        const {name} = requestEntity || {};
        const namesList = approvers.map(approver => {
            if (approver.metadata) {
                return `${approver.metadata.firstName} ${approver.metadata.lastName}`;
            }
            return approver.name;
        });
        return <GridList cellHeight={'auto'} className={classes.listContainer} cols={2}>
            <ListItem alignItems='flex-start'>
                <ListItemText
                    primary={'Name:'}
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
                    primary={'Requested Path:'}
                    secondary={
                        <React.Fragment>
                            <Typography className={classes.block} color='textSecondary' component='span'>
                                {path}
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
                                {approved === true || approved === 'true' ? 'Approved' : 'Pending'}
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
                    primary={'Approvers:'}
                    secondary={
                        <React.Fragment>
                            <Typography className={classes.block} color='textSecondary' component='span'>
                                {namesList.join(', ')}
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
        const {authorizeRequest, classes, inProgress, onClose, open, secretsRequests = [], vaultLookupSelf} = this.props;
        const {anchorEl, selectedFilterIndex, selectedRequestPath} = this.state;
        const {entity_id: entityIdSelf} = unwrap(safeWrap(vaultLookupSelf).data.data) || {};
        const selectedRequest = secretsRequests.length > 0 ? secretsRequests.find((request) => request.path === selectedRequestPath) : undefined;
        const filterOptions = [
            'All',
            'Approved',
            'Pending',
        ];
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
                            {secretsRequests.length > 0 &&
                            <Grid container justify='flex-start'>
                                <Grid item xs={12}>
                                    <List component='nav'>
                                        <ListItem
                                            button
                                            aria-controls='lock-menu'
                                            aria-haspopup='true'
                                            aria-label='Filter By'
                                            className={classes.filter}
                                            onClick={this._handleFilterClickListItem}
                                        >
                                            <ListItemText
                                                primary={<Typography variant='overline'>Filter By</Typography>}
                                                secondary={<Typography
                                                    variant='caption'>{filterOptions[selectedFilterIndex]}</Typography>}
                                                style={{textAlign: 'left'}}
                                            />
                                        </ListItem>
                                    </List>
                                    <Menu
                                        anchorEl={anchorEl}
                                        id='lock-menu'
                                        open={Boolean(anchorEl)}
                                        onClose={this._handleFilterClose}
                                    >
                                        {filterOptions.map((option, index) =>
                                            <MenuItem
                                                disabled={index === selectedFilterIndex}
                                                key={option}
                                                selected={index === selectedFilterIndex}
                                                onClick={event => this._handleFilterMenuItemClick(event, index)}
                                            >
                                                <Typography variant='caption'>{option}</Typography>
                                            </MenuItem>
                                        )}
                                    </Menu>
                                </Grid>
                            </Grid>
                            }
                        </ListSubheader>
                        {
                            secretsRequests.length > 0 ?
                                secretsRequests.filter(d => {
                                    switch (selectedFilterIndex) {
                                        case 1:
                                            return d.approved;
                                        case 2:
                                            return !d.approved;
                                        default:
                                            return true;
                                    }
                                }).map((requestData, i) => {
                                    const {approved, authorizations, creationTime, path, requestEntity = {}, type, id: requestId} = requestData;
                                    const {id, name} = requestEntity;
                                    const isOwnRequest = id === entityIdSelf;
                                    const alreadyApprovedBySelf = authorizations && authorizations.some((authorization) => authorization.entityId === entityIdSelf);
                                    const buttonData = {
                                        alreadyApprovedBySelf,
                                        approved,
                                        id,
                                        isOwnRequest,
                                        name,
                                        path
                                    };
                                    return <React.Fragment key={`${path}-${i}`}>
                                        <ListItem alignItems='flex-start'>
                                            <ListItemAvatar style={{marginRight: 15}}>
                                                <Avatar>
                                                    <AccountCircleIcon/>
                                                </Avatar>
                                            </ListItemAvatar>
                                            <Grid container>
                                                <Grid item xs={6}>
                                                    <ListItemText
                                                        primary={name}
                                                        secondary={
                                                            <React.Fragment>
                                                                <Typography
                                                                    className={classes.block}
                                                                    color='textPrimary'
                                                                    component='span'>
                                                                    {path}
                                                                </Typography>
                                                                <Typography
                                                                    className={classes.block}
                                                                    color='textSecondary'
                                                                    component='span'>
                                                                    {`Requested at ${new Date(creationTime).toLocaleString()} via ${this._getRequestTypeLabel(requestData)}`}
                                                                </Typography>
                                                                {authorizations && authorizations.length > 0 && this._renderAuthorizations(authorizations)}
                                                            </React.Fragment>
                                                        }
                                                    />
                                                </Grid>
                                                {
                                                    alreadyApprovedBySelf ?
                                                        <Grid item xs={6}>
                                                            <ListItemSecondaryAction>
                                                                <Button variant='text' onClick={(e) => {
                                                                    this._onRequestDetails(e, path, requestId);
                                                                }}>
                                                                    Details
                                                                </Button>
                                                                <IconButton disabled color='primary'>
                                                                    <CheckIcon/>
                                                                </IconButton>
                                                                {this._renderRejectButton(buttonData)}
                                                            </ListItemSecondaryAction>
                                                        </Grid>
                                                        :
                                                        <Grid item xs={6}>
                                                            <ListItemSecondaryAction>
                                                                <Button variant='text' onClick={(e) => {
                                                                    this._onRequestDetails(e, path, requestId);
                                                                }}>
                                                                    Details
                                                                </Button>
                                                                {!isOwnRequest &&
                                                                <Tooltip aria-label='Approve' title='Approve'>
                                                                    <IconButton
                                                                        color='primary'
                                                                        onClick={() => authorizeRequest(path, id, type)}>
                                                                        <CheckIcon/>
                                                                    </IconButton>
                                                                </Tooltip>}
                                                                {this._renderRejectButton(buttonData)}
                                                            </ListItemSecondaryAction>
                                                        </Grid>
                                                }
                                            </Grid>
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
    approvers: PropTypes.array,
    authorizeRequest: PropTypes.func.isRequired,
    classes: PropTypes.object.isRequired,
    deleteRequest: PropTypes.func.isRequired,
    errors: PropTypes.string,
    getRequestApprovers: PropTypes.func.isRequired,
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
        secretAction.ACTION_TYPES.DELETE_REQUEST,
        secretAction.ACTION_TYPES.LIST_REQUESTS,
        secretAction.ACTION_TYPES.LIST_APPROVERS
    ];
    return {
        errors: createErrorsSelector(actionsUsed)(state.actionStatusReducer),
        inProgress: createInProgressSelector(actionsUsed)(state.actionStatusReducer),
        ...state.secretReducer,
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
        authorizeRequest: (path, entityId, requestType) => dispatch(secretAction.authorizeRequest(path, entityId, requestType)),
        deleteRequest: (path, entityId, type = Constants.REQUEST_TYPES.STANDARD_REQUEST) => dispatch(secretAction.deleteRequest(path, entityId, type)),
        getRequestApprovers: requestId => dispatch(secretAction.getRequestApprovers(requestId))
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
    filter: {
        paddingTop: 0,
        paddingBottom: 0,
        width: 150,
        textAlign: 'left'
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
