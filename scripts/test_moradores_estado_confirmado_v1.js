'use strict';
const assert=require('assert');
const fs=require('fs');

const moradores=fs.readFileSync('teste-v1/painel-moradores-transport-v2.js','utf8');
const native=fs.readFileSync('conecta-moradores-native-v1.js','utf8');
new Function(moradores);
new Function(native);

assert.match(moradores,/var baseConfirmed=false/);
assert.match(moradores,/function confirmBaseState\(r,message\)\{\s*baseConfirmed=true/);
assert.match(moradores,/if\(remoteConfirmed\)baseConfirmed=true/);

// Rebind da mesma sessão não pode apagar indicadores já confirmados.
const showStart=moradores.indexOf('function showAuthenticatedShell(message)');
const showEnd=moradores.indexOf('function ensureSituationUi()',showStart);
const showBlock=moradores.slice(showStart,showEnd);
assert.match(showBlock,/if\(!baseConfirmed\)\{/);
assert.match(showBlock,/countResidents/);
assert.match(showBlock,/AGUARDE/);

const rebindStart=moradores.indexOf('function rebindNativeContext(config)');
const rebindEnd=moradores.indexOf('window.PortalTacsMoradoresTransportV2',rebindStart);
const rebindBlock=moradores.slice(rebindStart,rebindEnd);
assert.match(rebindBlock,/if\(!baseConfirmed\)\{/);
assert.match(rebindBlock,/Base já confirmada\. Conferindo somente se houve atualização…/);
assert.match(rebindBlock,/loadBase\('Base de moradores conferida no módulo nativo\.'/);

// Só contexto realmente novo pode zerar a confirmação.
assert.match(moradores,/selectedAreaId=next;\s*baseConfirmed=false;/);
assert.match(moradores,/selectedAreaId='';baseConfirmed=false;/);

// Busca e gravação continuam intactas.
assert.match(moradores,/function doSearch\(/);
assert.match(moradores,/admin_moradores_buscar/);
assert.match(moradores,/admin_morador_salvar/);
assert.match(native,/TAREFA_17_MORADORES_NATIVOS_V1/);

console.log('MORADORES_ESTADO_CONFIRMADO_OK: sincronização da mesma área preserva indicadores já confirmados; AGUARDE só reaparece em contexto ainda não confirmado.');
