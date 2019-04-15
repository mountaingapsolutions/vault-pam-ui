import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {withRouter} from 'react-router-dom';
import io from 'socket.io-client';

import kvAction from 'app/core/actions/kvAction';

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
     * Required React Component lifecycle method. Invoked once, only on the client (not on the server), immediately after the initial rendering occurs.
     *
     * @protected
     * @override
     */
    componentDidMount() {
        const {updateRequest} = this.props;
        const {protocol, host} = window.location;
        const socket = io(`${protocol}//${host}`, {
            path: '/notifications'
        });
        socket.on('connect', () => {
            console.info('Connected');
            socket.on('request', (data) => updateRequest(data));
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
    updateRequest: PropTypes.func.isRequired,
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
    console.log('TODO - ', ownProps);
    return {
        updateRequest: (requestData) => dispatch(kvAction.updateRequest(requestData))
    };
};

export default withRouter(connect(_mapStateToProps, _mapDispatchToProps)(NotificationsManager));
