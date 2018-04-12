import PropTypes from 'prop-types';
import React, {Component} from 'react';

/**
 * Generic text field component.
 */
export default class TextField extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props - Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.ref = React.createRef();
    }

    /**
     * React Component lifecycle method. Invoked immediately after the component's updates are flushed to the DOM. This method is not called for the initial render.
     *
     * @override
     * @protected
     * @param {Object} prevProps - The previous properties prior to being updated.
     */
    componentDidUpdate(prevProps) {
        const {value: prevValue} = prevProps;
        const {value} = this.props;
        if (!value && prevValue && this.ref && this.ref.MaterialTextfield) {
            this.ref.MaterialTextfield.checkDirty(); // Clear the is-dirty CSS class name on the field programmatically if the value props gets set to empty.
        }
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        const {children, onChange, name, value} = this.props;

        return <div className='mdl-textfield mdl-js-textfield mdl-textfield--floating-label' ref={this.ref}>
            <input className='mdl-textfield__input' name={name} type='text' value={value} onChange={onChange}/>
            <label className='mdl-textfield__label' htmlFor={name}>{children}</label>
        </div>;
    }
}

TextField.defaultProps = {
    value: ''
};

TextField.propTypes = {
    children: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func,
    value: PropTypes.string
};
