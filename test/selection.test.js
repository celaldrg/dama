import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoGame } from '../src/demo.js';
import {
  BLACK,
  WHITE,
  generateMoves,
  generateRoutes,
  initialBoard,
  moveToString,
  parseBoard,
  parseSquare,
  squareName,
} from '../src/rules.js';
import { movableSquares, movesWithPrefix, resolveTap, selectionHints } from '../src/selection.js';

const squares = (...names) => names.map(parseSquare);
const names = (list) => list.map(squareName);

/** Taps `name` with `prefix` selected and returns a readable result. */
function tap(moves, prefix, name) {
  const result = resolveTap(moves, prefix, parseSquare(name));
  if (result.type === 'play') return `play ${moveToString(result.move)}`;
  if (result.type === 'extend') return `extend ${names(result.prefix).join('-')}`;
  return result.type;
}

/** Plays `move` by tapping its next landing square until the move is made, as a player would. */
function tapAlong(moves, move) {
  let prefix = [move.from];
  while (prefix.length < move.path.length) {
    const result = resolveTap(moves, prefix, move.path[prefix.length]);
    if (result.type === 'play') return result.move;
    if (result.type !== 'extend') return null;
    prefix = result.prefix;
  }
  return null;
}

// The man on b3 has three maximum captures; two of them end on d7.
const TWO_ROUTES_TO_D7 = parseBoard(`
  . . . . . . . .
  . . . . . . . .
  . . . b . . . .
  . . b . . . . .
  . b . b . . . .
  . w b . . . . .
  . . . . . . . .
  . . . . . . . .
`);

// A white king that captures from afar and may land on three squares.
const FLYING_KING = parseBoard(`
  . . . . . . . .
  . . . . . . . .
  . . . . . . . .
  b . . . . . . .
  . . . . . . . .
  . . . . . . . .
  . . . . . . . .
  W . . . . . . .
`);

// The king on a1 takes a3 and a6; landing on a4 or a5 in between leads to the same positions.
const EQUIVALENT_ROUTES = parseBoard(`
  . . . . . . . .
  . . . . . . . .
  b . . . . . . .
  . . . . . . . .
  . . . . . . . .
  b . . . . . . .
  . . . . . . . .
  W . . . . . . .
`);

// The king on a1 takes b1 (landing on c1), c3 and c6; after c1 it may land on c4 or c5 before c7.
const SAME_END_DIFFERENT_HOPS = parseBoard(`
  . . W . . . . .
  . . . . . . . .
  . . b . . . . .
  . . . . . . . .
  . . . . . . . .
  . . b . . . . .
  . . . . . . . .
  W b . w . . . .
`);

describe('picking a piece', () => {
  test('only pieces with a legal move can be picked', () => {
    assert.deepEqual(names(movableSquares(generateMoves(initialBoard(), WHITE))), [
      'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
    ]);
    assert.deepEqual(names(movableSquares(createDemoGame().getState().moves)), ['d3'], 'a forced capture');
  });

  test('movesWithPrefix keeps the moves that follow the chosen squares', () => {
    const { moves } = createDemoGame().getState();
    assert.equal(movesWithPrefix(moves, squares('d3')).length, 2);
    assert.deepEqual(movesWithPrefix(moves, squares('d3', 'd5', 'b5')).map(moveToString), ['d3xd5xb5']);
    assert.deepEqual(movesWithPrefix(moves, squares('e3')), []);
  });
});

