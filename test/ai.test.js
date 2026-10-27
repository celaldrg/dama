import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { LEVELS, chooseMove, evaluate } from '../src/ai.js';
import { createDemoGame } from '../src/demo.js';
import { createGame } from '../src/game.js';
import { createRng } from '../src/rng.js';
import { BLACK, WHITE, generateMoves, initialBoard, moveToString, parseBoard } from '../src/rules.js';

/** Upper bound that a game ended by the rules never reaches; it only guards the loop. */
const SAFETY_PLIES = 5000;

function isLegal(board, side, move) {
  return generateMoves(board, side).some((legal) => moveToString(legal) === moveToString(move));
}

/**
 * Plays a whole game between two levels and resolves with its final state.
 * It yields to the event loop before every move: a synchronous loop would keep
 * the test's timeout from firing, so a rules regression could hang the suite.
 * Once `signal` aborts (the test timed out), it rejects instead of playing on.
 */
async function playGame(whiteLevel, blackLevel, seed, signal) {
  const rng = createRng(seed);
  const game = createGame();
  let state = game.getState();
  while (state.status === 'playing' && state.ply < SAFETY_PLIES) {
    await nextTurn(undefined, { signal });
    const level = state.turn === WHITE ? whiteLevel : blackLevel;
    const move = chooseMove(state.board, state.turn, { level, rng });
    assert.ok(game.play(move), `seed ${seed}: the AI chose an illegal move`);
    state = game.getState();
  }
  return state;
}

test('evaluate is zero-sum and rewards material', () => {
  assert.equal(evaluate(initialBoard(), WHITE), 0);
  const board = parseBoard(`
    . . . . . . . .
    . . . . . . . .
    . . . b . . . .
    . . . . . . . .
    . . . . . . . .
    . . w . w . . .
    . . . . . . . .
    . . . . . . . .
  `);
  assert.ok(evaluate(board, WHITE) > 0);
  assert.equal(evaluate(board, BLACK), -evaluate(board, WHITE));
});

test('chooseMove returns null when the side to move has no legal move', () => {
  const board = parseBoard(`
    . . . . . . . .
    . . . . . . . .
    . . . b . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
  `);
  assert.equal(chooseMove(board, WHITE, { rng: createRng(1) }), null);
});

test('every level returns a legal move and leaves the board untouched', () => {
  for (const level of Object.keys(LEVELS)) {
    for (const game of [createGame(), createDemoGame()]) {
      const { board, turn } = game.getState();
      const copy = board.slice();
      const move = chooseMove(board, turn, { level, rng: createRng(3) });
      assert.ok(isLegal(board, turn, move), `${level} chose ${moveToString(move)}`);
      assert.deepEqual(board, copy);
    }
  }
});

test('the same seed always produces the same game', () => {
  const record = (seed) => {
    const rng = createRng(seed);
    const game = createGame();
    const moves = [];
    for (let ply = 0; ply < 40 && game.getState().status === 'playing'; ply++) {
      const { board, turn } = game.getState();
      moves.push(moveToString(game.play(chooseMove(board, turn, { level: 'easy', rng }))));
    }
    return moves;
  };
  assert.deepEqual(record(5), record(5));
  assert.notDeepEqual(record(5), record(6));
});

test('medium and hard pick the capture that cannot be taken back', () => {
  // d4xd6 would be recaptured by c6 (losing White's last piece); d4xf4 is safe.
  const board = parseBoard(`
    . . . . . . . .
    . . . . . . . .
    . b b . . . . .
    . . . b . . . .
    . . . w b . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
  `);
  for (const level of ['medium', 'hard']) {
    for (let seed = 1; seed <= 5; seed++) {
      const move = chooseMove(board, WHITE, { level, rng: createRng(seed) });
      assert.equal(moveToString(move), 'd4xf4', `${level}, seed ${seed}`);
    }
  }
});

test('medium and hard crown a threatened man instead of losing it', () => {
  // a7 threatens b7; stepping to c7 runs into d7, so only b7-b8 saves the man.
  const board = parseBoard(`
    . . . . . . . .
    b w . b . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
  `);
  for (const level of ['medium', 'hard']) {
    for (let seed = 1; seed <= 3; seed++) {
      const move = chooseMove(board, WHITE, { level, rng: createRng(seed) });
      assert.equal(moveToString(move), 'b7-b8', `${level}, seed ${seed}`);
    }
  }
});

test('medium beats easy', { timeout: 20000 }, async (t) => {
  let wins = 0;
  for (const seed of [1, 2, 3, 4]) {
    const mediumIsWhite = seed % 2 === 1;
    const state = await playGame(mediumIsWhite ? 'medium' : 'easy', mediumIsWhite ? 'easy' : 'medium', seed, t.signal);
    if (state.winner === (mediumIsWhite ? WHITE : BLACK)) wins++;
  }
  assert.ok(wins >= 3, `medium won ${wins} of 4`);
});

test('200 seeded easy-level AI-vs-AI games all end by a win or a draw rule', { timeout: 25000 }, async (t) => {
  const endings = ['no-pieces', 'no-moves', 'repetition', 'fifty-moves'];
  const tally = { win: 0, draw: 0 };
  for (let seed = 1; seed <= 200; seed++) {
    const state = await playGame('easy', 'easy', seed, t.signal);
    assert.notEqual(state.status, 'playing', `seed ${seed}: the game did not end`);
    assert.ok(endings.includes(state.reason), `seed ${seed}: unexpected reason ${state.reason}`);
    tally[state.status]++;
  }
  assert.equal(tally.win + tally.draw, 200);
  assert.ok(tally.win > 0);
});
