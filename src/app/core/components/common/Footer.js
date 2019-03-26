import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

import localStorageAction from 'app/core/actions/localStorageAction';

import {AppBar, Typography} from '@material-ui/core';
import {COLORS} from 'app/core/assets/Styles';
import {withStyles} from '@material-ui/core/styles/index';

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
        const {getActiveVaultDomain} = this.props;
        getActiveVaultDomain();
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @protected
     * @override
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, activeVaultDomain, vaultVersion} = this.props;
        return (
            <AppBar className={classes.footer} position='fixed'>
                <div className={classes.footerTextContainer}>
                    <Typography inline className={classes.textActiveDomain} variant='caption'>
                        {`${activeVaultDomain}`}
                    </Typography>
                    <Typography inline className={classes.textSeparator} variant='caption'>
                        |
                    </Typography>
                    <Typography inline className={classes.textVersion} variant='caption'>
                        {`Vault ${vaultVersion}`}
                    </Typography>
                </div>
            </AppBar>
        );
    }
}

Footer.defaultProps = {
    activeVaultDomain: '',
    vaultVersion: ''
};

Footer.propTypes = {
    activeVaultDomain: PropTypes.string.isRequired,
    classes: PropTypes.object.isRequired,
    getActiveVaultDomain: PropTypes.func.isRequired,
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
        getActiveVaultDomain: () => dispatch(localStorageAction.getActiveVaultDomain())
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
    const {localStorageReducer, systemReducer} = state;
    return {
        activeVaultDomain: localStorageReducer && localStorageReducer.activeVaultDomain,
        vaultVersion: systemReducer && systemReducer.sealStatus && systemReducer.sealStatus.version
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
    textVersion: {
        color: COLORS.DARK_GREY,
        fontSize: 12
    }
});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(Footer));
