/**
 * A game of Turkish draughts: turn order, move history with undo, and the
 * end-of-game rules (win, threefold repetition, 50-move rule).
 * Pure module: no DOM or browser globals.
 */

import {
  WHITE,
  countPieces,
  generateRoutes,
  initialBoard,
  isKing,
  makeMove,
  positionKey,
  unmakeMove,
} from './rules.js';

/** @typedef {import('./rules.js').Move} Move */

/** Plies (50 moves per side) without a capture or a man move that end the game in a draw. */
export const QUIET_PLY_LIMIT = 100;

/** Occurrences of the same position, same side to move, that end the game in a draw. */
export const REPETITION_LIMIT = 3;

/**
 * Snapshot of a game; every array is a copy.
 * @typedef {object} GameState
 * @property {number[]} board - the 64 squares
 * @property {number} turn - side to move: WHITE or BLACK
 * @property {Move[]} moves - legal moves, empty once the game is over; a capture that can
 *   reach its position over different landing squares is listed once per route (see generateRoutes)
 * @property {boolean} mustCapture - the legal moves are (maximum) captures
 * @property {'playing'|'win'|'draw'} status
 * @property {number} winner - WHITE, BLACK or 0
 * @property {null|'no-pieces'|'no-moves'|'repetition'|'fifty-moves'} reason - why the game ended
 * @property {number} ply - half-moves played, counting `startPly`
 * @property {number} moveNumber - full-move counter starting at 1
 * @property {number} quietPlies - plies since the last capture or man move
 * @property {Move|null} lastMove
 * @property {boolean} canUndo
 * @property {{white: {men: number, kings: number}, black: {men: number, kings: number}}} pieces
 */

/**
 * @typedef {object} Game
 * @property {() => GameState} getState - current snapshot
 * @property {(move: Move|number[]) => (Move|null)} play - plays a legal move, given as a move
 *   or as the full path of squares of any of its routes; returns the move played, or null if it is not legal
 * @property {() => boolean} undo - takes back the last ply; false when there is none
 */

/**
 * Creates a game. White moves first unless `turn` says otherwise.
 * @param {object} [options]
 * @param {number[]} [options.board] - starting position (default: the initial setup)
 * @param {number} [options.turn] - side to move first: WHITE or BLACK
 * @param {number} [options.startPly] - plies already played before `board`, for the move counter
 * @returns {Game}
 */
export function createGame(options = {}) {
  const board = (options.board ?? initialBoard()).slice();
  const startPly = options.startPly ?? 0;
  const history = [];
  const seen = new Map();
  let turn = options.turn ?? WHITE;
  let quietPlies = 0;
  let key = '';
  let moves = [];
  let outcome = null;

  enterPosition();

  function enterPosition() {
    key = positionKey(board, turn);
    seen.set(key, (seen.get(key) ?? 0) + 1);
    refresh();
  }

  function refresh() {
    moves = generateRoutes(board, turn);
    outcome = judge(board, turn, moves, seen.get(key), quietPlies);
  }

  function play(input) {
    const path = Array.isArray(input) ? input : input?.path;
    const move = outcome || !path ? undefined : moves.find((m) => samePath(m.path, path));
    if (!move) return null;
    history.push({ move, quietPlies, key });
    makeMove(board, move);
    quietPlies = move.captures.length > 0 || !isKing(move.piece) ? 0 : quietPlies + 1;
    turn = -turn;
    enterPosition();
    return cloneMove(move);
  }

  function undo() {
    const last = history.pop();
    if (!last) return false;
    const count = seen.get(key);
    if (count > 1) seen.set(key, count - 1);
    else seen.delete(key);
    unmakeMove(board, last.move);
    turn = -turn;
    quietPlies = last.quietPlies;
    key = last.key;
    refresh();
    return true;
  }

  function getState() {
    const ply = startPly + history.length;
    const last = history[history.length - 1];
    const live = outcome ? [] : moves;
    return {
      board: board.slice(),
      turn,
      moves: live.map(cloneMove),
      mustCapture: live.length > 0 && live[0].captures.length > 0,
      status: outcome ? outcome.status : 'playing',
      winner: outcome ? outcome.winner : 0,
      reason: outcome ? outcome.reason : null,
      ply,
      moveNumber: Math.floor(ply / 2) + 1,
      quietPlies,
      lastMove: last ? cloneMove(last.move) : null,
      canUndo: history.length > 0,
      pieces: countPieces(board),
    };
  }

  return { getState, play, undo };
}

/** Result for the side to move, or null while the game goes on. */
function judge(board, turn, moves, repetitions, quietPlies) {
  if (moves.length === 0) {
    const hasPieces = board.some((piece) => piece * turn > 0);
    return { status: 'win', winner: -turn, reason: hasPieces ? 'no-moves' : 'no-pieces' };
  }
  if (repetitions >= REPETITION_LIMIT) return { status: 'draw', winner: 0, reason: 'repetition' };
  if (quietPlies >= QUIET_PLY_LIMIT) return { status: 'draw', winner: 0, reason: 'fifty-moves' };
  return null;
}

function samePath(a, b) {
  return a.length === b.length && a.every((square, i) => square === b[i]);
}

function cloneMove(move) {
  return {
    ...move,
    path: move.path.slice(),
    captures: move.captures.slice(),
    capturedPieces: move.capturedPieces.slice(),
  };
}
