/**
 * Module worker that picks the computer's move off the main thread.
 * Request: {id, board, side, level, seed}; reply: {id, path} (null when there is no move).
 */

import { chooseMove } from './ai.js';
import { createRng } from './rng.js';

self.addEventListener('message', (event) => {
  const { id, board, side, level, seed } = event.data;
  const move = chooseMove(board, side, { level, rng: createRng(seed) });
  self.postMessage({ id, path: move ? move.path : null });
});
