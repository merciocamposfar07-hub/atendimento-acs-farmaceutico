/**
 * ZZZZ_23_EntregaNotificacoesV1.gs
 * Portal TACS — acompanhamento técnico de entrega das notificações V1.0.0
 *
 * Lê somente notificações já registradas na auditoria do Portal TACS e consulta
 * o relatório oficial do OneSignal. Não altera envio, agendas ou publicações.
 */
var TACS_ENTREGA_NOTIFICACOES_V1 = Object.freeze({
  VERSAO:'1.0.0',
  DEFAULT_APP_ID:'e2294b98-c72b-4f8c-a055-de28979676dc',
  APP_ID_PROPERTIES:Object.freeze(['TACS_ONESIGNAL_APP_ID','ONESIGNAL_APP_ID']),
  API_KEY_PROPERTIES:Object.freeze(['TACS_ONESIGNAL_API_KEY','ONESIGNAL_APP_API_KEY','ONESIGNAL_REST_API_KEY','ONESIGNAL_API_KEY']),
  BASE:'https://api.onesignal.com/notifications/',
  RESULT_PREFIX:'tacs_entrega_notificacoes_v1_',
  RESULT_SECONDS:300,
  MAX_RECENTES:20
});

var entregaNotificacoesV1DoGetAnterior_;
var entregaNotificacoesV1DoPostAnterior_;
var entregaNotificacoesV1GetAnterior_;
var entregaNotificacoesV1PostAnterior_;

(function instalarEntregaNotificacoesV1_(){
  if(typeof doGet==='function'){
    entregaNotificacoesV1DoGetAnterior_=doGet;
    doGet=function(e){var r=entregaNotificacoesV1TratarGet_(e);return r||entregaNotificacoesV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    entregaNotificacoesV1DoPostAnterior_=doPost;
    doPost=function(e){var r=entregaNotificacoesV1TratarPost_(e);return r||entregaNotificacoesV1DoPostAnterior_(e);};
  }
  if(typeof tratarGetPainelTacs_==='function'){
    entregaNotificacoesV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){var r=entregaNotificacoesV1TratarGet_(e);return r||entregaNotificacoesV1GetAnterior_(e);};
  }
  if(typeof tratarPostPainelTacs_==='function'){
    entregaNotificacoesV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){var r=entregaNotificacoesV1TratarPost_(e);return r||entregaNotificacoesV1PostAnterior_(e);};
  }
})();

function entregaNotificacoesV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=entregaNotificacoesV1Texto_(p.action).toLowerCase();
  if(action!=='admin_notificacoes_entregas_result')return null;
  var requestId=entregaNotificacoesV1Texto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))return null;
  var resultado=entregaNotificacoesV1LerResultado_(requestId);
  if(!resultado)return null;
  return entregaNotificacoesV1ResponderJson_({ok:true,pendente:false,requestId:requestId,result:resultado},p.callback);
}

function entregaNotificacoesV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=entregaNotificacoesV1Texto_(p.action).toLowerCase();
  if(action!=='admin_notificacoes_entregas')return null;
  var requestId=entregaNotificacoesV1Texto_(p.requestId),resultado;
  try{
    requestId=entregaNotificacoesV1ValidarRequestId_(requestId);
    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
    entregaNotificacoesV1ExigirAcesso_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');
    resultado=entregaNotificacoesV1Consultar_(contexto,p);
  }catch(erro){resultado={ok:false,message:entregaNotificacoesV1Erro_(erro)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))entregaNotificacoesV1GuardarResultado_(requestId,resultado);
  return entregaNotificacoesV1ResponderPost_(requestId,resultado);
}

function entregaNotificacoesV1Consultar_(contexto,p){
  var props=PropertiesService.getScriptProperties();
  var appId=entregaNotificacoesV1PrimeiraPropriedade_(props,TACS_ENTREGA_NOTIFICACOES_V1.APP_ID_PROPERTIES)||TACS_ENTREGA_NOTIFICACOES_V1.DEFAULT_APP_ID;
  var apiKey=entregaNotificacoesV1PrimeiraPropriedade_(props,TACS_ENTREGA_NOTIFICACOES_V1.API_KEY_PROPERTIES);
  if(!apiKey)throw new Error('A consulta de entrega do OneSignal não está configurada.');
  var evento=entregaNotificacoesV1Texto_(p.eventoId||p.evento||'');
  var referencia=entregaNotificacoesV1Texto_(p.referenciaId||p.id||'');
  var registros=entregaNotificacoesV1AuditoriaArea_(contexto.areaId,evento,referencia);
  var itens=[];
  registros.slice(0,TACS_ENTREGA_NOTIFICACOES_V1.MAX_RECENTES).forEach(function(reg){
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reg.onesignalId))return;
    var relatorio=entregaNotificacoesV1Mensagem_(appId,apiKey,reg.onesignalId);
    itens.push(entregaNotificacoesV1MontarItem_(reg,relatorio));
  });
  return {
    ok:true,versao:TACS_ENTREGA_NOTIFICACOES_V1.VERSAO,areaId:contexto.areaId,areaNome:contexto.areaNome,
    itens:itens,
    observacao:'Aceito pelo serviço Push não é igual a exibido na tela. Recebido confirmado depende do suporte da plataforma; Safari Web Push não fornece a mesma confirmação de exibição.'
  };
}

