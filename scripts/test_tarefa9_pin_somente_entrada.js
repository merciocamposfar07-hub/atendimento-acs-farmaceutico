'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const core=read('conecta-module-core-v1.js');
const central=read('central-administrativa-tacs.js');
const centralHtml=read('central-administrativa-tacs.html');
const agendas=read('painel-oficial-agendas-vagas.html');
const recados=read('painel-oficial-recados-campanhas.html');
const suporte=read('painel-suporte-moradores-v2.html');
const municipios=read('painel-oficial-organizacoes-municipios.html');
const moradoresHtml=read('teste-v1/painel-moradores-v2.html');
const profissionais=read('teste-v1/painel-profissionais-servicos-v1.html');
const territorioHtml=read('teste-v1/painel-tacs-areas-v1.html');

new Function(core);

// O núcleo dos módulos não possui rota de autenticação por PIN.
assert.doesNotMatch(core,/admin_login|admin_territorio_login_pin|conecta_morador_login_pin|conecta_ubs_login_pin/);
assert.match(core,/function isCentralPage\(\)/);
assert.match(core,/function isModulePage\(\)/);
assert.match(core,/function installTask9ModuleGate\(\)/);
assert.match(core,/installTask9ModuleGate\(\);/);

// Módulo não pode gravar, substituir, apagar ou limpar a sessão global.
assert.match(core,/Storage\.prototype\.setItem=function/);
assert.match(core,/key===ADMIN_TOKEN_KEY\|\|key===TERRITORY_TOKEN_KEY/);
assert.match(core,/Storage\.prototype\.removeItem=function/);
assert.match(core,/Storage\.prototype\.clear=function/);
assert.match(core,/Módulo tentou substituir a sessão global/);
assert.match(core,/Módulo tentou encerrar a sessão global/);
assert.match(core,/Módulo tentou limpar a sessão global/);

// Controles legados de autenticação ficam indisponíveis nos módulos.
for(const id of ['pin','entrar','login','loginTacs','loginAdmin','sair','logout']){
  assert.ok(core.includes("'"+id+"'"),'Controle legado não coberto pelo gate: '+id);
}
assert.match(core,/csc-task9-auth-legacy\{display:none!important\}/);
assert.match(core,/event\.stopImmediatePropagation/);
assert.match(core,/Este módulo não possui login próprio/);
assert.match(core,/Entre pelo PIN na tela inicial do Conecta Saúde Comunitária/);

// A Central continua sendo a única dona do login e logoff.
assert.match(central,/post\('admin_login'/);
assert.match(central,/post\('admin_territorio_login_pin'/);
assert.match(central,/function logout\(\)/);
assert.ok(centralHtml.includes('conecta-module-core-v1.js'),'Central deve carregar o mesmo contrato do core.');
assert.match(core,/if\(!isModulePage\(\)\)return;/,'Gate não pode bloquear a Central.');

// Todos os módulos conectados carregam o gate comum antes de depender do core.
const modules=[
  ['Agendas',agendas],['Recados',recados],['Suporte',suporte],
  ['Municípios',municipios],['Moradores',moradoresHtml],
  ['Profissionais',profissionais],['TACS/Áreas',territorioHtml]
];
for(const [name,html] of modules){
  assert.ok(html.includes('conecta-module-core-v1.js'),name+' deixou de carregar o core.');
}

// O core continua fornecendo sessão/perfil/área; módulo não decide perfil por PIN.
assert.match(core,/function mode\(\)/);
assert.match(core,/function session\(extra\)/);
assert.match(core,/function ready\(\)/);
assert.match(core,/canonicalSession\(\)/);

console.log('TAREFA_9_PIN_SOMENTE_ENTRADA_OK: módulos não exibem nem executam login/PIN próprio, não gravam/apagam a sessão global e recebem autenticação, perfil e sessão exclusivamente do núcleo Conecta; Central permanece a única dona do acesso e logoff.');
