import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, randomInt } from '../src/rng.js';

test('createRng repeats the same sequence for the same seed and stays in [0, 1)', () => {
  const draw = (seed) => {
    const rng = createRng(seed);
    return Array.from({ length: 1000 }, () => rng());
  };
  const first = draw(42);
  assert.deepEqual(first, draw(42));
  assert.notDeepEqual(first, draw(43));
  assert.ok(first.every((x) => x >= 0 && x < 1));
});

test('randomInt covers the whole range and nothing outside it', () => {
  const rng = createRng(7);
  const seen = new Set(Array.from({ length: 200 }, () => randomInt(rng, 5)));
  assert.deepEqual([...seen].sort(), [0, 1, 2, 3, 4]);
});
