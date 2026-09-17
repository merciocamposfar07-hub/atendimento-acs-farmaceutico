'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const html=read('central-administrativa-tacs.html');
const central=read('central-administrativa-tacs.js');
const quick=read('central-tacs-login-rapido-v1.js');
const agenda=read('conecta-agendas-native-v1.js');

// PIN TACS: o HTML publicado precisa carregar uma revisão explícita do bundle.
assert.match(html,/central-tacs-login-rapido-v1\.js\?v=[A-Za-z0-9._-]+/);
assert.doesNotMatch(html,/central-tacs-login-rapido-v1\.js\?v=5b56e3dda8cb/);

// A revisão carregada precisa conter as proteções já existentes para iPhone.
assert.match(quick,/DONO_UNICO_PIN_TACS_2026_09_16_V1/);
assert.match(quick,/LEITURA_PIN_TACS_ATIVO_IPHONE_2026_09_16_V1/);
assert.match(quick,/function lerPinTacsParaEntrar\(\)/);
assert.match(quick,/stopImmediatePropagation\(\)/);

// Agendas: o bundle atual precisa ter revisão explícita e manter o retry isolado.
assert.match(central,/conecta-agendas-native-v1\.js\?v=[A-Za-z0-9._-]+(?:&load=[A-Za-z0-9._-]+)?/);
assert.doesNotMatch(central,/conecta-agendas-native-v1\.js\?v=20260913-loading-lifecycle-v2/);
assert.match(central,/CORRECAO_CIRURGICA_AGENDAS_RETRY_SAFARI_20260916_V1/);
assert.match(central,/ConectaAgendasNativeV1\.reset\(\)/);
assert.match(central,/\/atendimento-acs-farmaceutico\/conecta-agendas-native-v1\.js\?v=[A-Za-z0-9._-]+/);

// O módulo atual mantém o contrato de reset isolado e montagem por escopo.
assert.match(agenda,/if\(instance&&instance\.scope!==scope\)\{instance\.reset\(\);instance=null\}/);
assert.match(agenda,/reset:function\(\)\{visible=false;/);
assert.match(agenda,/window\.ConectaAgendasNativeV1=\{/);

// GATE_PIN_AGENDAS_SAFARI_20260916_V1
console.log('PIN_AGENDAS_SAFARI_OK: bundle do PIN atualizado; Agendas com revisão nova e retry isolado sem alterar sessão/dados.');
