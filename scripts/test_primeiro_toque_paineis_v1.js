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
assert.doesNotMatch(block,/showPendingModuleShell\(name,title\|\|'Painel',routeId\)/);

// Painéis nativos respondem imediatamente no modo local-first.
assert.match(block,/if\(name==='agendas'\)\{showNativeAgenda/);
assert.match(block,/if\(name==='moradores'/);
assert.match(block,/if\(name==='profissionais'\)\{showNativeProfissionais/);

// Regra aprovada em 13/09/2026: todos os painéis exibem sua estrutura interna no primeiro toque.
assert.match(block,/var localFrame=ensureShellFrame\(name,url,title\|\|'Painel',routeId\)/);
assert.match(block,/localFrame\.dataset\.shellLocalFirst='1'/);
assert.match(block,/showShellFrame\(name,localFrame,title\|\|'Painel',routeId\)/);

// A mensagem superior do shell não pode substituir o painel por uma tela lisa.
const openingStart=central.indexOf('function setShellOpening(title,visible)');
const openingEnd=central.indexOf('\n/* TAREFA_16_AGENDAS_NATIVAS_V1',openingStart);
const openingBlock=central.slice(openingStart,openingEnd);
assert.match(openingBlock,/node\.hidden=true/);
assert.match(openingBlock,/node\.textContent=''/);
assert.doesNotMatch(openingBlock,/Abrindo .*confirmando a sessão/);

// Se o usuário voltar antes da confirmação remota, o clique pendente é cancelado.
const closeEnd=central.indexOf('function loadContext(message)',closeStart);
const closeBlock=central.slice(closeStart,closeEnd);
assert.match(closeBlock,/moduloPendente=null/);

// Escrita continua protegida pela sessão remota no core.
const core=fs.readFileSync('conecta-module-core-v1.js','utf8');
assert.match(core,/function ready\(\)[\s\S]*Boolean\(s\.adminToken\|\|s\.territoryToken\)/);

console.log('PRIMEIRO_TOQUE_PAINEIS_OK: todos os painéis exibem a estrutura interna no primeiro toque; a sessão remota sincroniza em segundo plano sem tela lisa de espera.');
