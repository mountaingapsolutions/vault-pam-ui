/* global expect, it */

import {createErrorsSelector, createInProgressSelector} from 'app/util/actionStatusSelector';

it('create errors selector', () => {
    const actionsUsed = [
        'foo'
    ];
    let state = {
        errors: {
            foo: 'bar'
        }
    };
    expect(createErrorsSelector(actionsUsed)(state) === state.errors.foo).toBeTruthy();

    state = {
        errors: {}
    };
    expect(createErrorsSelector(actionsUsed)(state) === '').toBeTruthy();
});

it('create inProgress selector', () => {
    const actionsUsed = [
        'foo',
        'bar'
    ];
    let state = {
        inProgress: {foo: true}
    };
    expect(createInProgressSelector(actionsUsed)(state)).toBeTruthy();
    state = {
        inProgress: {foo: false}
    };
    expect(createInProgressSelector(actionsUsed)(state)).toBeFalsy();

    state = {
        inProgress: {bar: true}
    };
    expect(createInProgressSelector(actionsUsed)(state)).toBeTruthy();
    state = {
        inProgress: {bar: false}
    };
    expect(createInProgressSelector(actionsUsed)(state)).toBeFalsy();
});
