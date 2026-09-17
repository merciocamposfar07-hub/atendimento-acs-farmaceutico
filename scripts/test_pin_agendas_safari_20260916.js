'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const html=read('central-administrativa-tacs.html');
const central=read('central-administrativa-tacs.js');
const quick=read('central-tacs-login-rapido-v1.js');
const agenda=read('conecta-agendas-native-v1.js');

// PIN TACS: o HTML publicado precisa invalidar o bundle antigo do Safari.
assert.match(html,/central-tacs-login-rapido-v1\.js\?v=20260916-pin-tacs-iphone-v2/);
assert.doesNotMatch(html,/central-tacs-login-rapido-v1\.js\?v=5b56e3dda8cb/);

// A revisão carregada precisa conter as proteções já existentes para iPhone.
assert.match(quick,/DONO_UNICO_PIN_TACS_2026_09_16_V1/);
assert.match(quick,/LEITURA_PIN_TACS_ATIVO_IPHONE_2026_09_16_V1/);
assert.match(quick,/function lerPinTacsParaEntrar\(\)/);
assert.match(quick,/stopImmediatePropagation\(\)/);

// Agendas: não pode carregar o bundle nativo com a revisão antiga.
assert.match(central,/conecta-agendas-native-v1\.js\?v=20260916-safari-mount-retry-v1&load=20260916-safari-mount-retry-v1/);
assert.doesNotMatch(central,/conecta-agendas-native-v1\.js\?v=20260913-loading-lifecycle-v2/);
assert.match(central,/CORRECAO_CIRURGICA_AGENDAS_RETRY_SAFARI_20260916_V1/);
assert.match(central,/ConectaAgendasNativeV1\.reset\(\)/);
assert.match(central,/conecta-agendas-native-v1\.js\?v=20260916-safari-mount-retry-v1'\s*,/);

// O módulo atual mantém o contrato de reset isolado e montagem por escopo.
assert.match(agenda,/if\(instance&&instance\.scope!==scope\)\{instance\.reset\(\);instance=null\}/);
assert.match(agenda,/reset:function\(\)\{visible=false;/);
assert.match(agenda,/window\.ConectaAgendasNativeV1=\{/);

// GATE_PIN_AGENDAS_SAFARI_20260916_V1
console.log('PIN_AGENDAS_SAFARI_OK: bundle do PIN atualizado; Agendas com revisão nova e retry isolado sem alterar sessão/dados.');
