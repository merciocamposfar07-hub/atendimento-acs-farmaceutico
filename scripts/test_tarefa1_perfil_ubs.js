'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');

function read(path){return fs.readFileSync(path,'utf8');}

const access=read('conecta-acesso-unificado-v1.js');
const form=read('teste-v1/painel-tacs-areas-v1.html');
const formJs=read('teste-v1/painel-tacs-areas-v1.js');
const territory=read('apps-script/ZZZZ_17_TacsAreasAdminV1.gs');
const backend=read('apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs');

new Function(access);
new Function(formJs);
new Function(territory);
new Function(backend);

// Tarefa 1: quarto perfil disponível no primeiro acesso.
assert.match(access,/b\.id='tabUbs'/);
assert.match(access,/b\.textContent='UBS'/);
assert.match(access,/\.login-tabs\.csc-four\{grid-template-columns:repeat\(4/);
assert.match(access,/id="cscUbsCpf"/);
assert.match(access,/id="cscUbsPin"/);
assert.match(access,/conecta_ubs_identificar_primeiro_acesso/);

// O primeiro acesso identifica o cadastro, mas ainda NÃO faz o vínculo permanente
// do computador — reconhecimento do aparelho pertence à tarefa posterior.
assert.match(backend,/function conectaAcessoV1IdentificarUbsPrimeiroAcesso_/);
assert.match(backend,/vinculoAparelhoCriado:false/);
assert.doesNotMatch(access,/localStorage\.setItem\([^\n]*UBS/i);

// Cadastro administrativo passa a contemplar UBS isolado.
assert.match(form,/Administrador \/ TACS \/ UBS/);
assert.match(form,/value="UBS">UBS<\/option>/);
assert.match(form,/id="tacsUbsRole"/);
assert.match(form,/id="tacsUnit"/);
assert.match(form,/PIN de acesso à plataforma/);
assert.match(formJs,/profileHasUbs/);
assert.match(formJs,/funcaoUbs:isUbs\?/);
assert.match(formJs,/unidadeId:hasUnit\?/);

// Persistência no backend: perfil, função, unidade, PIN e permissões.
assert.match(territory,/'UBS'/);
assert.match(territory,/'FUNCAO_UBS'/);
assert.match(territory,/var temUbs=tacsTerritorioV1PerfilTem_\(perfil,'UBS'\)/);
assert.match(territory,/Informe a função do responsável na UBS/);
assert.match(territory,/var permissoes=\(temTacs\|\|temUbs\)/);

// Proteção de escopo: Tarefa 1 NÃO cria combinações UBS, que pertencem à Tarefa 2.
for(const proibido of ['ADMIN_UBS','TACS_UBS','UBS_MORADOR','ADMIN_TACS_UBS']){
  assert.equal(territory.includes("'"+proibido+"'"),false,'Combinação UBS antecipada na Tarefa 1: '+proibido);
}

console.log('TAREFA_1_PERFIL_UBS_OK: primeiro acesso, cadastro e persistência UBS isolados validados; combinações UBS não antecipadas.');
