/* global expect, it */

import localStorageUtil from 'app/util/localStorageUtil';

const foo = 'bar';

it('sets and gets a valid item', () => {
    localStorageUtil.setItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN, foo);
    expect(localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN) === foo).toBeTruthy();
});


it('sets an invalid item', () => {
    let message = false;
    try {
        localStorageUtil.setItem(foo, foo);
    } catch (e) {
        message = e.message;
    }
    expect(message).toBeTruthy();
});

it('removes an item', () => {
    localStorageUtil.setItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN, foo);
    localStorageUtil.removeItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN);
    expect(localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN) === null).toBeTruthy();
});

it('clears all items', () => {
    localStorageUtil.setItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN, foo);
    localStorageUtil.clear();
    expect(localStorageUtil.getItem(localStorageUtil.KEY_NAMES.VAULT_TOKEN) === null).toBeTruthy();
});
