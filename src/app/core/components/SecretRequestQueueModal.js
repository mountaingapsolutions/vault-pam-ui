import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    ListItem,
    ListItemText,
    Typography
} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles/index';
import {COLORS} from 'app/core/assets/Styles';

import AddSplit from 'app/core/components/AddSplit';
import Constants from 'app/util/Constants';
import SecretSplitRequestDetails from 'app/core/components/SecretSplitRequestDetails';

//TODO - WIRE THE LIST SOURCE TO REDUCER
const requestList = [
    {request: {id: '123456', key: 'AWS', requester: 'John'},
        requestDetails: { requestInfo: {
            Requester: 'John Doe',
            Type: 'Token',
            Token: '*************'},
        splitInfo: [
            {Shard: 'erbde.wdgts', Recipient: 'John Wayne', Email: 'john_wayne@gmail.com'}
        ]
        }
    },
    {request: {id: '76893', key: 'GoogleCloud', requester: 'Jerry'},
        requestDetails: { requestInfo: {
            Requester: 'Jerry Buhatin',
            Type: 'GoogleCloud',
            Token: '*************'},
        splitInfo: [
            {Shard: 'rm760n.ihd', Recipient: 'April Mae', Email: 'april_mae@gmail.com'},
            {Shard: 'ecv34t.det3', Recipient: 'Michael Peterson', Email: 'michael_p@gmail.com'}
        ]
        }
    },
    {request: {id: '23543', key: 'Okta', requester: 'Jay'},
        requestDetails: { requestInfo: {
            Requester: 'Jay Daman',
            Type: 'Okta',
            Token: '*************'},
        splitInfo: [
            {Shard: 'ecv34t.det3', Recipient: 'Michael Peterson', Email: 'michael_p@gmail.com'},
            {Shard: 'erbde.wdgts', Recipient: 'John Wayne', Email: 'john_wayne@gmail.com'},
            {Shard: 'rm760n.ihd', Recipient: 'April Mae', Email: 'april_mae@gmail.com'}
        ]
        }
    }
];

/**
 * Secret Request Queue Modal component.
 */
class SecretRequestQueueModal extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props Props to initialize with.
     */
    constructor(props) {
        super(props);
        this.state = {
            contentDisplay: Constants.SECRET_REQUEST_ACTIVE_VIEW.SECRET_REQUEST_DETAILS,
            selectedRequestDetails: requestList[0].requestDetails
        };

        this._onAddSplit = this._onAddSplit.bind(this);
        this._onCancelAddSplit = this._onCancelAddSplit.bind(this);
        this._onSelectRequest = this._onSelectRequest.bind(this);
    }

    /**
     * Handle for when Add Split button is clicked.
     *
     * @private
     */
    _onAddSplit() {
        this.setState({
            contentDisplay: Constants.SECRET_REQUEST_ACTIVE_VIEW.SECRET_REQUEST_ADD_SPLIT
        });
    }

    /**
     * Handle for when Cancel button is clicked in AddSplit component.
     *
     * @private
     */
    _onCancelAddSplit() {
        this.setState({
            contentDisplay: Constants.SECRET_REQUEST_ACTIVE_VIEW.SECRET_REQUEST_DETAILS
        });
    }

    /**
     * Handle for an Item is clicked in Request List.
     *
     * @private
     * @param {Object} requestDetails object containing request details.
     */
    _onSelectRequest(requestDetails) {
        this.setState({selectedRequestDetails: requestDetails});
    }

    /**
     * Helper method to render AddSplit component.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderAddSplit() {
        return <AddSplit onCancelAddSplit={this._onCancelAddSplit}/>;
    }

    /**
     * Helper method to render SecretSplitRequestDetails component.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderRequestSplitInfo() {
        return <SecretSplitRequestDetails requestDetails={this.state.selectedRequestDetails} onAdd={this._onAddSplit}/>;
    }

    /**
     * Helper method to render Secret Request List.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderRequestList() {
        const {contentDisplay} = this.state;
        const isRequestDetailsActive = contentDisplay === Constants.SECRET_REQUEST_ACTIVE_VIEW.SECRET_REQUEST_DETAILS;
        return requestList.map(item => {
            const {requestDetails} = item;
            return <ListItem
                button
                dense
                divider
                disabled={!isRequestDetailsActive}
                key={item.request.id}
                onClick={() => this._onSelectRequest(requestDetails)}>
                <ListItemText primary={item.request.requester} secondary={item.request.key} />
            </ListItem>;
        });
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {contentDisplay} = this.state;
        const {classes, onClose, open} = this.props;
        const isRequestDetailsActive = contentDisplay === Constants.SECRET_REQUEST_ACTIVE_VIEW.SECRET_REQUEST_DETAILS;
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                defaultValue='Default Value'
                maxWidth={'lg'}
                open={open}>
                <DialogTitle disableTypography className={classes.title}>
                    <Typography color='textSecondary'>
                        SECRET REQUEST
                    </Typography>
                    <div className={classes.buttonContainer}>
                        <IconButton onClick={onClose}>
                            <img alt='close' src='/assets/close-icon.svg' width='20'/>
                        </IconButton>
                    </div>
                </DialogTitle>
                <DialogContent className={classes.dialogContent}>
                    <Grid container spacing={16}>
                        <Grid item className={classes.lineDivider} xs={2}>
                            <div>
                                {this._renderRequestList()}
                            </div>
                        </Grid>
                        <Grid item xs={10}>
                            <div className={classes.rightContentContainer}>
                                {isRequestDetailsActive ?
                                    this._renderRequestSplitInfo() :
                                    this._renderAddSplit()}
                            </div>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                </DialogActions>
            </Dialog>
        );
    }
}

SecretRequestQueueModal.defaultProps = {
    open: false
};

SecretRequestQueueModal.propTypes = {
    classes: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object
    ]),
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
    buttonContainer: {
        position: 'absolute',
        right: 10,
        top: 10
    },
    dialogContent: {
        marginLeft: 0,
        paddingLeft: 0
    },
    lineDivider: {
        borderRight: `0.1em solid ${COLORS.LIGHT_GREY}`
    },
    rightContentContainer: {
        height: '100%',
        margin: 0,
        padding: 0,
        width: '100%'
    },
    title: {
        backgroundColor: COLORS.LIGHT_GREY
    }
});

export default withStyles(_styles)(SecretRequestQueueModal);
