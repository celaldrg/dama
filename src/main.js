/**
 * Entry point: restores the saved language and settings, builds the board and
 * the controller, and wires the header, the dialogs and keyboard shortcuts.
 * "?demo" opens a fixed mid-game position (used for the README screenshot).
 */

import { createAiClient } from './ai-client.js';
import { createApp } from './app.js';
import { createBoardView } from './board-view.js';
import { createNewGameDialog, createRulesDialog } from './dialogs.js';
import { normalizeLanguage, otherLanguage, translate } from './i18n.js';
import { DEFAULT_SETTINGS, normalizeSettings } from './session.js';
import { loadValue, saveValue } from './storage.js';

const byId = (id) => document.getElementById(id);

function playerElements(root) {
  return {
    root,
    name: root.querySelector('.player-name'),
    sub: root.querySelector('.player-sub'),
    count: root.querySelector('.player-count'),
    total: root.querySelector('.count-total'),
    kings: root.querySelector('.count-kings'),
    kingsCount: root.querySelector('.count-kings-n'),
  };
}

function init() {
  const demo = new URLSearchParams(window.location.search).has('demo');
  let language = normalizeLanguage(loadValue('lang', null));
  const t = (key, params) => translate(language, key, params);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const dom = {
    board: byId('board'),
    cursorInfo: byId('cursor-info'),
    playerTop: playerElements(byId('player-top')),
    playerBottom: playerElements(byId('player-bottom')),
    statusCard: byId('status-card'),
    statusTitle: byId('status-title'),
    statusDetail: byId('status-detail'),
    moveCounter: byId('move-counter'),
    lastMove: byId('last-move'),
    modeSummary: byId('mode-summary'),
    undoButton: byId('undo-btn'),
    againButton: byId('again-btn'),
  };

  const app = createApp({
    view: createBoardView(dom.board),
    ai: createAiClient(),
    dom,
    t,
    reducedMotion: () => motion.matches,
  });
  const newGameDialog = createNewGameDialog(byId('new-game-dialog'), (settings) => {
    saveValue('settings', settings);
    app.start(settings);
  });
  const rulesDialog = createRulesDialog(byId('rules-dialog'));
  const openNewGame = () => newGameDialog.open(app.getSettings());

  function applyLanguage() {
    document.documentElement.lang = language;
    document.title = t('docTitle');
    for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    for (const node of document.querySelectorAll('[data-i18n-label]')) {
      node.setAttribute('aria-label', t(node.dataset.i18nLabel));
    }
    for (const node of document.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle);
    byId('lang-toggle').lang = otherLanguage(language);
    rulesDialog.render(language);
    app.refresh();
  }

  function toggleLanguage() {
    language = otherLanguage(language);
    saveValue('lang', language);
    applyLanguage();
  }

  function onShortcut(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (document.querySelector('dialog[open]')) return;
    if (event.target instanceof Element && event.target.closest('input, select, textarea')) return;
    const key = event.key.toLowerCase();
    if (key === 'u') app.undo();
    else if (key === 'n') openNewGame();
  }

  byId('new-game-btn').addEventListener('click', openNewGame);
  byId('rules-btn').addEventListener('click', () => rulesDialog.open());
  byId('undo-btn').addEventListener('click', () => app.undo());
  byId('again-btn').addEventListener('click', () => app.restart());
  byId('lang-toggle').addEventListener('click', toggleLanguage);
  document.addEventListener('keydown', onShortcut);

  const settings = demo ? { ...DEFAULT_SETTINGS } : normalizeSettings(loadValue('settings', null));
  app.start(settings, { demo });
  applyLanguage();
}

init();
