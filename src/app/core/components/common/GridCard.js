import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {
    Grid,
    Paper,
    Typography
} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles/index';
import Constants from 'app/util/Constants';
import {COLORS} from 'app/core/assets/Styles';


/**
 * Grid with Cards row class that can be extended.
 *
 * @author Mountain Gap Solutions
 * @copyright ©2019 Mountain Gap Solutions
 */
class GridCard extends Component {

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, items} = this.props;
        const itemKeyList = Object.keys(items);
        const gridValue = Constants.GRID_WIDTH / itemKeyList.length;
        return <Grid container className={classes.rootGrid} spacing={24}>
            {itemKeyList.map((item, index) => {
                return <Grid item key={`${item}-${index}`} xs={gridValue}>
                    <Paper className={classes.paper}>
                        <Typography className={classes.textPadding}>
                            {`${item}: ${items[item]}`}
                        </Typography>
                    </Paper>
                </Grid>;
            })}
        </Grid>;
    }
}

GridCard.propTypes = {
    classes: PropTypes.object.isRequired,
    items: PropTypes.object.isRequired
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({
    paper: {
        backgroundColor: COLORS.LIGHT_GREY,
        flex: 1,
        flexDirection: 'row'
    },
    rootGrid: {
        padding: 10
    },
    textPadding: {
        padding: 10
    }
});

export default withStyles(_styles)(GridCard);
