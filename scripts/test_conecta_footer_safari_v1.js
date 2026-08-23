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
assert.match(icon, /if\(aplicar\(\)\)return;/);
assert.match(icon, /assets\/conecta-saude-comunitaria-oficial-footer\.png/);
assert.match(icon, /data-conecta-oficial/);
assert.doesNotMatch(icon, /function\s+simbolo\s*\(/);
assert.ok(fs.existsSync(path.join(root, 'assets/conecta-saude-comunitaria-oficial-footer.png')));
assert.match(update, /portal-conecta-oficial-v1\.js\?v=20260823-conecta-estavel-v2/);

console.log('CONECTA_FOOTER_SAFARI_V1_OK');
