import {AppBar, Typography} from '@material-ui/core';
import {COLORS} from 'app/core/assets/Styles';
import {withStyles} from '@material-ui/core/styles/index';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

import systemAction from 'app/core/actions/systemAction';

/**
 * Generic app bar as footer displaying active domain and version.
 */
class Footer extends Component {

    /**
     * Required React Component lifecycle method. Invoked once, only on the client (not on the server), immediately after the initial rendering occurs.
     *
     * @protected
     * @override
     */
    componentDidMount() {
        const {getConfig} = this.props;
        getConfig();
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @protected
     * @override
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, activeVaultDomain, buildInfo, vaultVersion} = this.props;
        const {showBuildNumber, buildNumber} = buildInfo;
        return (
            <div className={classes.footerRootContainer}>
                <AppBar className={classes.footer} position='fixed'>
                    <div className={classes.footerTextContainer}>
                        <Typography inline className={classes.text} component={(props) => <a href='/rest/api' {...props}>API</a>} variant='caption'>
                            API
                        </Typography>
                        <Typography inline className={classes.textSeparator} variant='caption'>
                            |
                        </Typography>
                        <Typography inline className={classes.textActiveDomain} variant='caption'>
                            {`${activeVaultDomain}`}
                        </Typography>
                        <Typography inline className={classes.textSeparator} variant='caption'>
                            |
                        </Typography>
                        <Typography inline className={classes.text} variant='caption'>
                            {`Vault ${vaultVersion}`}
                        </Typography>
                        { showBuildNumber === 'true' &&
                        <React.Fragment>
                            <Typography inline className={classes.textSeparator} variant='caption'>
                                |
                            </Typography>
                            <Typography inline className={classes.text} variant='caption'>
                                {`Build ${buildNumber}`}
                            </Typography>
                        </React.Fragment>
                        }
                    </div>
                </AppBar>
            </div>
        );
    }
}

Footer.defaultProps = {
    activeVaultDomain: '',
    buildInfo: {},
    vaultVersion: ''
};

Footer.propTypes = {
    activeVaultDomain: PropTypes.string.isRequired,
    buildInfo: PropTypes.object.isRequired,
    classes: PropTypes.object.isRequired,
    getConfig: PropTypes.func.isRequired,
    vaultVersion: PropTypes.string.isRequired
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
        getConfig: () => dispatch(systemAction.getConfig())
    };
};

/**
 * Returns the Redux store's state that is relevant to this class as props.
 *
 * @private
 * @param {Object} state - The initial state.
 * @returns {Object}
 */
const _mapStateToProps = (state) => {
    const {systemReducer} = state;
    return {
        activeVaultDomain: systemReducer.config && systemReducer.config.domain,
        buildInfo: systemReducer.config && systemReducer.config.build,
        vaultVersion: systemReducer.sealStatus && systemReducer.sealStatus.version,
    };
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({
    footer: {
        backgroundColor: COLORS.LIGHT_GREY,
        bottom: 0,
        boxShadow: 'none',
        padding: 16,
        textAlign: 'center',
        top: 'auto'
    },
    footerRootContainer: {
        margin: 70
    },
    footerTextContainer: {
        flexDirection: 'row'
    },
    textActiveDomain: {
        color: COLORS.GREY,
        fontStyle: 'italic',
        fontSize: 10
    },
    textSeparator: {
        paddingRight: 20,
        paddingLeft: 20
    },
    text: {
        color: COLORS.DARK_GREY,
        fontSize: 12
    }
});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(Footer));
