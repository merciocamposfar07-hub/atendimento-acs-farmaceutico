'use strict';
const assert=require('assert');
const fs=require('fs');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const central=fs.readFileSync('central-administrativa-tacs.js','utf8');
const core=fs.readFileSync('conecta-module-core-v1.js','utf8');
const agendas=fs.readFileSync('conecta-agendas-native-v1.js','utf8');
const moradores=fs.readFileSync('conecta-moradores-native-v1.js','utf8');
const profissionais=fs.readFileSync('conecta-profissionais-native-v1.js','utf8');

new Function(central);
new Function(core);
new Function(agendas);
new Function(moradores);
new Function(profissionais);

// A sequência aprovada 1–18 precisa continuar inteira na regressão oficial.
for(let n=1;n<=18;n++){
  const re=new RegExp('scripts/test_tarefa'+n+'_[^ ]+\\.js');
  assert.match(pkg.scripts.test,re,'Tarefa '+n+' precisa permanecer na regressão integral.');
}
assert.doesNotMatch(central,/TAREFA_19/);

// Tarefa 9/local-first: Central abre sem persistir token remoto.
assert.match(central,/FLUXO_CANONICO_LOCAL_FIRST_V1/);
assert.match(central,/PIN_LOCAL_SEM_TOKEN_V3/);
assert.match(central,/acessoLocalAberto&&mode&&context/);

// O sincronizador remoto não pode desistir depois de duas tentativas.
assert.match(central,/SINCRONIZACAO_REMOTA_CONTINUA_V1/);
assert.match(central,/function startRemoteAuthSync\(scope,pin,hadLocal\)/);
assert.match(central,/function runRemoteAuthSync\(seq\)/);
assert.match(central,/scheduleRemoteAuthSync\(seq,wait\)/);
assert.doesNotMatch(central,/tentativa<2/);
assert.match(central,/Math\.min\(5000,500\*Math\.pow\(1\.55/);

// Polling do Apps Script continua tardio para não saturar o backend.
assert.match(central,/schedulePoll\(fastPin\?8000:1800\)/);

// Assim que o token chega, o painel pendente retoma antes de esperar nova leitura de contexto.
const successStart=central.indexOf('function remoteAuthSuccess');
const successEnd=central.indexOf('function runRemoteAuthSync',successStart);
assert.ok(successStart>=0&&successEnd>successStart);
const success=central.slice(successStart,successEnd);
assert.ok(success.indexOf('resumePendingModule()')>=0,'Token remoto deve retomar o painel pendente.');
assert.ok(success.indexOf('resumePendingModule()')<success.indexOf('loadContext('),'Painel deve retomar antes da segunda leitura de contexto.');

// Falha temporária não invalida acesso local; recusa explícita continua invalidando.
assert.match(central,/if\(r&&r\.authRecusada===true\)/);
assert.match(central,/Falha temporária nunca encerra a tentativa nem destrói o acesso local/);
assert.match(core,/SESSION_AUTH_REFUSAL_RE/);
assert.match(core,/preserveSession:!explicit/);

// Painel legado responde no primeiro toque mas não carrega iframe remoto sem sessão.
const pendingStart=central.indexOf('function showPendingModuleShell');
const pendingEnd=central.indexOf('function shellHasUnsaved',pendingStart);
const pending=central.slice(pendingStart,pendingEnd);
assert.match(pending,/viewer\.hidden=false/);
assert.doesNotMatch(pending,/\.src\s*=/);

// Agendas: cache primeiro, remoto somente depois de core.ready().
const loadStart=agendas.indexOf('function load(message,done,options)');
const loadEnd=agendas.indexOf('function fillFilters',loadStart);
const agendaLoad=agendas.slice(loadStart,loadEnd);
assert.ok(agendaLoad.indexOf('prime()')>=0&&agendaLoad.indexOf('if(!ready())')>=0);
assert.ok(agendaLoad.indexOf('prime()')<agendaLoad.indexOf('if(!ready())'),'Agendas deve aplicar cache antes de aguardar sessão.');
assert.match(agendaLoad,/aguardandoSessao:true/);
assert.match(agendas,/function lockWrites\(\).*disabled=!confirmed/);

// Moradores: transporte pode ser pré-carregado, mas a base só revalida quando o core estiver pronto.
assert.match(moradores,/function remoteReady\(\)/);
assert.match(moradores,/if\(remoteReady\(\)&&window\.PortalTacsMoradoresTransportV2/);
assert.match(moradores,/else showWaitingSession\(\)/);

// Profissionais: iframe-ponte nunca é iniciado sem sessão remota.
assert.match(profissionais,/function remoteReady\(\)/);
const bridgeStart=profissionais.indexOf('function ensureBridge()');
const bridgeEnd=profissionais.indexOf('function field(',bridgeStart);
const bridge=profissionais.slice(bridgeStart,bridgeEnd);
assert.match(bridge,/if\(!remoteReady\(\)\)/);
assert.ok(bridge.indexOf('if(!remoteReady())')<bridge.indexOf('frame.src='),'Ponte de Profissionais só pode carregar após sessão.');
assert.match(profissionais,/b\.disabled=!confirmed/);

// Segurança: core continua sendo a autoridade para saber se há token.
assert.match(core,/function ready\(\)[\s\S]*Boolean\(s\.adminToken\|\|s\.territoryToken\)/);

console.log('AUDITORIA_FUNCIONAL_TAREFAS_1_18_OK: PIN local-first, retry remoto contínuo, cache antes da rede, retomada imediata do painel após token e bloqueio de leitura/escrita sem sessão estão coerentes entre as Tarefas 1–18.');
