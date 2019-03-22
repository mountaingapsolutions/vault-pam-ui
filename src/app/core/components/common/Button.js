import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {Button as MaterialUIButton} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles/index';

/**
 * Button class that can be extended.
 *
 * @author Mountain Gap Solutions
 * @copyright ©2019 Mountain Gap Solutions
 */
class Button extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {className, children, onClick} = this.props;
        return (
            <MaterialUIButton
                className={`${className}`}
                color='primary'
                size='small'
                variant='contained'
                onClick={onClick}>
                {children}
            </MaterialUIButton>
        );
    }
}

Button.propTypes = {
    children: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.node),
        PropTypes.node
    ]).isRequired,
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired
};

export default withStyles(null)(Button);
