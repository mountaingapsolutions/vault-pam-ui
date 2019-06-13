import {
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    FormHelperText,
    Grid,
    IconButton,
    InputAdornment,
    InputBase,
    List,
    ListItem,
    ListItemSecondaryAction,
    Paper,
    Switch,
    TextField,
    Tooltip,
    Typography
} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles';
import CreateNewFolderIcon from '@material-ui/icons/CreateNewFolder';
import DeleteIcon from '@material-ui/icons/Delete';
import FolderIcon from '@material-ui/icons/Folder';
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import VisibilityIcon from '@material-ui/icons/Visibility';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';
import {toObject} from '@mountaingapsolutions/objectutil';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';

import secretAction from 'app/core/actions/secretAction';
import Button from 'app/core/components/Button';
import CodeEditorArea from 'app/core/components/CodeEditorArea';

import {createInProgressSelector} from 'app/util/actionStatusSelector';

/**
 * Modal to create or modify a secret.
 */
class CreateUpdateSecretModal extends Component {

    _defaultState = {
        displayAsJson: false,
        errors: {},
        loaded: false,
        newPaths: [''],
        saving: false,
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

        this._copySecret = this._copySecret.bind(this);
        this._createNewPath = this._createNewPath.bind(this);
        this._onPathValueChange = this._onPathValueChange.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
        this._onValueChange = this._onValueChange.bind(this);
        this._resetState = this._resetState.bind(this);
        this._setSecretsFromJson = this._setSecretsFromJson.bind(this);
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
        const {inProgress, mode, secrets} = props;
        const {loaded} = state;
        if ((mode === 'read' || mode === 'update') && !loaded && inProgress === false) {
            // Check if KV engine is version 2, as the resource data is different.
            const isV2 = secrets.data && secrets.metadata && secrets.data && secrets.metadata.version;
            let secretsData;
            if (isV2) {
                secretsData = {...secrets.data};
            } else {
                secretsData = {...secrets};
            }
            const derivedSecrets = Object.keys(secretsData).map(key => {
                return {
                    key,
                    value: secretsData[key],
                    showPassword: false
                };
            });
            return {
                secrets: mode === 'read' ? derivedSecrets : derivedSecrets.concat({ // Create an empty row if mode is update.
                    key: '',
                    value: '',
                    showPassword: false
                }),
                loaded: true
            };
        }
        return null;
    }

