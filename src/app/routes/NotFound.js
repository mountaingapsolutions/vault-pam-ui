import React, {Component} from 'react';

/**
 * The 404 page.
 */
class NotFound extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    render() {
        return <section className='mdl-layout__tab-panel is-active'>
            <div className='page-content'>
                <div className='mdl-grid'>
                    <div className='mdl-cell mdl-cell--2-col'/>
                    <div className='mdl-cell mdl-cell--8-col' style={styles.centerText}>
                        <h1>404 - Page not found</h1>
                        <img alt='404' src='/assets/oh-noes.gif'/>
                        <h1> ¯\_(ツ)_/¯</h1>
                    </div>
                    <div className='mdl-cell mdl-cell--2-col'/>
                </div>
            </div>
        </section>;
    }
}

const styles = {
    centerText: {
        textAlign: 'center'
    }
};

export default NotFound;
