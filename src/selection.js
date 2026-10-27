/**
 * Turns taps on the board into moves. The player picks a piece, then taps a
 * square: the final square is usually enough, and when capture routes to
 * different positions share it, the landing squares can be tapped one by one.
 * Routes that lead to the same position are interchangeable, so the player may
 * follow any of them. The move lists come from generateRoutes (one entry per route).
 * Pure module: no DOM or browser globals.
 */

import { sameOutcome } from './rules.js';

/** @typedef {import('./rules.js').Move} Move */

/**
 * @typedef {{type: 'play', move: Move} | {type: 'extend', prefix: number[]} | {type: 'ambiguous'} | {type: 'none'}} TapResult
 * play: the tap identifies one resulting position, reached by `move`; extend: the chosen route gets longer;
 * ambiguous: routes to different positions use the square, tap an earlier landing square; none: not a target.
 */

/**
 * Squares holding a piece with at least one legal move.
 * @param {Move[]} moves - legal moves of the side to move
 * @returns {number[]} ascending
 */
export function movableSquares(moves) {
  return unique(moves.map((move) => move.from));
}

/**
 * Moves whose path starts with `prefix` (the piece's square, then the landing squares chosen so far).
 * @param {Move[]} moves
 * @param {number[]} prefix
 * @returns {Move[]}
 */
export function movesWithPrefix(moves, prefix) {
  return moves.filter((move) => prefix.every((square, i) => move.path[i] === square));
}

/**
 * What a tap on `square` means while `prefix` is selected. A tap on the next
 * landing square of a route wins over a tap on the final square of another.
 * When every route the tap fits leads to the same position, the first one is played.
 * @param {Move[]} moves - legal moves of the side to move, one per route
 * @param {number[]} prefix - selected piece's square followed by chosen landing squares
 * @param {number} square - tapped square
 * @returns {TapResult}
 */
export function resolveTap(moves, prefix, square) {
  const k = prefix.length;
  const through = movesWithPrefix(moves, prefix).filter((move) => move.path.indexOf(square, k) !== -1);
  const next = through.filter((move) => move.path[k] === square);
  const ending = through.filter((move) => move.to === square);
  const chosen = [next, ending, through].find((group) => group.length > 0);
  if (!chosen) return { type: 'none' };
  if (chosen.every((move) => sameOutcome(move, chosen[0]))) return { type: 'play', move: chosen[0] };
  const common = commonPrefix(chosen.map((move) => move.path));
  return common.length > k ? { type: 'extend', prefix: common } : { type: 'ambiguous' };
}

/**
 * What to highlight for a selection: the routes still possible, the squares
 * to tap next, their final squares and the pieces they capture.
 * @param {Move[]} moves - legal moves of the side to move, one per route
 * @param {number[]} prefix - selected piece's square followed by chosen landing squares
 * @returns {{routes: number[][], next: number[], finals: number[], captured: number[], chosenCaptures: number[]}}
 *   chosenCaptures are the pieces captured along `prefix` itself
 */
export function selectionHints(moves, prefix) {
  const candidates = movesWithPrefix(moves, prefix);
  const k = prefix.length;
  return {
    routes: candidates.filter((move) => move.captures.length > 0).map((move) => move.path.slice()),
    next: unique(candidates.filter((move) => move.path.length > k).map((move) => move.path[k])),
    finals: unique(candidates.map((move) => move.to)),
    captured: unique(candidates.flatMap((move) => move.captures)),
    chosenCaptures: candidates.length > 0 ? candidates[0].captures.slice(0, k - 1) : [],
  };
}

function commonPrefix(paths) {
  const [first, ...rest] = paths;
  let length = 0;
  while (length < first.length && rest.every((path) => path[length] === first[length])) length++;
  return first.slice(0, length);
}

function unique(squares) {
  return [...new Set(squares)].sort((a, b) => a - b);
}
