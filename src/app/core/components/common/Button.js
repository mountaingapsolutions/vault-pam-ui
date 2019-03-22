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
        const {className, children, color, onClick, size, variant} = this.props;
        return (
            <MaterialUIButton
                className={className}
                color={color}
                size={size}
                variant={variant}
                onClick={onClick}>
                {children}
            </MaterialUIButton>
        );
    }
}

Button.defaultProps = {
    color: 'primary',
    size: 'small',
    variant: 'contained'
};

Button.propTypes = {
    children: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.node),
        PropTypes.node
    ]).isRequired,
    className: PropTypes.string,
    color: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    size: PropTypes.string,
    variant: PropTypes.string
};

export default withStyles(null)(Button);
