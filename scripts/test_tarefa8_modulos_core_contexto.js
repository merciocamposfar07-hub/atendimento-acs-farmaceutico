'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const core=read('conecta-module-core-v1.js');
const central=read('central-administrativa-tacs.js');
const agendas=read('painel-oficial-agendas-vagas.html');
const recados=read('painel-oficial-recados-campanhas.html');
const suporte=read('painel-suporte-moradores-v2.html');
const municipios=read('painel-oficial-organizacoes-municipios.html');
const moradoresHtml=read('teste-v1/painel-moradores-v2.html');
const moradores=read('teste-v1/painel-moradores-transport-v2.js');
const profissionais=read('teste-v1/painel-profissionais-servicos-v1.html');
const territorioHtml=read('teste-v1/painel-tacs-areas-v1.html');
const territorio=read('teste-v1/painel-tacs-areas-v1.js');

new Function(core);
new Function(central);
new Function(moradores);
new Function(territorio);

// Contrato único publicado pela Central.
assert.match(central,/MODULE_CORE_KEY='portalConectaModuleCoreV1'/);
assert.match(central,/function publishModuleCore\(\)/);
assert.match(central,/source:'CENTRAL_CONECTA'/);
assert.match(central,/identity:\{[\s\S]*nome:[\s\S]*perfil:[\s\S]*funcao:[\s\S]*unidadeId:/);
assert.match(central,/permissions:permissions/);
assert.match(central,/cache:\{contextKey:contextCacheKey\(mode\),strategy:'stale-while-revalidate'\}/);
assert.match(central,/publishModuleCore\(\);el\('identityPanel'\)/);

// O snapshot de módulo não duplica token remoto; o núcleo lê a sessão canônica quando necessário.
const publishStart=central.indexOf('function publishModuleCore()');
const publishEnd=central.indexOf('function ensureCentralWelcome()',publishStart);
const publishBlock=central.slice(publishStart,publishEnd);
assert.doesNotMatch(publishBlock,/\btoken\s*:/);
assert.doesNotMatch(publishBlock,/\bterritorioToken\s*:/);

// API compartilhada: identidade/perfil/UBS, área, permissões, sessão, estado e cache.
assert.match(core,/window\.ConectaModuleCoreV1=\{/);
for(const api of ['context:context','state:state','session:session','mode:mode','areaId:areaId','identity:identity','permissions:permissions','can:can','ready:ready']){
  assert.ok(core.includes(api),'API do núcleo ausente: '+api);
}
assert.match(core,/funcao:text\(id\.funcao\)/);
assert.match(core,/unidadeId:text\(id\.unidadeId/);
assert.match(core,/permissions:permissions\(\)/);
assert.match(core,/cache:ctx\.cache\|\|\{\}/);
assert.doesNotMatch(core,/admin_login|admin_territorio_login_pin|conecta_morador_login_pin/,'Núcleo de módulos não pode autenticar por PIN.');

// Todos os módulos principais carregam ou consomem o core.
const bridge='conecta-module-core-v1.js';
for(const [name,html] of [
  ['Agendas',agendas],['Recados',recados],['Suporte',suporte],
  ['Municípios',municipios],['Moradores',moradoresHtml],
  ['Profissionais',profissionais],['TACS/Áreas',territorioHtml]
]){
  assert.ok(html.includes(bridge),name+' não carrega o núcleo de módulos.');
}

assert.match(agendas,/moduleCore=window\.ConectaModuleCoreV1/);
assert.match(agendas,/moduleCore\.session\(\{areaId:areaId,escopo:'agendas'\}\)/);
assert.match(recados,/moduleCore=window\.ConectaModuleCoreV1/);
assert.match(recados,/moduleCore\.session\(\{areaId:areaId,escopo:'recados'\}\)/);
assert.match(suporte,/moduleCore=window\.ConectaModuleCoreV1/);
assert.match(suporte,/moduleCore\.session\(Object\.assign\(\{areaId:area\(\),escopo:'suporte'\}/);
assert.match(municipios,/moduleCore=window\.ConectaModuleCoreV1/);
assert.match(municipios,/moduleCore\.session\(\{escopo:'municipios'\}\)/);
assert.match(moradores,/moduleCore=window\.ConectaModuleCoreV1/);
assert.match(moradores,/function session\(\)\{[\s\S]*var extra=\{escopo:'moradores'\};if\(selectedAreaId\)extra\.areaId=selectedAreaId;return moduleCore\.session\(extra\)/);
assert.match(profissionais,/moduleCore=window\.ConectaModuleCoreV1/);
assert.match(profissionais,/moduleCore\.session\(\{areaId:areaId,escopo:'profissionais'\}\)/);
assert.match(territorio,/moduleCore=window\.ConectaModuleCoreV1/);
assert.match(territorio,/moduleCore\.session\(\{escopo:'territorio'\}\)/);

// Compatibilidade permanece temporariamente; remoção total de login/PIN interno é Tarefa 9.
assert.match(agendas,/TOKEN_KEY='portalTacsAdminTokenV1'/);
assert.match(moradores,/function loginWithPin\(pin\)/);

console.log('TAREFA_8_MODULOS_CORE_CONTEXTO_OK: Central publica contexto único e Agendas, Moradores, Profissionais, Recados, Suporte, TACS/Áreas e Municípios consomem sessão/área/estado pelo núcleo Conecta; remoção total dos logins legados fica para a Tarefa 9.');
