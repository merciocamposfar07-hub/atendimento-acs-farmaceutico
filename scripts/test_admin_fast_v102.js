'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const transports=[
  ['teste-v1/painel-profissionais-servicos-v1.html','proximaEspera:450',false],
  ['teste-v1/painel-recados-campanhas-v1.html','proximaEspera:450',true],
  ['painel-oficial-agendas-vagas.html','proximaEspera:450',false],
  ['teste-v1/painel-moradores-transport-v2.js','nextWait:450',true]
];
for(const [file,wait,dynamicFrame] of transports){
  const t=read(file);
  assert.doesNotMatch(t,/mode:'no-cors'/,file+' não pode usar fetch no-cors para autenticação');
  assert.doesNotMatch(t,/enviarPostRapidoV102/,file+' ainda contém o transporte v102 defeituoso');
  assert.ok(t.includes(wait),file+' sem polling inicial curto');
  assert.match(t,/12000/,file+' deve tolerar cold start do Apps Script');
  assert.doesNotMatch(t,/74000|75000/,file+' ainda contém espera administrativa de 75 segundos');
  assert.equal((t.match(/\.submit\(\)/g)||[]).length,1,file+' deve enviar cada operação apenas uma vez');
  assert.match(t,/\.method='POST'/,file+' deve manter POST por formulário compatível com Safari');
  if(dynamicFrame)assert.match(t,/addEventListener\('load',enviarDepoisDoRegistro,\{once:true\}\)/,file+' sem registro seguro do iframe dinâmico');
}
const moradores=read('teste-v1/painel-moradores-v2.html');
assert.doesNotMatch(moradores,/portal-auto-update\.js/,'Moradores não deve carregar UI do Portal TACS');
assert.match(moradores,/painel-moradores-transport-v2\.js\?v=[^"']+/,'Moradores deve carregar o transporte administrativo versionado');
const warm=read('admin-warmup.js');
assert.doesNotMatch(warm,/portal-auto-update\.js/,'Warmup administrativo não deve injetar atualização do Portal público');
const profissionais=read('painel-oficial-profissionais-servicos.html');
assert.match(profissionais,/cache:'default'/,'Profissionais deve reutilizar HTML versionado');
assert.doesNotMatch(profissionais,/cache:'no-store'/,'Profissionais não deve forçar download integral');
assert.match(profissionais,/20260816-profissionais-v3|20260815-autonomia-v2/);
const recados=read('painel-oficial-recados-campanhas.html');
assert.match(recados,/admin_publicacoes_dados/,'Recados standalone deve manter a rota administrativa territorial');
assert.match(recados,/ponteConteudoV102_/,'Recados standalone deve manter transporte POST compatível com Safari');
assert.doesNotMatch(recados,/document\.write/,'Recados standalone não deve retornar ao carregador frágil');
assert.match(read('painel-oficial-agendas-vagas.html'),/admin-warmup\.js\?v=20260813-admin-v103/);
console.log('ADMIN_LOGIN_V103_TRANSPORT_TESTS_OK');