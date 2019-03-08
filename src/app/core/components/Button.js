import PropTypes from 'prop-types';
import React, {Component} from 'react';

/**
 * Generic button component.
 */
export default class Button extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props - Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {
            buttonProps: Button._getButtonProps(props)
        };
    }

    /**
     * Returns the button props to use within this component, generated from the props passed from the parent class.
     *
     * @private
     * @param {Object} props - The props to use.
     * @returns {Object}
     */
    static _getButtonProps(props = this.props) {
        const buttonProps = {...props};
        buttonProps.className = 'mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect';
        delete buttonProps.children;
        return buttonProps;
    }

    /**
     * Required React Component lifecycle method. invoked right before calling the render method, both on the initial mount and on subsequent updates.
     *
     * @protected
     * @override
     * @param {Object} nextProps - Next set of updated props.
     */
    static getDerivedStateFromProps(nextProps) {
        return {
            buttonProps: Button._getButtonProps(nextProps)
        };
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {children} = this.props;

        return <button {...this.state.buttonProps}>
            {children}
        </button>;
    }
}

Button.propTypes = {
    children: PropTypes.string.isRequired,
    disabled: PropTypes.bool,
    onClick: PropTypes.func
};
