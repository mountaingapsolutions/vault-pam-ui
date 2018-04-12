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
            buttonProps: this._getButtonProps(props)
        }
    }

    /**
     * Returns the button props to use within this component, generated from the props passed from the parent class.
     *
     * @private
     * @param {Object} props - The props to use.
     * @returns {Object}
     */
    _getButtonProps(props = this.props) {
        const buttonProps = {...props};
        buttonProps.className = 'mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect';
        delete buttonProps.children;
        return buttonProps;
    }

    /**
     * Required React Component lifecycle method. Invoked when a component is receiving new props. This method is not called for the initial render.
     *
     * @protected
     * @override
     * @param {Object} nextProps - Next set of updated props.
     */
    componentWillReceiveProps(nextProps) {
        this.setState({
            buttonProps: this._getButtonProps(nextProps)
        });
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
