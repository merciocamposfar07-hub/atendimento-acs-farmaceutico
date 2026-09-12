'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');

function read(path){return fs.readFileSync(path,'utf8');}

const territory=read('apps-script/ZZZZ_17_TacsAreasAdminV1.gs');
const form=read('teste-v1/painel-tacs-areas-v1.html');
const formJs=read('teste-v1/painel-tacs-areas-v1.js');
const central=read('central-administrativa-tacs.js');
const access=read('conecta-acesso-unificado-v1.js');
const ubsBackend=read('apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs');

new Function(territory);
new Function(formJs);
new Function(central);
new Function(access);
new Function(ubsBackend);

const profiles={
  ADMIN_TACS_UBS_MORADOR:'Administrador + TACS + UBS + Morador',
  ADMIN_TACS_UBS:'Administrador + TACS + UBS',
  ADMIN_UBS_MORADOR:'Administrador + UBS + Morador',
  TACS_UBS_MORADOR:'TACS + UBS + Morador',
  ADMIN_UBS:'Administrador + UBS',
  TACS_UBS:'TACS + UBS',
  UBS_MORADOR:'UBS + Morador',
  ADMIN_TACS_MORADOR:'Administrador + TACS + Morador',
  ADMIN_TACS:'Administrador + TACS',
  ADMIN_MORADOR:'Administrador + Morador',
  TACS_MORADOR:'TACS + Morador',
  TACS:'TACS',
  ADMIN:'Administrador',
  UBS:'UBS'
};

for(const [key,label] of Object.entries(profiles)){
  assert.ok(territory.includes("'"+key+"'"),'Backend não aceita perfil: '+key);
  assert.ok(form.includes('value="'+key+'">'+label+'</option>'),'Perfil não aparece no cadastro: '+key);
  assert.ok(formJs.includes(key+":'"+label+"'"),'Cliente não reconhece perfil: '+key);
  if(key!=='ADMIN_GERAL') assert.ok(central.includes(key+":'"+label+"'") || (key==='UBS'&&central.includes("UBS:'UBS'")),'Central não reconhece rótulo: '+key);
}

// UBS pura deve permanecer válida.
assert.ok(territory.includes("'UBS'"),'UBS pura foi removida do backend.');
assert.ok(form.includes('value="UBS">UBS</option>'),'UBS pura foi removida do formulário.');
assert.ok(formJs.includes("UBS:'UBS'"),'UBS pura foi removida do mapa do formulário.');

// Combinações mantêm exigências por vínculo.
assert.match(formJs,/function profileHasTacs\(v\)/);
assert.match(formJs,/function profileHasUbs\(v\)/);
assert.match(formJs,/isTacs=profileHasTacs\(profile\),isUbs=profileHasUbs\(profile\),hasUnit=isTacs\|\|isUbs/);
assert.match(territory,/var temTacs=tacsTerritorioV1PerfilTem_\(perfil,'TACS'\)/);
assert.match(territory,/var temUbs=tacsTerritorioV1PerfilTem_\(perfil,'UBS'\)/);
assert.match(territory,/if\(temTacs\)[\s\S]*CNS profissional[\s\S]*microárea do TACS/);
assert.match(territory,/if\(temUbs\)[\s\S]*unidade de saúde do perfil UBS[\s\S]*função do responsável na UBS/);

// A Tarefa 2 não muda a porta inicial: continuam apenas os 4 perfis-base.
for(const tab of ["tabAdmin","tabTacs","tabMorador","tabUbs"]) assert.ok(access.includes(tab),'Porta inicial ausente: '+tab);
assert.doesNotMatch(access,/tabAdminUbs|tabTacsUbs|tabUbsMorador/i,'Combinações não devem virar novos botões de entrada.');

// Ainda não é Tarefa de reconhecimento persistente do aparelho UBS.
assert.match(ubsBackend,/vinculoAparelhoCriado:false/);

console.log('TAREFA_2_COMBINACOES_PERFIS_UBS_OK: 14 perfis válidos, incluindo UBS pura; combinações não alteram as quatro portas de entrada nem antecipam reconhecimento de aparelho.');
