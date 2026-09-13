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

// Regra aprovada em 13/09/2026: todos os painéis respondem no primeiro toque sem tela lisa.
assert.match(block,/showPendingModuleShell\(name,title\|\|'Painel',routeId\)/);
assert.doesNotMatch(block,/localFrame\.dataset\.shellLocalFirst/);

// Painéis ainda em frame exibem estrutura interna segura enquanto a sessão remota sincroniza.
const previewStart=central.indexOf('function ensurePendingPreviewStyle');
const pendingStart=central.indexOf('function showPendingModuleShell',previewStart);
const pendingEnd=central.indexOf('function shellHasUnsaved',pendingStart);
const previewBlock=central.slice(previewStart,pendingEnd);
const pendingBlock=central.slice(pendingStart,pendingEnd);
assert.match(previewBlock,/csc-pending-preview/);
assert.match(previewBlock,/Aguarde enquanto os dados carregam…/);
assert.match(previewBlock,/Chamados dos moradores/);
assert.match(previewBlock,/Administrador \/ TACS \/ UBS/);
assert.match(previewBlock,/Buscar morador/);
assert.match(pendingBlock,/viewer\.classList\.add\('csc-shell-viewer','csc-native-viewer'\)/);
assert.match(pendingBlock,/host\.hidden=false/);
assert.doesNotMatch(pendingBlock,/\.src\s*=/,'Prévia imediata não pode iniciar iframe protegido antes da sessão remota.');

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

console.log('PRIMEIRO_TOQUE_PAINEIS_OK: painéis nativos exibem conteúdo imediatamente e painéis em frame exibem prévia interna segura no primeiro toque, sem tela lisa; a sessão remota sincroniza em segundo plano.');
