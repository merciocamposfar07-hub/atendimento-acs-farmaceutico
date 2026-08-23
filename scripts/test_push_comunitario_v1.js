'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs'),'utf8');
new vm.Script(source,{filename:'ZZZZ_19_NotificacoesSegmentadasV1.gs'});

const context=vm.createContext({console,Date,JSON,Math,Object,Array,String,Number,RegExp,isFinite});
vm.runInContext(source,context);

const A='11111111-1111-1111-1111-111111111111';
const B='22222222-2222-2222-2222-222222222222';
const C='33333333-3333-3333-3333-333333333333';
const D='44444444-4444-4444-4444-444444444444';

const exported=[
  {id:A,device_type:5,notification_types:1,invalid_identifier:false,tags:{area_tacs:'JAPARANDUBA'}},
  {id:B,device_type:5,notification_types:1,invalid_identifier:false,tags:{area_tacs:'JAPARANDUBA'}},
  {id:C,device_type:5,notification_types:1,invalid_identifier:false,tags:{area_tacs:'MUNTUNS'}},
  {id:D,device_type:5,notification_types:0,invalid_identifier:false,tags:{area_tacs:'JAPARANDUBA'}},
  {id:A,device_type:5,notification_types:1,invalid_identifier:false,tags:{area_tacs:'JAPARANDUBA'}}
];
const registry={
  [A]:{idPortal:'72',tipoAparelho:'Android',navegador:'Chrome',sistema:'Android'},
  [B]:{idPortal:'72',tipoAparelho:'iPhone',navegador:'Safari',sistema:'iOS'},
  [C]:{idPortal:'99',tipoAparelho:'Android',navegador:'Chrome',sistema:'Android'},
  [D]:{idPortal:'72',tipoAparelho:'Android',navegador:'Chrome',sistema:'Android'}
};

context.saudeNotificacoesV1ExportarSubscriptions_=()=>exported;
context.saudeNotificacoesV1EhPush_=tipo=>[0,2,5,8,11,12,13,14,15,16,17].includes(Number(tipo));
context.saudeNotificacoesV1PertenceArea_=(sub,areaId,quantidadeAreas)=>{
  const tags=sub&&sub.tags&&typeof sub.tags==='object'?sub.tags:{};
  const tag=String(tags.area_tacs||'').toUpperCase();
  const area=String(areaId||'').toUpperCase();
  if(tag)return tag===area;
  return area==='JAPARANDUBA'&&Number(quantidadeAreas||1)<=1;
};
context.saudeNotificacoesV1ClassificarExport_=sub=>{
  const inactive=Boolean(sub&&sub.invalid_identifier)||Number(sub&&sub.notification_types)<=0;
  return {status:inactive?'INATIVO':'ATIVO'};
};
context.saudeNotificacoesV1TipoRemoto_=()=>({dispositivo:'Aparelho Push',navegador:'Push'});
context.tacsTerritorioV1Planilha_=()=>({});
context.notificacoesAreaV1RegistrosDispositivos_=()=>registry;

const alvos=context.notificacoesAreaV1AlvosAtivos_('app','key',{areaId:'JAPARANDUBA'},2);
const ids=JSON.parse(JSON.stringify(alvos.map(x=>x.subscriptionId)));
assert.deepEqual(ids,[A,B],'Dois aparelhos ativos da mesma família/morador precisam permanecer dois destinos Push.');
assert.equal(alvos[0].idPortal,'72');
assert.equal(alvos[1].idPortal,'72');
assert(!ids.includes(C),'Inscrição de Muntuns não pode receber publicação de Japaranduba.');
assert(!ids.includes(D),'Inscrição inativa não pode receber publicação comunitária.');
assert.equal(ids.filter(id=>id===A).length,1,'A mesma Subscription não pode receber duas vezes o mesmo envio por duplicidade de exportação.');

const filtrosMulti=JSON.parse(JSON.stringify(context.notificacoesAreaV1Filtros_('JAPARANDUBA',2)));
assert.deepEqual(filtrosMulti,[{field:'tag',key:'area_tacs',relation:'=',value:'JAPARANDUBA'}],'Com múltiplas áreas, não pode existir fallback para inscrição sem tag.');

const inicio=source.indexOf('function notificacoesAreaV1AlvosAtivos_');
const fim=source.indexOf('function notificacoesAreaV1RegistrosDispositivos_',inicio);
assert(inicio>=0&&fim>inicio,'Seletor territorial de destinatários precisa existir.');
const seletor=source.slice(inicio,fim);
assert(seletor.includes('vistos[id]=true'),'Deduplicação precisa usar Subscription ID.');
assert(!/vistos\s*\[\s*(?:reg\.)?idPortal\s*\]/.test(seletor),'Não pode deduplicar por morador/família e perder o segundo aparelho.');
assert(!/documento|\bcpf\b|\bcns\b/i.test(seletor),'Seleção comunitária não pode depender do último CPF/CNS usado no aparelho.');
assert(seletor.includes('saudeNotificacoesV1PertenceArea_(sub,contexto.areaId,quantidadeAreas)'),'Área deve ser validada no servidor antes de incluir o destino.');
assert(seletor.includes("saudeNotificacoesV1ClassificarExport_(sub,false).status!=='ATIVO'"),'Somente inscrições ativas devem entrar na audiência.');

assert(source.includes('include_subscription_ids:[item.alvo.subscriptionId]'),'Cada envio comunitário deve ser dirigido à Subscription validada individualmente.');
assert(source.includes("filtro:{campo:'area_tacs',valor:contexto.areaId,modo:'INSCRICOES_ATIVAS_INDIVIDUAIS'}"),'Resultado deve registrar explicitamente o filtro territorial aplicado.');

const familySource=fs.readFileSync(path.join(ROOT,'apps-script/ZZZZ_37_VinculoFamiliarNotificacoesV1.gs'),'utf8');
assert(familySource.includes("delete parametros.documento;"));
assert(familySource.includes("delete parametros.cpf;"));
assert(familySource.includes("delete parametros.cns;"));
assert(familySource.includes("decisao.acao==='OUTRA_FAMILIA'"),'Beneficiário de outra família não pode reatribuir silenciosamente a inscrição do aparelho.');

console.log('PUSH_COMUNITARIO_V1_OK: múltiplos aparelhos preservados, área isolada, inativos excluídos, Subscription deduplicada e CPF/CNS fora da audiência.');