function entregaNotificacoesV1AuditoriaArea_(areaId,evento,referencia){
  var ss=tacsTerritorioV1Planilha_();
  var nome=(typeof TACS_NOTIFICACOES_AREA_V1!=='undefined'&&TACS_NOTIFICACOES_AREA_V1.AUDIT_SHEET)||'TACS_AUDIT_NOTIFICACOES';
  var sheet=ss.getSheetByName(nome);
  if(!sheet||sheet.getLastRow()<=1)return [];
  var rows=sheet.getRange(2,1,sheet.getLastRow()-1,10).getDisplayValues(),out=[];
  for(var i=rows.length-1;i>=0;i--){
    var r=rows[i];
    if(moradoresAdminV1NormalizarAreaId_(r[1])!==areaId)continue;
    if(evento&&entregaNotificacoesV1Texto_(r[0])!==evento)continue;
    if(referencia&&entregaNotificacoesV1Texto_(r[3])!==referencia)continue;
    if(entregaNotificacoesV1Texto_(r[8]).indexOf('ENVIADA')!==0)continue;
    out.push({eventoId:r[0],areaId:r[1],tipo:r[2],referenciaId:r[3],titulo:r[4],onesignalId:r[6],destinatarios:Number(r[7]||0),registradoEm:r[9]});
  }
  return out;
}

function entregaNotificacoesV1Mensagem_(appId,apiKey,messageId){
  var url=TACS_ENTREGA_NOTIFICACOES_V1.BASE+encodeURIComponent(messageId)+'?app_id='+encodeURIComponent(appId)+'&outcome_names='+encodeURIComponent('os__click.count,os__confirmed_delivery.count')+'&outcome_time_range=1mo';
  var resp=UrlFetchApp.fetch(url,{method:'get',headers:{Authorization:'Key '+apiKey},muteHttpExceptions:true});
  var code=Number(resp.getResponseCode()),data={};
  try{data=JSON.parse(resp.getContentText()||'{}');}catch(e){}
  if(code<200||code>=300)throw new Error('O OneSignal não liberou o relatório de entrega (HTTP '+code+').');
  return data;
}

function entregaNotificacoesV1MontarItem_(reg,data){
  var successful=entregaNotificacoesV1Numero_(data.successful),failed=entregaNotificacoesV1Numero_(data.failed),errored=entregaNotificacoesV1Numero_(data.errored),received=entregaNotificacoesV1Numero_(data.received),converted=entregaNotificacoesV1Numero_(data.converted),remaining=entregaNotificacoesV1Numero_(data.remaining);
  return {
    eventoId:reg.eventoId,tipo:reg.tipo,referenciaId:reg.referenciaId,titulo:reg.titulo,registradoEm:reg.registradoEm,
    destinatariosRegistrados:reg.destinatarios,
    aceitosPeloServicoPush:successful,
    recebidosConfirmados:received,
    falhas:failed,
    erros:errored,
    abertosOuClicados:converted,
    pendentes:remaining,
    concluido:data.completed_at?true:false,
    plataformas:data.platform_delivery_stats&&typeof data.platform_delivery_stats==='object'?data.platform_delivery_stats:{},
    onesignalRef:reg.onesignalId.slice(-8)
  };
}

function entregaNotificacoesV1Numero_(v){var n=Number(v);return Number.isFinite(n)?n:0;}
function entregaNotificacoesV1ExigirAcesso_(acesso){
  if(acesso&&acesso.perfil==='TACS'){
    if((acesso.permissoes||[]).indexOf('PUBLICACOES_GERENCIAR')===-1)throw new Error('Seu cadastro não possui permissão para consultar entregas.');
    return true;
  }
  tacsTerritorioV1ExigirAdmin_(acesso);return true;
}
function entregaNotificacoesV1PrimeiraPropriedade_(props,nomes){for(var i=0;i<nomes.length;i++){var v=entregaNotificacoesV1Texto_(props.getProperty(nomes[i]));if(v)return v;}return '';}
function entregaNotificacoesV1Texto_(v){return String(v==null?'':v).trim();}
function entregaNotificacoesV1Erro_(e){return e&&e.message?String(e.message):'Não foi possível consultar a entrega das notificações.';}
function entregaNotificacoesV1ValidarRequestId_(v){v=entregaNotificacoesV1Texto_(v);if(!/^[A-Za-z0-9_-]{8,160}$/.test(v))throw new Error('Identificador da consulta inválido.');return v;}
function entregaNotificacoesV1GuardarResultado_(requestId,result){CacheService.getScriptCache().put(TACS_ENTREGA_NOTIFICACOES_V1.RESULT_PREFIX+requestId,JSON.stringify(result),TACS_ENTREGA_NOTIFICACOES_V1.RESULT_SECONDS);}
function entregaNotificacoesV1LerResultado_(requestId){var raw=CacheService.getScriptCache().get(TACS_ENTREGA_NOTIFICACOES_V1.RESULT_PREFIX+requestId);if(!raw)return null;try{return JSON.parse(raw);}catch(e){return null;}}
function entregaNotificacoesV1ResponderJson_(obj,callback){var json=JSON.stringify(obj);if(callback&&/^[A-Za-z_$][A-Za-z0-9_$\.]{0,120}$/.test(callback))return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function entregaNotificacoesV1ResponderPost_(requestId,result){var payload={source:'entrega-notificacoes-tacs-v1',requestId:requestId,result:result};var html='<!doctype html><html><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(payload).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
