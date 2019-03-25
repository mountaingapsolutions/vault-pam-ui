import {
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormHelperText,
    Grid,
    IconButton,
    InputAdornment,
    InputBase,
    List,
    ListItem,
    ListItemSecondaryAction,
    Paper,
    TextField,
    Typography
} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles';
import CreateNewFolderIcon from '@material-ui/icons/CreateNewFolder';
import DeleteIcon from '@material-ui/icons/Delete';
import FolderIcon from '@material-ui/icons/Folder';
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import VisibilityIcon from '@material-ui/icons/Visibility';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

import kvAction from 'app/core/actions/kvAction';
import Button from 'app/core/components/common/Button';

/**
 * Modal to create or modify a secret.
 */
class CreateUpdateSecretModal extends Component {

    _defaultState = {
        errors: {},
        loaded: false,
        newPaths: [''],
        secrets: [{
            key: '',
            value: '',
            showPassword: false
        }]
    };

    /**
     * The constructor method. Executed upon class instantiation.
     *
     * @public
     * @param {Object} props Props to initialize with.
     */
    constructor(props) {
        super(props);

        this.state = {
            ...this._defaultState
        };

        this._createNewPath = this._createNewPath.bind(this);
        this._onPathValueChange = this._onPathValueChange.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
        this._onValueChange = this._onValueChange.bind(this);
        this._resetState = this._resetState.bind(this);
        this._togglePasswordVisibility = this._togglePasswordVisibility.bind(this);
    }

    /**
     * React Component lifecycle method. Invoked right before calling the render method, both on the initial mount and on subsequent updates.
     *
     * @protected
     * @override
     * @param {Object} props - Next set of updated props.
     * @param {Object} state - The current state.
     * @returns {Object}
     */
    static getDerivedStateFromProps(props, state) {
        const {mode, secrets} = props;
        const {loaded} = state;
        if (mode === 'update' && !loaded && secrets && secrets._meta && !secrets._meta.inProgress) {
            // Check if KV engine is version 2, as the resource data is different.
            const isV2 = secrets.data && secrets.metadata && secrets.data && secrets.metadata.version;
            let secretsData;
            if (isV2) {
                secretsData = {...secrets.data};
            } else {
                secretsData = {...secrets};
                delete secretsData._meta;
            }
            return {
                secrets: Object.keys(secretsData).map(key => {
                    return {
                        key,
                        value: secretsData[key],
                        showPassword: false
                    };
                }),
                loaded: true
            };
        }
        return null;
    }

    /**
     * Creates a new path if field is valid.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _createNewPath(event) {
        event.preventDefault();
        const {errors, newPaths} = this.state;
        const currentPathError = this._validateNewPath(newPaths[newPaths.length - 1]);
        if (currentPathError) {
            this.setState({
                errors: {
                    ...errors,
                    currentPath: currentPathError
                }
            });
        } else {
            const updadatedNewPaths = [...newPaths];
            updadatedNewPaths.push('');
            this.setState({
                errors: {
                    ...errors,
                    currentPath: ''
                },
                newPaths: updadatedNewPaths
            });
        }
    }

    /**
     * Handle for when the path field value change is triggered.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _onPathValueChange(event) {
        event.preventDefault();
        const {errors, newPaths} = this.state;
        const {value} = event.target;
        const valueToValidate = value.endsWith('/') ? value.slice(0, -1) : value;
        const currentPathError = this._validateNewPath(valueToValidate);
        const updadatedNewPaths = [...newPaths];
        updadatedNewPaths[updadatedNewPaths.length - 1] = value;

        // Error state.
        if (currentPathError) {
            this.setState({
                errors: {
                    ...errors,
                    currentPath: currentPathError
                },
                newPaths: updadatedNewPaths
            });
        }
        // Happy path.
        else {
            // Create new path.
            if (value.endsWith('/')) {
                updadatedNewPaths[updadatedNewPaths.length - 1] = valueToValidate;
                updadatedNewPaths.push('');
            }
            this.setState({
                errors: {
                    ...errors,
                    currentPath: ''
                },
                newPaths: updadatedNewPaths
            });
        }
    }

    /**
     * Validates the provided path value.
     *
     * @private
     * @param {string} value The path to validate.
     * @returns {string} Error message, if any.
     */
    _validateNewPath(value) {
        if (!value) {
            return 'Please fill out this field.';
        } else if (value.startsWith('/')) {
            return 'Path cannot start with "/."';
        } else {
            const regexp = /^[a-zA-Z0-9-_ ]+$/; // Regex to only allow for folder names that are alphanumeric, spaces, dashes, or underscores.
            if (value.search(regexp) === -1) {
                return 'Invalid folder name. Only alphanumeric, space, dash, and underscore characters are allowed.';
            } else {
                return '';
            }
        }
    }

