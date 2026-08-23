'use strict';
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
assert.doesNotMatch(central,/post\('admin_notificacoes_saude',\{areaId:context\.areaId\}/);
assert.match(central,/jsonp\('publico_conteudo_status'/);
assert.doesNotMatch(central,/jsonp\('publico_conteudo',\{areaId:context\.areaId\}/);
assert.match(perf,/profissionais:2400/);
assert.match(perf,/recados:850/);
for(const source of [agendas,prof]){
  assert.match(source,/portalTacsAdminSharedReadV1:admin_dados:v1:/);
  assert.match(source,/Date\.now\(\)-Number\(item\.salvoEm\|\|0\)>5000/);
  assert.match(source,/function salvarSharedAdminDados\(r\)/);
  assert.match(source,/var sharedAdminReadConsumido=false/);
  assert.match(source,/sharedAdminReadConsumido\?null:lerSharedAdminDados\(\)/);
  assert.doesNotMatch(source,/portalTacsAdminSharedReadV1:admin_dados:v1:'\+token/);
}
assert.match(agendas,/salvarSharedAdminDados\(r\);status\('loginStatus'/);
assert.match(prof,/salvarSharedAdminDados\(r\);status\('loginStatus'/);
console.log('ADMIN_REQUEST_DEDUP_V1_OK');
