/**
 * Turkish draughts (Dama) rules: board model and legal move generation.
 *
 * The board is an array of 64 numbers indexed row * 8 + col. Row 0 is the top
 * edge (rank 8, Black's home side) and row 7 the bottom edge (rank 1, White's).
 * A piece's sign is its side: 1 white man, 2 white king, -1 black man,
 * -2 black king and 0 for an empty square.
 * Pure module: no DOM or browser globals.
 */

export const SIZE = 8;
export const WHITE = 1;
export const BLACK = -1;
export const EMPTY = 0;
export const WHITE_MAN = 1;
export const WHITE_KING = 2;
export const BLACK_MAN = -1;
export const BLACK_KING = -2;

/**
 * A legal move. Simple steps have a two-square path and no captures.
 * @typedef {object} Move
 * @property {number} from - start square (0..63)
 * @property {number} to - final square
 * @property {number[]} path - the start square followed by every landing square
 * @property {number[]} captures - squares of the captured pieces, in capture order
 * @property {number[]} capturedPieces - values of the captured pieces, same order
 * @property {number} piece - value of the moving piece before the move
 * @property {boolean} promotes - true when a man ends the move on its last rank
 */

const SQUARES = SIZE * SIZE;
const FILES = 'abcdefgh';
const PIECE_CHARS = 'Bb.wW'; // indexed by piece value + 2
const NO_CAPTURES = Object.freeze([]); // shared by every simple step

// Directions: 0 up, 1 right, 2 down, 3 left; the reverse of d is (d + 2) % 4.
const STEPS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const KING_DIRECTIONS = [0, 1, 2, 3];
const WHITE_MAN_DIRECTIONS = [0, 3, 1]; // forward (up), left, right
const BLACK_MAN_DIRECTIONS = [2, 3, 1]; // forward (down), left, right

/** RAYS[square][direction]: squares from `square` (exclusive) to the board edge. */
const RAYS = Array.from({ length: SQUARES }, (_, square) =>
  STEPS.map(([dRow, dCol]) => buildRay(square, dRow, dCol)),
);

function buildRay(square, dRow, dCol) {
  const ray = [];
  let row = rowOf(square) + dRow;
  let col = colOf(square) + dCol;
  while (row >= 0 && row < SIZE && col >= 0 && col < SIZE) {
    ray.push(row * SIZE + col);
    row += dRow;
    col += dCol;
  }
  return ray;
}

/**
 * Row of a square: 0 (rank 8, top) to 7 (rank 1, bottom).
 * @param {number} square - 0..63
 * @returns {number}
 */
export function rowOf(square) {
  return Math.floor(square / SIZE);
}

/**
 * Column of a square: 0 (file a) to 7 (file h).
 * @param {number} square - 0..63
 * @returns {number}
 */
export function colOf(square) {
  return square % SIZE;
}

/**
 * Algebraic name of a square, e.g. 0 -> "a8", 63 -> "h1".
 * @param {number} square - 0..63
 * @returns {string}
 */
export function squareName(square) {
  return FILES[colOf(square)] + (SIZE - rowOf(square));
}

/**
 * Square index from an algebraic name such as "d3".
 * @param {string} name
 * @returns {number}
 * @throws {Error} when the name is not a1..h8
 */
export function parseSquare(name) {
  const match = /^([a-h])([1-8])$/.exec(name);
  if (!match) throw new Error(`Invalid square name: ${name}`);
  return (SIZE - Number(match[2])) * SIZE + FILES.indexOf(match[1]);
}

/**
 * Side owning a piece.
 * @param {number} piece
 * @returns {number} WHITE, BLACK or 0 for an empty square
 */
export function sideOf(piece) {
  return Math.sign(piece);
}

/**
 * Whether a piece is a king (dama) of either side.
 * @param {number} piece
 * @returns {boolean}
 */
export function isKing(piece) {
  return piece === WHITE_KING || piece === BLACK_KING;
}

/**
 * Row on which a side's men are promoted.
 * @param {number} side - WHITE or BLACK
 * @returns {number}
 */
export function promotionRow(side) {
  return side === WHITE ? 0 : SIZE - 1;
}

/**
 * Starting position: 16 men per side on their second and third ranks.
 * @returns {number[]}
 */
export function initialBoard() {
  const board = new Array(SQUARES).fill(EMPTY);
  for (let col = 0; col < SIZE; col++) {
    board[1 * SIZE + col] = BLACK_MAN;
    board[2 * SIZE + col] = BLACK_MAN;
    board[5 * SIZE + col] = WHITE_MAN;
    board[6 * SIZE + col] = WHITE_MAN;
  }
  return board;
}

