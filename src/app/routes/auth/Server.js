import {withStyles} from '@material-ui/core/styles';
import {Button, CardActions, CardContent, TextField, Typography} from '@material-ui/core';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

/**
 * The Vault server validation page.
 */
class Server extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {classes, history} = this.props;
        return [
            <CardContent key='card-content'>
                <Typography gutterBottom className={classes.title} color='textSecondary' variant='h6'>
                    Initial Configuration
                </Typography>
                <TextField fullWidth required className={classes.textField} helperText='e.g. https://vault.mycompany.com:8200' label='Vault Server URL' margin='normal' variant='outlined'/>
            </CardContent>,
            <CardActions className={classes['card-action']} key='card-actions'>
                <Button className={classes.button} color='primary' variant='contained' onClick={() => history.push('/auth/token')}>
                    Next
                </Button>
            </CardActions>
        ];
    }
}

Server.propTypes = {
    classes: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired
};

/**
 * Returns the Redux store's state that is relevant to this class as props.
 *
 * @private
 * @param {Object} state - The initial state.
 * @returns {Object}
 */
const _mapStateToProps = (state = {}) => {
    return {
        ...state
    };
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({
    'card-action': {
        justifyContent: 'flex-end'
    }
});

export default connect(_mapStateToProps)(withStyles(_styles)(Server));
