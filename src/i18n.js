/**
 * Interface strings in English and Turkish, plus the text of the Rules dialog.
 * Pure module: no DOM or browser globals.
 */

/** Supported interface languages; the first one is the default. */
export const LANGUAGES = Object.freeze(['en', 'tr']);

export const DEFAULT_LANGUAGE = 'en';

/** Flat dictionaries: the same keys in every language, "{name}" marks a parameter. */
export const STRINGS = Object.freeze({
  en: Object.freeze({
    docTitle: 'Dama · Turkish draughts',
    tagline: 'Turkish draughts',
    newGame: 'New game',
    undo: 'Undo',
    rules: 'Rules',
    playAgain: 'Play again',
    langToggle: 'TR',
    langToggleLabel: 'TR – Türkçe',
    langToggleTitle: 'Türkçe',
    white: 'White',
    black: 'Black',
    you: 'You',
    computer: 'Computer',
    levelEasy: 'Easy',
    levelMedium: 'Medium',
    levelHard: 'Hard',
    piecesTitle: 'Men: {men} · Kings: {kings}',
    moveCounter: 'Move {n}',
    lastMove: 'Last move: {move}',
    whiteToMove: 'White to move',
    blackToMove: 'Black to move',
    yourMove: 'Your move',
    thinking: 'Computer is thinking…',
    hintSelect: 'Tap a piece, then a highlighted square.',
    hintCapture: 'Capture is mandatory: take the most pieces.',
    hintPath: 'Several routes end there: tap the next landing square first.',
    hintOtherMustCapture: 'Another piece has to capture.',
    hintCannotMove: 'That piece has no legal move.',
    hintWait: 'Wait for the computer’s move.',
    winWhite: 'White wins!',
    winBlack: 'Black wins!',
    youWin: 'You win!',
    youLose: 'The computer wins.',
    draw: 'Draw',
    reasonNoPiecesWhite: 'White has no pieces left.',
    reasonNoPiecesBlack: 'Black has no pieces left.',
    reasonNoMovesWhite: 'White has no legal move.',
    reasonNoMovesBlack: 'Black has no legal move.',
    reasonRepetition: 'The same position came up for the third time.',
    reasonFiftyMoves: '50 moves each without a capture or a man move.',
    modeSummaryAi: 'vs computer · {level}',
    modeSummaryTwo: '2 players on one device',
    kbdHelp: 'Keyboard: Tab to the board, arrows + Enter to move, Esc cancels, U undoes, N starts a new game.',
    boardLabel: 'Draughts board',
    boardHelp: 'Arrow keys move the cursor, Enter or Space picks a piece and a square, Escape cancels.',
    squareEmpty: '{square}, empty',
    squareWhiteMan: '{square}, white man',
    squareWhiteKing: '{square}, white king',
    squareBlackMan: '{square}, black man',
    squareBlackKing: '{square}, black king',
    mode: 'Mode',
    modeAi: 'vs computer',
    modeTwo: '2 players',
    level: 'Level',
    yourColor: 'Your color',
    start: 'Start',
    cancel: 'Cancel',
    close: 'Close',
    rulesTitle: 'Rules of Turkish draughts',
    footerSource: 'Source on GitHub',
  }),
  tr: Object.freeze({
    docTitle: 'Dama · Türk daması',
    tagline: 'Türk daması',
    newGame: 'Yeni oyun',
    undo: 'Geri al',
    rules: 'Kurallar',
    playAgain: 'Yeniden oyna',
    langToggle: 'EN',
    langToggleLabel: 'EN – English',
    langToggleTitle: 'English',
    white: 'Beyaz',
    black: 'Siyah',
    you: 'Sen',
    computer: 'Bilgisayar',
    levelEasy: 'Kolay',
    levelMedium: 'Orta',
    levelHard: 'Zor',
    piecesTitle: 'Taş: {men} · Dama: {kings}',
    moveCounter: 'Hamle {n}',
    lastMove: 'Son hamle: {move}',
    whiteToMove: 'Sıra beyazda',
    blackToMove: 'Sıra siyahta',
    yourMove: 'Sıra sende',
    thinking: 'Bilgisayar düşünüyor…',
    hintSelect: 'Bir taşa, sonra işaretli kareye dokun.',
    hintCapture: 'Almak zorunlu: en çok taşı alan yolu seç.',
    hintPath: 'Oraya birden çok yol var: önce sıradaki iniş karesine dokun.',
    hintOtherMustCapture: 'Almak zorunda olan başka bir taş var.',
    hintCannotMove: 'Bu taşın oynayabileceği hamle yok.',
    hintWait: 'Bilgisayarın hamlesini bekle.',
    winWhite: 'Beyaz kazandı!',
    winBlack: 'Siyah kazandı!',
    youWin: 'Kazandın!',
    youLose: 'Bilgisayar kazandı.',
    draw: 'Berabere',
    reasonNoPiecesWhite: 'Beyazın taşı kalmadı.',
    reasonNoPiecesBlack: 'Siyahın taşı kalmadı.',
    reasonNoMovesWhite: 'Beyazın oynayacak hamlesi yok.',
    reasonNoMovesBlack: 'Siyahın oynayacak hamlesi yok.',
    reasonRepetition: 'Aynı konum üçüncü kez oluştu.',
    reasonFiftyMoves: '50’şer hamle boyunca ne taş alındı ne de taş oynatıldı.',
    modeSummaryAi: 'Bilgisayara karşı · {level}',
    modeSummaryTwo: 'Aynı cihazda 2 oyuncu',
    kbdHelp: 'Klavye: Tab ile tahtaya geç, oklar + Enter ile oyna, Esc vazgeçer, U geri alır, N yeni oyun başlatır.',
    boardLabel: 'Dama tahtası',
    boardHelp: 'Ok tuşları imleci taşır, Enter ya da Boşluk taşı ve kareyi seçer, Esc vazgeçer.',
    squareEmpty: '{square}, boş',
    squareWhiteMan: '{square}, beyaz taş',
    squareWhiteKing: '{square}, beyaz dama',
    squareBlackMan: '{square}, siyah taş',
    squareBlackKing: '{square}, siyah dama',
    mode: 'Mod',
    modeAi: 'Bilgisayara karşı',
    modeTwo: '2 oyuncu',
    level: 'Seviye',
    yourColor: 'Rengin',
    start: 'Başla',
    cancel: 'Vazgeç',
    close: 'Kapat',
    rulesTitle: 'Türk daması kuralları',
    footerSource: 'Kaynak kodu GitHub’da',
  }),
});

