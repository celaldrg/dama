/**
 * SVG board view: squares, coordinates, flat round pieces with crowned kings,
 * move hints, the keyboard cursor, drag feedback and step-by-step move
 * animation. It draws what it is told and knows nothing about the rules.
 */

import { BLACK_KING, BLACK_MAN, SIZE, WHITE, WHITE_KING, WHITE_MAN, colOf, rowOf } from './rules.js';

/** @typedef {import('./rules.js').Move} Move */

/**
 * Highlights to draw; every field is optional.
 * @typedef {object} Marks
 * @property {number[]} [lastMove] - squares of the last move's path
 * @property {number} [selected] - square of the selected piece
 * @property {number[]} [mustCapture] - pieces that have to capture
 * @property {number[][]} [routes] - capture routes still possible for the selected piece
 * @property {number[]} [prefix] - the selected piece's square and the landing squares chosen so far
 * @property {number[]} [next] - landing squares to tap next
 * @property {number[]} [finals] - final squares of the possible moves
 * @property {number[]} [captured] - pieces the possible moves capture
 * @property {number[]} [chosenCaptures] - pieces captured along `prefix`
 * @property {number} [hover] - square under a dragged piece
 * @property {number} [cursor] - keyboard cursor square
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const CELL = 100;
const BOARD = SIZE * CELL;
const FILES = 'abcdefgh';
const PIECE_IDS = {
  [WHITE_MAN]: 'dama-wm',
  [WHITE_KING]: 'dama-wk',
  [BLACK_MAN]: 'dama-bm',
  [BLACK_KING]: 'dama-bk',
};
const PIECE_COLORS = {
  white: { body: '#f8fafc', rim: '#64748b', ring: '#cbd5e1', crown: '#f59e0b', crownEdge: '#92400e' },
  black: { body: '#1e293b', rim: '#020617', ring: '#475569', crown: '#fbbf24', crownEdge: '#78350f' },
};
const CROWN_PATH = 'M-19 12 L-22 -8 L-10 1 L0 -16 L10 1 L22 -8 L19 12 Z';
const CROWN_TIPS = [[-22, -8], [0, -16], [22, -8]];
const LAYERS = ['squares', 'labels', 'tints', 'pieces', 'routes', 'marks', 'cursor', 'drag'];

/**
 * Creates the board inside an empty <svg> element.
 * @param {SVGSVGElement} svg
 */
