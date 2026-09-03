'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'apps-script','ZZZZ_35_CampanhasAutomaticasV1.gs'),'utf8');
const ctx=vm.createContext({console,Date,JSON,Math});
vm.runInContext(src,ctx);
const catalog=JSON.parse(JSON.stringify(ctx.campanhasAutomaticasV1Catalogo_()));
assert.equal(catalog.length,18);
const aug=catalog.filter(x=>x.mes===8);
assert.equal(aug.length,2);
assert.deepEqual(aug.map(x=>x.tema),['lilas','dourado']);
const plan=JSON.parse(JSON.stringify(ctx.campanhasAutomaticasV1PlanejarAno_('JAPARANDUBA',2026)));
const augPlan=plan.filter(x=>x.MES==='08');
assert.equal(augPlan.length,2);
assert.ok(augPlan.every(x=>x.INICIO==='2026-08-01'&&x.VALIDADE==='2026-08-31'));
const leap=JSON.parse(JSON.stringify(ctx.campanhasAutomaticasV1PlanejarAno_('JAPARANDUBA',2028))).find(x=>x.MES==='02');
assert.equal(leap.VALIDADE,'2028-02-29');
const publicBackend=fs.readFileSync(path.join(ROOT,'apps-script','ZZ_12_PublicoAgendasPortalV1.gs'),'utf8');
assert.match(publicBackend,/publicoAgendasV1LerCampanhas_/);
assert.match(publicBackend,/campanhas: campanhas/);
const renderer=fs.readFileSync(path.join(ROOT,'portal-controle-integral.js'),'utf8');
for(const c of ['campaign-theme-lilas','campaign-theme-dourado','campaign-description','integral-campaign'])assert.ok(renderer.includes(c));
const panel=fs.readFileSync(path.join(ROOT,'painel-oficial-recados-campanhas.html'),'utf8');
assert.match(panel,/admin_publicacoes_dados/);
const period=fs.readFileSync(path.join(ROOT,'campanhas-periodo-v2.js'),'utf8');
assert.match(period,/Cor da campanha/);
assert.match(period,/camp-theme-lilas/);
const build=fs.readFileSync(path.join(ROOT,'scripts','build_apps_script_release.js'),'utf8');
assert.match(build,/ZZZZ_35_CampanhasAutomaticasV1\.gs/);
const cron=fs.readFileSync(path.join(ROOT,'.github','workflows','campanhas-automaticas-diarias.yml'),'utf8');
assert.match(cron,/campanhas_automaticas_executar/);
assert.match(cron,/cron: '5 3 \* \* \*'/);

// Regressão: uma campanha automática pode ser publicada todos os dias no Portal,
// mas o Push aos moradores só pode sair uma vez por ID/ciclo da campanha.
const propsMap=new Map([['APP','app-teste'],['KEY','key-teste']]);
const props={
  getProperty:k=>propsMap.has(k)?propsMap.get(k):null,
  setProperty:(k,v)=>{propsMap.set(k,String(v));},
  deleteProperty:k=>{propsMap.delete(k);}
};
ctx.PropertiesService={getScriptProperties:()=>props};
ctx.TACS_NOTIFICACOES_AREA_V1={APP_ID_PROPERTIES:['APP'],API_KEY_PROPERTIES:['KEY'],DEFAULT_APP_ID:'app-default'};
ctx.notificacoesAreaV1PrimeiraPropriedade_=(p,keys)=>keys.map(k=>p.getProperty(k)).find(Boolean)||'';
ctx.notificacoesAreaV1QuantidadeAreas_=()=>1;
ctx.Utilities={formatDate:()=> '03/09/2026 04:58:00'};

const campanha=(id,titulo='Setembro Verde')=>({
  ID:id,AREA_ID:'JAPARANDUBA',TITULO:titulo,SUBTITULO:'Incentivo à doação de órgãos',
  MENSAGEM:'Conscientização e incentivo à doação de órgãos.',INICIO:'2026-09-01',
  VALIDADE:'2026-09-30',NOTIFICADO_EM:''
});
let ativas=[campanha('CAMP_AUTO_JAPARANDUBA_2026_09_SET_VERDE')];
let envios=[];
let auditoria={};
ctx.campanhasAutomaticasV1AtivasAgora_=()=>ativas;
ctx.campanhasAutomaticasV1MarcarNotificada_=(area,id,valor)=>{
  const item=ativas.find(x=>x.ID===id);
  if(item)item.NOTIFICADO_EM=String(valor||'');
  return true;
};
ctx.notificacoesAreaV1UltimoEnvio_=(area,tipo,id)=>auditoria[id]||null;
ctx.notificacoesAreaV1Enviar_=(app,key,contexto,acesso,input)=>{
  envios.push({...input});
  return {ok:true,push:true,onesignalId:'push-'+envios.length};
};

