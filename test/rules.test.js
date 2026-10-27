import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLACK,
  BLACK_KING,
  BLACK_MAN,
  EMPTY,
  WHITE,
  WHITE_KING,
  WHITE_MAN,
  applyMove,
  boardToText,
  canCapture,
  canStep,
  countPieces,
  generateMoves,
  generateRoutes,
  initialBoard,
  makeMove,
  moveToString,
  parseBoard,
  parseSquare,
  sameOutcome,
  squareName,
  unmakeMove,
} from '../src/rules.js';

/** Sorted notations of every legal move, e.g. ['d3-d4', 'e3xe5']. */
function notations(board, side) {
  return generateMoves(board, side).map(moveToString).sort();
}

/** Sorted destination squares of the moves starting on `from`. */
function targetsFrom(board, side, from) {
  return generateMoves(board, side)
    .filter((move) => move.from === parseSquare(from))
    .map((move) => squareName(move.to))
    .sort();
}

function legalMove(board, side, notation) {
  const move = generateMoves(board, side).find((m) => moveToString(m) === notation);
  assert.ok(move, `expected ${notation} to be legal`);
  return move;
}

describe('board model', () => {
  test('squares use algebraic names: a8 is the top-left, h1 the bottom-right', () => {
    assert.equal(squareName(0), 'a8');
    assert.equal(squareName(63), 'h1');
    assert.equal(parseSquare('d3'), 43);
    for (let square = 0; square < 64; square++) assert.equal(parseSquare(squareName(square)), square);
    assert.throws(() => parseSquare('i9'), /Invalid square/);
  });

  test('parseBoard reads diagrams that boardToText writes back', () => {
    const diagram = [
      '. . . . W . . .',
      '. b b . . . b .',
      'b . . b . b . b',
      '. . b . . B . .',
      '. . . b . . . .',
      '. w . w w . w .',
      'w . w . . w . w',
      '. . . . . . . .',
    ].join('\n');
    const board = parseBoard(diagram);
    assert.equal(boardToText(board), diagram);
    assert.equal(board[parseSquare('e8')], WHITE_KING);
    assert.equal(board[parseSquare('f5')], BLACK_KING);
    assert.equal(board[parseSquare('d3')], WHITE_MAN);
    assert.equal(board[parseSquare('d4')], BLACK_MAN);
    assert.equal(board[parseSquare('a1')], EMPTY);
    assert.throws(() => parseBoard('. . .'), /expected 64 cells/);
    assert.throws(() => parseBoard('x'.repeat(64)), /unknown cell/);
  });

  test('the initial position has 16 men per side on their second and third ranks', () => {
    const board = initialBoard();
    assert.deepEqual(countPieces(board), { white: { men: 16, kings: 0 }, black: { men: 16, kings: 0 } });
    assert.equal(
      boardToText(board),
      [
        '. . . . . . . .',
        'b b b b b b b b',
        'b b b b b b b b',
        '. . . . . . . .',
        '. . . . . . . .',
        'w w w w w w w w',
        'w w w w w w w w',
        '. . . . . . . .',
      ].join('\n'),
    );
    const files = [...'abcdefgh'];
    assert.deepEqual(notations(board, WHITE), files.map((f) => `${f}3-${f}4`));
    assert.deepEqual(notations(board, BLACK), files.map((f) => `${f}6-${f}5`));
  });
});

