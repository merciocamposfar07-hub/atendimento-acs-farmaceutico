'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');

function read(path){return fs.readFileSync(path,'utf8');}

const central=read('central-administrativa-tacs.js');
const access=read('conecta-acesso-unificado-v1.js');
const ubsBackend=read('apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs');
const resident=read('conecta-morador-session-v1.js');

new Function(central);
new Function(access);
new Function(ubsBackend);
new Function(resident);

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
  assert.ok(central.includes(key+":'"+label+"'"),'Central não reconhece identidade: '+key);
  assert.ok(access.includes(key+":'"+label+"'"),'Acesso unificado não reconhece identidade: '+key);
}

assert.match(central,/function identityHeadline\(nome,perfil\)/);
assert.ok(central.includes("identityHeadline(nome,tacs&&tacs.perfil||'TACS')"),'TACS não usa nome + perfil real.');
assert.ok(central.includes("identityHeadline(adminNome,admin&&admin.perfil||context&&context.perfil||'ADMIN')"),'Administrador não usa nome + perfil real.');
assert.ok(central.includes("el('professionalName').textContent=mode==='tacs'"),'Nome real deixou de ser publicado no painel de identidade.');
assert.ok(central.includes("el('profileLabel').textContent=perfilAtual"),'Perfil cadastrado deixou de ser publicado no painel de identidade.');

assert.ok(ubsBackend.includes("perfil:conectaAcessoV1Texto_(ubs.perfil)||'UBS'"),'Backend UBS ainda reduz combinação ao perfil UBS simples.');
assert.ok(access.includes("identityHeadline(r.nome||'Responsável UBS',r.perfil||'UBS')"),'Primeiro acesso UBS não exibe nome + perfil cadastrado.');
assert.ok(resident.includes("+' — Morador<small>"),'Morador autenticado não exibe nome + perfil.');

assert.match(ubsBackend,/vinculoAparelhoCriado:false/,'Tarefa 3 não pode antecipar vínculo persistente UBS.');
assert.doesNotMatch(ubsBackend,/quickKeyUbs|ubsQuickKey|reconhecerAparelhoUbs/i,'Tarefa 3 não pode antecipar a Tarefa 4.');

console.log('TAREFA_3_IDENTIDADE_REAL_OK: nome completo + perfil cadastrado preservados para Administrador, TACS, Morador, UBS e combinações; sem antecipar reconhecimento persistente do aparelho.');
