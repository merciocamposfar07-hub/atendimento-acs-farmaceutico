/**
 * ZZZZ_19_NotificacoesSegmentadasV1.gs
 * Portal TACS — envio de notificações segmentadas por área V1.0.0
 *
 * A área e a tag são resolvidas no servidor. O navegador não pode fornecer um
 * filtro livre. Quando houver mais de uma área ativa, o envio é bloqueado se a
 * chave privada do OneSignal não estiver configurada, evitando vazamento entre
 * áreas. Repetir uma publicação cria um novo evento; repetir a mesma requisição
 * não envia duas vezes.
 */
var TACS_NOTIFICACOES_AREA_V1 = Object.freeze({
  VERSAO:'1.0.0',
  DEFAULT_AREA_ID:'JAPARANDUBA',
  DEFAULT_APP_ID:'4bead971-106d-461b-853f-83aecbd62d40',
  MAINTENANCE_TITLE:'PORTAL EM MANUTENÇÃO',
  MAINTENANCE_MESSAGE:'O Portal TACS está temporariamente em manutenção. Aguarde a liberação para fazer novas solicitações.',
  APP_ID_PROPERTIES:Object.freeze(['TACS_ONESIGNAL_APP_ID','ONESIGNAL_APP_ID']),
  API_KEY_PROPERTIES:Object.freeze(['TACS_ONESIGNAL_API_KEY','ONESIGNAL_REST_API_KEY','ONESIGNAL_API_KEY']),
  ENDPOINT:'https://api.onesignal.com/notifications',
  PORTAL_URL:'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/',
  AUDIT_SHEET:'TACS_AUDIT_NOTIFICACOES',
  AUDIT_HEADERS:Object.freeze([
    'EVENTO_ID','AREA_ID','TIPO','REFERENCIA_ID','TITULO','OPERADOR_ID','ONESIGNAL_ID',
    'DESTINATARIOS','RESULTADO','REGISTRADO_EM'
  ]),
  RESULT_PREFIX:'tacs_notificacao_area_v1_result_',
  RESULT_SECONDS:300,
  IDEMPOTENCY_PREFIX:'tacs_notificacao_area_v1_evento_'
});

var notificacoesAreaV1DoPostAnterior_;
var notificacoesAreaV1PostAnterior_;

(function instalarNotificacoesAreaV1_(){
  if(typeof doPost==='function'){
    notificacoesAreaV1DoPostAnterior_=doPost;
    doPost=function(e){var r=notificacoesAreaV1TratarPost_(e);return r||notificacoesAreaV1DoPostAnterior_(e);};
  }
  if(typeof tratarPostPainelTacs_==='function'){
    notificacoesAreaV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){var r=notificacoesAreaV1TratarPost_(e);return r||notificacoesAreaV1PostAnterior_(e);};
  }
})();

function notificacoesAreaV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  if(notificacoesAreaV1Texto_(p.action).toLowerCase()!=='admin_publicar_notificacao')return null;

  var props=PropertiesService.getScriptProperties();
  var appId=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.APP_ID_PROPERTIES)||TACS_NOTIFICACOES_AREA_V1.DEFAULT_APP_ID;
  var apiKey=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.API_KEY_PROPERTIES);
  var quantidadeAreas=notificacoesAreaV1QuantidadeAreas_();

  // Mantém o emissor antigo apenas enquanto existe uma única área. Com duas ou
  // mais áreas, delegar sem filtro seria inseguro e é expressamente bloqueado.
  if(!apiKey&&quantidadeAreas<=1)return null;

  var requestId=notificacoesAreaV1Texto_(p.requestId);
  var resultado;
  try{
    requestId=notificacoesAreaV1ValidarRequestId_(requestId);
    if(!apiKey)throw new Error('A chave privada do OneSignal precisa ser configurada antes de enviar para múltiplas áreas.');
    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
    tacsTerritorioV1ExigirAdmin_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');
    var titulo=notificacoesAreaV1Texto_(p.titulo).slice(0,120);
    var mensagem=notificacoesAreaV1Texto_(p.mensagem).slice(0,1000);
    var tipo=notificacoesAreaV1Texto_(p.tipo||'recado').toUpperCase();
    var referencia=notificacoesAreaV1Texto_(p.id).slice(0,160);
    var evento=notificacoesAreaV1Texto_(p.eventoPublicacao||requestId);
    var comunicadoManutencao=
      notificacoesAreaV1Booleano_(p.comunicadoManutencao)&&
      titulo===TACS_NOTIFICACOES_AREA_V1.MAINTENANCE_TITLE&&
      mensagem===TACS_NOTIFICACOES_AREA_V1.MAINTENANCE_MESSAGE;
    if(!titulo||!mensagem)throw new Error('Título e mensagem são obrigatórios para enviar a notificação.');
    if(!notificacoesAreaV1Booleano_(p.ativo)){
      resultado={ok:true,skipped:true,push:false,areaId:contexto.areaId,message:'A publicação está inativa; nenhuma notificação foi enviada.'};
    }else{
      resultado=notificacoesAreaV1Enviar_(appId,apiKey,contexto,acesso,{
        titulo:titulo,mensagem:mensagem,tipo:tipo,referencia:referencia,evento:evento,
        manutencao:comunicadoManutencao
      });
    }
  }catch(erro){resultado={ok:false,message:notificacoesAreaV1Erro_(erro)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))notificacoesAreaV1GuardarResultado_(requestId,resultado);
  return notificacoesAreaV1ResponderPost_(requestId,resultado);
}