describe('men', () => {
  test('a man steps one square forward or sideways, never backward or diagonally', () => {
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . b . . .
      . . . w . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
    `);
    assert.deepEqual(notations(board, WHITE), ['d4-c4', 'd4-d5', 'd4-e4']);
    assert.deepEqual(notations(board, BLACK), ['e5-d5', 'e5-e4', 'e5-f5']);
  });

  test('board edges and neighbouring pieces block steps', () => {
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      w w . . . . . .
      . . . . . . . w
      . . . . . . w w
      . . . . . . . .
    `);
    assert.deepEqual(notations(board, WHITE), [
      'a4-a5',
      'b4-b5',
      'b4-c4',
      'g2-f2',
      'g2-g3',
      'h3-g3',
      'h3-h4',
    ]);
  });

  test('a man captures an adjacent enemy forward or sideways, never backward or diagonally', () => {
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . b b . . . .
      . . . w b . . .
      . . . b . . . .
      . . . . . . . .
      . . . . . . . .
    `);
    assert.deepEqual(notations(board, WHITE), ['d4xd6', 'd4xf4']);
  });

  test('capturing is mandatory: no simple step is legal while a capture exists', () => {
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . b . . . .
      . . . w . . . .
      . . . . . . . .
      w . . . . . . .
      . . . . . . . .
    `);
    assert.equal(canCapture(board, WHITE), true);
    assert.deepEqual(notations(board, WHITE), ['d4xd6']);
  });

  test('a man reaching the last rank is promoted to a king', () => {
    const board = parseBoard(`
      . . . . . . . .
      . w . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . b .
      . . . . . . . .
    `);
    const crowning = legalMove(board, WHITE, 'b7-b8');
    assert.equal(crowning.promotes, true);
    assert.equal(applyMove(board, crowning)[parseSquare('b8')], WHITE_KING);
    const sideways = legalMove(board, WHITE, 'b7-a7');
    assert.equal(sideways.promotes, false);
    assert.equal(applyMove(board, sideways)[parseSquare('a7')], WHITE_MAN);
    const blackCrowning = legalMove(board, BLACK, 'g2-g1');
    assert.equal(applyMove(board, blackCrowning)[parseSquare('g1')], BLACK_KING);
  });

  test('a man reaching the last rank mid-capture goes on as a man and is crowned at the end', () => {
    // As a king on e8 it could also take e6; a man cannot capture backward.
    const board = parseBoard(`
      . . . b . . . .
      . . b . . . . .
      . . w . b . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
    `);
    assert.deepEqual(notations(board, WHITE), ['c6xc8xe8']);
    const move = legalMove(board, WHITE, 'c6xc8xe8');
    assert.equal(move.promotes, true);
    const after = applyMove(board, move);
    assert.equal(after[parseSquare('e8')], WHITE_KING);
    assert.equal(after[parseSquare('e6')], BLACK_MAN);
    assert.deepEqual(countPieces(after), { white: { men: 0, kings: 1 }, black: { men: 1, kings: 0 } });
  });
});

describe('multi-captures and the maximum-capture rule', () => {
  test('only the sequence capturing the most pieces is legal, whichever piece makes it', () => {
    // d3 can take two pieces, g3 only one.
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . b . . . .
      . . . . . . . .
      . . . b . . b .
      . . . w . . w .
      . . . . . . . .
      . . . . . . . .
    `);
    assert.deepEqual(notations(board, WHITE), ['d3xd5xd7']);
  });

  test('a piece must follow the branch that captures the most and loses every captured piece', () => {
    // From d5 the man may go up (two captures in total) or left (three in total).
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . b . b . . . .
      . . b . . . . .
      . . . b . . . .
      . . . w . . . .
      . . . . . . . .
      . . . . . . . .
    `);
    assert.deepEqual(notations(board, WHITE), ['d3xd5xb5xb7']);
    const move = legalMove(board, WHITE, 'd3xd5xb5xb7');
    assert.deepEqual(move.captures.map(squareName), ['d4', 'c5', 'b6']);
    assert.deepEqual(move.capturedPieces, [BLACK_MAN, BLACK_MAN, BLACK_MAN]);
    assert.equal(
      boardToText(applyMove(board, move)),
      [
        '. . . . . . . .',
        '. w . . . . . .',
        '. . . b . . . .',
        '. . . . . . . .',
        '. . . . . . . .',
        '. . . . . . . .',
        '. . . . . . . .',
        '. . . . . . . .',
      ].join('\n'),
    );
  });

  test('captured pieces leave the board at once, so a king may cross their squares later in the move', () => {
    // The last jump (h3 to a3) passes over d3, captured by the first jump.
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . b . .
      . . . . . . . b
      . b . b . . . .
      . . . . . . . w
      . . . W . . . .
    `);
    assert.deepEqual(notations(board, WHITE), ['d1xd5xh5xh3xa3']);
    const [move] = generateMoves(board, WHITE);
    assert.deepEqual(move.captures.map(squareName), ['d3', 'f5', 'h4', 'b3']);
    const after = applyMove(board, move);
    assert.deepEqual(countPieces(after), { white: { men: 1, kings: 1 }, black: { men: 0, kings: 0 } });
    assert.equal(after[parseSquare('a3')], WHITE_KING);
  });

  test('a king may not turn 180 degrees between two jumps', () => {
    // After taking f4 the king may not come back over d4 to take b4, nor the other way round.
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . b . W . b . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
    `);
    assert.deepEqual(notations(board, WHITE), ['d4xa4', 'd4xg4', 'd4xh4']);
  });

  test('sequences that end in the same position are listed once, while generateRoutes keeps every route', () => {
    // Landing on a4 or a5 before taking a6 leads to the same two outcomes.
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      b . . . . . . .
      . . . . . . . .
      . . . . . . . .
      b . . . . . . .
      . . . . . . . .
      W . . . . . . .
    `);
    assert.deepEqual(notations(board, WHITE), ['a1xa4xa7', 'a1xa4xa8']);
    const routes = generateRoutes(board, WHITE);
    assert.deepEqual(routes.map(moveToString), ['a1xa4xa7', 'a1xa4xa8', 'a1xa5xa7', 'a1xa5xa8']);
    const [viaA4, viaA4ToA8, viaA5] = routes;
    assert.equal(sameOutcome(viaA4, viaA5), true);
    assert.equal(sameOutcome(viaA4, viaA4ToA8), false);
    assert.deepEqual(viaA5.captures.map(squareName), ['a3', 'a6']);
    assert.deepEqual(applyMove(board, viaA5), applyMove(board, viaA4));
  });

  test('generateRoutes adds nothing when every move has a single route', () => {
    // Steps, and a king capture whose landing squares end in different positions.
    const flyingCapture = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      b . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      W . . . . . . .
    `);
    for (const [board, side] of [[initialBoard(), BLACK], [flyingCapture, WHITE]]) {
      assert.deepEqual(generateRoutes(board, side), generateMoves(board, side));
    }
    assert.equal(generateRoutes(flyingCapture, WHITE).length, 3);
  });
});