describe('resolving taps', () => {
  test('a simple step is played by tapping its target', () => {
    const moves = generateMoves(initialBoard(), BLACK);
    assert.equal(tap(moves, squares('c6'), 'c5'), 'play c6-c5');
    assert.equal(tap(moves, squares('c6'), 'c4'), 'none', 'men step one square');
    assert.equal(tap(moves, squares('c6'), 'd5'), 'none', 'never diagonally');
  });

  test('the final square of a capture route plays the whole route', () => {
    const { moves } = createDemoGame().getState();
    assert.equal(tap(moves, squares('d3'), 'd7'), 'play d3xd5xd7');
    assert.equal(tap(moves, squares('d3'), 'b5'), 'play d3xd5xb5');
    assert.equal(tap(moves, squares('d3'), 'e4'), 'none');
  });

  test('a shared landing square extends the route until the routes fork', () => {
    const { moves } = createDemoGame().getState();
    assert.equal(tap(moves, squares('d3'), 'd5'), 'extend d3-d5');
    assert.equal(tap(moves, squares('d3', 'd5'), 'd7'), 'play d3xd5xd7');
    assert.equal(tap(moves, squares('d3', 'd5'), 'b5'), 'play d3xd5xb5');
  });

  test('when several routes end on the tapped square the player is asked for the next landing square', () => {
    const moves = generateMoves(TWO_ROUTES_TO_D7, WHITE);
    assert.deepEqual(moves.map(moveToString).sort(), ['b3xb5xd5xd7', 'b3xd3xd5xb5', 'b3xd3xd5xd7']);
    assert.equal(tap(moves, squares('b3'), 'd7'), 'ambiguous');
    assert.equal(tap(moves, squares('b3'), 'd5'), 'ambiguous');
    assert.equal(tap(moves, squares('b3'), 'd3'), 'extend b3-d3-d5');
    assert.equal(tap(moves, squares('b3', 'd3', 'd5'), 'd7'), 'play b3xd3xd5xd7');
    assert.equal(tap(moves, squares('b3', 'd3', 'd5'), 'b5'), 'play b3xd3xd5xb5');
    assert.equal(tap(moves, squares('b3'), 'b5'), 'play b3xb5xd5xd7', 'the next landing square wins');
  });

  test('a flying king lands on whichever square beyond the victim is tapped', () => {
    const moves = generateMoves(FLYING_KING, WHITE);
    for (const target of ['a6', 'a7', 'a8']) assert.equal(tap(moves, squares('a1'), target), `play a1x${target}`);
    assert.equal(tap(moves, squares('a1'), 'a5'), 'none', 'the king must jump the piece on a5');
  });

  test('routes that lead to the same position can each be followed, and the final square alone is enough', () => {
    const moves = generateRoutes(EQUIVALENT_ROUTES, WHITE);
    assert.equal(tap(moves, squares('a1'), 'a5'), 'extend a1-a5');
    assert.equal(tap(moves, squares('a1', 'a5'), 'a7'), 'play a1xa5xa7');
    assert.equal(tap(moves, squares('a1', 'a5'), 'a8'), 'play a1xa5xa8');
    assert.equal(tap(moves, squares('a1'), 'a4'), 'extend a1-a4');
    assert.equal(tap(moves, squares('a1', 'a4'), 'a7'), 'play a1xa4xa7');
    assert.equal(tap(moves, squares('a1'), 'a7'), 'play a1xa4xa7', 'not ambiguous: both routes give the same position');
    assert.equal(tap(moves, squares('a1'), 'a8'), 'play a1xa4xa8');
    assert.equal(tap(moves, squares('a1'), 'a6'), 'none', 'a6 holds a piece to capture');
  });

  test('a traced route is recorded hop by hop even when other routes give the same position', () => {
    const moves = generateRoutes(SAME_END_DIFFERENT_HOPS, WHITE);
    assert.deepEqual(moves.map(moveToString).sort(), ['a1xc1xc4xc7', 'a1xc1xc5xc7']);
    assert.equal(tap(moves, squares('a1'), 'c1'), 'extend a1-c1', 'the player still picks the next hop');
    assert.equal(tap(moves, squares('a1', 'c1'), 'c5'), 'play a1xc1xc5xc7');
    assert.equal(tap(moves, squares('a1', 'c1'), 'c4'), 'play a1xc1xc4xc7');
    assert.equal(tap(moves, squares('a1'), 'c7'), 'play a1xc1xc4xc7', 'the final square alone is enough');
  });

  test('every legal route can be entered by tapping its landing squares in order', () => {
    const positions = [
      [initialBoard(), WHITE],
      [createDemoGame().getState().board, WHITE],
      [TWO_ROUTES_TO_D7, WHITE],
      [FLYING_KING, WHITE],
      [EQUIVALENT_ROUTES, WHITE],
      [SAME_END_DIFFERENT_HOPS, WHITE],
    ];
    for (const [board, side] of positions) {
      const moves = generateRoutes(board, side);
      for (const move of moves) {
        const entered = tapAlong(moves, move);
        assert.ok(entered, `${moveToString(move)} could not be entered`);
        assert.equal(moveToString(entered), moveToString(move));
      }
    }
  });
});

describe('selection hints', () => {
  test('show the capture routes, the squares to tap and the pieces that will be taken', () => {
    const { moves } = createDemoGame().getState();
    const hints = selectionHints(moves, squares('d3'));
    assert.deepEqual(hints.routes.map(names).sort(), [['d3', 'd5', 'b5'], ['d3', 'd5', 'd7']]);
    assert.deepEqual(names(hints.next), ['d5']);
    assert.deepEqual(names(hints.finals).sort(), ['b5', 'd7']);
    assert.deepEqual(names(hints.captured).sort(), ['c5', 'd4', 'd6']);
    assert.deepEqual(hints.chosenCaptures, []);
  });

  test('pieces captured along the chosen part of the route are reported separately', () => {
    const { moves } = createDemoGame().getState();
    const hints = selectionHints(moves, squares('d3', 'd5'));
    assert.deepEqual(names(hints.next).sort(), ['b5', 'd7']);
    assert.deepEqual(names(hints.chosenCaptures), ['d4']);
  });

  test('every landing square of equivalent routes is offered', () => {
    const moves = generateRoutes(EQUIVALENT_ROUTES, WHITE);
    const hints = selectionHints(moves, squares('a1'));
    assert.deepEqual(names(hints.next).sort(), ['a4', 'a5']);
    assert.deepEqual(names(hints.finals).sort(), ['a7', 'a8']);
    assert.deepEqual(names(hints.captured).sort(), ['a3', 'a6']);
    assert.deepEqual(names(selectionHints(moves, squares('a1', 'a5')).chosenCaptures), ['a3']);
  });

  test('a simple step has a target but no route or victims', () => {
    const hints = selectionHints(generateMoves(initialBoard(), WHITE), squares('c3'));
    assert.deepEqual(names(hints.next), ['c4']);
    assert.deepEqual(names(hints.finals), ['c4']);
    assert.deepEqual(hints.routes, []);
    assert.deepEqual(hints.captured, []);
  });
});
