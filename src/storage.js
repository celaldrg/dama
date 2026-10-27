/**
 * Tiny localStorage wrapper. Every access is guarded, so private browsing,
 * blocked storage or a full quota never break the game.
 * Nothing is read at import time.
 */

const PREFIX = 'dama.';

/**
 * Reads a value saved with saveValue.
 * @param {string} key
 * @param {*} fallback - returned when nothing usable is stored or storage is unavailable
 * @returns {*}
 */
export function loadValue(key, fallback) {
  try {
    const raw = globalThis.localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Saves a value as JSON.
 * @param {string} key
 * @param {*} value - anything JSON can represent
 * @returns {boolean} false when the browser did not store it
 */
export function saveValue(key, value) {
  try {
    globalThis.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
