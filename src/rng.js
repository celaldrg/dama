/**
 * Seeded pseudo-random numbers (mulberry32), so AI choices are reproducible.
 * Pure module: no browser globals.
 */

/**
 * Creates a seeded random number generator.
 * @param {number} seed - any integer; the same seed always yields the same sequence
 * @returns {() => number} a function returning floats in [0, 1)
 */
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random integer in [0, n).
 * @param {() => number} rng - generator from createRng
 * @param {number} n - exclusive upper bound, at least 1
 * @returns {number}
 */
export function randomInt(rng, n) {
  return Math.floor(rng() * n);
}
