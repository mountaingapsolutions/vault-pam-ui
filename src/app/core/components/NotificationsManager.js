import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {withRouter} from 'react-router-dom';
import io from 'socket.io-client';

import kvAction from 'app/core/actions/kvAction';
import Constants from 'app/util/Constants';

/**
 * Notifications manager class. Note: this is a renderless component (https://kyleshevlin.com/renderless-components).
 */
class NotificationsManager extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props - Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {};
    }

    /**
     * Establishes a socket.io connection.
     *
     * @private
     * @returns {Object}
     */
    _connect() {
        const {approveRequestData, createRequestData, removeRequestData} = this.props;
        const {protocol, host} = window.location;
        const socket = io(`${protocol}//${host}`, {
            path: '/notifications'
        });
        socket.on('connect', () => {
            console.info('Connected ', socket);
            socket.on(Constants.NOTIFICATION_EVENTS.REQUEST.APPROVE, (data) => approveRequestData(data));
            socket.on(Constants.NOTIFICATION_EVENTS.REQUEST.CREATE, (data) => createRequestData(data));
            socket.on(Constants.NOTIFICATION_EVENTS.REQUEST.REJECT, (data) => removeRequestData(data));
            socket.on(Constants.NOTIFICATION_EVENTS.REQUEST.CANCEL, (data) => removeRequestData(data));
            socket.on(Constants.NOTIFICATION_EVENTS.REQUEST.READ_APPROVED, (data) => removeRequestData(data));
        });
        return socket;
    }

    /**
     * Required React Component lifecycle method. Invoked once, only on the client (not on the server), immediately after the initial rendering occurs.
     *
     * @protected
     * @override
     */
    componentDidMount() {
        const socket = this._connect();
        socket.on('disconnect', () => {
            console.info('Disconnected. Attempt to reconnect in 3 seconds...');
            socket.disconnect();
            setTimeout(() => {
                console.info('Connecting again...');
                this._connect();
            }, 3000);
        });
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @protected
     * @override
     * @returns {ReactElement}
     */
    render() {
        return <React.Fragment/>;
    }
}

NotificationsManager.propTypes = {
    approveRequestData: PropTypes.func.isRequired,
    createRequestData: PropTypes.func.isRequired,
    removeRequestData: PropTypes.func.isRequired
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
 * @returns {Object}
 */
const _mapDispatchToProps = (dispatch) => {
    return {
        approveRequestData: (requestData) => dispatch(kvAction.approveRequestData(requestData)),
        createRequestData: (requestData) => dispatch(kvAction.createRequestData(requestData)),
        removeRequestData: (accessor) => dispatch(kvAction.removeRequestData(accessor))
    };
};

export default withRouter(connect(_mapStateToProps, _mapDispatchToProps)(NotificationsManager));
