import include from '@mountaingapsolutions/include';

import PropTypes from 'prop-types';
import React, {Component} from 'react';

import logger from 'app/util/logger';

/**
 * Code editor text area.
 */
class CodeEditorArea extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props Props to initialize with.
     */
    constructor(props) {
        super(props);
        this.ref = React.createRef();

        this.state = {
            editor: null
        };
    }

    /**
     * Initializes the code editor.
     *
     * @private
     */
    _initializeEditor() {
        this.setState({
            editor: window.CodeMirror.fromTextArea(this.ref.current, {
                gutters: ['CodeMirror-lint-markers'],
                lineNumbers: true,
                lint: true,
                mode: 'javascript',
                theme: 'material'
            })
        });
    }

    /**
     * Required React Component lifecycle method. Invoked once, only on the client (not on the server), immediately after the initial rendering occurs.
     *
     * @protected
     * @override
     */
    componentDidMount() {
        if (window.CodeMirror) {
            this._initializeEditor();
        } else {
            const cdnProvider = '//cdnjs.cloudflare.com/ajax/libs';
            const urlPrefix = `${cdnProvider}/codemirror/5.47.0`;
            include(`${cdnProvider}/jshint/2.10.2/jshint.min.js`,
                `${urlPrefix}/codemirror.min.js`,
                `${urlPrefix}/mode/javascript/javascript.min.js`,
                `${urlPrefix}/addon/lint/lint.min.js`,
                `${urlPrefix}/addon/lint/lint.min.css`,
                `${urlPrefix}/addon/lint/javascript-lint.min.js`,
                `${urlPrefix}/addon/lint/json-lint.min.js`,
                `${urlPrefix}/codemirror.min.css`,
                `${urlPrefix}/theme/material.css`)
                .then(() => {
                    if (window.CodeMirror) {
                        this._initializeEditor();
                    } else {
                        logger.error('Unable to load CodeMirror library.');
                    }
                });
        }
    }

    /**
     * Required React Component lifecycle method. Invoked immediately before a component is unmounted from the DOM. Perform any necessary cleanup in this method, such as invalidating timers or
     * cleaning up any DOM elements that were created in componentDidMount.
     *
     * @protected
     */
    componentWillUnmount() {
        const {editor} = this.state;
        if (editor) {
            // Commit the changes upon unmount.
            const {onUnload} = this.props;
            editor.toTextArea();
            if (onUnload) {
                onUnload(this.ref.current.value);
            }
        }
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {readOnly, value} = this.props;
        return <textarea readOnly={readOnly} ref={this.ref} value={value} onChange={() => {
            // No-op.
        }}/>;
    }
}

CodeEditorArea.defaultProps = {
    readOnly: false,
    value: '',
};

CodeEditorArea.propTypes = {
    onUnload: PropTypes.func,
    readOnly: PropTypes.bool,
    value: PropTypes.string
};

export default CodeEditorArea;
