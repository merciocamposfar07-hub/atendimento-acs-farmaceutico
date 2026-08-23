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
assert.match(panel.slice(safariFix), /html,body\{overflow-x:visible!important;overflow-y:visible!important\}/);

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

console.log('RECADOS_SAFARI_RENDER_V1_OK');
