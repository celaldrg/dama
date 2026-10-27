/**
 * Computer opponent: iterative-deepening negamax with alpha-beta pruning.
 * Moves come from the rules' generator, so captures are mandatory and maximal;
 * forced capture chains are searched past the depth limit. The evaluation
 * counts material and how far men have advanced.
 * Pure module: no DOM or browser globals; randomness comes from an injected RNG.
 */

import {
  EMPTY,
  SIZE,
  canCapture,
  canStep,
  generateMoves,
  isKing,
  makeMove,
  unmakeMove,
} from './rules.js';
import { createRng, randomInt } from './rng.js';

/** @typedef {import('./rules.js').Move} Move */

/**
 * Difficulty levels. depth: search plies; margin: root moves scoring within
 * this many points of the best are picked at random; blunder: chance of a
 * random legal move; nodeLimit: search budget that bounds thinking time.
 */
export const LEVELS = Object.freeze({
  easy: Object.freeze({ depth: 1, margin: 60, blunder: 0.2, nodeLimit: 20000 }),
  medium: Object.freeze({ depth: 4, margin: 12, blunder: 0, nodeLimit: 100000 }),
  hard: Object.freeze({ depth: 8, margin: 0, blunder: 0, nodeLimit: 200000 }),
});

const MAN_VALUE = 100;
const KING_VALUE = 300;
const ADVANCE_BONUS = [0, 0, 3, 6, 10, 15, 22, 30]; // indexed by ranks from the home edge
const WIN_SCORE = 100000;
const DECISIVE_SCORE = WIN_SCORE - 1000;
const MAX_EXTENSION = 8; // extra plies for forced captures beyond the depth limit

/**
 * Static evaluation of a position.
 * @param {number[]} board
 * @param {number} side - WHITE or BLACK
 * @returns {number} positive when `side` stands better
 */
export function evaluate(board, side) {
  let score = 0;
  for (let square = 0; square < board.length; square++) {
    const piece = board[square];
    if (piece !== EMPTY) score += pieceValue(piece, square);
  }
  return score * side;
}

/** Value of a piece for White (negative for Black's pieces). */
function pieceValue(piece, square) {
  if (isKing(piece)) return piece > 0 ? KING_VALUE : -KING_VALUE;
  const row = Math.floor(square / SIZE);
  return piece > 0 ? MAN_VALUE + ADVANCE_BONUS[SIZE - 1 - row] : -(MAN_VALUE + ADVANCE_BONUS[row]);
}

/**
 * Chooses a move for `side`.
 * @param {number[]} board - current position (not modified)
 * @param {number} side - side to move: WHITE or BLACK
 * @param {object} [options]
 * @param {'easy'|'medium'|'hard'} [options.level] - difficulty, 'medium' by default
 * @param {() => number} [options.rng] - seeded generator from createRng (fixed seed if omitted)
 * @returns {Move|null} null when `side` has no legal move
 */
export function chooseMove(board, side, options = {}) {
  const level = Object.hasOwn(LEVELS, options.level) ? LEVELS[options.level] : LEVELS.medium;
  const rng = options.rng ?? createRng(1);
  const work = board.slice();
  let moves = generateMoves(work, side);
  if (moves.length <= 1) return moves[0] ?? null;
  if (level.blunder > 0 && rng() < level.blunder) return moves[randomInt(rng, moves.length)];
  const search = { nodes: 0, limit: level.nodeLimit, exhausted: false, killers: [] };
  let candidates = moves;
  for (let depth = 1; depth <= level.depth; depth++) {
    const result = scoreRootMoves(work, side, moves, depth, level.margin, search);
    if (!result) break; // out of budget: keep the last completed depth
    const ranked = moves
      .map((move, i) => ({ move, score: result.scores[i] }))
      .sort((a, b) => b.score - a.score);
    moves = ranked.map((entry) => entry.move);
    candidates = ranked
      .filter((entry) => entry.score >= result.best - level.margin)
      .map((entry) => entry.move);
    if (Math.abs(result.best) >= DECISIVE_SCORE) break; // a forced win or loss is already seen
  }
  return candidates[randomInt(rng, candidates.length)];
}

/**
 * Scores every root move. Moves within `margin` of the best get exact scores;
 * the others only need to be proven worse, which keeps pruning effective.
 * Returns null when the node budget ran out.
 */
function scoreRootMoves(board, side, moves, depth, margin, search) {
  const scores = [];
  let best = -Infinity;
  for (const move of moves) {
    const floor = best - margin - 1;
    makeMove(board, move);
    const score = -negamax(board, -side, depth - 1, -Infinity, -floor, 1, search);
    unmakeMove(board, move);
    if (search.exhausted) return null;
    scores.push(score);
    best = Math.max(best, score);
  }
  return { best, scores };
}

/**
 * Fail-soft negamax alpha-beta; scores are from the point of view of `side`.
 * Past the depth limit only forced captures are searched further.
 */
function negamax(board, side, depth, alpha, beta, ply, search) {
  search.nodes++;
  if (depth <= 0) {
    const mustCapture = canCapture(board, side);
    if (!mustCapture || depth <= -MAX_EXTENSION) {
      return mustCapture || canStep(board, side) ? evaluate(board, side) : ply - WIN_SCORE;
    }
  }
  const moves = generateMoves(board, side);
  if (moves.length === 0) return ply - WIN_SCORE; // no legal move: `side` has lost
  if (search.nodes >= search.limit) {
    search.exhausted = true;
    return 0;
  }
  tryKillerFirst(moves, search.killers[ply]);
  let best = -Infinity;
  for (const move of moves) {
    makeMove(board, move);
    const score = -negamax(board, -side, depth - 1, -beta, -alpha, ply + 1, search);
    unmakeMove(board, move);
    if (search.exhausted) return 0;
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      search.killers[ply] = moveId(move);
      break;
    }
  }
  return best;
}

/** Identifies a move by its start and end squares, which is enough for move ordering. */
function moveId(move) {
  return move.from * 64 + move.to;
}

/** Puts first the move that last caused a cut-off at this ply, if it is legal here. */
function tryKillerFirst(moves, killer) {
  const index = moves.findIndex((move) => moveId(move) === killer);
  if (index > 0) [moves[0], moves[index]] = [moves[index], moves[0]];
}
