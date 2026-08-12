'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('agenda-enfermeira.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert.match(source, /id="notificationRepairButton"[^>]*hidden>🔧 Reparar recebimento de avisos<\/button>/);
assert.match(source, /repairButton\.hidden = false;\s*repairButton\.disabled = false;/);
assert.match(source, /async function repararRecebimento\(\)/);
assert.match(source, /await push\.optOut\(\)/);
assert.match(source, /await push\.optIn\(\)/);
assert.match(source, /await aguardarInscricao\(12000\)/);
assert.match(source, /await aguardarToken\(8000\)/);
assert.match(source, /await marcarAreaDaUnidade\(\)/);
assert.match(source, /if \(repairInProgress\) return;/);
assert.match(source, /Reparo concluído\. A inscrição foi renovada/);
assert.match(index, /agenda-enfermeira\.js\?v=20260812-reparo-push-v4/);
console.log('Push do morador: botão permanente e renovação optOut/optIn + token + área validados.');
