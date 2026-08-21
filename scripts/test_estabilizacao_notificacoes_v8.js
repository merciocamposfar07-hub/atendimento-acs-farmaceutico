'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const source=read('apps-script/ZZZZ_46_EstabilizacaoNotificacoesV8.gs');
const messageSource=read('apps-script/ZZZZ_40_MensagensIndividuaisMoradorV1.gs');
const panel=read('painel-oficial-recados-campanhas.html');
const build=read('scripts/build_apps_script_release.js');
new vm.Script(source,{filename:'ZZZZ_46_EstabilizacaoNotificacoesV8.gs'});

const SUB='11111111-1111-4111-8111-11111111c024';
const AREA='JAPARANDUBA';
let basePayload=null,gravacoes=[],registroVinculado='';
const cache=new Map();
const sandbox={
  console,Object,Array,String,Number,Boolean,Date,JSON,Math,RegExp,Error,
  doPost:function(){return null},tratarPostPainelTacs_:function(){return null},
  moradoresAdminV1NormalizarAreaId_:v=>String(v||'').toUpperCase().replace(/[^A-Z0-9_-]/g,''),
  vinculoFamiliarNotifV1Ler_:()=>null,
  vinculoFamiliarNotifV1ResolverMoradorDocumento_:(doc)=>String(doc).replace(/\D/g,'').length===11?{familiaId:'024',idPortal:'321',nome:'Cristina'}:null,
  vinculoFamiliarNotifV1CheckinAnterior_:(p)=>{basePayload={...p};return {ok:true,registrado:true}},
  vinculoFamiliarNotifV1ResolverLegado_:()=>null,
  vinculoFamiliarNotifV1ReconciliarReferencia_:v=>v,
  vinculoFamiliarNotifV1Decidir_:(v,m)=>{if(!m)return{acao:'NADA'};if(!v)return{acao:'VINCULAR'};return{acao:v.familiaId===m.familiaId?'MESMA_FAMILIA':'OUTRA_FAMILIA'}},
  vinculoFamiliarNotifV1Gravar_:(sub,area,m,origem)=>{const v={subscriptionId:sub,areaId:area,familiaId:m.familiaId,idPortal:m.idPortal,nome:m.nome,origem};gravacoes.push(v);return v},
  CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v)})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
  tacsTerritorioV1Planilha_:()=>({getSheetByName:()=>null}),
  saudeNotificacoesV1MapaMoradores_:()=>({}),
  saudeNotificacoesV1RegistroDaLinha_:()=>({}),
  saudeNotificacoesV1ReparoPendenteSubscription_:()=>null,
  saudeNotificacoesV1Classificar_:()=>({status:'SEM_CONFIRMACAO',texto:'Aguardando',motivo:'local'}),
  saudeNotificacoesV1ValidarRequestId_:v=>v,
  tacsTerritorioV1ValidarAcesso_:()=>({}),saudeNotificacoesV1ExigirAcesso_:()=>{},moradoresAdminV1ResolverContexto_:()=>({areaId:AREA,areaNome:'Sítio Japaranduba'}),
  saudeNotificacoesV1GuardarResultado_:()=>{},saudeNotificacoesV1ResponderPost_:()=>({}),
  saudeNotificacoesV1SaudeAdmin_:()=>({ok:true,areaId:AREA,areaNome:'Sítio Japaranduba',contagens:{ativos:2,inativos:0,reparo:0,semConfirmacao:0},aparelhos:[
    {nome:'Cristina',status:'ATIVO',statusTexto:'Ativo',motivo:'Push ativo',subscriptionRef:SUB.slice(-8)},
    {nome:'Aparelho ativo ainda não identificado',status:'ATIVO',statusTexto:'Ativo',motivo:'Push ativo',subscriptionRef:'deadbeef'}
  ]}),
  TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1:{SHEET:'TACS_NOTIFICACOES_FAMILIAS'},
  TACS_SAUDE_NOTIFICACOES_V1:{REGISTRY_SHEET:'TACS_NOTIFICACOES_DISPOSITIVOS'}
};
vm.createContext(sandbox);new vm.Script(source).runInContext(sandbox);
// As funções V8 são definidas pelo próprio módulo; os stubs de I/O entram depois da carga.
sandbox.notificacoesV8ResolverVinculoPorOneSignal_=()=>null;
sandbox.notificacoesV8VincularRegistroSaude_=(sub,area,id)=>{registroVinculado=id;return true};

