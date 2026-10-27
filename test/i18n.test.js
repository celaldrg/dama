import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  RULES,
  STRINGS,
  normalizeLanguage,
  otherLanguage,
  translate,
} from '../src/i18n.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test('English and Turkish have the same keys, none empty, with the same parameters', () => {
  assert.deepEqual(LANGUAGES, ['en', 'tr']);
  const keys = Object.keys(STRINGS.en).sort();
  assert.deepEqual(Object.keys(STRINGS.tr).sort(), keys);
  for (const key of keys) {
    for (const lang of LANGUAGES) assert.ok(STRINGS[lang][key].trim().length > 0, `${lang}.${key} is empty`);
    assert.deepEqual(placeholders(STRINGS.tr[key]), placeholders(STRINGS.en[key]), `parameters of ${key}`);
  }
});

test('the language toggle shows the other language and its accessible name starts with that text', () => {
  for (const lang of LANGUAGES) {
    const label = translate(lang, 'langToggle');
    assert.equal(label, otherLanguage(lang).toUpperCase());
    assert.ok(translate(lang, 'langToggleLabel').startsWith(label));
  }
});

test('translate fills in parameters and falls back sensibly', () => {
  assert.equal(translate('en', 'moveCounter', { n: 19 }), 'Move 19');
  assert.equal(translate('tr', 'moveCounter', { n: 19 }), 'Hamle 19');
  assert.equal(translate('tr', 'lastMove', { move: 'd3xd5xd7' }), 'Son hamle: d3xd5xd7');
  assert.equal(translate('de', 'undo'), 'Undo', 'unknown languages fall back to English');
  assert.equal(translate('en', 'noSuchKey'), 'noSuchKey');
  assert.equal(translate('en', 'moveCounter'), 'Move {n}', 'a missing parameter stays visible');
});

test('normalizeLanguage and otherLanguage only produce supported languages', () => {
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.equal(normalizeLanguage('tr'), 'tr');
  for (const value of [null, undefined, 'TR', 'fr', 3]) assert.equal(normalizeLanguage(value), 'en');
  assert.equal(otherLanguage('en'), 'tr');
  assert.equal(otherLanguage('tr'), 'en');
  assert.equal(otherLanguage('xx'), 'tr');
});

test('the rules exist in both languages with the same structure and state the draw rule', () => {
  assert.equal(RULES.tr.length, RULES.en.length);
  RULES.en.forEach((section, i) => {
    assert.equal(RULES.tr[i].paragraphs.length, section.paragraphs.length, `section ${i}`);
    for (const text of [section.title, ...section.paragraphs, RULES.tr[i].title, ...RULES.tr[i].paragraphs]) {
      assert.ok(text.trim().length > 0);
    }
  });
  const english = RULES.en.flatMap((section) => section.paragraphs).join(' ');
  assert.match(english, /third time/);
  assert.match(english, /50 moves/);
  assert.match(english, /most pieces/);
});

test('every key used by index.html and the interface code is translated', () => {
  const html = read('index.html');
  const htmlKeys = [...html.matchAll(/data-i18n(?:-label|-title)?="(\w+)"/g)].map((match) => match[1]);
  assert.ok(htmlKeys.length > 20);
  // Every quoted word passed to t(...) or showHint(...) in the source must be a key.
  const codeKeys = readdirSync(new URL('src/', root))
    .filter((name) => name.endsWith('.js'))
    .flatMap((name) => [...read(`src/${name}`).matchAll(/\b(?:t|showHint)\((.*)$/gm)])
    .flatMap((call) => [...call[1].matchAll(/'(\w+)'/g)].map((literal) => literal[1]));
  assert.ok(codeKeys.length > 10);
  for (const key of [...htmlKeys, ...codeKeys]) {
    assert.ok(Object.hasOwn(STRINGS.en, key) && Object.hasOwn(STRINGS.tr, key), `untranslated key "${key}"`);
  }
});