/**
 * Builds a board from a diagram of 64 cells, rank 8 first. Cells: "." empty,
 * "w"/"W" white man/king, "b"/"B" black man/king; whitespace is ignored.
 * @param {string} diagram
 * @returns {number[]}
 * @throws {Error} on a wrong cell count or an unknown cell
 */
export function parseBoard(diagram) {
  const cells = diagram.replace(/\s+/g, '');
  if (cells.length !== SQUARES) {
    throw new Error(`parseBoard: expected ${SQUARES} cells, got ${cells.length}`);
  }
  return Array.from(cells, (cell) => {
    const index = PIECE_CHARS.indexOf(cell);
    if (index === -1) throw new Error(`parseBoard: unknown cell "${cell}"`);
    return index - 2;
  });
}

/**
 * Diagram of a board in the parseBoard format, one rank per line.
 * @param {number[]} board
 * @returns {string}
 */
export function boardToText(board) {
  const lines = [];
  for (let row = 0; row < SIZE; row++) {
    const cells = board.slice(row * SIZE, (row + 1) * SIZE);
    lines.push(cells.map((piece) => PIECE_CHARS[piece + 2]).join(' '));
  }
  return lines.join('\n');
}

/**
 * Compact key identifying a position (board and side to move), for repetitions.
 * @param {number[]} board
 * @param {number} side - side to move
 * @returns {string}
 */
export function positionKey(board, side) {
  let key = side === WHITE ? 'w' : 'b';
  for (let square = 0; square < SQUARES; square++) key += PIECE_CHARS[board[square] + 2];
  return key;
}

/**
 * Number of men and kings of each side.
 * @param {number[]} board
 * @returns {{white: {men: number, kings: number}, black: {men: number, kings: number}}}
 */
export function countPieces(board) {
  const counts = { white: { men: 0, kings: 0 }, black: { men: 0, kings: 0 } };
  for (const piece of board) {
    if (piece === EMPTY) continue;
    const side = piece > 0 ? counts.white : counts.black;
    if (isKing(piece)) side.kings++;
    else side.men++;
  }
  return counts;
}

/**
 * All legal moves for `side`. Capturing is mandatory and only the sequences
 * that capture the most pieces are legal; otherwise every simple step is.
 * Sequences ending in the same position are listed once (generateRoutes lists
 * them all). The board is not modified.
 * @param {number[]} board
 * @param {number} side - WHITE or BLACK
 * @returns {Move[]}
 */
export function generateMoves(board, side) {
  const captures = generateCaptures(board, side);
  return captures.length > 0 ? uniqueMoves(captures) : generateSteps(board, side);
}

/**
 * Every legal route for `side`: the moves of generateMoves plus the capture
 * routes that reach the same position over other landing squares, so a player
 * can follow whichever route they choose. Of the routes to one position, the
 * one generateMoves keeps comes first. The board is not modified.
 * @param {number[]} board
 * @param {number} side - WHITE or BLACK
 * @returns {Move[]}
 */
export function generateRoutes(board, side) {
  const captures = generateCaptures(board, side);
  return captures.length > 0 ? captures : generateSteps(board, side);
}

/**
 * Whether two moves lead to the same position: same start and final squares
 * and the same captured pieces, whatever the route between them.
 * @param {Move} a
 * @param {Move} b
 * @returns {boolean}
 */
export function sameOutcome(a, b) {
  return a.from === b.from && a.to === b.to && a.captures.length === b.captures.length
    && a.captures.every((square) => b.captures.includes(square));
}

/**
 * Whether `side` has a capture available (and therefore must capture).
 * @param {number[]} board
 * @param {number} side - WHITE or BLACK
 * @returns {boolean}
 */
export function canCapture(board, side) {
  for (let square = 0; square < SQUARES; square++) {
    const piece = board[square];
    if (piece * side > 0 && canCaptureFrom(board, square, piece)) return true;
  }
  return false;
}

/**
 * Whether `side` has a simple, non-capturing step available.
 * @param {number[]} board
 * @param {number} side - WHITE or BLACK
 * @returns {boolean}
 */
export function canStep(board, side) {
  for (let square = 0; square < SQUARES; square++) {
    const piece = board[square];
    if (piece * side <= 0) continue;
    for (const direction of directionsFor(piece)) {
      const ray = RAYS[square][direction];
      if (ray.length > 0 && board[ray[0]] === EMPTY) return true;
    }
  }
  return false;
}

function directionsFor(piece) {
  if (isKing(piece)) return KING_DIRECTIONS;
  return piece > 0 ? WHITE_MAN_DIRECTIONS : BLACK_MAN_DIRECTIONS;
}

/**
 * Index on `ray` of an enemy piece that `piece` can jump (adjacent for a man,
 * at any distance for a king) with an empty square right behind it, or -1.
 */
