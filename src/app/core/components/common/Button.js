import React, {Component} from 'react';
import {Button as MaterialUIButton} from '@material-ui/core';

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
        const mappedProps = {...this.props};
        // Exclude children from being passed as a prop.
        delete mappedProps.children;
        return <MaterialUIButton {...mappedProps}>{
            this.props.children
        }</MaterialUIButton>;
    }
}

Button.defaultProps = {
    color: 'primary',
    size: 'small',
    variant: 'contained'
};

Button.propTypes = {
    ...MaterialUIButton.propTypes
};

export default Button;
