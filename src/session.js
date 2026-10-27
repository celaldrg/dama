/**
 * Game settings and the turn bookkeeping the interface needs: who plays which
 * side, how far Undo goes and which strings describe the game's state.
 * Pure module: no DOM or browser globals.
 */

import { BLACK, BLACK_KING, BLACK_MAN, EMPTY, WHITE, WHITE_KING, WHITE_MAN } from './rules.js';

/** @typedef {import('./game.js').GameState} GameState */

/**
 * @typedef {object} Settings
 * @property {'ai'|'two'} mode - against the computer or two players on one device
 * @property {'easy'|'medium'|'hard'} level - computer strength
 * @property {number} color - the human's side against the computer: WHITE or BLACK
 */

export const MODES = Object.freeze(['ai', 'two']);
export const LEVEL_NAMES = Object.freeze(['easy', 'medium', 'hard']);

/** @type {Readonly<Settings>} */
export const DEFAULT_SETTINGS = Object.freeze({ mode: 'ai', level: 'medium', color: WHITE });

const LEVEL_KEYS = Object.freeze({ easy: 'levelEasy', medium: 'levelMedium', hard: 'levelHard' });
const SQUARE_KEYS = Object.freeze({
  [EMPTY]: 'squareEmpty',
  [WHITE_MAN]: 'squareWhiteMan',
  [WHITE_KING]: 'squareWhiteKing',
  [BLACK_MAN]: 'squareBlackMan',
  [BLACK_KING]: 'squareBlackKing',
});

/**
 * Valid settings built from any value (such as a stored one); bad fields get defaults.
 * @param {unknown} raw
 * @returns {Settings}
 */
export function normalizeSettings(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {};
  return {
    mode: MODES.includes(source.mode) ? source.mode : DEFAULT_SETTINGS.mode,
    level: LEVEL_NAMES.includes(source.level) ? source.level : DEFAULT_SETTINGS.level,
    color: source.color === BLACK ? BLACK : WHITE,
  };
}

/**
 * Whether a person makes the next move.
 * @param {Settings} settings
 * @param {number} turn - side to move
 * @returns {boolean}
 */
export function isHumanTurn(settings, turn) {
  return settings.mode === 'two' || turn === settings.color;
}

/**
 * Plies one press of Undo takes back: one in a two-player game; against the
 * computer, back to the human's previous turn. 0 when that is not possible.
 * @param {Settings} settings
 * @param {number} turn - side to move now
 * @param {number} played - plies played in this game so far
 * @returns {number}
 */
export function pliesToUndo(settings, turn, played) {
  if (settings.mode === 'two') return played > 0 ? 1 : 0;
  const plies = turn === settings.color ? 2 : 1;
  return played >= plies ? plies : 0;
}

/**
 * i18n key of a computer level's name.
 * @param {string} level
 * @returns {string}
 */
export function levelKey(level) {
  return LEVEL_KEYS[level] ?? LEVEL_KEYS[DEFAULT_SETTINGS.level];
}

/**
 * i18n key describing a square's content for screen readers, e.g. "{square}, white king".
 * @param {number} piece - value on the square
 * @returns {string}
 */
export function squareKey(piece) {
  return SQUARE_KEYS[piece] ?? SQUARE_KEYS[EMPTY];
}

/**
 * i18n key saying whose turn it is while the game goes on.
 * @param {Settings} settings
 * @param {number} turn - side to move
 * @returns {string}
 */
export function turnKey(settings, turn) {
  if (settings.mode === 'ai') return turn === settings.color ? 'yourMove' : 'thinking';
  return turn === WHITE ? 'whiteToMove' : 'blackToMove';
}

/**
 * i18n keys of a finished game's headline and reason, or null while it goes on.
 * @param {GameState} state
 * @param {Settings} settings
 * @returns {{title: string, reason: string}|null}
 */
export function outcomeKeys(state, settings) {
  if (state.status === 'playing') return null;
  const reason = reasonKey(state);
  if (state.status === 'draw') return { title: 'draw', reason };
  if (settings.mode === 'ai') return { title: state.winner === settings.color ? 'youWin' : 'youLose', reason };
  return { title: state.winner === WHITE ? 'winWhite' : 'winBlack', reason };
}

function reasonKey(state) {
  if (state.reason === 'repetition') return 'reasonRepetition';
  if (state.reason === 'fifty-moves') return 'reasonFiftyMoves';
  const loser = state.winner === WHITE ? 'Black' : 'White';
  return state.reason === 'no-pieces' ? `reasonNoPieces${loser}` : `reasonNoMoves${loser}`;
}
