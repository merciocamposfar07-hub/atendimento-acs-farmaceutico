'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const backend=read('apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs');
const admin=read('admin-aparelho-tacs-teste-v1.js');
const familyClient=read('portal-identificacao-familia-v1.js');
const loader=read('recados-campanhas-whatsapp-mensal-v12.js');
const geral=read('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs');
new vm.Script(backend,{filename:'ZZZZ_45_AparelhoTacsTesteV1.gs'});
new vm.Script(admin,{filename:'admin-aparelho-tacs-teste-v1.js'});
new vm.Script(familyClient,{filename:'portal-identificacao-familia-v1.js'});
const SUB_TEST='11111111-1111-4111-8111-11111111aaaa';
const SUB_NORMAL='22222222-2222-4222-8222-22222222bbbb';
const DEVICE_TEST='iphone-0123456789abcdef0123456789abcdef';
const TOKEN_TEST='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0123456789_abcd';
let generalTargetSentinel=function(){return 'GERAL_INTACTO'};
const sandbox={
  console,
  doPost:function(){return 'POST_ANTERIOR'},
  saudeNotificacoesV1CheckinPublico_:function(p){return {ok:true,recebido:p}},
  saudeNotificacoesV1SaudeAdmin_:function(){return {ok:true,contagens:{},aparelhos:[]}},
  mensagemIndividualV1Alvos_:function(){return [{subscriptionId:SUB_TEST},{subscriptionId:SUB_NORMAL}]},
  buscaEnvioFamiliaV1Alvos_:function(){return {alvos:[{subscriptionId:SUB_TEST},{subscriptionId:SUB_NORMAL}]}},
  identificacaoFamiliarPublicaV1ConsultarFamilia_:function(){return {ok:true,autorizada:false,requerConfirmacao:true}},
  moradoresAdminV1NormalizarAreaId_:function(v){return String(v||'').toUpperCase()},
  notificacoesAreaV1AlvosAtivos_:generalTargetSentinel,
  Object
};
vm.createContext(sandbox);
new vm.Script(backend).runInContext(sandbox);
sandbox.aparelhoTacsTesteV1MapaAtivos_=function(){return {[SUB_TEST]:true}};
sandbox.aparelhoTacsTesteV1TokenValido_=function(device,area,token){return device===DEVICE_TEST&&area==='JAPARANDUBA'&&token===TOKEN_TEST};
sandbox.aparelhoTacsTesteV1AssociarSubscription_=function(){return true};
sandbox.identificacaoFamiliarPublicaV1Contexto_=function(area){return {areaId:area}};
sandbox.identificacaoFamiliarPublicaV1NormalizarFamilia_=function(v){return String(v)==='53'?'053':String(v)};
sandbox.identificacaoFamiliarPublicaV1Membros_=function(f){return f==='053'?[{token:'x',nome:'MORADOR',temDocumento:true}]:[]};
const individual=Array.from(sandbox.mensagemIndividualV1Alvos_('app','key',{areaId:'JAPARANDUBA'},{}));
assert.deepEqual(individual.map(x=>x.subscriptionId),[SUB_NORMAL]);
const familiar=sandbox.buscaEnvioFamiliaV1Alvos_({areaId:'JAPARANDUBA'},'053');
assert.deepEqual(Array.from(familiar.alvos).map(x=>x.subscriptionId),[SUB_NORMAL]);
assert.equal(sandbox.notificacoesAreaV1AlvosAtivos_,generalTargetSentinel);
const ok=sandbox.identificacaoFamiliarPublicaV1ConsultarFamilia_({areaId:'JAPARANDUBA',familia:'53',dispositivo:DEVICE_TEST,chaveTacsTeste:TOKEN_TEST,subscriptionId:SUB_TEST});
assert.equal(ok.autorizada,true);
assert.equal(ok.familiaId,'053');
assert.equal(ok.autorizacao,'APARELHO_TACS_TESTE');
sandbox.aparelhoTacsTesteV1TokenValido_=function(){return false};
sandbox.aparelhoTacsTesteV1LegacyAtivo_=function(sub,area){return sub===SUB_TEST&&area==='JAPARANDUBA'};
const legado=sandbox.identificacaoFamiliarPublicaV1ConsultarFamilia_({areaId:'JAPARANDUBA',familia:'53',subscriptionId:SUB_TEST});
assert.equal(legado.autorizada,true,'Aparelho TACS/teste legado não pode voltar a pedir CPF/CNS.');
assert.equal(legado.autorizacao,'APARELHO_TACS_TESTE_LEGADO');
const protegido=sandbox.identificacaoFamiliarPublicaV1ConsultarFamilia_({areaId:'JAPARANDUBA',familia:'53',dispositivo:DEVICE_TEST});
assert.equal(protegido.requerConfirmacao,true);
assert.match(backend,/VERSAO:'1\.2\.0'/);
assert.match(backend,/CHAVE_HASH/);
assert.match(backend,/computeDigest/);
assert.match(backend,/chaveTacsTeste/);
assert.doesNotMatch(backend,/notificacoesAreaV1AlvosAtivos_\s*=/);
assert.match(geral,/notificacoesAreaV1AlvosAtivos_/);
assert.match(admin,/portalTacsAparelhoTesteTokenV3:/);
assert.match(admin,/admin_notificacoes_aparelho_tacs_teste/);
assert.match(admin,/OneSignalDeferred/);
assert.match(admin,/subscriptionId/);
assert.doesNotMatch(admin,/requestPermission\s*\(|Notifications\.requestPermission/);
assert.match(admin,/Ativar modo TACS \/ teste/);
assert.match(admin,/salvarChave\(r\.chaveTecnica\)/);
assert.match(familyClient,/\^\\d\{2,4\}\$/);
assert.match(familyClient,/chaveTacsTeste:technicalToken\(\)/);
assert.match(familyClient,/dispositivo:deviceId\(false\)/);
assert.match(familyClient,/nome, nascimento e localidade/);
assert.match(familyClient,/aguardarSubscription\(1800\)/);
assert.match(loader,/admin-aparelho-tacs-teste-v1\.js\?v=20260827-botoes-safe-v1/);

// Handoff V7: testa criação, resgate, uso único e isolamento por área.
const handoffCache=new Map();
sandbox.CacheService={getScriptCache:function(){return{put:function(k,v){handoffCache.set(k,v)},get:function(k){return handoffCache.get(k)||null},remove:function(k){handoffCache.delete(k)}}}};
let seq=0;sandbox.aparelhoTacsTesteV1NovaChave_=function(){seq++;return ('handoffTOKEN'+String(seq).padStart(4,'0')+'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz').slice(0,64)};
sandbox.aparelhoTacsTesteV1Hash_=function(v){return 'hash_'+String(v)};
let salvo=null;sandbox.aparelhoTacsTesteV1SalvarDispositivo_=function(device,area,op,ativo,chave){salvo={device,area,op,ativo,chave};return{ativo:true}};
sandbox.aparelhoTacsTesteV1Estado_=function(device,sub,ctx,chave){return{ok:true,areaId:ctx.areaId,aparelhoTacsTeste:true,autorizadoNesteAparelho:true,device,chaveRef:chave.slice(-4)}};
const codigo=sandbox.aparelhoTacsTesteV1HandoffCriar_({areaId:'JAPARANDUBA'},{operadorId:'TACS_TESTE'});
assert.ok(codigo.length>=40);
const resgate=sandbox.aparelhoTacsTesteV1HandoffResgatar_({codigo,dispositivo:DEVICE_TEST,areaId:'JAPARANDUBA'});
assert.equal(resgate.ok,true);assert.equal(resgate.transferidoParaPortal,true);assert.equal(salvo.device,DEVICE_TEST);assert.equal(salvo.area,'JAPARANDUBA');assert.equal(salvo.ativo,true);assert.ok(resgate.chaveTecnica.length>=40);
assert.throws(()=>sandbox.aparelhoTacsTesteV1HandoffResgatar_({codigo,dispositivo:DEVICE_TEST,areaId:'JAPARANDUBA'}),/expirou|utilizada/,'Código TACS deve ser de uso único.');
const codigoOutra=sandbox.aparelhoTacsTesteV1HandoffCriar_({areaId:'JAPARANDUBA'},{operadorId:'TACS_TESTE'});
assert.throws(()=>sandbox.aparelhoTacsTesteV1HandoffResgatar_({codigo:codigoOutra,dispositivo:DEVICE_TEST,areaId:'MATIAS'}),/outra área/,'Handoff não pode atravessar área.');
assert.match(backend,/publico_aparelho_tacs_resgatar/);assert.match(backend,/codigoTransferencia/);assert.match(admin,/Abrir Portal TACS em modo teste/);assert.match(admin,/TRANSFERIR/);assert.match(familyClient,/q\.get\('tacsTeste'\)/);assert.match(familyClient,/resgatarModoTacsTeste/);assert.match(familyClient,/publico_aparelho_tacs_resgatar/);assert.match(familyClient,/history\.replaceState/);assert.match(loader,/admin-aparelho-tacs-teste-v1\.js\?v=20260827-botoes-safe-v1/);
console.log('Handoff TACS V7 validado: código único, área isolada, Portal recebe autorização no próprio contexto do iPhone.');

console.log('Modo TACS/teste V1.2 validado: autorização por dispositivo, sem dependência do Push, com fluxo comum protegido.');