    /**
     * Handle for submitting the form.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _onSubmit(event) {
        event.preventDefault();
        const {errors, newPaths, secrets} = this.state;
        const updatedErrors = {...errors};
        const errorMessage = 'Please fill out this field.';
        let pathErrorMessage;
        if (newPaths.length === 1) {
            pathErrorMessage = this._validateNewPath(newPaths[0]);
        } else if (newPaths.length > 1) {
            const lastPathIndex = newPaths[newPaths.length - 1] === '' ? newPaths.length - 2 : newPaths.length - 1;
            pathErrorMessage = this._validateNewPath(newPaths[lastPathIndex]);
        }
        if (pathErrorMessage) {
            updatedErrors.currentPath = pathErrorMessage;
        }
        secrets.forEach((secret, i) => {
            if (!secret.key) {
                updatedErrors[`key-${i}`] = errorMessage;
            } else {
                delete updatedErrors[`key-${i}`];
            }
            if (!secret.value) {
                updatedErrors[`value-${i}`] = errorMessage;
            } else {
                delete updatedErrors[`value-${i}`];
            }
        });
        if (Object.keys(updatedErrors).length > 0) {
            this.setState({
                errors: {
                    ...updatedErrors
                }
            });
        } else {
            // const {createFolder} = this.props;
            // createFolder(value);
            console.warn('TODO - Submit: ', secrets);
        }
    }

    /**
     * Handle for when a value change is triggered.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _onValueChange(event) {
        event.preventDefault();
        const {errors, secrets} = this.state;
        const {name, value} = event.target;
        if (name) {
            const nameParts = name.split('-');
            const fieldType = nameParts[0]; // Either 'key' or 'value'.
            const index = parseInt(nameParts[1], 10);
            if (!isNaN(index) && secrets[index]) {
                const secret = {
                    ...secrets[index],
                    [fieldType]: value
                };
                const updatedErrors = {...errors};
                delete updatedErrors[`${fieldType}-${index}`];
                const updatedSecrets = [...secrets];
                updatedSecrets[index] = secret;
                this.setState({
                    errors: updatedErrors,
                    secrets: updatedSecrets
                });
            }
        }
    }

    /**
     * Toggles the password visibility of the secret.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _togglePasswordVisibility(event) {
        event.preventDefault();
        const {secrets} = this.state;
        const {name} = event.target;
        if (name) {
            const nameParts = name.split('-');
            const index = parseInt(nameParts[1], 10);
            if (!isNaN(index) && secrets[index]) {
                const secret = {
                    ...secrets[index],
                    showPassword: !secrets[index].showPassword
                };
                const updatedSecrets = [...secrets];
                updatedSecrets[index] = secret;
                this.setState({
                    secrets: updatedSecrets
                });
            }
        }
    }

    /**
     * Renders the paths input field.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderPathsInput() {
        const {classes, initialPath} = this.props;
        const {errors, newPaths} = this.state;
        const paths = initialPath.split('/');
        return <Paper className={classes.marginBottom} elevation={1}>
            <div className={classes.pathRoot}>
                <FolderIcon className={classes.folderIcon} color='disabled'/>
                <InputBase
                    autoFocus
                    fullWidth
                    required
                    className={classes.input}
                    error={!!errors.currentPath}
                    name='currentPath'
                    placeholder='New path'
                    startAdornment={
                        <React.Fragment>
                            {paths.map((path, i) => {
                                return <React.Fragment key={`${path}-${i}`}>
                                    <Chip label={path}/>
                                    <Typography color='textSecondary' variant='h5'>/</Typography>
                                </React.Fragment>;
                            })}
                            {newPaths.length > 1 && newPaths.slice(0, newPaths.length - 1).map((path, i) => {
                                return <React.Fragment key={`${path}-${i}`}>
                                    <Chip label={path} onDelete={() => {
                                        const updatedNewPaths = [...newPaths];
                                        updatedNewPaths.splice(i, 1);
                                        this.setState({
                                            newPaths: updatedNewPaths
                                        });
                                    }}/>
                                    <Typography color='textSecondary' variant='h5'>/</Typography>
                                </React.Fragment>;
                            })}
                        </React.Fragment>
                    }
                    value={newPaths[newPaths.length - 1]}
                    onChange={this._onPathValueChange}
                    onKeyDown={(event) => {
                        event.stopPropagation(); // Prevent form submit.
                        if (event.key === 'Backspace' && newPaths.length > 1 && newPaths[newPaths.length - 1] === '') {
                            const updatedNewPaths = [...newPaths];
                            updatedNewPaths.pop();
                            updatedNewPaths[updatedNewPaths.length - 1] = '';
                            this.setState({
                                errors: {
                                    ...errors,
                                    currentPath: ''
                                },
                                newPaths: updatedNewPaths
                            });
                        } else if (event.key === 'Enter') {
                            this._createNewPath(event);
                        }
                    }}
                />
                <div className={classes.confirmPathContainer}>
                    <Divider className={classes.pathDivider}/>
                    <IconButton
                        aria-label='Confirm Path'
                        className={classes.confirmPathIconButton}
                        color='primary'
                        onClick={this._createNewPath}>
                        <CreateNewFolderIcon/>
                    </IconButton>
                </div>
            </div>
            {errors.currentPath &&
            <FormHelperText className={classes.pathError} error={true}>{errors.currentPath}</FormHelperText>}
        </Paper>;
    }

    /**
     * Resets the internal state.
     *
     * @private
     */
    _resetState() {
        this.setState({
            ...this._defaultState
        });
    }

