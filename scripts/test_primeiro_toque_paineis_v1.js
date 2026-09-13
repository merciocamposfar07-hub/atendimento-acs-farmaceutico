'use strict';
const assert=require('assert');
const fs=require('fs');

const central=fs.readFileSync('central-administrativa-tacs.js','utf8');
new Function(central);

assert.match(central,/CORRECAO_PRIMEIRO_TOQUE_PAINEIS_V1/);
assert.match(central,/function localPanelAccessReady\(\)/);
assert.match(central,/Boolean\(acessoLocalAberto&&mode&&context\)/);
assert.match(central,/function showPendingModuleShell\(name,title,routeId\)/);

const openStart=central.indexOf('function openModule(name,title,options)');
const closeStart=central.indexOf('function closeViewer()',openStart);
assert.ok(openStart>=0&&closeStart>openStart,'openModule não encontrado');
const block=central.slice(openStart,closeStart);

assert.match(block,/var remoteReady=Boolean\(token\|\|territoryToken\),localReady=localPanelAccessReady\(\)/);
assert.match(block,/if\(!remoteReady&&!localReady\)/);
assert.match(block,/if\(!remoteReady\)\{/);
assert.match(block,/showPendingModuleShell\(name,title\|\|'Painel',routeId\)/);

// Painéis nativos respondem imediatamente no modo local-first.
assert.match(block,/if\(name==='agendas'\)\{showNativeAgenda/);
assert.match(block,/if\(name==='moradores'/);
assert.match(block,/if\(name==='profissionais'\)\{showNativeProfissionais/);

// O painel legado não recebe iframe remoto antes da sessão, mas o shell já aparece.
const pendingStart=central.indexOf('function showPendingModuleShell');
const pendingEnd=central.indexOf('function shellHasUnsaved',pendingStart);
const pendingBlock=central.slice(pendingStart,pendingEnd);
assert.match(pendingBlock,/viewer\.hidden=false/);
assert.match(pendingBlock,/document\.body\.classList\.add\('viewer-open'\)/);
assert.doesNotMatch(pendingBlock,/\.src\s*=/,'Shell pendente não pode iniciar iframe sem sessão remota.');

// Se o usuário voltar antes da confirmação remota, o clique pendente é cancelado.
const closeEnd=central.indexOf('function loadContext(message)',closeStart);
const closeBlock=central.slice(closeStart,closeEnd);
assert.match(closeBlock,/moduloPendente=null/);

// Escrita continua protegida pela sessão remota no core.
const core=fs.readFileSync('conecta-module-core-v1.js','utf8');
assert.match(core,/function ready\(\)[\s\S]*Boolean\(s\.adminToken\|\|s\.territoryToken\)/);

console.log('PRIMEIRO_TOQUE_PAINEIS_OK: Central aberta por PIN local responde ao primeiro toque; painéis nativos abrem imediatamente, legados mostram o shell imediatamente e aguardam somente a sessão remota para carregar o conteúdo.');