// 1) Primeiro acesso de Cristina: o CPF deve chegar à camada de Saúde e o vínculo familiar deve ser criado.
const first=sandbox.vinculoFamiliarNotifV1Checkin_({subscriptionId:SUB,areaId:AREA,documento:'12345678901',permission:'true'});
assert.equal(basePayload.documento,'12345678901','No primeiro vínculo o CPF/CNS precisa chegar à Saúde para gravar ID_PORTAL.');
assert.equal(gravacoes.length,1);assert.equal(gravacoes[0].familiaId,'024');assert.equal(gravacoes[0].idPortal,'321');
assert.equal(registroVinculado,'321');assert.equal(first.vinculadoFamilia,true);assert.equal(first.familiaId,'024');

// 2) Depois de vinculada à família 024, atender outra pessoa não pode trocar a família do aparelho.
sandbox.vinculoFamiliarNotifV1Ler_=()=>({subscriptionId:SUB,areaId:AREA,familiaId:'024',idPortal:'321',nome:'Cristina'});
sandbox.vinculoFamiliarNotifV1ResolverMoradorDocumento_=()=>({familiaId:'030',idPortal:'999',nome:'Outra pessoa'});
basePayload=null;const other=sandbox.vinculoFamiliarNotifV1Checkin_({subscriptionId:SUB,areaId:AREA,documento:'98765432100'});
assert.equal(Object.prototype.hasOwnProperty.call(basePayload,'documento'),false,'Depois do vínculo o documento do beneficiário não pode substituir a família do aparelho.');
assert.equal(other.familiaId,'024');assert.equal(other.familiaDiferente,true);

// 3) Saúde: Push ativo sem família NÃO pode aparecer como apto para mensagem individual.
sandbox.notificacoesV8MapaVinculos_=()=>({porSub:{},porRef:{[SUB.slice(-8)]:{familiaId:'024',idPortal:'321',nome:'Cristina'}}});
let health=sandbox.notificacoesV8EnriquecerSaude_(sandbox.saudeNotificacoesV1SaudeAdmin_(),{areaId:AREA});
const cristina=health.aparelhos.find(a=>a.subscriptionRef===SUB.slice(-8));
const solto=health.aparelhos.find(a=>a.subscriptionRef==='deadbeef');
assert.equal(cristina.status,'ATIVO');assert.equal(cristina.aptoMensagemIndividual,true);assert.equal(cristina.familiaId,'024');
assert.equal(solto.status,'SEM_CONFIRMACAO');assert.equal(solto.aptoMensagemIndividual,false);assert.match(solto.statusTexto,/sem vínculo/i);
assert.equal(health.contagens.ativos,1,'A contagem Aptos deve considerar somente aparelhos realmente aptos para mensagem individual.');

// 4) Simulação do envio: OneSignal ativo + registro técnico ID_PORTAL -> família 024 -> exatamente um alvo.
const individual={console};vm.createContext(individual);new vm.Script(messageSource).runInContext(individual);
individual.notificacoesAreaV1AlvosAtivos_=()=>[{subscriptionId:SUB,tipoAparelho:'Android',navegador:'Chrome',sistema:'Android'}];
individual.notificacoesAreaV1QuantidadeAreas_=()=>1;
individual.tacsTerritorioV1Planilha_=()=>({});
individual.mensagemIndividualV1MapaFamilias_=()=>({[SUB]:'024'});
const targets=individual.mensagemIndividualV1Alvos_('app','key',{areaId:AREA},{familiaId:'024',referencia:'321'});
assert.equal(targets.length,1,'Cristina com Push ativo e família 024 precisa produzir um destinatário de envio.');
assert.equal(targets[0].subscriptionId,SUB);

// 5) Contratos da estabilização: painel rápido primeiro, OneSignal depois; módulo entra no release.
assert.match(panel,/admin_notificacoes_saude_rapida/);
assert.match(panel,/admin_notificacoes_saude_remota/);
assert.match(panel,/Aptos p\/ mensagem/);
assert.match(build,/ZZZZ_46_EstabilizacaoNotificacoesV8\.gs/);
assert.match(build,/TACS_ESTABILIZACAO_NOTIFICACOES_V8/);
console.log('ESTABILIZACAO_NOTIFICACOES_V8_OK: paciente, vínculo familiar, Push ativo, classificação e alvo individual simulados.');
