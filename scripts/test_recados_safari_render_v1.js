'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const panel = fs.readFileSync('painel-oficial-recados-campanhas.html', 'utf8');
const central = fs.readFileSync('central-administrativa-tacs.js', 'utf8');
const quick = fs.readFileSync('central-tacs-login-rapido-v1.js', 'utf8');
const centralHtml = fs.readFileSync('central-administrativa-tacs.html', 'utf8');

const standardEnd = panel.indexOf('PORTAL_TACS_ADMIN_UI_STANDARD_END');
const safariFix = panel.indexOf('id="recadosSafariRenderV1"');
assert.ok(standardEnd >= 0 && safariFix > standardEnd,
  'A correção do Safari precisa prevalecer sobre o padrão visual injetado.');
assert.match(panel.slice(safariFix), /html\{overflow-x:hidden!important;overflow-y:auto!important\}body\{overflow-x:hidden!important;overflow-y:visible!important\}/);

assert.match(panel, /\.ponte\{position:absolute;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none\}/);
assert.doesNotMatch(panel, /\.ponte\{position:fixed;left:-10000px/);
assert.match(central, /frame\.style\.cssText='position:absolute;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none'/);
assert.doesNotMatch(central, /frame\.style\.cssText='position:fixed;left:-10000px/);

assert.doesNotMatch(quick, /name==='portal'\|\|name==='recados'/);
assert.doesNotMatch(central, /if\(name==='recados'\)\{location\.href=url;return\}/);
assert.match(centralHtml, /\.viewer iframe\{display:block;width:100%;min-width:0;min-height:0;flex:1 1 auto/);
assert.doesNotMatch(centralHtml, /\.viewer\{[^}]*height:100(?:d?vh|%)/);
assert.match(centralHtml, /central-administrativa-tacs\.js\?v=[^"']+/,
  'A Central deve carregar o controlador com o carimbo integral da publicação.');


const backButton = fs.readFileSync('central-back-button-v1.js', 'utf8');
assert.match(backButton, /portalTacsRecadosViewerSafeV4/,
  'Recados deve instalar a estabilização isolada do visor da Central.');
assert.match(backButton, /portal-tacs-recados-viewer-safe-v4/);
assert.match(backButton, /height:100dvh!important/,
  'O visor de Recados deve ocupar o viewport dinâmico inteiro no iPhone.');
assert.match(backButton, /grid-template-rows:auto minmax\(0,1fr\)/,
  'O visor de Recados deve evitar o colapso flex do iframe no Safari.');
assert.match(backButton, /history\.scrollRestoration='manual'/,
  'Recados não deve restaurar uma posição antiga que deixe a página aparente cortada.');
assert.match(backButton, /window\.scrollTo\(0,0\)/,
  'A primeira abertura de Recados deve começar no topo real do painel.');
assert.match(backButton, /recadosFirstContentResetDone/,
  'A primeira compactação da lista deve neutralizar a posição antiga do Safari.');
assert.doesNotMatch(backButton, /html\{[^}]*overflow-y:visible!important/,
  'A correção não pode reintroduzir overflow-y visible no elemento html.');
assert.match(panel, /central-back-button-v1\.js\?v=20260830-recados-viewport-safe-v4/,
  'O painel deve invalidar o cache do estabilizador corrigido.');
console.log('RECADOS_VIEWER_SAFE_V4_OK');

console.log('RECADOS_SAFARI_RENDER_V1_OK');
