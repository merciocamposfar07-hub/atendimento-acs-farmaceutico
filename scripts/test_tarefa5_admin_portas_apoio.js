'use strict';
const assert=require('assert');
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}

const central=read('central-administrativa-tacs.js');
const quick=read('central-tacs-login-rapido-v1.js');
const access=read('conecta-acesso-unificado-v1.js');

new Function(central);
new Function(quick);
new Function(access);

// O aparelho reconhecido como Administrador não pode ser preso na porta TACS.
assert.match(central,/function adminDeviceRecognized\(\)/);
assert.match(central,/TACS_ONLY=.*==='tacs'&&!adminDeviceRecognized\(\)/);
assert.match(quick,/function adminDeviceRecognized\(\)/);
assert.match(quick,/return !adminDeviceRecognized\(\)&&\(queryTacsOnly\(\)\|\|hasTerritorySession\(\)\)/);
assert.match(quick,/if\(adminDeviceRecognized\(\)\)\{sessionStorage\.removeItem\(EXCLUSIVE_MODE_KEY\);return\}/);
assert.match(access,/tacsOnly=.*==='tacs'&&!roleRecognized\('ADMIN'\)/);

// As quatro portas permanecem existentes e independentes.
for(const tab of ['tabAdmin','tabTacs','tabMorador','tabUbs']){
  assert.ok(access.includes(tab),'Porta de apoio ausente: '+tab);
}
assert.doesNotMatch(access,/tabAdminUbs|tabAdminMorador|tabAdminTacs/i,'Combinações não podem virar novas portas.');

// Reconhecimento de Administrador continua local e não depende de nome exposto.
assert.match(access,/if\(role==='ADMIN'\)return vaultHas\('admin'\)\|\|!!trustKey\('ADMIN'\)/);
assert.doesNotMatch(access,/Administrador reconhecido[^\n]*nome/i);

// Tarefas 6 e 7 continuam fora do escopo.
assert.doesNotMatch(access,/diagn[oó]stico administrativo|modoDiagnosticoMorador/i);
assert.doesNotMatch(central,/diagn[oó]stico administrativo|modoDiagnosticoMorador/i);

console.log('TAREFA_5_ADMIN_PORTAS_APOIO_OK: aparelho Administrador preserva Administrador/Central, TACS, Morador e UBS sem ficar preso ao modo TACS; diagnóstico administrativo permanece fora desta tarefa.');
