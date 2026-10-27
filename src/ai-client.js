/**
 * Runs the computer player in a module worker so the page stays responsive
 * while it thinks. If a worker cannot be started (or fails), the search runs
 * on the main thread instead.
 */

import { chooseMove } from './ai.js';
import { createRng } from './rng.js';

/**
 * @typedef {object} ThinkRequest
 * @property {number[]} board
 * @property {number} side - side to move
 * @property {'easy'|'medium'|'hard'} level
 * @property {number} seed - seed for the computer's random choices
 */

/**
 * Creates the computer player. The worker is only started on the first request.
 * @returns {{think: (request: ThinkRequest) => Promise<number[]|null>}} think resolves
 *   with the path of the chosen move, or null when there is no legal move
 */
export function createAiClient() {
  const pending = new Map(); // request id -> {request, resolve}
  let worker = null;
  let workerBroken = false;
  let nextId = 1;

  function settle(id, path) {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    entry.resolve(path);
  }

  function computeHere(id) {
    const entry = pending.get(id);
    if (!entry) return;
    const { board, side, level, seed } = entry.request;
    // Defer so the "thinking" state is painted before the search blocks the page.
    setTimeout(() => {
      const move = chooseMove(board, side, { level, rng: createRng(seed) });
      settle(id, move ? move.path : null);
    }, 30);
  }

  function abandonWorker() {
    workerBroken = true;
    worker?.terminate();
    worker = null;
    for (const id of pending.keys()) computeHere(id);
  }

  function getWorker() {
    if (worker || workerBroken) return worker;
    try {
      worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
      worker.addEventListener('message', (event) => settle(event.data.id, event.data.path));
      worker.addEventListener('error', abandonWorker);
    } catch {
      workerBroken = true;
    }
    return worker;
  }

  function think(request) {
    return new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, { request, resolve });
      const target = getWorker();
      if (target) target.postMessage({ id, ...request });
      else computeHere(id);
    });
  }

  return { think };
}
