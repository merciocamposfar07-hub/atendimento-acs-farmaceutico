'use strict';
const assert=require('assert');
const fs=require('fs');

const central=fs.readFileSync('central-administrativa-tacs.js','utf8');
new Function(central);

assert.match(central,/CORRECAO_PRIMEIRO_TOQUE_PAINEIS_V1/);
assert.match(central,/function localPanelAccessReady\(\)/);
assert.match(central,/Boolean\(acessoLocalAberto&&mode&&context\)/);
assert.match(central,/function showPendingModuleShell\(name,title,routeId\)/);
assert.match(central,/function priorizarSincronizacaoTerritorioPendente\(\)/);
assert.match(central,/active&&\/\^\(\?:admin_login\|admin_territorio_login_pin\)\$\//);
assert.match(central,/schedulePoll\(0\)/);
assert.match(central,/scheduleRemoteAuthSync\(remoteAuthSeq,0\)/);

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

// Correção cirúrgica: TACS/áreas não pode exibir uma tela provisória diferente da tela real.
assert.match(block,/if\(name==='territorio'\)\{[\s\S]*?priorizarSincronizacaoTerritorioPendente\(\)[\s\S]*?Confirmando a sessão para abrir TACS e áreas[\s\S]*?return;\s*\}/);
const territoryGuard=block.match(/if\(name==='territorio'\)\{[\s\S]*?return;\s*\}/);
assert.ok(territoryGuard,'Guard cirúrgico de TACS/áreas ausente.');
assert.doesNotMatch(territoryGuard[0],/showPendingModuleShell/);
assert.doesNotMatch(block,/localFrame\.dataset\.shellLocalFirst/);

// Os demais painéis em frame preservam a prévia segura já existente.
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

console.log('PRIMEIRO_TOQUE_PAINEIS_OK: TACS/áreas prioriza imediatamente a confirmação remota ao toque e abre automaticamente assim que o token chega, sem tela provisória; demais painéis preservam o comportamento anterior.');
