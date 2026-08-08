'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const compat = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'portal-conteudo-publico-v1.js'), 'utf8');
const shared = fs.readFileSync(path.join(ROOT, 'portal-public-data.js'), 'utf8');
const agenda = fs.readFileSync(path.join(ROOT, 'agenda-enfermeira.js'), 'utf8');
const integral = fs.readFileSync(path.join(ROOT, 'portal-controle-integral.js'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

assert.match(compat, /PortalTacsPublicData\.get/);
assert.match(compat, /leituraAutomatica:\s*false/);
assert.doesNotMatch(compat, /iniciarLeituraSilenciosa/);
assert.doesNotMatch(compat, /action=publico_conteudo/);
assert.match(compat, /action=painel_publico/);

assert.match(shared, /action=painel_publico/);
assert.match(agenda, /PortalTacsPublicData\.get/);
assert.match(integral, /PortalTacsPublicData\.get/);
assert.ok(index.indexOf('portal-public-data.js') < index.indexOf('agenda-enfermeira.js'));
assert.ok(index.indexOf('portal-public-data.js') < index.indexOf('portal-controle-integral.js'));

console.log('OK: Portal usa a leitura pública compartilhada e não dispara leitura silenciosa concorrente.');