function notificacoesAreaV1Enviar_(appId,apiKey,contexto,acesso,input){
  if(typeof portalManutencaoV1Estado_==='function'){
    var manutencao=portalManutencaoV1Estado_(contexto.areaId);
    if(manutencao.ativa&&!input.manutencao){
      return {ok:true,skipped:true,push:false,maintenance:true,areaId:contexto.areaId,message:'Portal em manutenção: conteúdo salvo sem notificar os moradores.'};
    }
  }
  var chave=TACS_NOTIFICACOES_AREA_V1.IDEMPOTENCY_PREFIX+moradoresAdminV1Hash_(contexto.areaId+'|'+input.evento);
  var cache=CacheService.getScriptCache();
  var anterior=cache.get(chave);
  if(anterior){
    try{return JSON.parse(anterior);}catch(erroCache){}
  }
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(15000))throw new Error('Outro envio está sendo processado. Tente novamente.');
  try{
    anterior=cache.get(chave);
    if(anterior){try{return JSON.parse(anterior);}catch(erroCache2){}}
    var payload={
      app_id:appId,
      target_channel:'push',
      headings:{pt:input.titulo,en:input.titulo},
      contents:{pt:input.mensagem,en:input.mensagem},
      filters:[{field:'tag',key:'area_tacs',relation:'=',value:contexto.areaId}],
      url:TACS_NOTIFICACOES_AREA_V1.PORTAL_URL,
      data:{areaId:contexto.areaId,tipo:input.tipo,referenciaId:input.referencia,evento:input.evento}
    };
    var resposta=UrlFetchApp.fetch(TACS_NOTIFICACOES_AREA_V1.ENDPOINT,{
      method:'post',contentType:'application/json',payload:JSON.stringify(payload),
      headers:{Authorization:'Key '+apiKey},muteHttpExceptions:true
    });
    var code=Number(resposta.getResponseCode());
    var texto=resposta.getContentText();
    var data={};try{data=JSON.parse(texto||'{}');}catch(erroJson){}
    if(code<200||code>=300||!data.id){
      var detalhe=data&&data.errors?JSON.stringify(data.errors):('HTTP '+code);
      notificacoesAreaV1Auditar_(contexto,acesso,input,'',0,'ERRO:'+detalhe);
      throw new Error('O OneSignal recusou o envio segmentado: '+detalhe);
    }
    var resultado={
      ok:true,push:true,skipped:false,areaId:contexto.areaId,
      filtro:{campo:'area_tacs',valor:contexto.areaId},onesignalId:String(data.id),
      destinatarios:Number(data.recipients||0),message:'Notificação enviada somente para a área '+contexto.areaNome+'.'
    };
    cache.put(chave,JSON.stringify(resultado),TACS_NOTIFICACOES_AREA_V1.RESULT_SECONDS);
    notificacoesAreaV1Auditar_(contexto,acesso,input,resultado.onesignalId,resultado.destinatarios,'ENVIADA');
    return resultado;
  }finally{lock.releaseLock();}
}

function notificacoesAreaV1QuantidadeAreas_(){
  try{return moradoresAdminV1CatalogoAreas_().length;}catch(erro){return 1;}
}

function notificacoesAreaV1Auditar_(contexto,acesso,input,onesignalId,destinatarios,resultado){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.AUDIT_SHEET);
  if(!sheet)sheet=ss.insertSheet(TACS_NOTIFICACOES_AREA_V1.AUDIT_SHEET);
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.length).setValues([TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.slice()]);sheet.setFrozenRows(1);}
  var atual=sheet.getRange(1,1,1,TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.length).getDisplayValues()[0];
  if(TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.some(function(v,i){return atual[i]!==v;}))throw new Error('A auditoria de notificações possui estrutura diferente.');
  sheet.appendRow([
    input.evento,contexto.areaId,input.tipo,input.referencia,input.titulo,
    acesso.operadorId||'ADMIN_GERAL',onesignalId,destinatarios,resultado,new Date()
  ]);
  sheet.getRange(sheet.getLastRow(),10).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function notificacoesAreaV1PrimeiraPropriedade_(props,nomes){
  for(var i=0;i<nomes.length;i++){var valor=notificacoesAreaV1Texto_(props.getProperty(nomes[i]));if(valor)return valor;}
  return '';
}
function notificacoesAreaV1Booleano_(valor){return valor===true||['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(notificacoesAreaV1Texto_(valor).toUpperCase())!==-1;}
function notificacoesAreaV1Texto_(valor){return String(valor==null?'':valor).replace(/\s+/g,' ').trim();}
function notificacoesAreaV1ValidarRequestId_(valor){var id=notificacoesAreaV1Texto_(valor);if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da notificação inválido.');return id;}
function notificacoesAreaV1GuardarResultado_(id,r){try{CacheService.getScriptCache().put(TACS_NOTIFICACOES_AREA_V1.RESULT_PREFIX+id,JSON.stringify(r),TACS_NOTIFICACOES_AREA_V1.RESULT_SECONDS);}catch(erro){}}
function notificacoesAreaV1ResponderPost_(requestId,resultado){var msg={source:'notificacoes-area-tacs-v1',requestId:requestId,result:resultado};var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(msg).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function notificacoesAreaV1Erro_(erro){return notificacoesAreaV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,700);}
