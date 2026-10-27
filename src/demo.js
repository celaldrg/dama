/**
 * The deterministic mid-game position shown with the ?demo query parameter.
 * Pure module: no DOM or browser globals.
 */

import { createGame } from './game.js';
import { WHITE, parseBoard } from './rules.js';

// White to move: the man on d3 must capture twice (d3xd5xd7 or d3xd5xb5);
// the white king on e8 is the only king on the board.
const DEMO_DIAGRAM = `
  . . . . W . . .
  . b b . . . b .
  b . . b . b . b
  . . b . . b . .
  . . . b . . . .
  . w . w w . w .
  w . w . . w . w
  . . . . . . . .
`;

/**
 * Builds the ?demo game: move 19, White to move with a forced capture and one king.
 * @returns {import('./game.js').Game}
 */
export function createDemoGame() {
  return createGame({ board: parseBoard(DEMO_DIAGRAM), turn: WHITE, startPly: 36 });
}
