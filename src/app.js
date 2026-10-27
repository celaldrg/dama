/**
 * Game controller: connects the rules, the board view, the computer player and
 * the status area of the page. Taps, drags and the keyboard all end up in
 * handleSquare(), so every input method follows the same rules.
 */

import { createDemoGame } from './demo.js';
import { createGame } from './game.js';
import { WHITE, moveToString, sideOf, squareName } from './rules.js';
import { movableSquares, resolveTap, selectionHints } from './selection.js';
import { isHumanTurn, levelKey, outcomeKeys, pliesToUndo, squareKey, turnKey } from './session.js';

/** @typedef {import('./session.js').Settings} Settings */
/** @typedef {import('./rules.js').Move} Move */

const MIN_THINK_MS = 450; // the computer's reply never lands instantly
const HINT_MS = 2800;
const DRAG_THRESHOLD_PX = 6;
const DEMO_SEED = 19;
const ARROWS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

/**
 * Creates the controller and attaches the board's pointer and keyboard handlers.
 * @param {object} deps
 * @param {ReturnType<import('./board-view.js').createBoardView>} deps.view
 * @param {{think: (request: object) => Promise<number[]|null>}} deps.ai
 * @param {object} deps.dom - page elements, see main.js
 * @param {(key: string, params?: object) => string} deps.t - translates into the current language
 * @param {() => boolean} deps.reducedMotion - true when animations should be skipped
 */
