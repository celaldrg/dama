import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS } from '../src/i18n.js';
import { BLACK, BLACK_KING, BLACK_MAN, EMPTY, WHITE, WHITE_KING, WHITE_MAN } from '../src/rules.js';
import {
  DEFAULT_SETTINGS,
  LEVEL_NAMES,
  isHumanTurn,
  levelKey,
  normalizeSettings,
  outcomeKeys,
  pliesToUndo,
  squareKey,
  turnKey,
} from '../src/session.js';

const vsComputer = (color) => ({ mode: 'ai', level: 'medium', color });
const twoPlayers = { mode: 'two', level: 'medium', color: WHITE };

function assertKnownKey(key) {
  assert.ok(Object.hasOwn(STRINGS.en, key), `missing English string "${key}"`);
  assert.ok(Object.hasOwn(STRINGS.tr, key), `missing Turkish string "${key}"`);
}

describe('settings', () => {
  test('bad or missing stored values fall back to the defaults', () => {
    for (const raw of [null, undefined, 'medium', 42, [], {}]) {
      assert.deepEqual(normalizeSettings(raw), DEFAULT_SETTINGS);
    }
    assert.deepEqual(normalizeSettings({ mode: 'online', level: 'expert', color: 7 }), DEFAULT_SETTINGS);
  });

  test('valid values are kept', () => {
    assert.deepEqual(normalizeSettings({ mode: 'two', level: 'hard', color: BLACK }), {
      mode: 'two',
      level: 'hard',
      color: BLACK,
    });
    assert.deepEqual(normalizeSettings({ mode: 'ai', level: 'easy', color: WHITE, extra: true }), {
      mode: 'ai',
      level: 'easy',
      color: WHITE,
    });
  });

  test('every level has a translated name', () => {
    for (const level of LEVEL_NAMES) assertKnownKey(levelKey(level));
    assert.equal(levelKey('nonsense'), levelKey(DEFAULT_SETTINGS.level));
  });
});

describe('turns and undo', () => {
  test('against the computer only the chosen color is played by a person', () => {
    assert.equal(isHumanTurn(vsComputer(WHITE), WHITE), true);
    assert.equal(isHumanTurn(vsComputer(WHITE), BLACK), false);
    assert.equal(isHumanTurn(vsComputer(BLACK), BLACK), true);
    assert.equal(isHumanTurn(twoPlayers, WHITE), true);
    assert.equal(isHumanTurn(twoPlayers, BLACK), true);
  });

  test('two players undo one ply at a time', () => {
    assert.equal(pliesToUndo(twoPlayers, WHITE, 0), 0);
    assert.equal(pliesToUndo(twoPlayers, BLACK, 1), 1);
    assert.equal(pliesToUndo(twoPlayers, WHITE, 8), 1);
  });

  test('against the computer undo goes back to the human player\'s previous turn', () => {
    // The human is to move: take back the computer's reply and the human's move.
    assert.equal(pliesToUndo(vsComputer(WHITE), WHITE, 2), 2);
    // The computer is to move (thinking, or the human's move ended the game): one ply.
    assert.equal(pliesToUndo(vsComputer(WHITE), BLACK, 1), 1);
    // Nothing to take back yet, or only the computer's opening move.
    assert.equal(pliesToUndo(vsComputer(WHITE), WHITE, 0), 0);
    assert.equal(pliesToUndo(vsComputer(BLACK), BLACK, 1), 0);
    assert.equal(pliesToUndo(vsComputer(BLACK), BLACK, 3), 2);
  });

  test('the turn line names the player to move', () => {
    assert.equal(turnKey(vsComputer(WHITE), WHITE), 'yourMove');
    assert.equal(turnKey(vsComputer(WHITE), BLACK), 'thinking');
    assert.equal(turnKey(twoPlayers, WHITE), 'whiteToMove');
    assert.equal(turnKey(twoPlayers, BLACK), 'blackToMove');
  });
});

describe('describing the game', () => {
  test('a game in progress has no outcome', () => {
    assert.equal(outcomeKeys({ status: 'playing', winner: 0, reason: null }, twoPlayers), null);
  });

  test('wins name the winner and the reason', () => {
    const blackLost = { status: 'win', winner: WHITE, reason: 'no-pieces' };
    assert.deepEqual(outcomeKeys(blackLost, twoPlayers), { title: 'winWhite', reason: 'reasonNoPiecesBlack' });
    assert.deepEqual(outcomeKeys(blackLost, vsComputer(WHITE)), { title: 'youWin', reason: 'reasonNoPiecesBlack' });
    assert.deepEqual(outcomeKeys(blackLost, vsComputer(BLACK)), { title: 'youLose', reason: 'reasonNoPiecesBlack' });
    const whiteStuck = { status: 'win', winner: BLACK, reason: 'no-moves' };
    assert.deepEqual(outcomeKeys(whiteStuck, twoPlayers), { title: 'winBlack', reason: 'reasonNoMovesWhite' });
  });

  test('draws name the draw rule', () => {
    const draw = (reason) => outcomeKeys({ status: 'draw', winner: 0, reason }, vsComputer(WHITE));
    assert.deepEqual(draw('repetition'), { title: 'draw', reason: 'reasonRepetition' });
    assert.deepEqual(draw('fifty-moves'), { title: 'draw', reason: 'reasonFiftyMoves' });
  });

  test('every outcome, turn and square description has English and Turkish text', () => {
    const endings = [
      { status: 'win', winner: WHITE, reason: 'no-pieces' },
      { status: 'win', winner: BLACK, reason: 'no-pieces' },
      { status: 'win', winner: WHITE, reason: 'no-moves' },
      { status: 'win', winner: BLACK, reason: 'no-moves' },
      { status: 'draw', winner: 0, reason: 'repetition' },
      { status: 'draw', winner: 0, reason: 'fifty-moves' },
    ];
    for (const settings of [twoPlayers, vsComputer(WHITE), vsComputer(BLACK)]) {
      for (const ending of endings) {
        const keys = outcomeKeys(ending, settings);
        assertKnownKey(keys.title);
        assertKnownKey(keys.reason);
      }
      for (const turn of [WHITE, BLACK]) assertKnownKey(turnKey(settings, turn));
    }
    for (const piece of [EMPTY, WHITE_MAN, WHITE_KING, BLACK_MAN, BLACK_KING]) assertKnownKey(squareKey(piece));
    assert.notEqual(squareKey(WHITE_KING), squareKey(BLACK_KING));
  });
});
