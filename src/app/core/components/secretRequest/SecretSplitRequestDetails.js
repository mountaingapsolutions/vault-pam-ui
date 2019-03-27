import PropTypes from 'prop-types';
import React, {Component, Fragment} from 'react';
import {
    Divider,
    Paper,
    Typography
} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles/index';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import Button from 'app/core/components/common/Button';
import GridTextField from 'app/core/components/common/GridTextField';

/**
 * Split Request component.
 */
class SecretSplitRequestDetails extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props Props to initialize with.
     */
    constructor(props) {
        super(props);
        this._onClick = this._onClick.bind(this);
    }

    /**
     * Handler for when button is clicked.
     *
     * @private
     */
    _onClick() {
        /* eslint-disable no-alert */
        window.alert('button clicked!');
        /* eslint-enable no-alert */
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, onAdd} = this.props;
        const {requestInfo, splitInfo} = this.props.requestDetails;
        return (
            <Paper className={classes.paper} elevation={2}>
                <Typography className={classes.alignLeft} color='primary'>
                    SECRET REQUEST DETAILS
                </Typography>
                <div className={classes.textFieldsContainer}>
                    <GridTextField items={requestInfo} margin='normal'/>
                    <div className={classes.splitInfoContainer}>
                        <Divider />
                        <Typography className={classes.alignLeft} color='primary'>
                            CURRENT SPLIT
                        </Typography>
                        {splitInfo.map((items, index) => {
                            return (
                                <Fragment key={`${items}-${index}`}>
                                    <GridTextField items={items}/>
                                    <div className={classes.deleteIcon}>
                                        <DeleteForeverIcon color='primary'/>
                                    </div>
                                </Fragment>
                            );
                        })}
                        <div className={classes.alignRight}>
                            <Button onClick={onAdd}>ADD SPLIT</Button>
                        </div>
                    </div>
                </div>
            </Paper>
        );
    }
}

SecretSplitRequestDetails.propTypes = {
    classes: PropTypes.object.isRequired,
    onAdd: PropTypes.func.isRequired,
    requestDetails: PropTypes.object
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({
    alignLeft: {
        padding: 10,
        textAlign: 'left'
    },
    alignRight: {
        margin: 10,
        textAlign: 'right'
    },
    deleteIcon: {
        textAlign: 'right'
    },
    paper: {
        marginTop: 20,
        paddingBottom: 5
    },
    splitInfoContainer: {
        backgroundColor: '#fcfcfc'
    },
    textFieldsContainer: {
        paddingLeft: 10,
        paddingRight: 10,
    }
});

export default withStyles(_styles)(SecretSplitRequestDetails);