describe('flying kings', () => {
  test('a king slides any distance along ranks and files, but not diagonally or through pieces', () => {
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . w . . . .
      . . . . . . . .
      . . . W . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
    `);
    assert.deepEqual(targetsFrom(board, WHITE, 'd4'), [
      'a4', 'b4', 'c4', 'd1', 'd2', 'd3', 'd5', 'e4', 'f4', 'g4', 'h4',
    ]);
  });

  test('a king captures from a distance and may land on any empty square beyond', () => {
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      b . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      W . . . . . . .
    `);
    assert.deepEqual(notations(board, WHITE), ['a1xa6', 'a1xa7', 'a1xa8']);
  });

  test('a king cannot jump two pieces in a row or over its own pieces', () => {
    const board = parseBoard(`
      . . . . . . . .
      . . . b . . . .
      . . . b . . . .
      . . . . . . . .
      . b b W . w b b
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
    `);
    assert.equal(canCapture(board, WHITE), false);
    assert.deepEqual(targetsFrom(board, WHITE, 'd4'), ['d1', 'd2', 'd3', 'd5', 'e4']);
  });

  test('a flying king must choose the landing square that lets it capture the most', () => {
    // Only from a7 can the king go on to take c7.
    const board = parseBoard(`
      . . . . . . . .
      . . b . . . . .
      . . . . . . . .
      b . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      W . . . . . . .
    `);
    assert.deepEqual(notations(board, WHITE), [
      'a1xa7xd7',
      'a1xa7xe7',
      'a1xa7xf7',
      'a1xa7xg7',
      'a1xa7xh7',
    ]);
    assert.ok(generateMoves(board, WHITE).every((move) => move.captures.length === 2));
  });
});

describe('applying moves', () => {
  test('makeMove and unmakeMove are exact inverses, applyMove leaves its input alone', () => {
    const board = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . b . .
      . . . . . . . b
      . b . b . . . .
      . . . . . . . w
      . . . W . . . .
    `);
    const before = boardToText(board);
    const [move] = generateMoves(board, WHITE);
    assert.equal(boardToText(board), before, 'generateMoves must not modify the board');
    const after = applyMove(board, move);
    assert.equal(boardToText(board), before, 'applyMove must not modify its input');
    makeMove(board, move);
    assert.equal(boardToText(board), boardToText(after));
    unmakeMove(board, move);
    assert.equal(boardToText(board), before);
  });

  test('canCapture and canStep agree with the generated moves', () => {
    const start = initialBoard();
    assert.equal(canCapture(start, WHITE), false);
    assert.equal(canStep(start, WHITE), true);
    const stuck = parseBoard(`
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      . . . . . . . .
      w . . . . . . .
      . . . . . . . w
      . . . . . w w b
      . . . . . . . w
    `);
    assert.equal(canCapture(stuck, BLACK), false);
    assert.equal(canStep(stuck, BLACK), false);
    assert.deepEqual(generateMoves(stuck, BLACK), []);
  });
});
