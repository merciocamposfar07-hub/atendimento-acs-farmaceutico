'use strict';
// Disparo controlado da homologação da correção de consistência entre aparelhos.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const autofill = fs.readFileSync(path.join(root, 'moradores-autofill.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(index, /moradores-autofill\.js\?v=[^"']+/,
  'O Portal precisa carregar o autofill com o carimbo integral da publicação.');
assert.match(autofill, /var negativeRequestId = 0;/);
assert.match(autofill, /var negativeProofs = \{\};/);
assert.match(autofill, /Object\.keys\(negativeProofs\)\.length < 2/,
  'Uma única resposta negativa não pode encerrar a busca.');
assert.match(autofill, /'jsonp:' \+ callback/,
  'A confirmação JSONP precisa ser identificada separadamente.');
assert.match(autofill, /'bridge:' \+ message\.nonce/,
  'A confirmação bridge precisa ser identificada separadamente.');
assert.match(autofill, /payload\.ok === true && payload\.encontrado === true/,
  'Resposta positiva continua sendo aceita imediatamente.');

console.log('CNS_CONSISTENCIA_DISPOSITIVO_V1_OK');
