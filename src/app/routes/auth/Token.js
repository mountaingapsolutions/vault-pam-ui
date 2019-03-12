import {withStyles} from '@material-ui/core/styles';
import {Button, CardActions, CardContent, TextField, Typography} from '@material-ui/core';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

/**
 * The Vault server validation page.
 */
class Token extends Component {

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
                <TextField fullWidth required className={classes.textField} label='Token' margin='normal' type='password' variant='outlined'/>
            </CardContent>,
            <CardActions className={classes['card-action']} key='card-actions'>
                <Button className={classes.button} color='primary' onClick={() => history.push('/auth/server')}>
                    Back
                </Button>
                <Button className={classes.button} color='primary' variant='contained'>
                    Next
                </Button>
            </CardActions>
        ];
    }
}

Token.propTypes = {
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
        justifyContent: 'space-between'
    }
});

export default connect(_mapStateToProps)(withStyles(_styles)(Token));
