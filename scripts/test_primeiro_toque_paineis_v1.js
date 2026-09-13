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

// Correção cirúrgica: TACS/áreas abre a tela real no primeiro toque, em leitura local.
assert.match(block,/if\(name==='territorio'\)\{[\s\S]*?priorizarSincronizacaoTerritorioPendente\(\)[\s\S]*?ensureShellFrame\(name,url,title\|\|'TACS e áreas',routeId\)[\s\S]*?localFrame\.dataset\.shellLocalFirst='1'[\s\S]*?showShellFrame\(name,localFrame,title\|\|'TACS e áreas',routeId\)[\s\S]*?return;\s*\}/);
const territoryGuard=block.match(/if\(name==='territorio'\)\{[\s\S]*?return;\s*\}/);
assert.ok(territoryGuard,'Guard cirúrgico de TACS/áreas ausente.');
assert.doesNotMatch(territoryGuard[0],/showPendingModuleShell/);
assert.match(block,/if\(name==='territorio'&&frame\.dataset\.shellLocalFirst==='1'\)[\s\S]*?delete frame\.dataset\.shellLocalFirst/);
const remoteTerritoryGuard=block.match(/if\(name==='territorio'&&frame\.dataset\.shellLocalFirst==='1'\)\{[\s\S]*?\n  \}/);
assert.ok(remoteTerritoryGuard,'Guard de promoção local→remoto ausente.');
assert.doesNotMatch(remoteTerritoryGuard[0],/frame\.src='about:blank'|frame\.dataset\.shellLoaded=''|frame\.dataset\.shellReady=''/,'A confirmação remota não pode apagar o painel territorial já visível.');
assert.match(central,/teste-v1\/painel-tacs-areas-v1\.html\?from=central&localfirst=1&v=/);
assert.doesNotMatch(central,/if\(name==='territorio'\)return '\/atendimento-acs-farmaceutico\/painel-oficial-tacs-areas\.html\?from=central&localfirst=1/);

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

// Escrita continua protegida pela sessão remota; local-first libera apenas a tela real para leitura.
const core=fs.readFileSync('conecta-module-core-v1.js','utf8');
assert.match(core,/function ready\(\)[\s\S]*Boolean\(s\.adminToken\|\|s\.territoryToken\)/);
assert.match(core,/function localFirstContextAllowed\(\)/);
assert.match(core,/params\.get\('localfirst'\)==='1'&&Boolean\(ctx&&text\(ctx\.mode\)\)/);
assert.match(core,/if\(!ready\(\)&&!localFirstContextAllowed\(\)\)showCentralGate\(\)/);

const territorioHtml=fs.readFileSync('teste-v1/painel-tacs-areas-v1.html','utf8');
const territorioJs=fs.readFileSync('teste-v1/painel-tacs-areas-v1.js','utf8');
const wrapper=fs.readFileSync('painel-oficial-tacs-areas.html','utf8');
assert.match(territorioHtml,/conecta-module-core-v1\.js\?v=20260913-territorio-first-touch-v3/);
assert.match(territorioHtml,/painel-tacs-areas-v1\.js\?v=20260913-territorio-contexto-local-v4/);
assert.match(wrapper,/painel-tacs-areas-v1\.html\?v=20260913-territorio-contexto-local-v4/);
assert.match(territorioJs,/function localFirstWithoutRemote\(\)/);
assert.match(territorioJs,/function primeTerritoryFromCentralContext\(\)/);
assert.match(territorioJs,/state&&state\.cache&&state\.cache\.contextKey/);
assert.match(territorioJs,/sessionStorage\.getItem\(key\)/);
assert.match(territorioJs,/territoryConfirmed=false;[\s\S]*?syncTerritoryWriteState\(\)/);
assert.match(territorioJs,/if\(localFirst\)\{[\s\S]*?primeTerritoryFromCentralContext\(\)[\s\S]*?scheduleLocalFirstRemoteSync\(\);[\s\S]*?return;/);
assert.match(territorioJs,/moduleCore\.ready\(\)[\s\S]*?loadData\('Dados territoriais confirmados\.'\)/);

console.log('PRIMEIRO_TOQUE_PAINEIS_OK: TACS/áreas abre diretamente com o contexto territorial local já confirmado, sem tela vazia; escrita continua bloqueada até a sessão remota e a sincronização ocorre no mesmo painel.');