export function createApp({ view, ai, dom, t, reducedMotion }) {
  let game = null;
  let state = null;
  let settings = null;
  let startPly = 0;
  let seed = 1;
  let selection = null; // chosen piece square followed by chosen landing squares
  let busy = false; // a move is being animated
  let thinking = false; // the computer is choosing a move
  let token = 0; // bumped whenever pending async work becomes stale
  let hint = null;
  let hintTimer = 0;
  let press = null; // pointer press on the board
  let hover;
  let cursor = 43; // d3
  let cursorVisible = false;

  /**
   * Starts a new game.
   * @param {Settings} nextSettings
   * @param {{demo?: boolean}} [options] - demo: the fixed mid-game position used for screenshots
   */
  function start(nextSettings, { demo = false } = {}) {
    token++;
    settings = nextSettings;
    game = demo ? createDemoGame() : createGame();
    startPly = game.getState().ply;
    seed = demo ? DEMO_SEED : Date.now() % 2147483647;
    busy = false;
    thinking = false;
    clearHint();
    view.setOrientation(settings.mode === 'ai' ? settings.color : WHITE);
    syncPosition();
  }

  /** Redraws the position after it changed and lets the computer move when it is its turn. */
  function syncPosition() {
    state = game.getState();
    view.renderPosition(state.board);
    selection = autoSelection();
    render();
    if (state.status === 'playing' && !isHumanTurn(settings, state.turn)) letComputerMove();
  }

  /** Selects the only piece that can move, so a forced capture shows its route at once. */
  function autoSelection() {
    if (!humanToMove()) return null;
    const movable = movableSquares(state.moves);
    return movable.length === 1 ? [movable[0]] : null;
  }

  async function letComputerMove() {
    const myToken = ++token;
    thinking = true;
    render();
    const started = performance.now();
    const path = await ai.think({ board: state.board, side: state.turn, level: settings.level, seed: seed + state.ply });
    await wait(MIN_THINK_MS - (performance.now() - started));
    if (myToken !== token) return;
    thinking = false;
    const move = path && state.moves.find((candidate) => samePath(candidate.path, path));
    if (move) commit(move);
    else render();
  }

  /** Plays a legal move, animates it and continues with the next turn. */
  async function commit(move) {
    const myToken = ++token;
    const played = game.play(move.path);
    if (!played) return;
    busy = true;
    selection = null;
    hover = undefined;
    clearHint();
    view.renderMarks({});
    renderControls();
    await view.animateMove(played, reducedMotion() ? 0 : 1);
    if (myToken !== token) return;
    busy = false;
    syncPosition();
  }

  /** Takes back the last move (against the computer: back to the human's previous turn). */
  function undo() {
    const plies = busy ? 0 : pliesToUndo(settings, state.turn, state.ply - startPly);
    if (plies === 0) return;
    token++;
    thinking = false;
    for (let i = 0; i < plies; i++) game.undo();
    clearHint();
    syncPosition();
  }

  function humanToMove() {
    return state.status === 'playing' && isHumanTurn(settings, state.turn);
  }

  function canPlay() {
    return humanToMove() && !busy && !thinking;
  }

  /** A tap, a drop or Enter on a square: continue the selection or pick a piece. */
  function handleSquare(square, dropped) {
    if (selection) {
      const result = resolveTap(state.moves, selection, square);
      if (result.type === 'play') return commit(result.move);
      if (result.type === 'extend') {
        selection = result.prefix;
        return render();
      }
      if (result.type === 'ambiguous') return showHint('hintPath');
    }
    if (dropped) return render(); // an invalid drop: the piece goes back
    if (sideOf(state.board[square]) === state.turn) return pickPiece(square);
    selection = null;
    return render();
  }

  function pickPiece(square) {
    if (!movableSquares(state.moves).includes(square)) {
      selection = null;
      return showHint(state.mustCapture ? 'hintOtherMustCapture' : 'hintCannotMove');
    }
    const reselect = selection !== null && selection[0] === square && selection.length === 1;
    selection = reselect ? null : [square];
    return render();
  }

  function isTarget(square) {
    return selection !== null && square >= 0 && resolveTap(state.moves, selection, square).type !== 'none';
  }

  function onPointerDown(event) {
    if (!event.isPrimary || event.button !== 0) return;
    const square = view.squareAt(event.clientX, event.clientY);
    cursorVisible = false;
    if (square < 0) return;
    if (!canPlay()) {
      if (thinking) showHint('hintWait');
      return;
    }
    const draggable = movableSquares(state.moves).includes(square);
    const pickedNow = draggable && selection?.[0] !== square;
    if (pickedNow) {
      selection = [square];
      render();
    }
    press = { id: event.pointerId, square, x: event.clientX, y: event.clientY, draggable, pickedNow, dragging: false };
    dom.board.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!press || event.pointerId !== press.id) return;
    if (!press.dragging) {
      const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      if (!press.draggable || moved < DRAG_THRESHOLD_PX) return;
      press.dragging = true;
      view.startDrag(press.square);
    }
    view.moveDrag(event.clientX, event.clientY);
    const square = view.squareAt(event.clientX, event.clientY);
    const target = isTarget(square) ? square : undefined;
    if (target !== hover) {
      hover = target;
      renderBoardMarks();
    }
  }

  function onPointerUp(event) {
    if (!press || event.pointerId !== press.id) return;
    const { square: pressed, dragging, pickedNow } = press;
    const square = view.squareAt(event.clientX, event.clientY);
    press = null;
    hover = undefined;
    if (dragging) view.endDrag();
    if (!canPlay()) return;
    if (dragging) {
      if (square < 0 || square === pressed) return render();
      return handleSquare(square, true);
    }
    if (square < 0 || (pickedNow && square === pressed)) return undefined; // the press already picked it
    return handleSquare(square, false);
  }

  function onPointerCancel() {
    if (!press) return;
    if (press.dragging) view.endDrag();
    press = null;
    hover = undefined;
    render();
  }

  function onKeyDown(event) {
    const arrow = ARROWS[event.key];
    if (arrow) {
      event.preventDefault();
      const next = view.neighbour(cursor, arrow[0], arrow[1]);
      if (next >= 0) cursor = next;
      showCursor();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showCursor();
      if (canPlay()) handleSquare(cursor, false);
      else if (thinking) showHint('hintWait');
    } else if (event.key === 'Escape' && selection) {
      event.preventDefault();
      selection = null;
      render();
    }
  }

  function onFocus() {
    if (!dom.board.matches(':focus-visible')) return;
    cursor = selection?.[0] ?? movableSquares(state.moves)[0] ?? cursor;
    showCursor();
  }

  function onBlur() {
    cursorVisible = false;
    renderBoardMarks();
  }

  function showCursor() {
    cursorVisible = true;
    renderCursorInfo();
    renderBoardMarks();
  }

  /** Describes the cursor square to screen readers, also after a move changed what is on it. */
  function renderCursorInfo() {
    if (cursorVisible) setText(dom.cursorInfo, t(squareKey(state.board[cursor]), { square: squareName(cursor) }));
  }

  function showHint(key) {
    hint = key;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      hint = null;
      renderStatus();
    }, HINT_MS);
    renderStatus();
  }

  function clearHint() {
    hint = null;
    clearTimeout(hintTimer);
  }

  function render() {
    renderBoardMarks();
    renderStatus();
    renderPlayers();
    renderControls();
    renderCursorInfo();
  }

  function renderBoardMarks() {
    if (busy) return;
    const marks = { lastMove: state.lastMove ? state.lastMove.path : [] };
    if (canPlay()) {
      const selected = selection?.[0];
      if (state.mustCapture) marks.mustCapture = movableSquares(state.moves).filter((square) => square !== selected);
      if (selection) Object.assign(marks, selectionHints(state.moves, selection), { selected, prefix: selection, hover });
    }
    if (cursorVisible) marks.cursor = cursor;
    view.renderMarks(marks);
  }

  function renderStatus() {
    const outcome = outcomeKeys(state, settings);
    const humanTurn = humanToMove();
    let detail = '';
    if (outcome) detail = t(outcome.reason);
    else if (hint) detail = t(hint);
    else if (humanTurn) detail = t(state.mustCapture ? 'hintCapture' : 'hintSelect');
    setText(dom.statusTitle, t(outcome ? outcome.title : turnKey(settings, state.turn)));
    setText(dom.statusDetail, detail);
    dom.statusCard.dataset.state = outcome ? 'over' : humanTurn && state.mustCapture ? 'capture' : 'playing';
    setText(dom.moveCounter, t('moveCounter', { n: state.moveNumber }));
    setText(dom.lastMove, state.lastMove ? t('lastMove', { move: moveToString(state.lastMove) }) : '');
    const level = t(levelKey(settings.level));
    setText(dom.modeSummary, settings.mode === 'ai' ? t('modeSummaryAi', { level }) : t('modeSummaryTwo'));
  }

  function renderPlayers() {
    const bottom = settings.mode === 'ai' ? settings.color : WHITE;
    renderPlayer(dom.playerBottom, bottom);
    renderPlayer(dom.playerTop, -bottom);
  }

  function renderPlayer(player, side) {
    const counts = side === WHITE ? state.pieces.white : state.pieces.black;
    const sideName = t(side === WHITE ? 'white' : 'black');
    const human = isHumanTurn(settings, side);
    let name = sideName;
    let sub = '';
    if (settings.mode === 'ai') {
      name = t(human ? 'you' : 'computer');
      sub = human ? sideName : `${sideName} · ${t(levelKey(settings.level))}`;
    }
    const { classList } = player.root;
    classList.toggle('is-white', side === WHITE);
    classList.toggle('is-black', side !== WHITE);
    classList.toggle('is-active', state.status === 'playing' && state.turn === side);
    classList.toggle('is-thinking', thinking && state.turn === side);
    classList.toggle('is-winner', state.status === 'win' && state.winner === side);
    setText(player.name, name);
    setText(player.sub, sub);
    player.sub.hidden = sub === '';
    setText(player.total, String(counts.men + counts.kings));
    setText(player.kingsCount, String(counts.kings));
    player.kings.hidden = counts.kings === 0;
    player.count.title = t('piecesTitle', { men: counts.men, kings: counts.kings });
  }

  function renderControls() {
    const plies = busy ? 0 : pliesToUndo(settings, state.turn, state.ply - startPly);
    dom.undoButton.disabled = plies === 0;
    dom.againButton.hidden = state.status === 'playing';
  }

  const board = dom.board;
  board.addEventListener('pointerdown', onPointerDown);
  board.addEventListener('pointermove', onPointerMove);
  board.addEventListener('pointerup', onPointerUp);
  board.addEventListener('pointercancel', onPointerCancel);
  board.addEventListener('lostpointercapture', onPointerCancel);
  board.addEventListener('keydown', onKeyDown);
  board.addEventListener('focus', onFocus);
  board.addEventListener('blur', onBlur);

  return {
    start,
    undo,
    /** Starts a new game with the current settings. */
    restart: () => start(settings),
    /** Current settings, for the New game dialog. */
    getSettings: () => ({ ...settings }),
    /** Redraws every text, e.g. after a language change. */
    refresh: render,
  };
}

function samePath(a, b) {
  return a.length === b.length && a.every((square, i) => square === b[i]);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/** Changes text only when it differs, so live regions do not repeat themselves. */
function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
