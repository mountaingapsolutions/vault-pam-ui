import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button, Card, MenuItem, TextField, Typography } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import withRoot from 'app/withRoot';

//ADD CUSTOM STYLES HERE
const styles = () => ({
    card: {
        width: 400,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    textField: {
        width: '100%'
    }
});

//TODO FETCH THESE LOGIN OPTIONS FROM DATA STORAGE
const LOGIN_OPTIONS = [
    {
        value: 'token',
        label: 'Token'
    },
    {
        value: 'github',
        label: 'GitHub'
    }
];

class Login extends Component {

    constructor() {
        super();
        this.state = {
            loginType: 'token'
        };
    }

    _handleChange = event => {
        console.log(event);
    };

    render() {
        const { classes } = this.props;
        return (
            <section className='mdl-layout__tab-panel is-active'>
                <div className='page-content'>
                    <div className='mdl-grid'>
                        <div className='mdl-cell mdl-cell--8-col'>
                            <Card className={classes.card}>
                                <Typography variant="title">
                                    LOGIN
                                </Typography>
                                <div>
                                    <TextField
                                        className={classes.textField}
                                        label='Token'
                                        margin='normal'
                                        variant='outlined'/>
                                    <TextField
                                        select
                                        className={classes.textField}
                                        label='Select'
                                        margin='normal'
                                        value={this.state.loginType}
                                        variant='outlined'
                                        onChange={event => this._handleChange(event)}>
                                        {
                                            LOGIN_OPTIONS.map(option => {
                                                return (
                                                    <MenuItem key={option}>
                                                        {option.label}
                                                    </MenuItem>
                                                );
                                            })
                                        }
                                    </TextField>
                                </div>
                                <div className='mdl-card__actions mdl-card--border'>
                                    <Button
                                        color='primary'
                                        variant='contained'>
                                        Login
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>
        );
    }
}

Login.propTypes = {
    classes: PropTypes.object.isRequired
};

export default withRoot(withStyles(styles)(Login));
