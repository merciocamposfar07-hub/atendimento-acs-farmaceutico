'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const transports=[
  'teste-v1/painel-profissionais-servicos-v1.html',
  'teste-v1/painel-recados-campanhas-v1.html',
  'painel-oficial-agendas-vagas.html',
  'teste-v1/painel-moradores-transport-v2.js'
];
for(const file of transports){
  const t=read(file);
  assert.match(t,/mode:'no-cors'/,file+' sem transporte POST rápido');
  assert.match(t,/(?:proximaEspera|nextWait):350/,file+' sem polling inicial curto');
  assert.doesNotMatch(t,/74000|75000/,file+' ainda contém espera administrativa de 75 segundos');
  assert.equal((t.match(/\.submit\(\)/g)||[]).length,1,file+' deve manter apenas um envio fallback, sem reenvio automático');
}
const moradores=read('teste-v1/painel-moradores-v2.html');
assert.doesNotMatch(moradores,/portal-auto-update\.js/,'Moradores não deve carregar a UI de atualização do Portal TACS');
assert.match(moradores,/admin-warmup\.js\?v=20260813-admin-v102/);
const warm=read('admin-warmup.js');
assert.doesNotMatch(warm,/portal-auto-update\.js/,'Warmup administrativo não deve injetar a rotina do Portal TACS');
for(const file of ['painel-oficial-profissionais-servicos.html','painel-oficial-recados-campanhas.html']){
  const t=read(file);
  assert.match(t,/cache:'default'/,file+' deve permitir cache do HTML versionado');
  assert.doesNotMatch(t,/cache:'no-store'/,file+' ainda força download integral a cada abertura');
  assert.match(t,/admin-warmup\.js\?v=20260813-admin-v102/);
}
console.log('ADMIN_FAST_V102_TESTS_OK');
