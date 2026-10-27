import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { QUIET_PLY_LIMIT, REPETITION_LIMIT, createGame } from '../src/game.js';
import { createDemoGame } from '../src/demo.js';
import {
  BLACK,
  BLACK_MAN,
  WHITE,
  WHITE_MAN,
  isKing,
  moveToString,
  parseBoard,
  parseSquare,
  squareName,
} from '../src/rules.js';

/** Path of squares from algebraic names: path('d3', 'd5') -> [43, 27]. */
const path = (...names) => names.map(parseSquare);

// Two lone kings that can never capture each other: every move is a quiet king move.
const TWO_KINGS = `
  . . . . . . . B
  . . . . . . . .
  . . . . . . . .
  . . . . . . . .
  . . . . . . . .
  . . . . . . . .
  . . . . . . . .
  W . . . . . . .
`;

describe('playing moves', () => {
  test('a new game starts from the initial position with White to move', () => {
    const state = createGame().getState();
    assert.equal(state.turn, WHITE);
    assert.equal(state.status, 'playing');
    assert.equal(state.winner, 0);
    assert.equal(state.reason, null);
    assert.equal(state.moves.length, 8);
    assert.equal(state.mustCapture, false);
    assert.equal(state.ply, 0);
    assert.equal(state.moveNumber, 1);
    assert.equal(state.quietPlies, 0);
    assert.equal(state.lastMove, null);
    assert.equal(state.canUndo, false);
    assert.deepEqual(state.pieces, { white: { men: 16, kings: 0 }, black: { men: 16, kings: 0 } });
  });

  test('play accepts a path or a move object and hands the turn over', () => {
    const game = createGame();
    const played = game.play(path('c3', 'c4'));
    assert.equal(moveToString(played), 'c3-c4');
    let state = game.getState();
    assert.equal(state.turn, BLACK);
    assert.equal(state.ply, 1);
    assert.equal(state.moveNumber, 1);
    assert.equal(state.canUndo, true);
    assert.equal(state.board[parseSquare('c4')], WHITE_MAN);
    assert.equal(moveToString(state.lastMove), 'c3-c4');
    const reply = state.moves.find((move) => moveToString(move) === 'f6-f5');
    assert.ok(game.play(reply));
    state = game.getState();
    assert.equal(state.turn, WHITE);
    assert.equal(state.moveNumber, 2);
  });

  test('play rejects illegal input and leaves the game unchanged', () => {
    const game = createGame();
    const before = game.getState();
    assert.equal(game.play(path('c3', 'c5')), null, 'men step one square');
    assert.equal(game.play(path('c2', 'c3')), null, 'the square is occupied');
    assert.equal(game.play(path('c6', 'c5')), null, 'not your piece');
    assert.equal(game.play([]), null);
    assert.equal(game.play(undefined), null);
    assert.deepEqual(game.getState(), before);
  });

  test('snapshots are copies that cannot change the game', () => {
    const game = createGame();
    const state = game.getState();
    state.board.fill(0);
    state.moves[0].path.push(99);
    assert.equal(game.getState().pieces.white.men, 16);
    assert.ok(game.play(game.getState().moves[0]));
  });

  test('play refuses captures shorter than the maximum, including stopping halfway', () => {
    const game = createGame({
      board: parseBoard(`
        . . . . . . . .
        . . . . . . . .
        . . . b . . . .
        . . . . . . . .
        . . . b . . b .
        . . . w . . w .
        . . . . . . . .
        . . . . . . . .
      `),
    });
    assert.equal(game.getState().mustCapture, true);
    assert.equal(game.play(path('g3', 'g5')), null);
    assert.equal(game.play(path('d3', 'd5')), null);
    const played = game.play(path('d3', 'd5', 'd7'));
    assert.deepEqual(played.captures.map(squareName), ['d4', 'd6']);
    assert.equal(game.getState().pieces.black.men, 1);
  });

  test('every route of a capture is offered and can be played, and the route played is the one recorded', () => {
    // The king on a1 takes a3 and a6, landing on a4 or a5 in between.
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
    const game = createGame({ board });
    assert.deepEqual(game.getState().moves.map(moveToString), ['a1xa4xa7', 'a1xa4xa8', 'a1xa5xa7', 'a1xa5xa8']);
    const viaA4 = createGame({ board });
    viaA4.play(path('a1', 'a4', 'a7'));
    const played = game.play(path('a1', 'a5', 'a7'));
    assert.equal(moveToString(played), 'a1xa5xa7');
    assert.deepEqual(played.captures.map(squareName), ['a3', 'a6']);
    assert.equal(moveToString(game.getState().lastMove), 'a1xa5xa7');
    assert.deepEqual(game.getState().board, viaA4.getState().board);
    assert.equal(game.getState().status, 'win');
  });

  test('undo takes back one ply at a time and restores the exact state', () => {
    const game = createGame();
    const start = game.getState();
    game.play(path('d3', 'd4'));
    const afterOne = game.getState();
    game.play(path('e6', 'e5'));
    assert.equal(game.undo(), true);
    assert.deepEqual(game.getState(), afterOne);
    assert.equal(game.undo(), true);
    assert.deepEqual(game.getState(), start);
    assert.equal(game.undo(), false);
  });

  test('startPly offsets the move counter', () => {
    const state = createGame({ startPly: 36 }).getState();
    assert.equal(state.ply, 36);
    assert.equal(state.moveNumber, 19);
  });
});

