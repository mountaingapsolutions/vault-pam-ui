import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {
    Grid,
    TextField
} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles/index';
import {COLORS} from 'app/core/assets/Styles';
import Constants from 'app/util/Constants';

/**
 * Generic grid layout with items displayed using cards.
 */
class GridTextField extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, items, margin} = this.props;
        const itemKeyList = Object.keys(items);
        const gridValue = Constants.GRID_WIDTH / itemKeyList.length;
        return <Grid container spacing={24}>
            {itemKeyList.map((item, index) => {
                return <Grid item key={`${item}-${index}`} xs={gridValue}>
                    <TextField
                        disabled
                        InputProps={{classes: {input: classes.textField}}}
                        label={item}
                        margin={margin}
                        value={items[item]}
                        variant='outlined'/>
                </Grid>;
            })}
        </Grid>;
    }
}

GridTextField.defaultProps = {
    margin: 'none'
};

GridTextField.propTypes = {
    classes: PropTypes.object.isRequired,
    items: PropTypes.object.isRequired,
    margin: PropTypes.string.isRequired
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({
    textField: {
        color: COLORS.GREY,
        fontStyle: 'italic',
        fontSize: 14,
        padding: 10
    }
});

export default withStyles(_styles)(GridTextField);
