import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

/**
 * The About page route.
 */
class About extends Component {
    render() {
        return <section className='mdl-layout__tab-panel is-active'>
            <div className='page-content'>
                <div className='mdl-grid'>
                    <div className='mdl-cell mdl-cell--2-col'/>
                    <div className='mdl-cell mdl-cell--8-col'>
                        <div className='demo-card-wide mdl-card mdl-shadow--2dp' style={{width: 'auto'}}>
                            <div className='mdl-card__title'>
                                <h2 className='mdl-card__title-text'>Welcome, Guest</h2>
                            </div>
                            <div className='mdl-card__supporting-text'>
                                <p>Please enter your username to continue:</p>
                                <div className='mdl-textfield mdl-js-textfield mdl-textfield--floating-label'>
                                    <input className='mdl-textfield__input' type='text'/>
                                    <label className='mdl-textfield__label' htmlFor='sample3'>Username...</label>
                                </div>
                            </div>
                            <div className='mdl-card__actions mdl-card--border'>
                                <a className='mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect'>
                                    Get Started
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
