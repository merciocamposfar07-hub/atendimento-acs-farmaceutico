'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.js');
const centralHtml=read('central-administrativa-tacs.html');
const index=read('index.html');
const moradores=read('teste-v1/painel-moradores-transport-v2.js');
const nativeMoradores=read('conecta-moradores-native-v1.js');
const familia=read('portal-identificacao-familia-v1.js');

// Central: não montar sete painéis ocultos enquanto o usuário está tocando.
assert.match(central,/CORRECAO_CONGELAMENTO_PREWARM_2026_09_16_V1/);
const runtimeStart=central.indexOf('function schedulePanelRuntimePrewarm()');
const runtimeEnd=central.indexOf("window.addEventListener('load'",runtimeStart);
assert.ok(runtimeStart>=0&&runtimeEnd>runtimeStart,'schedulePanelRuntimePrewarm ausente');
const runtime=central.slice(runtimeStart,runtimeEnd);
assert.doesNotMatch(runtime,/prewarmPanelRuntime\(name\)/,'runtime oculto voltou ao caminho de prewarm');
assert.match(runtime,/scheduleNativePanelPrewarm\(\)/);
assert.match(centralHtml,/central-administrativa-tacs\.js\?v=[A-Za-z0-9._-]+/,'Central publicada sem revisão de cache');

// Moradores: consulta da base e busca são leituras independentes; escrita continua serializada.
assert.match(moradores,/LEITURAS_CONCORRENTES_MORADORES_2026_09_16_V1/);
assert.match(moradores,/function readPost\(action,payload,resultAction,cb\)/);
assert.match(moradores,/readPost\('admin_moradores_status'/);
assert.match(moradores,/readPost\('admin_moradores_buscar'/);
assert.doesNotMatch(moradores,/if\(baseCheckPending\)\{\s*setStatus\('operationStatus','O painel já está aberto\. Aguarde somente a conferência da base terminar\.'/);
const loadingStart=moradores.indexOf('function setBaseLoading(loading)');
const loadingEnd=moradores.indexOf('function showAuthenticatedShell',loadingStart);
const loading=moradores.slice(loadingStart,loadingEnd);
assert.match(loading,/searchButton\.disabled=false/,'busca ainda é bloqueada pela sincronização da base');
for(const action of ['admin_morador_salvar','admin_morador_situacao','admin_morador_consolidar']){
  assert.ok(moradores.includes("post('"+action+"'"),action+' deixou de usar transporte serial de escrita');
}
assert.match(nativeMoradores,/painel-moradores-transport-v2\.js\?v=20260916-read-concorrente-v1/);

// Família: o módulo precisa estar realmente carregado pela página publicada e responder no pointer/touch.
assert.match(index,/portal-identificacao-familia-v1\.js\?v=[A-Za-z0-9._-]+/,'módulo familiar não está carregado pelo Portal publicado');
assert.match(familia,/BUSCA_FAMILIAR_TOQUE_RESILIENTE_2026_09_16_V1/);
assert.match(familia,/function activateFamilySearchButton\(button,e\)/);
assert.match(familia,/function familySearchButton\(target\)/);
assert.match(familia,/document\.addEventListener\('pointerup',function\(e\)\{if\(!familySearchPointer/);
assert.match(familia,/activateFamilySearchButton\(t,e\)/);
assert.match(familia,/touch-action:manipulation/);

console.log('TRAVAMENTO_FAMILIA_V2_OK: Central sem montagem oculta em massa; Moradores lê e busca sem trava global; módulo familiar publicado e busca responde ao toque.');
