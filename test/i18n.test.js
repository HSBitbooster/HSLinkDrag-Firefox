// Unit-Tests für die Sprachwahl der eigenen Übersetzung. Ausführen: node --test test/
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { LOCALES, pickLocale } = require('../src/shared/i18n.js');

test('Firefox-Sprache → vorhandene Übersetzung', () => {
  assert.equal(pickLocale('de'), 'de');
  assert.equal(pickLocale('de-DE'), 'de');
  assert.equal(pickLocale('de-AT'), 'de');
  assert.equal(pickLocale('en-US'), 'en');
  assert.equal(pickLocale('en-GB'), 'en');
  assert.equal(pickLocale('fr'), 'en');
  assert.equal(pickLocale(''), 'en');
  assert.equal(pickLocale(undefined), 'en');
});

test('LOCALES passt zu _locales/ und alle Sprachen haben dieselben Texte', () => {
  const dir = path.join(__dirname, '..', '_locales');
  assert.deepEqual([...LOCALES].sort(), fs.readdirSync(dir).sort());
  const keys = LOCALES.map((l) => Object.keys(JSON.parse(fs.readFileSync(path.join(dir, l, 'messages.json')))).sort());
  for (const k of keys) assert.deepEqual(k, keys[0]);
});
