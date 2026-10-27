import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadValue, saveValue } from '../src/storage.js';

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

/** Installs a stand-in for window.localStorage. */
function useStorage(value) {
  Object.defineProperty(globalThis, 'localStorage', { value, configurable: true, writable: true });
}

function memoryStorage() {
  const items = new Map();
  return {
    items,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else delete globalThis.localStorage;
});

test('values round-trip as JSON under a namespaced key', () => {
  const storage = memoryStorage();
  useStorage(storage);
  assert.equal(saveValue('settings', { mode: 'two', level: 'hard', color: -1 }), true);
  assert.equal(saveValue('lang', 'tr'), true);
  assert.deepEqual(loadValue('settings', null), { mode: 'two', level: 'hard', color: -1 });
  assert.equal(loadValue('lang', 'en'), 'tr');
  assert.deepEqual([...storage.items.keys()].sort(), ['dama.lang', 'dama.settings']);
});

test('missing or corrupt values give the fallback', () => {
  const storage = memoryStorage();
  useStorage(storage);
  assert.equal(loadValue('lang', 'en'), 'en');
  storage.items.set('dama.settings', '{not json');
  assert.equal(loadValue('settings', 'fallback'), 'fallback');
});

test('no storage at all (as in some embedded browsers) never throws', () => {
  useStorage(undefined);
  assert.equal(loadValue('lang', 'en'), 'en');
  assert.equal(saveValue('lang', 'tr'), false);
});

test('storage that throws (private mode, full quota, blocked cookies) never throws', () => {
  useStorage({
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
  });
  assert.equal(loadValue('lang', 'en'), 'en');
  assert.equal(saveValue('lang', 'tr'), false);
});
