import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

/**
 * The Chat page route.
 */
class Chat extends Component {
    render() {
        return <section className='mdl-layout__tab-panel is-active'>
            <div className='page-content'>
                <div className='mdl-grid'>
                    <div className='mdl-cell mdl-cell--2-col'/>
                    <div className='mdl-cell mdl-cell--8-col'>
                        <div className='demo-card-wide mdl-card mdl-shadow--2dp' style={{width: 'auto'}}>
                            <div className='mdl-card__title'>
                                <h2 className='mdl-card__title-text'>Nothing to see here yet...</h2>
                            </div>
                            <div className='mdl-card__supporting-text'>
                                <p>More to come...</p>
                            </div>
                            <div className='mdl-card__actions mdl-card--border'>
                                <a disabled className='mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect'>
                                    Send
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

Chat.propTypes = {
    user: PropTypes.object
};

const mapStateToProps = (state = {}) => {
    const {user} = state.userReducer;
    return {
        user
    };
};

export default connect(mapStateToProps)(Chat);
