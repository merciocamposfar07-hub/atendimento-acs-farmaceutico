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
assert.match(access,/field\('cscUbsCpf'/);
assert.match(access,/field\('cscUbsPin'/);
assert.match(access,/conecta_ubs_identificar_primeiro_acesso/);

// O primeiro acesso UBS permanece identificável. O reconhecimento persistente,
 // originalmente adiado na Tarefa 1, pode ser acrescentado pela Tarefa 4 sem
 // descaracterizar este gate histórico.
assert.match(backend,/function conectaAcessoV1IdentificarUbsPrimeiroAcesso_/);
assert.match(access,/function identifyUbsFirstAccess\(\)/);

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
console.log('TAREFA_1_PERFIL_UBS_OK: primeiro acesso, cadastro e persistência do perfil UBS continuam preservados.');
