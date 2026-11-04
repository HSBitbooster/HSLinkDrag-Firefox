// Unit-Tests für Text-Erkennung und Einstellungs-Hilfen. Ausführen: node --test test/
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyText, isOpenableUrl, searchUrl } = require('../src/shared/detect.js');
const { normalizeDomainList, isHostExcluded } = require('../src/shared/settings.js');

function url(text) {
  const r = classifyText(text);
  assert.equal(r && r.type, 'url', `„${text}“ sollte eine Adresse sein, war ${JSON.stringify(r)}`);
  return r.url;
}

function search(text) {
  const r = classifyText(text);
  assert.equal(r && r.type, 'search', `„${text}“ sollte eine Suche sein, war ${JSON.stringify(r)}`);
  return r.query;
}

function mail(text) {
  const r = classifyText(text);
  assert.equal(r && r.type, 'email', `„${text}“ sollte eine E-Mail sein, war ${JSON.stringify(r)}`);
  return r.url;
}

test('Adressen mit Schema', () => {
  assert.equal(url('https://example.com'), 'https://example.com/');
  assert.equal(url('http://example.com/a?b=c#d'), 'http://example.com/a?b=c#d');
  assert.equal(url('ftp://ftp.example.org/file.txt'), 'ftp://ftp.example.org/file.txt');
  assert.equal(url('HTTPS://Example.COM/Pfad'), 'https://example.com/Pfad');
});

test('Adressen ohne Schema', () => {
  assert.equal(url('www.heise.de'), 'https://www.heise.de/');
  assert.equal(url('www.example.foo'), 'https://www.example.foo/');
  assert.equal(url('example.com'), 'https://example.com/');
  assert.equal(url('sub.example.de/seite?x=1'), 'https://sub.example.de/seite?x=1');
  assert.equal(url('example.com:8080/pfad'), 'https://example.com:8080/pfad');
  assert.equal(url('müller.de'), 'https://xn--mller-kva.de/');
});

test('localhost und IP-Adressen', () => {
  assert.equal(url('localhost'), 'http://localhost/');
  assert.equal(url('localhost:3000/app'), 'http://localhost:3000/app');
  assert.equal(url('192.168.1.1'), 'http://192.168.1.1/');
  assert.equal(url('10.0.0.5:8080/status'), 'http://10.0.0.5:8080/status');
  search('300.1.1.1');
});

test('Satzzeichen und Klammern um Adressen', () => {
  assert.equal(url('example.com.'), 'https://example.com/');
  assert.equal(url('(www.example.com)'), 'https://www.example.com/');
  assert.equal(url('„https://example.com/x“,'), 'https://example.com/x');
  assert.equal(url('<https://example.com>'), 'https://example.com/');
  assert.equal(url('https://de.wikipedia.org/wiki/Test_(Begriffsklärung)'),
    'https://de.wikipedia.org/wiki/Test_(Begriffskl%C3%A4rung)');
  assert.equal(url('https://example.com/x)'), 'https://example.com/x');
  assert.equal(url('  www.example.com\n'), 'https://www.example.com/');
});

test('Kein Adress-Fehlalarm', () => {
  search('node.js');
  search('readme.md');
  search('script.py');
  search('index.html');
  search('z.B.');
  search('u.a.');
  search('Version 1.2.3');
  search('Mr.Smith');
  search('Chrome Erweiterung Drag');
  search('https://example.com und mehr');
  search('foo.bar');
});

test('Suchtext wird normalisiert', () => {
  assert.equal(search('  zwei\n  Zeilen\tText '), 'zwei Zeilen Text');
  assert.equal(classifyText('   '), null);
  assert.equal(classifyText(''), null);
});

test('E-Mail-Adressen', () => {
  assert.equal(mail('max@example.com'), 'mailto:max@example.com');
  assert.equal(mail('max.muster+tag@sub.example.de.'), 'mailto:max.muster+tag@sub.example.de');
  assert.equal(mail('<info@example.org>'), 'mailto:info@example.org');
  assert.equal(mail('mailto:a@b.de?subject=Hallo'), 'mailto:a@b.de?subject=Hallo');
  search('max@example');
  search('@handle');
  search('schreib an max@example.com');
});

test('Öffenbare Protokolle', () => {
  assert.ok(isOpenableUrl('https://example.com/'));
  assert.ok(isOpenableUrl('ftp://ftp.example.org/datei.txt'));
  assert.ok(!isOpenableUrl('file:///home/user/bild.png'));  // Firefox: tabs.create verbietet file:
  assert.ok(!isOpenableUrl('javascript:alert(1)'));
  assert.ok(!isOpenableUrl('data:image/png;base64,AAAA'));
  assert.ok(!isOpenableUrl('blob:https://example.com/123'));
  assert.ok(!isOpenableUrl('kein url'));
});

test('Such-URLs', () => {
  assert.equal(searchUrl('google', 'a b&c'), 'https://www.google.com/search?q=a%20b%26c');
  assert.equal(searchUrl('duckduckgo', 'ä'), 'https://duckduckgo.com/?q=%C3%A4');
  assert.equal(searchUrl('bing', 'x'), 'https://www.bing.com/search?q=x');
  assert.equal(searchUrl('default', 'x'), null);
  assert.equal(searchUrl('unbekannt', 'x'), 'https://www.google.com/search?q=x');
});

test('Ausschlussliste', () => {
  assert.deepEqual(
    normalizeDomainList('https://Trello.com/b/123\n  drive.google.com \n\n*.example.org\nlocalhost:3000\ntrello.com'),
    ['trello.com', 'drive.google.com', 'example.org', 'localhost']);
  const list = ['trello.com', 'google.com'];
  assert.ok(isHostExcluded('trello.com', list));
  assert.ok(isHostExcluded('drive.google.com', list));
  assert.ok(!isHostExcluded('nottrello.com', list));
  assert.ok(!isHostExcluded('example.com', list));
  assert.ok(!isHostExcluded('', list));
});
