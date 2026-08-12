'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'apps-script', 'ZZ_11_PublicoConteudoPortalV1.gs'),
  'utf8'
);

const context = {
  console,
  Date,
  JSON,
  Object,
  String,
  Array,
  Utilities: {
    formatDate() { return '2026-08-12'; }
  },
  SpreadsheetApp: {getActiveSpreadsheet() { return null; }},
  ContentService: {
    MimeType: {JAVASCRIPT: 'js', JSON: 'json'},
    createTextOutput(text) { return {text, setMimeType() { return this; }}; }
  }
};
vm.createContext(context);
vm.runInContext(source, context);

const linhas = [
  {ATIVO:'sim', TITULO:'Legado Japa', MENSAGEM:'Japa', VALIDADE:'31/12/2026'},
  {ATIVO:'sim', TITULO:'Muntuns', MENSAGEM:'Muntuns', VALIDADE:'31/12/2026', AREA_ID:'MUNTUNS'}
];
const japa = context.publicoConteudoPortalV1PrepararRecados_(linhas, '2026-08-12', 'JAPARANDUBA');
const muntuns = context.publicoConteudoPortalV1PrepararRecados_(linhas, '2026-08-12', 'MUNTUNS');
assert.deepEqual(Array.from(japa, item => item.titulo), ['Legado Japa']);
assert.deepEqual(Array.from(muntuns, item => item.titulo), ['Muntuns']);
assert.equal(context.publicoConteudoPortalV1LinhaDaArea_(linhas[0], 'JAPARANDUBA'), true);
assert.equal(context.publicoConteudoPortalV1LinhaDaArea_(linhas[0], 'MUNTUNS'), false);
console.log('Conteúdo público multiárea: legado permanece Japaranduba e AREA_ID isola a nova área.');