describe('end of the game', () => {
  test('capturing the last enemy piece wins, and undo brings the game back', () => {
    const game = createGame({
      board: parseBoard(`
        . . . . . . . .
        . . . . . . . .
        . . . . . . . .
        . . . b . . . .
        . . . w . . . .
        . . . . . . . .
        . . . . . . . .
        . . . . . . . .
      `),
    });
    game.play(path('d4', 'd6'));
    const state = game.getState();
    assert.equal(state.status, 'win');
    assert.equal(state.winner, WHITE);
    assert.equal(state.reason, 'no-pieces');
    assert.deepEqual(state.moves, []);
    assert.equal(game.play(path('d6', 'd7')), null, 'no move after the end');
    assert.equal(game.undo(), true);
    const restored = game.getState();
    assert.equal(restored.status, 'playing');
    assert.equal(restored.board[parseSquare('d5')], BLACK_MAN);
  });

  test('a side that still has pieces but no legal move loses', () => {
    const game = createGame({
      board: parseBoard(`
        . . . . . . . .
        . . . . . . . .
        . . . . . . . .
        . . . . . . . .
        w . . . . . . .
        . . . . . . . w
        . . . . . w w b
        . . . . . . . w
      `),
    });
    game.play(path('a4', 'a5'));
    const state = game.getState();
    assert.equal(state.status, 'win');
    assert.equal(state.winner, WHITE);
    assert.equal(state.reason, 'no-moves');
    assert.equal(state.pieces.black.men, 1);
  });

  test('the same position with the same side to move for the third time is a draw', () => {
    const game = createGame({ board: parseBoard(TWO_KINGS) });
    const shuffle = [['a1', 'b1'], ['h8', 'g8'], ['b1', 'a1'], ['g8', 'h8']];
    for (let ply = 0; ply < 8; ply++) {
      assert.equal(game.getState().status, 'playing', `still playing before ply ${ply + 1}`);
      assert.ok(game.play(path(...shuffle[ply % 4])));
    }
    const state = game.getState();
    assert.equal(REPETITION_LIMIT, 3);
    assert.equal(state.status, 'draw');
    assert.equal(state.winner, 0);
    assert.equal(state.reason, 'repetition');
    assert.equal(game.undo(), true);
    assert.equal(game.getState().status, 'playing');
  });

  test('50 moves per side without a capture or a man move is a draw', () => {
    // White's king tours 7 squares and Black's 4, so no position comes up a third time first.
    const game = createGame({ board: parseBoard(TWO_KINGS) });
    const whiteTour = ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1'];
    const blackTour = ['h8', 'g8', 'f8', 'e8'];
    for (let i = 0; i < QUIET_PLY_LIMIT / 2; i++) {
      assert.equal(game.getState().status, 'playing', `still playing at move ${i + 1}`);
      assert.ok(game.play(path(whiteTour[i % 7], whiteTour[(i + 1) % 7])));
      assert.ok(game.play(path(blackTour[i % 4], blackTour[(i + 1) % 4])));
    }
    const state = game.getState();
    assert.equal(QUIET_PLY_LIMIT, 100);
    assert.equal(state.quietPlies, 100);
    assert.equal(state.status, 'draw');
    assert.equal(state.reason, 'fifty-moves');
  });

  test('the quiet-move counter counts king moves and resets on captures and man moves', () => {
    const game = createGame({
      board: parseBoard(`
        . . . . . . . .
        . . . . . . . B
        . . . . . . . .
        b . . . . . . .
        . . . . . . . .
        . . . . . . . .
        . . . . . w . .
        . W . . . . . .
      `),
    });
    const plies = [['b1', 'a1'], ['h7', 'h6'], ['a1', 'a6'], ['h6', 'h7'], ['f2', 'f3']];
    const counts = plies.map((squares) => {
      assert.ok(game.play(path(...squares)), squares.join('-'));
      return game.getState().quietPlies;
    });
    assert.deepEqual(counts, [1, 2, 0, 1, 0]);
  });
});

describe('demo position', () => {
  test('is a mid-game position with one king and a forced double capture for White', () => {
    const state = createDemoGame().getState();
    assert.equal(state.status, 'playing');
    assert.equal(state.turn, WHITE);
    assert.equal(state.mustCapture, true);
    assert.deepEqual(state.moves.map(moveToString).sort(), ['d3xd5xb5', 'd3xd5xd7']);
    assert.equal(state.board.filter(isKing).length, 1);
    assert.equal(state.moveNumber, 19);
    assert.deepEqual(state.pieces, { white: { men: 8, kings: 1 }, black: { men: 10, kings: 0 } });
  });

  test('is the same on every call', () => {
    assert.deepEqual(createDemoGame().getState(), createDemoGame().getState());
  });
});