export function createBoardView(svg) {
  const layers = {};
  const pieces = new Map(); // square -> <use> element
  let bottomSide = WHITE;
  let ghost = null;
  let lifted = null;

  svg.setAttribute('viewBox', `0 0 ${BOARD} ${BOARD}`);
  defineSymbols(svg);
  for (const name of LAYERS) layers[name] = svgElement('g', { class: `layer-${name}` }, svg);
  drawSquares(layers.squares);

  /** Top-left corner of a square, in board units, for the current orientation. */
  function corner(square) {
    const flip = bottomSide !== WHITE;
    const row = flip ? SIZE - 1 - rowOf(square) : rowOf(square);
    const col = flip ? SIZE - 1 - colOf(square) : colOf(square);
    return { x: col * CELL, y: row * CELL };
  }

  function center(square) {
    const { x, y } = corner(square);
    return { x: x + CELL / 2, y: y + CELL / 2 };
  }

  /** Converts a pointer position to board units. */
  function toBoardUnits(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * BOARD,
      y: ((clientY - rect.top) / rect.height) * BOARD,
    };
  }

  function drawLabels() {
    clear(layers.labels);
    for (let square = 0; square < SIZE * SIZE; square++) {
      const { x, y } = corner(square);
      const tone = isLight(square) ? 'coord coord-on-light' : 'coord coord-on-dark';
      if (y === BOARD - CELL) {
        svgElement('text', { x: x + CELL - 9, y: y + CELL - 9, 'text-anchor': 'end', class: tone }, layers.labels)
          .textContent = FILES[colOf(square)];
      }
      if (x === 0) {
        svgElement('text', { x: x + 8, y: y + 25, class: tone }, layers.labels).textContent = String(SIZE - rowOf(square));
      }
    }
  }

  function placePiece(node, point, scale = 1) {
    const scaled = scale === 1 ? '' : ` scale(${scale})`;
    node.setAttribute('transform', `translate(${point.x} ${point.y})${scaled}`);
  }

  function addPiece(square, piece) {
    const node = svgElement('use', { href: `#${PIECE_IDS[piece]}`, class: 'piece' }, layers.pieces);
    placePiece(node, center(square));
    pieces.set(square, node);
  }

  /**
   * Shows the bottom edge from the given side's point of view.
   * @param {number} side - WHITE or BLACK
   */
  function setOrientation(side) {
    bottomSide = side;
    drawLabels();
  }

  /**
   * Draws the pieces of a position, replacing whatever was there.
   * @param {number[]} board - 64 squares
   */
  function renderPosition(board) {
    clear(layers.pieces);
    pieces.clear();
    board.forEach((piece, square) => {
      if (piece !== 0) addPiece(square, piece);
    });
  }

  function tint(square, className) {
    const { x, y } = corner(square);
    svgElement('rect', { x, y, width: CELL, height: CELL, class: className }, layers.tints);
  }

  function circle(square, r, className, layer = layers.marks) {
    const { x, y } = center(square);
    return svgElement('circle', { cx: x, cy: y, r, class: className }, layer);
  }

  function drawRoute(route, chosen) {
    const points = route.map((square) => {
      const { x, y } = center(square);
      return `${x},${y}`;
    }).join(' ');
    const kind = chosen ? 'route route-chosen' : 'route';
    svgElement('polyline', { points, class: `${kind} route-shade` }, layers.routes);
    svgElement('polyline', { points, class: kind }, layers.routes);
  }

  function drawCross(square, chosen) {
    const { x, y } = center(square);
    const group = svgElement('g', { class: chosen ? 'victim victim-chosen' : 'victim' }, layers.marks);
    svgElement('circle', { cx: x, cy: y, r: 40, class: 'victim-veil' }, group);
    const d = `M${x - 15} ${y - 15} L${x + 15} ${y + 15} M${x + 15} ${y - 15} L${x - 15} ${y + 15}`;
    for (const className of ['victim-x victim-x-shade', 'victim-x']) svgElement('path', { d, class: className }, group);
  }

  /**
   * Draws the highlights, replacing the previous ones.
   * @param {Marks} marks
   */
  function renderMarks(marks) {
    for (const name of ['tints', 'routes', 'marks', 'cursor']) clear(layers[name]);
    const finals = marks.finals ?? [];
    for (const square of marks.lastMove ?? []) tint(square, 'tint-last');
    if (marks.selected !== undefined) tint(marks.selected, 'tint-selected');
    if (marks.hover !== undefined) tint(marks.hover, 'tint-hover');
    for (const route of marks.routes ?? []) drawRoute(route, false);
    if ((marks.prefix ?? []).length > 1) drawRoute(marks.prefix, true);
    for (const square of marks.captured ?? []) drawCross(square, (marks.chosenCaptures ?? []).includes(square));
    for (const square of marks.mustCapture ?? []) circle(square, 45, 'ring-must');
    if (marks.selected !== undefined) circle(marks.selected, 45, 'ring-selected');
    for (const square of marks.next ?? []) {
      if (!finals.includes(square)) circle(square, 15, 'target-step');
    }
    for (const square of finals) circle(square, 17, 'target-final');
    if (marks.cursor !== undefined) {
      const { x, y } = corner(marks.cursor);
      svgElement('rect', { x: x + 5, y: y + 5, width: CELL - 10, height: CELL - 10, rx: 10, class: 'cursor' }, layers.cursor);
    }
  }

  /**
   * Square under a pointer position, or -1 outside the board.
   * @param {number} clientX
   * @param {number} clientY
   * @returns {number}
   */
  function squareAt(clientX, clientY) {
    const { x, y } = toBoardUnits(clientX, clientY);
    if (x < 0 || y < 0 || x >= BOARD || y >= BOARD) return -1;
    const flip = bottomSide !== WHITE;
    const row = Math.floor(y / CELL);
    const col = Math.floor(x / CELL);
    return (flip ? SIZE - 1 - row : row) * SIZE + (flip ? SIZE - 1 - col : col);
  }

  /**
   * Board-relative step for the arrow keys: the square one step up/down/left/right
   * on screen, or -1 at the edge.
   * @param {number} square
   * @param {number} dRow - -1 up, 1 down (on screen)
   * @param {number} dCol - -1 left, 1 right (on screen)
   * @returns {number}
   */
  function neighbour(square, dRow, dCol) {
    const sign = bottomSide === WHITE ? 1 : -1;
    const row = rowOf(square) + dRow * sign;
    const col = colOf(square) + dCol * sign;
    return row < 0 || row >= SIZE || col < 0 || col >= SIZE ? -1 : row * SIZE + col;
  }

  /**
   * Lifts the piece on `square` so it follows the pointer.
   * @param {number} square
   */
  function startDrag(square) {
    lifted = pieces.get(square) ?? null;
    if (!lifted) return;
    lifted.classList.add('lifted');
    ghost = svgElement('use', { href: lifted.getAttribute('href'), class: 'piece ghost' }, layers.drag);
  }

  /**
   * Moves the lifted piece under the pointer.
   * @param {number} clientX
   * @param {number} clientY
   */
  function moveDrag(clientX, clientY) {
    if (ghost) placePiece(ghost, toBoardUnits(clientX, clientY), 1.12);
  }

  /** Puts the lifted piece back (the caller re-renders after a move). */
  function endDrag() {
    ghost?.remove();
    lifted?.classList.remove('lifted');
    ghost = null;
    lifted = null;
  }

  /**
   * Animates a move hop by hop: each captured piece fades out once it is
   * jumped, and a crowned man turns into a king at the end.
   * @param {Move} move - the move just played
   * @param {number} speed - 1 for normal speed, 0 for no animation
   * @returns {Promise<void>}
   */
  async function animateMove(move, speed) {
    const node = pieces.get(move.from);
    if (!node) return;
    layers.pieces.appendChild(node); // keep the moving piece on top
    const fades = [];
    for (let i = 1; i < move.path.length; i++) {
      const from = center(move.path[i - 1]);
      const to = center(move.path[i]);
      const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) / CELL;
      await tween(hopDuration(distance) * speed, (t) => placePiece(node, lerp(from, to, ease(t))));
      const victim = pieces.get(move.captures[i - 1]);
      if (victim) fades.push(fadeOut(victim, 180 * speed));
    }
    await Promise.all(fades);
    if (move.promotes) {
      node.setAttribute('href', `#${PIECE_IDS[move.piece * 2]}`);
      const end = center(move.to);
      await tween(240 * speed, (t) => placePiece(node, end, 1.3 - 0.3 * ease(t)));
    }
  }

  return {
    setOrientation,
    renderPosition,
    renderMarks,
    squareAt,
    neighbour,
    startDrag,
    moveDrag,
    endDrag,
    animateMove,
  };
}

