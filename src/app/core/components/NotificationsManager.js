import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {withRouter} from 'react-router-dom';
import io from 'socket.io-client';

import secretAction from 'app/core/actions/secretAction';
import constants from 'app/util/constants';
import logger from 'app/util/logger';

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
            logger.info('Connected ', socket);
            const {APPROVE, CANCEL, CREATE, READ_APPROVED, REJECT} = constants.NOTIFICATION_EVENTS.REQUEST;
            socket.on(APPROVE, (data) => approveRequestData(data));
            socket.on(CREATE, (data) => createRequestData(data));
            socket.on(REJECT, (data) => removeRequestData(data));
            socket.on(CANCEL, (data) => removeRequestData(data));
            socket.on(READ_APPROVED, (data) => removeRequestData(data));
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
            logger.info('Disconnected. Attempt to reconnect in 3 seconds...');
            socket.disconnect();
            setTimeout(() => {
                logger.info('Connecting again...');
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
        ...state.secretReducer
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
        approveRequestData: (requestData) => dispatch(secretAction.approveRequestData(requestData)),
        createRequestData: (requestData) => dispatch(secretAction.createRequestData(requestData)),
        removeRequestData: (requestData) => dispatch(secretAction.removeRequestData(requestData))
    };
};

export default withRouter(connect(_mapStateToProps, _mapDispatchToProps)(NotificationsManager));