function victimIndex(board, ray, piece) {
  let i = 0;
  if (isKing(piece)) while (i < ray.length && board[ray[i]] === EMPTY) i++;
  const jumpable = i + 1 < ray.length && board[ray[i]] * piece < 0 && board[ray[i + 1]] === EMPTY;
  return jumpable ? i : -1;
}

function canCaptureFrom(board, square, piece) {
  for (const direction of directionsFor(piece)) {
    if (victimIndex(board, RAYS[square][direction], piece) >= 0) return true;
  }
  return false;
}

function generateCaptures(board, side) {
  const sequences = [];
  let work = null;
  for (let square = 0; square < SQUARES; square++) {
    const piece = board[square];
    if (piece * side <= 0 || !canCaptureFrom(board, square, piece)) continue;
    work ??= board.slice();
    work[square] = EMPTY; // the start square is free while the piece is jumping
    extendCapture(work, piece, [square], [], [], -1, sequences);
    work[square] = piece;
  }
  if (sequences.length === 0) return sequences;
  const most = sequences.reduce((max, move) => Math.max(max, move.captures.length), 0);
  return sequences.filter((move) => move.captures.length === most);
}

/**
 * Depth-first search over capture continuations from the last square of `path`.
 * Captured pieces leave the board at once (restored when backtracking), so no
 * piece is jumped twice. Only sequences that cannot be extended are recorded.
 */
function extendCapture(board, piece, path, captures, taken, lastDirection, out) {
  const square = path[path.length - 1];
  const reverse = lastDirection < 0 ? -1 : (lastDirection + 2) % 4;
  let extended = false;
  for (const direction of directionsFor(piece)) {
    if (direction === reverse) continue; // no 180-degree turn between two jumps
    const ray = RAYS[square][direction];
    const i = victimIndex(board, ray, piece);
    if (i < 0) continue;
    extended = true;
    const victimSquare = ray[i];
    const victim = board[victimSquare];
    board[victimSquare] = EMPTY;
    captures.push(victimSquare);
    taken.push(victim);
    const end = isKing(piece) ? ray.length : i + 2; // a king may land on any empty square beyond
    for (let j = i + 1; j < end && board[ray[j]] === EMPTY; j++) {
      path.push(ray[j]);
      extendCapture(board, piece, path, captures, taken, direction, out);
      path.pop();
    }
    captures.pop();
    taken.pop();
    board[victimSquare] = victim;
  }
  if (!extended && captures.length > 0) {
    out.push(buildMove(piece, path.slice(), captures.slice(), taken.slice()));
  }
}

/** Drops capture sequences that end in the same position as an earlier one. */
function uniqueMoves(moves) {
  return moves.filter((move, index) => {
    for (let k = 0; k < index; k++) if (sameOutcome(moves[k], move)) return false;
    return true;
  });
}

function generateSteps(board, side) {
  const moves = [];
  for (let square = 0; square < SQUARES; square++) {
    const piece = board[square];
    if (piece * side <= 0) continue;
    const king = isKing(piece);
    for (const direction of directionsFor(piece)) {
      for (const target of RAYS[square][direction]) {
        if (board[target] !== EMPTY) break;
        moves.push(buildMove(piece, [square, target], NO_CAPTURES, NO_CAPTURES));
        if (!king) break;
      }
    }
  }
  return moves;
}

/** Builds a move that takes ownership of the given arrays. */
function buildMove(piece, path, captures, taken) {
  const to = path[path.length - 1];
  return {
    from: path[0],
    to,
    path,
    captures,
    capturedPieces: taken,
    piece,
    promotes: !isKing(piece) && rowOf(to) === promotionRow(sideOf(piece)),
  };
}

/**
 * Plays a move on `board` in place (used by the search; see applyMove for a copy).
 * @param {number[]} board
 * @param {Move} move - a legal move for this board
 */
export function makeMove(board, move) {
  board[move.from] = EMPTY;
  for (const square of move.captures) board[square] = EMPTY;
  board[move.to] = move.promotes ? move.piece * 2 : move.piece;
}

/**
 * Reverts makeMove on `board` in place.
 * @param {number[]} board
 * @param {Move} move - the move that was just made
 */
export function unmakeMove(board, move) {
  board[move.to] = EMPTY;
  move.captures.forEach((square, i) => {
    board[square] = move.capturedPieces[i];
  });
  board[move.from] = move.piece;
}

/**
 * Board after a move, leaving the input untouched.
 * @param {number[]} board
 * @param {Move} move - a legal move for this board
 * @returns {number[]}
 */
export function applyMove(board, move) {
  const next = board.slice();
  makeMove(next, move);
  return next;
}

/**
 * Human-readable notation: "c3-c4" for a step, "d3xd5xd7" for a capture.
 * @param {Move} move
 * @returns {string}
 */
export function moveToString(move) {
  return move.path.map((square) => squareName(square)).join(move.captures.length > 0 ? 'x' : '-');
}
