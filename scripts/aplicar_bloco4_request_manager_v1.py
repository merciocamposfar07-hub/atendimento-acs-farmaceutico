from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

# CENTRAL: colapsa verificações repetidas e troca rotas pesadas quando já existe rota leve.
central=ROOT/'central-administrativa-tacs.js'
s=central.read_text(encoding='utf-8')
old="var mode=territoryToken?'tacs':(token?'admin':''),active=null,context=null,selectedAreaId='';"
new="var mode=territoryToken?'tacs':(token?'admin':''),active=null,context=null,selectedAreaId='';\nvar healthRefreshInFlight=false,healthRefreshAt=0,HEALTH_REFRESH_TTL=30000;"
if old not in s: raise SystemExit('Marcador de estado da Central ausente')
s=s.replace(old,new,1)
start=s.index('function refreshHealth(){')
end=s.index('function moduleUrl',start)
new_refresh="""function refreshHealth(){
  if(!context)return;
  var agora=Date.now();
  if(healthRefreshInFlight||agora-healthRefreshAt<HEALTH_REFRESH_TTL)return;
  healthRefreshInFlight=true;healthRefreshAt=agora;
  var pendentes=5;
  function concluir(){pendentes--;if(pendentes<=0)healthRefreshInFlight=false}
  mark('healthMaintenance','Verificando…','warn');
  mark('healthResidents','Verificando…','warn');
  mark('healthNotifications','Verificando…','warn');
  mark('healthAgenda','Verificando…','warn');
  mark('healthContent','Verificando…','warn');
  jsonp('portal_manutencao_status',{areaId:context.areaId},function(r){mark('healthMaintenance',r&&r.ok?(r.ativa?'Ativa':'Desligada'):'Indisponível',r&&r.ok?(r.ativa?'warn':'ok'):'err');concluir()});
  post('admin_moradores_status',{areaId:context.areaId},function(r){
    mark('healthResidents',r&&r.ok?(r.total+' moradores'):'Falha',r&&r.ok?'ok':'err');concluir();
    post('admin_notificacoes_saude_rapida',{areaId:context.areaId},function(n){if(n&&n.ok){var c=n.contagens||{};mark('healthNotifications',String(Number(c.ativos||0))+' aptos',Number(c.reparo||0)>0?'warn':'ok')}else mark('healthNotifications','Falha','err');concluir()},'admin_notificacoes_saude_result');
  },'admin_moradores_result');
  jsonp('painel_publico',{areaId:context.areaId},function(r){mark('healthAgenda',r&&r.ok?'Acessível':'Falha',r&&r.ok?'ok':'err');concluir()});
  jsonp('publico_conteudo_status',{areaId:context.areaId},function(r){mark('healthContent',r&&r.ok?'Acessível':'Falha',r&&r.ok?'ok':'err');concluir()});
  setTimeout(function(){healthRefreshInFlight=false},10000);
}
"""
s=s[:start]+new_refresh+s[end:]
central.write_text(s,encoding='utf-8')

# PRELOAD: evita rajada de iframes chamando Apps Script ao mesmo tempo. Toque direto continua criando o frame imediatamente.
perf=ROOT/'central-admin-performance-v1.js'
s=perf.read_text(encoding='utf-8')
old="""  order.forEach(function(name,index){
    setTimeout(function(){if(getSession().ok&&sessionKey()===currentKey)ensureFrame(name)},index<4?index*220:900+(index-4)*350);
  });"""
new="""  var delays={moradores:0,agendas:260,recados:850,profissionais:2400,suporte:3200,territorio:3900,municipios:4600};
  order.forEach(function(name){
    setTimeout(function(){if(getSession().ok&&sessionKey()===currentKey)ensureFrame(name)},Number(delays[name]||0));
  });"""
if old not in s: raise SystemExit('Marcador de preload ausente')
perf.write_text(s.replace(old,new,1),encoding='utf-8')

shared_helpers="""function sharedAdminReadKey(){var id=cacheIdentity();return id?'portalTacsAdminSharedReadV1:admin_dados:v1:'+id:''}
function lerSharedAdminDados(){try{var key=sharedAdminReadKey();if(!key)return null;var item=JSON.parse(localStorage.getItem(key)||'null');if(!item||!item.data||Date.now()-Number(item.salvoEm||0)>5000)return null;return item.data}catch(e){return null}}
function salvarSharedAdminDados(r){try{var key=sharedAdminReadKey();if(!key||!r||r.ok!==true)return;localStorage.setItem(key,JSON.stringify({salvoEm:Date.now(),data:{ok:true,profissionais:Array.isArray(r.profissionais)?r.profissionais:[],servicos:Array.isArray(r.servicos)?r.servicos:[],agendas:Array.isArray(r.agendas)?r.agendas:[]}}))}catch(e){}}
"""

