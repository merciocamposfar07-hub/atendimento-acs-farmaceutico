'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const icon = read('portal-conecta-oficial-v1.js');
const update = read('portal-auto-update.js');

assert.doesNotMatch(icon, /new\s+MutationObserver\s*\(/);
assert.doesNotMatch(icon, /observer\.observe\s*\(/);
assert.match(icon, /MAX_RETRIES=40/);
assert.match(icon, /RETRY_MS=250/);
assert.match(icon, /data:image\/jpeg;base64,\/9j\//);
assert.match(icon, /data-conecta-oficial/);
assert.match(icon, /width=56/);
assert.match(icon, /height=56/);
assert.doesNotMatch(icon, /assets\/conecta-saude-comunitaria-oficial-footer\.png/);
assert.doesNotMatch(icon, /function\s+simbolo\s*\(/);
assert.match(update, /portal-conecta-oficial-v1\.js\?v=20260823-conecta-estavel-v4/);
assert.match(update, /INSTITUTIONAL_SCRIPT_ID='portalTacsInstitucionalSuporteScriptV1'/);
assert.match(update, /if\(!document\.querySelector\('\.portal-footer-brand'\)\)return/);
assert.match(update, /script\.addEventListener\('load',afterInstitutionalReady,\{once:true\}\)/);
assert.match(update, /function afterInstitutionalReady\(\)/);
assert.match(update, /script\.async=false/);

const institutionalStart=update.indexOf("script.src='/atendimento-acs-farmaceutico/portal-institucional-suporte-v1.js");
const institutionalHook=update.indexOf("script.addEventListener('load',afterInstitutionalReady",institutionalStart);
assert.ok(institutionalStart>=0&&institutionalHook>institutionalStart,'Rodapé institucional deve concluir antes de acionar o símbolo Conecta');

const match = icon.match(/data:image\/jpeg;base64,([^']+)/);
assert.ok(match && match[1]);
const bytes = Buffer.from(match[1], 'base64');
assert.ok(bytes.length > 4000);
assert.equal(bytes[0], 0xff);
assert.equal(bytes[1], 0xd8);
assert.equal(bytes.at(-2), 0xff);
assert.equal(bytes.at(-1), 0xd9);

console.log('CONECTA_FOOTER_SAFARI_V1_OK');