    /**
     * Required React Component lifecycle method. Returns a tree of React components that will render to HTML.
     *
     * @override
     * @protected
     * @returns {React.ReactElement}
     */
    render() {
        const {classes, onClose, mode, open} = this.props;
        const {errors, loaded, secrets} = this.state;
        if (mode === 'update' && loaded) {
            console.warn('SET THESE ', secrets);
        }
        return <Dialog open={open} onClose={onClose} onExit={this._resetState}>
            <form onSubmit={this._onSubmit}>
                <DialogTitle id='create-new-folder-modal'>
                    New Secret
                </DialogTitle>
                <DialogContent>
                    {this._renderPathsInput()}
                    <Paper elevation={1}>
                        {secrets.map((secret, i) => {
                            const {key = '', value = '', showPassword} = secret;
                            const keyKey = `key-${i}`;
                            const keyError = errors[keyKey];
                            const valueKey = `value-${i}`;
                            const valueError = errors[valueKey];
                            return <List key={`secret-${i}`}>
                                <ListItem className={classes.listItem}>
                                    <Grid container spacing={16}>
                                        <Grid item className={classes.marginRight} xs={4}>
                                            <TextField
                                                fullWidth
                                                required
                                                error={!!keyError}
                                                helperText={keyError}
                                                label='Key'
                                                margin='dense'
                                                name={keyKey}
                                                value={key}
                                                variant='outlined'
                                                onChange={this._onValueChange}/>
                                        </Grid>
                                        <Grid item xs={7}>
                                            <TextField
                                                fullWidth
                                                required
                                                error={!!valueError}
                                                helperText={valueError}
                                                InputProps={{
                                                    endAdornment: <InputAdornment position='end'>
                                                        <IconButton
                                                            aria-label='Toggle password visibility'
                                                            name={`toggle-${i}`}
                                                            onClick={this._togglePasswordVisibility}
                                                        >
                                                            {showPassword ? <VisibilityOffIcon/> : <VisibilityIcon/>}
                                                        </IconButton>
                                                    </InputAdornment>
                                                }}
                                                label='Value'
                                                margin='dense'
                                                name={valueKey}
                                                type={showPassword ? 'text' : 'password'}
                                                value={value}
                                                variant='outlined'
                                                onChange={this._onValueChange}/>
                                        </Grid>
                                    </Grid>
                                    <ListItemSecondaryAction>
                                        {i === secrets.length - 1 ?
                                            <IconButton aria-label='Add' onClick={() => {
                                                const updatedSecrets = [...secrets];
                                                updatedSecrets.push({
                                                    key: '',
                                                    value: ''
                                                });
                                                this.setState({
                                                    secrets: updatedSecrets
                                                });
                                            }}>
                                                <NoteAddIcon/>
                                            </IconButton>
                                            :
                                            <IconButton aria-label='Delete' onClick={() => {
                                                const updatedErrors = {...errors};
                                                delete updatedErrors[keyKey];
                                                delete updatedErrors[valueKey];
                                                const updatedSecrets = [...secrets];
                                                updatedSecrets.splice(i, 1);
                                                this.setState({
                                                    errors: updatedErrors,
                                                    secrets: updatedSecrets
                                                });
                                            }}>
                                                <DeleteIcon/>
                                            </IconButton>}
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </List>;
                        })}
                    </Paper>
                </DialogContent>
                <DialogActions>
                    <Button variant='text' onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type='submit' onClick={this._onSubmit}>
                        Create
                    </Button>
                </DialogActions>
            </form>
        </Dialog>;
    }
}