/** Rules dialog: sections with a title and paragraphs, in the same order in every language. */
export const RULES = Object.freeze({
  en: [
    {
      title: 'The board',
      paragraphs: [
        'Turkish draughts is played on an 8×8 board and every square is used. Each player starts with 16 men on their second and third ranks. White moves first.',
      ],
    },
    {
      title: 'Moving',
      paragraphs: [
        'A man moves one square forward or sideways, never backward or diagonally.',
        'A king (dama) moves any number of empty squares along a rank or a file.',
      ],
    },
    {
      title: 'Capturing',
      paragraphs: [
        'A man captures by jumping over an adjacent enemy piece, forward or sideways, onto the empty square just behind it.',
        'A king captures from any distance along a rank or a file and may land on any empty square beyond the captured piece.',
        'Capturing is mandatory, and you must take the sequence that captures the most pieces. Men and kings count the same.',
        'In a multi-capture each piece leaves the board as soon as it is jumped, so no piece can be jumped twice. A king may not turn back 180° between two jumps.',
      ],
    },
    {
      title: 'Kings',
      paragraphs: [
        'A man that reaches the last rank becomes a king. If it gets there in the middle of a capture, it keeps capturing as a man and is crowned when the move ends.',
      ],
    },
    {
      title: 'End of the game',
      paragraphs: [
        'You win when your opponent has no pieces left or cannot move.',
        'The game is a draw when the same position, with the same player to move, comes up for the third time, or when both players make 50 moves in a row without a capture or a man move (only kings moving).',
      ],
    },
    {
      title: 'Controls',
      paragraphs: [
        'Tap a piece and then a highlighted square, or drag the piece there. Pieces that must capture glow and the whole capture route is drawn on the board. When several routes end on the same square, tap the landing squares one by one.',
        'Keyboard: Tab to the board, the arrow keys move the cursor, Enter or Space picks a piece and a square, Esc cancels, U undoes and N starts a new game.',
      ],
    },
  ],
  tr: [
    {
      title: 'Tahta',
      paragraphs: [
        'Türk daması 8×8 tahtada oynanır ve tüm kareler kullanılır. Her oyuncu ikinci ve üçüncü sıralarına dizilmiş 16 taşla başlar. İlk hamleyi beyaz yapar.',
      ],
    },
    {
      title: 'Hareket',
      paragraphs: [
        'Taş bir kare ileri ya da yana gider; geri ya da çapraz gidemez.',
        'Dama, satır ya da sütun boyunca istediği kadar boş kare gider.',
      ],
    },
    {
      title: 'Taş alma',
      paragraphs: [
        'Taş, yanındaki rakip taşın üzerinden ileri ya da yana atlayıp hemen arkasındaki boş kareye konarak alır.',
        'Dama, satır ya da sütundaki rakip taşı uzaktan alabilir ve alınan taşın ötesindeki herhangi bir boş kareye konabilir.',
        'Almak zorunludur ve en çok taşı alan yol seçilmelidir. Taş da dama da bir sayılır.',
        'Çoklu almada her taş, üzerinden atlandığı anda tahtadan kalkar; bu yüzden bir taş iki kez atlanamaz. Dama iki atlama arasında 180° geri dönemez.',
      ],
    },
    {
      title: 'Dama olma',
      paragraphs: [
        'Son sıraya ulaşan taş dama olur. Oraya bir alma sırasında varırsa almaya taş olarak devam eder ve hamle bitince dama olur.',
      ],
    },
    {
      title: 'Oyunun sonu',
      paragraphs: [
        'Rakibinin taşı kalmazsa ya da rakibin hamle yapamazsa kazanırsın.',
        'Aynı konum, sıra aynı oyuncudayken üçüncü kez oluşursa ya da iki oyuncu üst üste 50’şer hamle boyunca hiç taş almaz ve taş oynatmazsa (yalnız damalar oynarsa) oyun berabere biter.',
      ],
    },
    {
      title: 'Kontroller',
      paragraphs: [
        'Bir taşa, sonra işaretli kareye dokun ya da taşı oraya sürükle. Almak zorunda olan taşlar parlar ve alma yolunun tamamı tahtada çizilir. Aynı kareye birden çok yol varsa iniş karelerine sırayla dokun.',
        'Klavye: Tab ile tahtaya geç; oklar imleci taşır, Enter ya da Boşluk taşı ve kareyi seçer, Esc vazgeçer, U geri alır, N yeni oyun başlatır.',
      ],
    },
  ],
});

/**
 * A supported language code, or the default for anything else.
 * @param {unknown} value - e.g. a stored preference
 * @returns {string}
 */
export function normalizeLanguage(value) {
  return LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

/**
 * The language the toggle button switches to.
 * @param {string} lang
 * @returns {string}
 */
export function otherLanguage(lang) {
  return normalizeLanguage(lang) === 'en' ? 'tr' : 'en';
}

/**
 * Looks up a string and fills in its "{name}" parameters. Falls back to
 * English for an unknown language and to the key itself for an unknown key.
 * @param {string} lang - 'en' or 'tr'
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function translate(lang, key, params = {}) {
  const table = STRINGS[normalizeLanguage(lang)];
  const text = Object.hasOwn(table, key) ? table[key] : key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(params, name) ? String(params[name]) : match));
}
