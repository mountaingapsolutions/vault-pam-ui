import React, { Component } from 'react';
import { MenuItem, TextField } from '@material-ui/core';

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
        return (
            <div>
                <TextField
                    select
                    label='Select'
                    value={this.state.loginType}
                    onChange={event => this._handleChange(event)}
                >
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
        );
    }
}

export default Login;