function isLight(square) {
  return (rowOf(square) + colOf(square)) % 2 === 0;
}

function drawSquares(layer) {
  for (let square = 0; square < SIZE * SIZE; square++) {
    svgElement('rect', {
      x: colOf(square) * CELL,
      y: rowOf(square) * CELL,
      width: CELL,
      height: CELL,
      class: isLight(square) ? 'square-light' : 'square-dark',
    }, layer);
  }
}

/** Piece shapes, drawn around (0, 0) with fixed colors so <use> copies need no CSS. */
function defineSymbols(svg) {
  const defs = svgElement('defs', {}, svg);
  for (const [piece, id] of Object.entries(PIECE_IDS)) {
    const value = Number(piece);
    const colors = value > 0 ? PIECE_COLORS.white : PIECE_COLORS.black;
    const group = svgElement('g', { id }, defs);
    svgElement('circle', { cy: 5, r: 38, fill: '#0f172a', 'fill-opacity': 0.45 }, group);
    svgElement('circle', { r: 38, fill: colors.body, stroke: colors.rim, 'stroke-width': 2.5 }, group);
    svgElement('circle', { r: 27, fill: 'none', stroke: colors.ring, 'stroke-width': 3.5 }, group);
    if (Math.abs(value) === 2) drawCrown(group, colors);
  }
}

function drawCrown(group, colors) {
  const style = { fill: colors.crown, stroke: colors.crownEdge, 'stroke-width': 2.5, 'stroke-linejoin': 'round' };
  svgElement('path', { d: CROWN_PATH, ...style }, group);
  for (const [cx, cy] of CROWN_TIPS) svgElement('circle', { cx, cy, r: 4, ...style }, group);
  svgElement('rect', { x: -19, y: 6, width: 38, height: 6, rx: 2, fill: colors.crownEdge, 'fill-opacity': 0.55 }, group);
}

function svgElement(tag, attributes, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  parent.appendChild(node);
  return node;
}

function clear(node) {
  node.replaceChildren();
}

function hopDuration(distance) {
  return Math.min(420, 150 + 45 * distance);
}

function lerp(from, to, t) {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function fadeOut(node, duration) {
  return tween(duration, (t) => node.setAttribute('opacity', String(1 - t))).then(() => node.remove());
}

/** Calls onFrame with progress 0..1 on animation frames; resolves at once for duration 0. */
function tween(duration, onFrame) {
  if (duration <= 0) {
    onFrame(1);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      onFrame(t);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