const setVerde=ativas[0];
let r=ctx.campanhasAutomaticasV1NotificarArea_('JAPARANDUBA');
assert.equal(r.enviadas,1,'primeiro lançamento deve enviar exatamente um Push');
assert.equal(envios.length,1);
assert.equal(envios[0].evento,'AUTO_'+setVerde.ID,'evento automático deve ser estável e não carregar a data diária');
assert.ok(setVerde.NOTIFICADO_EM,'primeiro envio deve persistir NOTIFICADO_EM');

r=ctx.campanhasAutomaticasV1NotificarArea_('JAPARANDUBA');
assert.equal(r.enviadas,0,'segundo dia não pode reenviar a mesma campanha');
assert.equal(envios.length,1);
r=ctx.campanhasAutomaticasV1NotificarArea_('JAPARANDUBA');
assert.equal(r.enviadas,0,'terceiro dia não pode reenviar a mesma campanha');
assert.equal(envios.length,1);

// Mesmo se a coluna da planilha for apagada por acidente, o marcador persistente impede repetição.
setVerde.NOTIFICADO_EM='';
r=ctx.campanhasAutomaticasV1NotificarArea_('JAPARANDUBA');
assert.equal(r.enviadas,0,'marcador persistente deve impedir reenvio se NOTIFICADO_EM vier vazio');
assert.equal(envios.length,1);

// Uma campanha realmente nova, com outro ID/ciclo, continua recebendo seu primeiro Push.
const outubro=campanha('CAMP_AUTO_JAPARANDUBA_2026_10_OUT_ROSA','Outubro Rosa');
ativas=[setVerde,outubro];
r=ctx.campanhasAutomaticasV1NotificarArea_('JAPARANDUBA');
assert.equal(r.enviadas,1,'nova campanha deve receber seu primeiro Push');
assert.equal(envios.length,2);
assert.equal(envios[1].referencia,outubro.ID);

// Se já existe auditoria real de envio, não reenviar: apenas reconstruir os marcadores.
const auditada=campanha('CAMP_AUTO_JAPARANDUBA_2026_11_NOV_AZUL','Novembro Azul');
ativas=[auditada];
auditoria[auditada.ID]={onesignalId:'onesignal-antigo',registradoEm:'01/11/2026 04:58:00'};
const antesAudit=envios.length;
r=ctx.campanhasAutomaticasV1NotificarArea_('JAPARANDUBA');
assert.equal(r.enviadas,0);
assert.equal(envios.length,antesAudit,'auditoria prévia deve bloquear novo Push');
assert.match(auditada.NOTIFICADO_EM,/^AUDITADO /);

// Falha verdadeira de envio não fecha a campanha: a próxima execução pode tentar novamente.
const retry=campanha('CAMP_AUTO_JAPARANDUBA_2026_12_DEZ_VERMELHO','Dezembro Vermelho');
ativas=[retry];
auditoria[retry.ID]=null;
ctx.notificacoesAreaV1Enviar_=()=>({ok:false,push:false,message:'falha simulada'});
r=ctx.campanhasAutomaticasV1NotificarArea_('JAPARANDUBA');
assert.equal(r.pendentes,1);
assert.equal(retry.NOTIFICADO_EM,'');
assert.equal(props.getProperty('TACS_CAMP_AUTO_ENVIADA_UNICA_V1_'+retry.ID),null);
ctx.notificacoesAreaV1Enviar_=(app,key,contexto,acesso,input)=>{envios.push({...input});return {ok:true,push:true,onesignalId:'push-retry'};};
r=ctx.campanhasAutomaticasV1NotificarArea_('JAPARANDUBA');
assert.equal(r.enviadas,1,'após falha real, a campanha deve poder tentar o primeiro envio novamente');
assert.ok(retry.NOTIFICADO_EM);

assert.doesNotMatch(src,/var\s+reenviar\s*=/,'campanha automática não pode manter caminho de renotificação diária/revisional');
assert.doesNotMatch(src,/AUTO_'\)\+id\+'_'\+hoje/,'evento automático não pode incorporar o dia da execução');
console.log('Campanhas automáticas V1: calendário e Push único por campanha validados (1º envio=1; 2º/3º dia=0; nova campanha=1; falha permite retry).');
