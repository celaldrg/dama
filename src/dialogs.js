/**
 * The New game and Rules dialogs, built on native <dialog> elements.
 */

import { RULES } from './i18n.js';
import { normalizeSettings } from './session.js';

/** @typedef {import('./session.js').Settings} Settings */

/**
 * Wires the New game dialog: mode, computer level and the human's color.
 * @param {HTMLDialogElement} dialog - holds a form with "mode", "level" and "color" radio groups
 * @param {(settings: Settings) => void} onStart - called when the player presses Start
 * @returns {{open: (current: Settings) => void}}
 */
export function createNewGameDialog(dialog, onStart) {
  const form = dialog.querySelector('form');
  const fields = form.elements;
  const computerOnly = dialog.querySelectorAll('[data-ai-only]');

  function syncFields() {
    const againstComputer = fields.mode.value === 'ai';
    for (const fieldset of computerOnly) fieldset.hidden = !againstComputer;
  }

  form.addEventListener('change', syncFields);
  dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
  closeOnBackdrop(dialog);
  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== 'start') return;
    onStart(normalizeSettings({
      mode: fields.mode.value,
      level: fields.level.value,
      color: Number(fields.color.value),
    }));
  });

  function open(current) {
    fields.mode.value = current.mode;
    fields.level.value = current.level;
    fields.color.value = String(current.color);
    syncFields();
    dialog.returnValue = '';
    dialog.showModal();
  }

  return { open };
}

/**
 * Wires the Rules dialog, whose text is rebuilt for each language.
 * @param {HTMLDialogElement} dialog - holds an element marked data-rules for the text
 * @returns {{open: () => void, render: (lang: string) => void}}
 */
export function createRulesDialog(dialog) {
  const content = dialog.querySelector('[data-rules]');
  closeOnBackdrop(dialog);

  function render(lang) {
    const sections = RULES[lang] ?? RULES.en;
    content.replaceChildren(...sections.map(buildSection));
  }

  function open() {
    dialog.showModal();
    content.scrollTop = 0;
  }

  return { open, render };
}

function buildSection(section) {
  const block = document.createElement('section');
  const heading = document.createElement('h3');
  heading.textContent = section.title;
  block.append(heading);
  for (const text of section.paragraphs) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    block.append(paragraph);
  }
  return block;
}

/** Closes a modal dialog when its backdrop (the dialog element itself) is clicked. */
function closeOnBackdrop(dialog) {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
