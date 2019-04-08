import {withStyles} from '@material-ui/core/styles';
import {CardActions, CardContent, ExpansionPanel, ExpansionPanelSummary, ExpansionPanelDetails, MenuList, MenuItem, TextField, Typography} from '@material-ui/core';
import {ExpandMore} from '@material-ui/icons';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

import localStorageAction from 'app/core/actions/localStorageAction';
import sessionAction from 'app/core/actions/sessionAction';
import localStorageUtil from 'app/util/localStorageUtil';

import Button from 'app/core/components/common/Button';

/**
 * The Vault server validation page.
 */
class Server extends Component {

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {
            error: '',
            isDirty: false,
            url: ''
        };

        this._onChange = this._onChange.bind(this);
        this._onClick = this._onClick.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
    }

    /**
     * Handle for when value change is triggered.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _onChange(event) {
        event.preventDefault();
        this.setState({
            error: '',
            isDirty: true,
            url: event.target.value
        });
    }

    /**
     * Handle for when the server textfield has been clicked.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _onClick(event) {
        event.stopPropagation();
    }

    /**
     * Handle the menu item click.
     *
     * @private
     * @param {string} value The value.
     */
    _onMenuItemClick(value) {
        this.setState({
            url: value
        });
    }

    /**
     * Handle the menu item click.
     *
     * @private
     * @param {string} value The value.
     * @param {SyntheticMouseEvent} event The event.
     */
    _onRemoveMenuItem(value, event) {
        event.stopPropagation();

        const {removeVaultDomain} = this.props;
        removeVaultDomain(value);
    }

    /**
     * Handle for submitting the form.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _onSubmit(event) {
        event.preventDefault();
        const {history, setVaultDomain} = this.props;
        const {url} = this.state;
        if (!url) {
            this.setState({
                error: 'Please fill out this field.'
            });
        } else {
            setVaultDomain(url).then(() => {
                history.push('/auth/login');
            }).catch(() => {
                const {sealStatus} = this.props;
                if (sealStatus.errors) {
                    this.setState({
                        error: sealStatus.errors[0]
                    });
                }
            });
        }
    }

    /**
     * Required React Component lifecycle method. Invoked once, only on the client (not on the server), immediately after the initial rendering occurs.
     *
     * @protected
     * @override
     */
    componentDidMount() {
        const {getVaultDomains} = this.props;
        getVaultDomains();
    }

    /**
     * Required React Component lifecycle method. Invoked right before calling the render method, both on the initial mount and on subsequent updates.
     *
     * @protected
     * @override
     * @param {Object} props - Next set of updated props.
     * @param {Object} state - The current state.
     * @returns {Object}
     */
    static getDerivedStateFromProps(props, state) {
        const {activeVaultDomain} = props;
        const {isDirty} = state;
        if (!isDirty && activeVaultDomain) {
            return {
                isDirty: true,
                url: activeVaultDomain
            };
        }
        return null;
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, vaultDomains} = this.props;
        const {error, url} = this.state;
        const helperText = error || 'e.g. https://vault.mycompany.com:8200';
        return <form onSubmit={this._onSubmit}>
            <CardContent>
                <Typography gutterBottom color='textSecondary' variant='h6'>
                    Connect to a Vault server
                </Typography>
                <ExpansionPanel>
                    <ExpansionPanelSummary expandIcon={<ExpandMore/>}>
                        <TextField
                            fullWidth
                            required
                            className='m-1'
                            error={!!error}
                            helperText={helperText}
                            label='Vault Server URL'
                            margin='normal'
                            value={url}
                            variant='outlined'
                            onChange={this._onChange}
                            onClick={this._onClick}/>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails className={classes.flexDirection}>
                        <Typography className='w-100' color='textSecondary'>
                            Saved Vault Domains
                        </Typography>
                        <MenuList className='w-100'>{
                            vaultDomains.map((domain, i) => <MenuItem key={`vault-domain-${i}`} onClick={this._onMenuItemClick.bind(this, domain)}>
                                <div className={classes.menuListContainer}>
                                    <div className={classes.menuListLabel}>{domain}</div>
                                    <Button variant='text' onClick={this._onRemoveMenuItem.bind(this, domain)}>
                                        Remove
                                    </Button>
                                </div>
                            </MenuItem>)
                        }</MenuList>
                    </ExpansionPanelDetails>
                </ExpansionPanel>
            </CardContent>
            <CardActions className={classes.cardAction}>
                <Button className={classes.button} type='submit' onClick={this._onSubmit}>
                    Next
                </Button>
            </CardActions>
        </form>;
    }
}

Server.propTypes = {
    activeVaultDomain: PropTypes.string,
    classes: PropTypes.object.isRequired,
    getActiveVaultDomain: PropTypes.func.isRequired,
    getVaultDomains: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    removeVaultDomain: PropTypes.func.isRequired,
    sealStatus: PropTypes.object.isRequired,
    setVaultDomain: PropTypes.func.isRequired,
    vaultDomain: PropTypes.object.isRequired,
    vaultDomains: PropTypes.array.isRequired,
    vaultLookupSelf: PropTypes.object.isRequired
};

/**
 * Returns the Redux store's state that is relevant to this class as props.
 *
 * @private
 * @param {Object} state - The initial state.
 * @returns {Object}
 */
const _mapStateToProps = (state) => {
    return {
        ...state.localStorageReducer,
        ...state.sessionReducer
    };
};

/**
 * Returns a map of methods used for dispatching actions to the store.
 *
 * @private
 * @param {function} dispatch Redux dispatch function.
 * @returns {Object}
 */
const _mapDispatchToProps = (dispatch) => {
    return {
        getActiveVaultDomain: () => dispatch(localStorageAction.getActiveVaultDomain()),
        getVaultDomains: () => {
            dispatch(localStorageAction.getActiveVaultDomain());
            dispatch(localStorageAction.getVaultDomains());
        },
        removeVaultDomain: (url) => dispatch(localStorageAction.removeVaultDomain(url)),
        setVaultDomain: (url) => {
            return new Promise((resolve, reject) => {
                dispatch(sessionAction.validateServer(url)).then(() => {
                    localStorageUtil.setItem(localStorageUtil.KEY_NAMES.VAULT_DOMAIN, url);
                    dispatch(localStorageAction.addVaultDomain(url));
                    dispatch(sessionAction.setDomain(url));
                    resolve();
                }).catch(reject);
            });
        }
    };
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @returns {Object}
 */
const _styles = () => ({
    cardAction: {
        justifyContent: 'flex-end'
    },
    flexDirection: {
        flexDirection: 'column'
    },
    menuListContainer: {
        display: 'flex',
        width: '100%'
    },
    menuListLabel: {
        flex: 'auto',
        padding: '6px 0'
    }
});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(Server));
