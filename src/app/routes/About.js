import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

import userAction from 'app/core/actions/userAction';
import TextField from 'app/core/components/TextField';

/**
 * The About page route.
 */
class About extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props - Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {};

        this._clearUsername = this._clearUsername.bind(this);
        this._confirmUsername = this._confirmUsername.bind(this);
        this._setFieldValue = this._setFieldValue.bind(this);
    }

    /**
     * Handle for clearing the username.
     *
     * @private
     * @param {SyntheticMouseEvent} event - The event.
     */
    _clearUsername() {
        this.props.dispatch(userAction.setUsername(''));
        this.setState({
            username: ''
        });
    }

    /**
     * Handle for confirming the username.
     *
     * @private
     * @param {SyntheticMouseEvent} event - The event.
     */
    _confirmUsername() {
        const {username} = this.state;
        if (!username) {
            alert('Username cannot be empty!');
        } else {
            this.props.dispatch(userAction.setUsername(username));
        }
    }

    /**
     * Handle for setting various field values.
     *
     * @private
     * @param {SyntheticMouseEvent} event - The event.
     */
    _setFieldValue(event) {
        const {name, value} = event.target;
        this.setState({
            [name]: value
        })
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        return <section className='mdl-layout__tab-panel is-active'>
            <div className='page-content'>
                <div className='mdl-grid'>
                    <div className='mdl-cell mdl-cell--2-col'/>
                    <div className='mdl-cell mdl-cell--8-col'>
                        <div className='demo-card-wide mdl-card mdl-shadow--2dp' style={{width: 'auto'}}>
                            <div className='mdl-card__title'>
                                <h2 className='mdl-card__title-text'>Welcome, {this.props.user.username || 'Guest'}!</h2>
                            </div>
                            <div className='mdl-card__supporting-text'>
                                <p>Please enter your username to continue:</p>
                                <TextField name='username' value={this.state.username} onChange={this._setFieldValue}>Username...</TextField>
                            </div>
                            <div className='mdl-card__actions mdl-card--border'>
                                <a className='mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect' onClick={this._confirmUsername}>
                                    Save Username
                                </a>
                                <a className='mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect' onClick={this._clearUsername}>
                                    Clear
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className='mdl-cell mdl-cell--2-col'/>
                </div>
            </div>
        </section>;
    }
}

About.defaultProps = {
    user: {}
};

About.propTypes = {
    user: PropTypes.object
};

const mapStateToProps = (state = {}) => {
    const {user} = state.userReducer;
    return {
        user
    };
};

export default connect(mapStateToProps)(About);
