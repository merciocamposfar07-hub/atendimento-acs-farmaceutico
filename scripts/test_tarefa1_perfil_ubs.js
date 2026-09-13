'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');

function read(path){return fs.readFileSync(path,'utf8');}

const access=read('conecta-acesso-unificado-v1.js');
const form=read('teste-v1/painel-tacs-areas-v1.html');
const formJs=read('teste-v1/painel-tacs-areas-v1.js');
const territory=read('apps-script/ZZZZ_17_TacsAreasAdminV1.gs');
const backend=read('apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs');
const central=read('central-administrativa-tacs.html');
const centralJs=read('central-administrativa-tacs.js');

new Function(access);
new Function(formJs);
new Function(territory);
new Function(backend);

// Tarefa 1: o perfil UBS continua disponível na entrada, mas a UBS é cadastrada pelo Administrador.
// O computador da unidade usa somente o PIN já criado no cadastro.
assert.match(access,/b\.id='tabUbs'/);
assert.match(access,/b\.textContent='UBS'/);
assert.match(access,/\.login-tabs\.csc-four\{grid-template-columns:repeat\(4/);
assert.match(access,/field\('cscUbsPin'/);
assert.doesNotMatch(access,/field\('cscUbsCpf'/);
assert.doesNotMatch(access,/Primeiro acesso da UBS/);
assert.match(access,/function loginUbsAccess\(\)/);
assert.match(access,/post\('conecta_ubs_login_pin'/);
assert.match(backend,/function conectaAcessoV1UbsPorPin_/);
assert.match(backend,/function conectaAcessoV1LoginUbs_/);
assert.match(backend,/novaChave=conectaAcessoV1RegistrarUbsConfiavel_/);

// Administrador autenticado acessa todas as UBS cadastradas sem PIN/CPF da unidade,
// com modos separados de apenas visualizar e editar.
assert.match(central,/data-module="ubs" data-admin-only="true"/);
assert.match(centralJs,/function showAdminUbs\(/);
assert.match(centralJs,/Apenas visualizar/);
assert.match(centralJs,/data-ubs-mode="edit"/);

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

// Após a autorização da Tarefa 2, este gate preserva somente os contratos
// funcionais da Tarefa 1. As combinações UBS passam a ser validadas no gate da Tarefa 2.
console.log('TAREFA_1_PERFIL_UBS_OK: UBS é cadastrada pelo Administrador, computador da unidade entra somente por PIN e Administrador acessa a lista de UBS sem credencial da unidade.');