CreateUpdateSecretModal.defaultProps = {
    open: false,
    mode: 'create'
};

CreateUpdateSecretModal.propTypes = {
    classes: PropTypes.object.isRequired,
    createFolder: PropTypes.func.isRequired,
    error: PropTypes.string,
    initialPath: PropTypes.string.isRequired,
    mode: PropTypes.oneOf(['', 'create', 'update']),
    open: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    secrets: PropTypes.object
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
        ...state.kvReducer
    };
};

/**
 * Returns a map of methods used for dispatching actions to the store.
 *
 * @private
 * @param {function} dispatch Redux dispatch function.
 * @param {Object} ownProps The own comopnent props.
 * @returns {Object}
 */
const _mapDispatchToProps = (dispatch, ownProps) => {
    return {
        createFolder: (path) => {
            const {initialPath} = ownProps;
            let savePath = initialPath.split('/');
            savePath.splice(1, 0, 'data'); // The path for creating/saving a KV requires "data" as the second path after the initial mount path.
            dispatch(kvAction.saveSecret(`${savePath.join('/')}/${path}/${encodeURIComponent(' ')}`)); // Appending an empty space to force creation of a folder.
        }
    };
};

/**
 * Returns custom style overrides.
 *
 * @private
 * @param {Object} theme theme
 * @returns {Object}
 */
const _styles = (theme) => ({
    pathRoot: {
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        width: '100%'
    },
    folderIcon: {
        padding: 10,
    },
    confirmPathContainer: {
        display: 'flex',
        marginLeft: 'auto'
    },
    pathDivider: {
        width: 1,
        height: 28,
        margin: 4,
    },
    pathError: {
        margin: '0 !important',
        padding: '0 8px 8px 8px'
    },
    marginRight: {
        marginRight: theme.spacing.unit
    },
    marginBottom: {
        marginBottom: theme.spacing.unit
    },
    confirmPathIconButton: {
        padding: 10
    },
    listItem: {
        paddingTop: 0,
        paddingBottom: 0
    },
    keyField: {
        width: '35%'
    },
    valueField: {}
});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(CreateUpdateSecretModal));