    /**
     * Copies the KV secrets to clipboard.
     *
     * @private
     * @param {SyntheticMouseEvent} event The event.
     */
    _copySecret(event) {
        event.preventDefault();
        const {displayAsJson, secrets} = this.state;

        const clipboard = document.createElement('textarea');
        const secretsToCopy = [...secrets].filter((secret) => !!secret.key);
        if (displayAsJson) {
            const secretsJsonFormat = toObject(secretsToCopy, 'key', (secret) => secret.value);
            clipboard.value = JSON.stringify(secretsJsonFormat, null, 4);
        } else {
            clipboard.value = secretsToCopy.reduce((previous, secret) => {
                return `${previous}${secret.key}=${secret.value}\r\n`;
            }, '');
        }
        clipboard.style.position = 'absolute';
        clipboard.style.left = '-9999px';
        clipboard.style.width = 0;
        clipboard.style.height = 0;
        // Append to the modal itself, as text underneath the modal is unselectable.
        const parentContainer = document.getElementById('create-new-folder-modal');
        parentContainer.appendChild(clipboard);
        clipboard.select();
        document.execCommand('copy');
        parentContainer.removeChild(clipboard);
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
        const {mode} = this.props;
        const {errors, newPaths, secrets} = this.state;
        const updatedErrors = {...errors};
        const errorMessage = 'Please fill out this field.';
        // Only need to validate the secrets path is if creating a new secret. Update mode does not allow to change secret paths.
        if (mode === 'create') {
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
        }
        const secretsToPersist = [...secrets];
        // Ignore the last secrets row if it's empty.
        if (secretsToPersist.length > 1) {
            const {key, value} = secretsToPersist[secretsToPersist.length - 1];
            if (!key && !value) {
                secretsToPersist.pop();
            }
        }
        secretsToPersist.forEach((secret, i) => {
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
        if (Object.keys(updatedErrors).filter(key => !!updatedErrors[key]).length > 0) {
            this.setState({
                errors: {
                    ...updatedErrors
                }
            });
        } else {
            this.setState({
                saving: true
            });
            const {onClose, saveSecret, secretsMounts} = this.props;
            const secretsMap = toObject(secretsToPersist, 'key', (secret) => secret.value);
            const promise = saveSecret(secretsMounts, newPaths, secretsMap);
            if (mode === 'create') {
                promise.then(() => onClose(true)).catch(() => onClose(false));
            } else {
                onClose(false);
            }
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
     * @param {string} name The button name.
     */
    _togglePasswordVisibility(event, name) {
        event.preventDefault();
        const {secrets} = this.state;
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
     * If valid JSON, remaps the JSON from the editor back onto state.
     *
     * @private
     * @param {string} jsonString The JSON string value from the code editor.
     */
    _setSecretsFromJson(jsonString) {
        try {
            const json = JSON.parse(jsonString);
            this.setState({
                secrets: Object.keys(json).map((key) => {
                    return {
                        key,
                        value: json[key],
                        showPassword: false
                    };
                })
            });
        } catch (err) {
            /* eslint-disable no-console */
            console.warn('Invalid JSON provided: ', err);
            /* eslint-enable no-console */
        }
    }

    /**
     * Renders a loader.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderLoadingProgress() {
        const {classes} = this.props;
        return <Paper elevation={1}>
            <Grid container justify='center'>
                <Grid item>
                    <CircularProgress className={classes.loader}/>
                </Grid>
            </Grid>
        </Paper>;
    }

    /**
     * Renders the paths input field.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderPathsInput() {
        const {classes, initialPath, mode} = this.props;
        const {displayAsJson, errors, newPaths} = this.state;
        const paths = initialPath.split('/');
        return <Paper className={classes.marginBottom} elevation={1}>
            <div className={classes.pathRoot}>
                <FolderIcon className={classes.folderIcon} color='disabled'/>
                <InputBase
                    autoFocus
                    fullWidth
                    required
                    className={classes.input}
                    disabled={mode !== 'create'}
                    error={!!errors.currentPath}
                    name='currentPath'
                    placeholder={mode === 'create' ? 'New path' : ''}
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
                {mode === 'create' && <div className={classes.confirmPathContainer}>
                    <Divider className={classes.pathDivider}/>
                    <Tooltip aria-label='Create New Path' title='Create New Path'>
                        <IconButton
                            aria-label='Create New Path'
                            className={classes.confirmPathIconButton}
                            color='primary'
                            onClick={this._createNewPath}>
                            <CreateNewFolderIcon/>
                        </IconButton>
                    </Tooltip>
                </div>}
            </div>
            {errors.currentPath &&
            <FormHelperText error className={classes.pathError}>{errors.currentPath}</FormHelperText>}
            <div className={classes.buttonRow}>
                <FormControlLabel
                    checked={displayAsJson}
                    classes={{
                        label: classes.fontSizeSmall
                    }}
                    control={
                        <Switch
                            checked={displayAsJson}
                            color='primary'
                            inputProps={{
                                'aria-label': 'Display as JSON'
                            }}
                            onChange={() => {
                                this.setState({
                                    displayAsJson: !displayAsJson
                                });
                            }}/>
                    }
                    label='JSON'
                    value={displayAsJson}
                />
                <Button color='default' variant='text' onClick={this._copySecret}>
                    Copy
                </Button>
            </div>
        </Paper>;
    }

    /**
     * Renders the secrets input area.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderSecretsList() {
        const {classes, mode} = this.props;
        const {errors, secrets} = this.state;

        return <Paper elevation={1}>
            <List>
                {secrets.map((secret, i) => {
                    const {key = '', value = '', showPassword} = secret;
                    const keyKey = `key-${i}`;
                    const keyError = errors[keyKey];
                    const valueKey = `value-${i}`;
                    const valueError = errors[valueKey];
                    return <ListItem className={classes.listItem} key={`secret-${i}`}>
                        <Grid container spacing={2}>
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
                                                className={classes.iconButton}
                                                onClick={(e) => {
                                                    this._togglePasswordVisibility(e, `toggle-${i}`);
                                                }}
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
                        {
                            mode !== 'read' && <ListItemSecondaryAction>
                                {i === secrets.length - 1 ?
                                    <IconButton aria-label='Add' className={classes.iconButton} onClick={() => {
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
                                    <IconButton aria-label='Delete' className={classes.iconButton} onClick={() => {
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
                        }
                    </ListItem>;
                })}
            </List>
        </Paper>;
    }

    /**
     * Renders the secrets input area using the CodeEditorArea component.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderSecretsListWithCodeEditor() {
        const {mode} = this.props;
        const {secrets} = this.state;
        const secretsToCopy = [...secrets].filter((secret) => !!secret.key);
        const secretsJsonFormat = toObject(secretsToCopy, 'key', (secret) => secret.value);
        return <Paper elevation={1}>
            <CodeEditorArea readOnly={mode === 'read'} value={JSON.stringify(secretsJsonFormat, null, 4)} onUnload={this._setSecretsFromJson}/>
        </Paper>;
    }

    /**
     * Renders the secrets input area using custom input base inputs.
     *
     * @private
     * @returns {React.ReactElement}
     */
    _renderSecretsListWithInputBase() {
        const {classes, mode} = this.props;
        const {errors, secrets} = this.state;
        return secrets.map((secret, i) => {
            const {key = '', value = '', showPassword} = secret;
            const keyKey = `key-${i}`;
            const keyError = errors[keyKey];
            const valueKey = `value-${i}`;
            const valueError = errors[valueKey];
            const togglePasswordLabel = `${showPassword ? 'Hide' : 'Show'} Password`;
            return <Paper elevation={1} key={`input-row-${i}`}>
                <div className={classes.inputRow}>
                    <InputBase
                        className={`${classes.input} ${classes.keyInput}`}
                        error={!!keyError}
                        name={keyKey}
                        placeholder='Key'
                        value={key}
                        onChange={this._onValueChange}
                    />
                    <InputBase
                        fullWidth
                        className={classes.input}
                        error={!!valueKey}
                        name={valueKey}
                        placeholder='Value'
                        type={showPassword ? 'text' : 'password'}
                        value={value}
                        onChange={this._onValueChange}
                    />
                    <Tooltip aria-label={togglePasswordLabel} title={togglePasswordLabel}>
                        <IconButton
                            aria-label={togglePasswordLabel}
                            className={classes.iconButton}
                            onClick={(e) => {
                                this._togglePasswordVisibility(e, `toggle-${i}`);
                            }}
                        >
                            {showPassword ? <VisibilityOffIcon/> : <VisibilityIcon/>}
                        </IconButton>
                    </Tooltip>
                    {
                        mode !== 'read' && <React.Fragment>
                            <Divider className={classes.pathDivider}/>
                            <Tooltip aria-label='Add' title='Add'>
                                {i === secrets.length - 1 ?
                                    <IconButton aria-label='Add' className={classes.iconButton} onClick={() => {
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
                                    <IconButton aria-label='Delete' className={classes.iconButton} onClick={() => {
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
                            </Tooltip>
                        </React.Fragment>
                    }
                </div>
                {(keyError || valueError) &&
                <FormHelperText error className={classes.pathError}>{keyError || valueError}</FormHelperText>}
            </Paper>;
        });
    }

    /**
     * If displaying secrets in JSON mode, do not wrap in a form element. Otherwise, this will result in a NPE stemming from Material UI.
     *
     * @private
     * @param {React.ReactElement} children The child elements.
     * @returns {React.ReactElement}
     */
    _renderContentContainer(children) {
        const {displayAsJson} = this.state;
        if (displayAsJson) {
            return children;
        } else {
            return <form autoComplete='off' onSubmit={this._onSubmit}>
                {children}
            </form>;
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
        const {classes, mode, onClose, open} = this.props;
        const {displayAsJson, loaded, saving} = this.state;
        let title;
        switch (mode) {
            case 'read':
                title = 'Secret';
                break;
            case 'update':
                title = 'Edit Secret';
                break;
            default:
                title = 'Create Secret';
        }
        const showLoader = mode !== 'create' && !loaded || saving;
        let contentArea;
        if (showLoader) {
            contentArea = this._renderLoadingProgress();
        } else if (displayAsJson) {
            contentArea = this._renderSecretsListWithCodeEditor();
        } else {
            contentArea = this._renderSecretsListWithInputBase();
        }
        return <Dialog fullWidth maxWidth='md' open={open} onClose={() => onClose(mode === 'read')} onExit={this._resetState}>
            {
                this._renderContentContainer(<React.Fragment>
                    <DialogTitle id='create-new-folder-modal'>
                        {title}
                    </DialogTitle>
                    <DialogContent>
                        {this._renderPathsInput()}
                        {contentArea}
                    </DialogContent>
                    {
                        mode === 'read' ?
                            <DialogActions>
                                <Button onClick={() => onClose(true)}>
                                    Close
                                </Button>
                            </DialogActions>
                            :
                            <DialogActions>
                                <Button variant='text' onClick={() => onClose(false)}>
                                    Cancel
                                </Button>
                                <Button disabled={saving || displayAsJson} type='submit' onClick={this._onSubmit}>
                                    {mode === 'create' ? 'Create' : 'Save'}
                                </Button>
                            </DialogActions>
                    }
                    {/* Trick to prevent browser save password popup. See https://stackoverflow.com/questions/32369/disable-browser-save-password-functionality. */}
                    <div className={classes.hidden}>
                        {/* And for whatever reason, it took 4 of these hidden fields to fully suppress it. */}
                        <input readOnly type='password' value='hidden'/>
                        <input readOnly type='password' value='hidden'/>
                        <input readOnly type='password' value='hidden'/>
                        <input readOnly type='password' value='hidden'/>
                    </div>
                </React.Fragment>)
            }
        </Dialog>;
    }
}

CreateUpdateSecretModal.defaultProps = {
    open: false,
    mode: 'create'
};

CreateUpdateSecretModal.propTypes = {
    classes: PropTypes.object.isRequired,
    error: PropTypes.string,
    initialPath: PropTypes.string.isRequired,
    inProgress: PropTypes.bool,
    mode: PropTypes.oneOf(['', 'create', 'read', 'update']),
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool,
    saveSecret: PropTypes.func.isRequired,
    secrets: PropTypes.object,
    secretsMounts: PropTypes.object
};

/**
 * Returns the Redux store's state that is relevant to this class as props.
 *
 * @private
 * @param {Object} state - The initial state.
 * @returns {Object}
 */
const _mapStateToProps = (state) => {
    const actionsUsed = [secretAction.ACTION_TYPES.GET_SECRETS, secretAction.ACTION_TYPES.UNWRAP_SECRET];
    return {
        inProgress: createInProgressSelector(actionsUsed)(state.actionStatusReducer),
        ...state.secretReducer
    };
};

/**
 * Returns a map of methods used for dispatching actions to the store.
 *
 * @private
 * @param {function} dispatch Redux dispatch function.
 * @param {Object} ownProps The own component props.
 * @returns {Object}
 */
const _mapDispatchToProps = (dispatch, ownProps) => {
    return {
        saveSecret: (secretsMounts, newPaths, secrets) => {
            const {initialPath} = ownProps;
            let savePath = initialPath.split('/');
            return new Promise((resolve, reject) => {
                const mount = (secretsMounts.data || []).find(m => savePath[0] === m.name.slice(0, -1));
                let secretsData;
                if (mount) {
                    const isV2 = mount.options.version === '2';
                    if (isV2) {
                        savePath.splice(1, 0, 'data'); // The path for creating/saving a KV requires "data" as the second path after the initial mount path.
                        secretsData = {
                            data: {
                                ...secrets
                            }
                        };
                    } else {
                        secretsData = {
                            ...secrets
                        };
                    }
                    const fullSavePath = `${savePath.join('/')}/${newPaths.join('/')}`;
                    dispatch(secretAction.saveSecret(fullSavePath.endsWith('/') ? fullSavePath.slice(0, -1) : fullSavePath, secretsData)).then(resolve).catch(reject);
                } else {
                    reject();
                }
            });
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
    buttonRow: {
        padding: '0 10px'
    },
    fontSizeSmall: {
        color: 'rgba(0, 0, 0, 0.87)',
        fontSize: '0.8125rem',
        fontWeight: 500
    },
    iconButton: {
        padding: 10
    },
    inputRow: {
        margin: '10px 0',
        display: 'flex',
        alignItems: 'center',
        width: '100%'
    },
    input: {
        margin: '0 10px'
    },
    keyInput: {
        width: 300
    },
    loader: {
        margin: 50
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
        marginRight: theme.spacing(1)
    },
    marginBottom: {
        marginBottom: theme.spacing(1)
    },
    confirmPathIconButton: {
        padding: 10
    },
    listItem: {
        paddingTop: 0,
        paddingBottom: 0
    },
    hidden: {
        display: 'none'
    }
});

export default connect(_mapStateToProps, _mapDispatchToProps)(withStyles(_styles)(CreateUpdateSecretModal));