ag=ROOT/'painel-oficial-agendas-vagas.html'
s=ag.read_text(encoding='utf-8')
marker="function lerSnapshot(){try{var key=dataCacheKey();if(!key)return null;"
idx=s.index(marker);s=s[:idx]+shared_helpers+s[idx:]
old="function carregarDados(mensagem,depois,silencioso){post('admin_dados',sessao(),function(r){"
new="function carregarDados(mensagem,depois,silencioso){var compartilhado=lerSharedAdminDados();if(compartilhado){aplicarDados(compartilhado,true);salvarSnapshot(compartilhado);status('loginStatus',mensagem||'Dados confirmados pela leitura compartilhada desta sessão.','ok');if(depois)depois(true,Object.assign({compartilhado:true},compartilhado));return}post('admin_dados',sessao(),function(r){"
if old not in s: raise SystemExit('carregarDados Agendas ausente')
s=s.replace(old,new,1)
old2="aplicarDados(r,true);salvarSnapshot(r);status('loginStatus',mensagem||'Sessão validada e agendas desta área carregadas.','ok');"
new2="aplicarDados(r,true);salvarSnapshot(r);salvarSharedAdminDados(r);status('loginStatus',mensagem||'Sessão validada e agendas desta área carregadas.','ok');"
if old2 not in s: raise SystemExit('sucesso Agendas ausente')
ag.write_text(s.replace(old2,new2,1),encoding='utf-8')

pr=ROOT/'teste-v1/painel-profissionais-servicos-v1.html'
s=pr.read_text(encoding='utf-8')
idx=s.index(marker);s=s[:idx]+shared_helpers+s[idx:]
old="function carregarDados(mensagem,silencioso,depois){aplicarSnapshotSeDisponivel();post('admin_dados',sessao(),function(r){"
new="function carregarDados(mensagem,silencioso,depois){aplicarSnapshotSeDisponivel();var compartilhado=lerSharedAdminDados();if(compartilhado){snapshotVisivel=false;snapshotReconexaoTentativas=0;cancelarReconexaoSnapshot();aplicarDadosLocalFirst(compartilhado,true);salvarSnapshot(compartilhado);status('loginStatus',mensagem||'Dados confirmados pela leitura compartilhada desta sessão.','ok');if(depois)depois(true,Object.assign({compartilhado:true},compartilhado));return}post('admin_dados',sessao(),function(r){"
if old not in s: raise SystemExit('carregarDados Profissionais ausente')
s=s.replace(old,new,1)
old2="aplicarDadosLocalFirst(r,true);salvarSnapshot(r);status('loginStatus',mensagem||'Sessão validada e dados desta área carregados.','ok');"
new2="aplicarDadosLocalFirst(r,true);salvarSnapshot(r);salvarSharedAdminDados(r);status('loginStatus',mensagem||'Sessão validada e dados desta área carregados.','ok');"
if old2 not in s: raise SystemExit('sucesso Profissionais ausente')
pr.write_text(s.replace(old2,new2,1),encoding='utf-8')

test=ROOT/'scripts/test_admin_request_dedup_v1.js'
test.write_text("""'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const central=read('central-administrativa-tacs.js');
const perf=read('central-admin-performance-v1.js');
const agendas=read('painel-oficial-agendas-vagas.html');
const prof=read('teste-v1/painel-profissionais-servicos-v1.html');
assert.match(central,/HEALTH_REFRESH_TTL=30000/);
assert.match(central,/healthRefreshInFlight/);
assert.match(central,/admin_notificacoes_saude_rapida/);
assert.doesNotMatch(central,/post\\('admin_notificacoes_saude',\\{areaId:context\\.areaId\\}/);
assert.match(central,/jsonp\\('publico_conteudo_status'/);
assert.doesNotMatch(central,/jsonp\\('publico_conteudo',\\{areaId:context\\.areaId\\}/);
assert.match(perf,/profissionais:2400/);
assert.match(perf,/recados:850/);
for(const source of [agendas,prof]){
  assert.match(source,/portalTacsAdminSharedReadV1:admin_dados:v1:/);
  assert.match(source,/Date\\.now\\(\\)-Number\\(item\\.salvoEm\\|\\|0\\)>5000/);
  assert.match(source,/function salvarSharedAdminDados\\(r\\)/);
  assert.match(source,/var compartilhado=lerSharedAdminDados\\(\\)/);
  assert.doesNotMatch(source,/portalTacsAdminSharedReadV1:admin_dados:v1:'\\+token/);
}
assert.match(agendas,/salvarSharedAdminDados\\(r\\);status\\('loginStatus'/);
assert.match(prof,/salvarSharedAdminDados\\(r\\);status\\('loginStatus'/);
console.log('ADMIN_REQUEST_DEDUP_V1_OK');
""",encoding='utf-8')

pkg=ROOT/'package.json'
s=pkg.read_text(encoding='utf-8')
needle=" && node scripts/test_performance_v101.js && node scripts/test_quality_gate_v101.js"
repl=" && node scripts/test_admin_request_dedup_v1.js && node scripts/test_performance_v101.js && node scripts/test_quality_gate_v101.js"
if needle not in s: raise SystemExit('Marcador package.json ausente')
pkg.write_text(s.replace(needle,repl,1),encoding='utf-8')
print('BLOCO4_APLICADO_OK')
