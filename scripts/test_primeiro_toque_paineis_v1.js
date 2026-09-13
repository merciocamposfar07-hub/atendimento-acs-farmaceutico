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

// Correção cirúrgica: os painéis em frame do menu principal abrem a tela real
// no primeiro toque durante o local-first; não exibem uma prévia sem navegação.
assert.match(block,/if\(name==='territorio'\|\|name==='suporte'\|\|name==='recados'\|\|name==='municipios'\)\{/);
assert.match(block,/ensureShellFrame\(name,localFirstFrameUrl\(url\),title\|\|'Painel',routeId\)/);
assert.match(block,/localFrame\.dataset\.shellLocalFirst='1'/);
assert.match(block,/showShellFrame\(name,localFrame,title\|\|'Painel',routeId\)/);
assert.match(central,/function localFirstFrameUrl\(url\)/);
assert.match(central,/searchParams\.set\('localfirst','1'\)/);

const frameLocalGuard=block.match(/if\(name==='territorio'\|\|name==='suporte'\|\|name==='recados'\|\|name==='municipios'\)\{[\s\S]*?return;\s*\}/);
assert.ok(frameLocalGuard,'Guard local-first dos painéis em frame ausente.');
assert.doesNotMatch(frameLocalGuard[0],/showPendingModuleShell/);

assert.match(block,/if\(frame\.dataset\.shellLocalFirst==='1'\)[\s\S]*?delete frame\.dataset\.shellLocalFirst/);
const promoteGuard=block.match(/if\(frame\.dataset\.shellLocalFirst==='1'\)\{[\s\S]*?\n  \}/);
assert.ok(promoteGuard,'Promoção local→remoto ausente.');
assert.doesNotMatch(promoteGuard[0],/about:blank|shellLoaded=''|shellReady=''/,'A confirmação remota não pode apagar o painel já visível.');

assert.match(central,/teste-v1\/painel-tacs-areas-v1\.html\?from=central&localfirst=1&v=/);
assert.match(central,/painel-suporte-moradores-v2\.html\?area=[\s\S]*?localFirstRevision/);
assert.match(central,/painel-oficial-recados-campanhas\.html\?area=[\s\S]*?localFirstRevision/);
assert.match(central,/painel-oficial-organizacoes-municipios\.html\?from=central&v='\+localFirstRevision/);

// A prévia continua existindo apenas como contingência para rotas fora do menu principal.
const previewStart=central.indexOf('function ensurePendingPreviewStyle');
const pendingStart=central.indexOf('function showPendingModuleShell',previewStart);
const pendingEnd=central.indexOf('function localFirstFrameUrl',pendingStart);
const previewBlock=central.slice(previewStart,pendingEnd);
const pendingBlock=central.slice(pendingStart,pendingEnd);
assert.match(previewBlock,/csc-pending-preview/);
assert.match(pendingBlock,/viewer\.classList\.add\('csc-shell-viewer','csc-native-viewer'\)/);
assert.doesNotMatch(frameLocalGuard[0],/csc-pending-preview|Aguarde enquanto os dados carregam/);

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

const suporteHtml=fs.readFileSync('painel-suporte-moradores-v2.html','utf8');
const recadosHtml=fs.readFileSync('painel-oficial-recados-campanhas.html','utf8');
const municipiosHtml=fs.readFileSync('painel-oficial-organizacoes-municipios.html','utf8');
assert.match(suporteHtml,/LOCAL_FIRST=/);
assert.match(suporteHtml,/function scheduleSupportRemoteSync\(\)/);
assert.match(suporteHtml,/if\(localOnly\)\{[\s\S]*?scheduleSupportRemoteSync\(\);return/);
assert.match(recadosHtml,/LOCAL_FIRST=/);
assert.match(recadosHtml,/function aguardarSessaoCentralLocalFirst\(\)/);
assert.match(recadosHtml,/if\(LOCAL_FIRST\)\{[\s\S]*?aplicarSnapshotSeDisponivel\(\)[\s\S]*?aguardarSessaoCentralLocalFirst\(\);return/);
assert.match(municipiosHtml,/LOCAL_FIRST=/);
assert.match(municipiosHtml,/function aguardarSessaoCentralLocalFirst\(\)/);
assert.match(municipiosHtml,/if\(localOnly\)\{[\s\S]*?syncMunicipioWriteState\(\);aguardarSessaoCentralLocalFirst\(\);return/);

console.log('PRIMEIRO_TOQUE_PAINEIS_OK: painéis do menu principal abrem a tela real no primeiro toque durante local-first; escrita permanece bloqueada até a sessão remota e a sincronização ocorre sem apagar o painel.');
