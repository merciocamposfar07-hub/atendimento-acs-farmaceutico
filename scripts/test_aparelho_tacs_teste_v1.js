'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const backend=read('apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs');
const admin=read('admin-aparelho-tacs-teste-v1.js');
const loader=read('recados-campanhas-whatsapp-mensal-v12.js');
const build=read('scripts/build_apps_script_release.js');
const geral=read('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs');
new vm.Script(backend,{filename:'ZZZZ_45_AparelhoTacsTesteV1.gs'});
new vm.Script(admin,{filename:'admin-aparelho-tacs-teste-v1.js'});

const SUB_TEST='11111111-1111-4111-8111-11111111aaaa';
const SUB_NORMAL='22222222-2222-4222-8222-22222222bbbb';
const SUB_OUTRA='33333333-3333-4333-8333-33333333cccc';
let generalTargetSentinel=function(){return 'GERAL_INTACTO'};
const sandbox={
  console,
  doPost:function(){return 'POST_ANTERIOR'},
  saudeNotificacoesV1CheckinPublico_:function(p){return {ok:true,recebido:p}},
  saudeNotificacoesV1SaudeAdmin_:function(){return {ok:true,contagens:{},aparelhos:[{nome:'Morador teste',subscriptionRef:SUB_TEST.slice(-8),status:'ATIVO',motivo:'normal'},{nome:'Morador normal',subscriptionRef:SUB_NORMAL.slice(-8),status:'ATIVO',motivo:'normal'}]}},
  mensagemIndividualV1Alvos_:function(){return [{subscriptionId:SUB_TEST},{subscriptionId:SUB_NORMAL},{subscriptionId:SUB_OUTRA}]},
  buscaEnvioFamiliaV1Alvos_:function(){return {cfg:{ok:true},alvos:[{subscriptionId:SUB_TEST},{subscriptionId:SUB_NORMAL}]}},
  identificacaoFamiliarPublicaV1ConsultarFamilia_:function(){return {ok:true,autorizada:false,requerConfirmacao:true}},
  moradoresAdminV1NormalizarAreaId_:function(v){return String(v||'').toUpperCase()},
  notificacoesAreaV1AlvosAtivos_:generalTargetSentinel,
  Object
};
vm.createContext(sandbox);
new vm.Script(backend).runInContext(sandbox);

sandbox.aparelhoTacsTesteV1MapaAtivos_=function(){return {[SUB_TEST]:true}};
sandbox.aparelhoTacsTesteV1Ativo_=function(sub,area){return sub===SUB_TEST&&area==='JAPARANDUBA'};
sandbox.aparelhoTacsTesteV1RemoverVinculoFamilia_=function(){return 1};
sandbox.aparelhoTacsTesteV1LimparMoradorRegistro_=function(){return true};
sandbox.identificacaoFamiliarPublicaV1Contexto_=function(area){return {areaId:area}};
sandbox.identificacaoFamiliarPublicaV1NormalizarFamilia_=function(v){return String(v)==='34'?'034':String(v)};
sandbox.identificacaoFamiliarPublicaV1Membros_=function(familia){return familia==='034'?[{token:'x',nome:'FILHA'}]:[]};

const individual=Array.from(sandbox.mensagemIndividualV1Alvos_('app','key',{areaId:'JAPARANDUBA'},{}));
assert.deepEqual(individual.map(x=>x.subscriptionId),[SUB_NORMAL,SUB_OUTRA],'Aparelho teste deve ser removido somente dos alvos individuais.');
const familiar=sandbox.buscaEnvioFamiliaV1Alvos_({areaId:'JAPARANDUBA'},'034');
assert.deepEqual(Array.from(familiar.alvos).map(x=>x.subscriptionId),[SUB_NORMAL],'Aparelho teste deve ser removido do envio familiar.');
assert.equal(sandbox.notificacoesAreaV1AlvosAtivos_,generalTargetSentinel,'O emissor geral de Recados/Campanhas não pode ser substituído pelo modo teste.');

const checkin=sandbox.saudeNotificacoesV1CheckinPublico_({subscriptionId:SUB_TEST,areaId:'JAPARANDUBA',documento:'123',cpf:'456',cns:'789'});
assert.equal(Object.prototype.hasOwnProperty.call(checkin.recebido,'documento'),false);
assert.equal(Object.prototype.hasOwnProperty.call(checkin.recebido,'cpf'),false);
assert.equal(Object.prototype.hasOwnProperty.call(checkin.recebido,'cns'),false);
assert.equal(checkin.aparelhoTacsTeste,true);
assert.equal(checkin.vinculadoFamilia,false);
assert.equal(checkin.familiaId,'');

const health=sandbox.saudeNotificacoesV1SaudeAdmin_({areaId:'JAPARANDUBA'},{});
assert.equal(health.aparelhos[0].nome,'🛠 Aparelho TACS / teste');
assert.equal(health.aparelhos[0].vinculadoMorador,false);
assert.match(health.aparelhos[0].motivo,/recebe Recados e Campanhas/);
assert.equal(health.aparelhos[1].nome,'Morador normal');

const family=sandbox.identificacaoFamiliarPublicaV1ConsultarFamilia_({subscriptionId:SUB_TEST,areaId:'JAPARANDUBA',familia:'34'});
assert.equal(family.autorizada,true);
assert.equal(family.familiaId,'034');
assert.equal(family.autorizacao,'APARELHO_TACS_TESTE');
assert.equal(family.aparelhoTacsTeste,true);

assert.match(backend,/admin_notificacoes_aparelho_tacs_teste/);
assert.match(backend,/RemoverVinculoFamilia_/);
assert.match(backend,/LimparMoradorRegistro_/);
assert.match(backend,/delete parametros\.documento;delete parametros\.cpf;delete parametros\.cns/);
assert.match(backend,/recebe Recados e Campanhas/);
assert.doesNotMatch(backend,/notificacoesAreaV1AlvosAtivos_\s*=/,'O módulo teste não pode substituir a seleção geral de Recados/Campanhas.');
assert.match(geral,/notificacoesAreaV1AlvosAtivos_/,'O emissor geral continua existindo no módulo oficial de notificações.');

assert.match(admin,/Marcar este aparelho como TACS \/ teste/);
assert.match(admin,/Voltar este aparelho ao modo morador/);
assert.match(admin,/continuará recebendo Recados e Campanhas/);
assert.match(admin,/subscriptionId/);
assert.doesNotMatch(admin,/requestPermission\s*\(/,'O painel não deve pedir nova permissão ao marcar o modo teste.');
assert.doesNotMatch(admin,/\.optOut\s*\(/,'Marcar modo teste não pode desligar a inscrição Push.');
assert.doesNotMatch(admin,/\.optIn\s*\(/,'Marcar modo teste não pode rotacionar a inscrição Push.');
assert.match(loader,/admin-aparelho-tacs-teste-v1\.js\?v=20260820-v1/);
assert.match(build,/ZZZZ_45_AparelhoTacsTesteV1\.gs/);
assert.match(build,/TACS_APARELHO_TACS_TESTE_V1/);

console.log('Aparelho TACS/teste V1: sem vínculo familiar, fora de mensagens individuais/familiares e preservado no Push geral.');
