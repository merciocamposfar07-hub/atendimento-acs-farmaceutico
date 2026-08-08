/**
 * ZZZZ_14_NotificacoesPushPortalV1.gs
 *
 * Subsistema isolado de notificações do Portal TACS.
 *
 * Regras:
 * - não altera agenda, odontologia, moradores, recados ou campanhas;
 * - recebe somente a ação administrativa `admin_publicar_notificacao`;
 * - exige sessão administrativa válida;
 * - lê a chave do OneSignal em Script Properties;
 * - nunca expõe a chave ao GitHub Pages;
 * - falha de push não desfaz nem altera conteúdo já publicado;
 * - usa idempotência e deduplicação curta para evitar envio repetido.
 */
var TACS_PUSH_PORTAL_V1 = Object.freeze({
  VERSAO: '1.0.0',
  APP_ID: 'e2294b98-c72b-4f8c-a055-de28979676dc',
  API_KEY_PROPERTY: 'ONESIGNAL_APP_API_KEY',
  ENDPOINT: 'https://api.onesignal.com/notifications',
  PORTAL_URL: 'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/',
  RESULT_PREFIX: 'tacs_push_v1_result_',
  DEDUPE_PREFIX: 'tacs_push_v1_sent_',
  RESULT_SECONDS: 300,
  DEDUPE_SECONDS: 600
});

var tacsPushV1DoGetAnterior_;
var tacsPushV1DoPostAnterior_;
var tacsPushV1GetAnterior_;
var tacsPushV1PostAnterior_;

(function instalarTacsPushPortalV1_(){
  if(typeof doGet==='function'){
    tacsPushV1DoGetAnterior_=doGet;
    doGet=function(e){
      var resposta=tacsPushV1TratarGet_(e);
      return resposta||tacsPushV1DoGetAnterior_(e);
    };
  }
  if(typeof doPost==='function'){
    tacsPushV1DoPostAnterior_=doPost;
    doPost=function(e){
      var resposta=tacsPushV1TratarPost_(e);
      return resposta||tacsPushV1DoPostAnterior_(e);
    };
  }
  if(typeof tratarGetPainelTacs_==='function'){
    tacsPushV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){
      var resposta=tacsPushV1TratarGet_(e);
      return resposta||tacsPushV1GetAnterior_(e);
    };
  }
  if(typeof tratarPostPainelTacs_==='function'){
    tacsPushV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){
      var resposta=tacsPushV1TratarPost_(e);
      return resposta||tacsPushV1PostAnterior_(e);
    };
  }
})();

function tacsPushV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  if(String(p.action||'').trim()!=='admin_result')return null;
  var requestId=String(p.requestId||'').trim();
  var resultado=tacsPushV1LerResultado_(requestId);
  if(!resultado)return null;
  return tacsPushV1ResponderJson_({ok:true,pendente:false,requestId:requestId,result:resultado},p.callback);
}

function tacsPushV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  if(String(p.action||'').trim()!=='admin_publicar_notificacao')return null;

  var requestId=String(p.requestId||'').trim();
  var resultado;
  try{
    requestId=tacsPushV1ValidarRequestId_(requestId);
    tacsPushV1ValidarSessao_(p);
    resultado=tacsPushV1Publicar_(p);
  }catch(erro){
    resultado={ok:false,push:false,message:erro&&erro.message?erro.message:String(erro)};
  }
  tacsPushV1GuardarResultado_(requestId,resultado);
  return tacsPushV1ResponderPost_(requestId,resultado);
}

function tacsPushV1Publicar_(p){
  var tipo=tacsPushV1Texto_(p.tipo).toLowerCase();
  var origemId=tacsPushV1Texto_(p.id);
  var titulo=tacsPushV1Texto_(p.titulo);
  var mensagem=tacsPushV1Texto_(p.mensagem);
  var ativo=tacsPushV1Booleano_(p.ativo);

  if(['recado','campanha'].indexOf(tipo)===-1)throw new Error('Tipo de publicação inválido para notificação.');
  if(!origemId)throw new Error('Identificador da publicação ausente.');
  if(!titulo||!mensagem)throw new Error('Título e mensagem são obrigatórios para o push.');
  if(!ativo)return {ok:true,push:false,skipped:true,reason:'inactive',message:'Conteúdo inativo: notificação não enviada.'};

  titulo=titulo.slice(0,120);
  mensagem=mensagem.slice(0,800);
  var fingerprint=tacsPushV1Fingerprint_([tipo,origemId,titulo,mensagem,tacsPushV1Texto_(p.meta)].join('|'));
  var cache=CacheService.getScriptCache();
  if(cache.get(TACS_PUSH_PORTAL_V1.DEDUPE_PREFIX+fingerprint)){
    return {ok:true,push:false,skipped:true,reason:'duplicate',message:'Esta mesma publicação já gerou uma notificação recentemente.'};
  }

  var apiKey=tacsPushV1Texto_(PropertiesService.getScriptProperties().getProperty(TACS_PUSH_PORTAL_V1.API_KEY_PROPERTY));
  if(!apiKey){
    return {ok:false,push:false,code:'PUSH_NOT_CONFIGURED',message:'A chave privada do OneSignal ainda não foi configurada no Apps Script.'};
  }

  var heading=tipo==='campanha'?'Campanha da Unidade de Saúde':'Recado da Unidade de Saúde';
  var idempotencyKey=Utilities.getUuid();
  var payload={
    app_id:TACS_PUSH_PORTAL_V1.APP_ID,
    target_channel:'push',
    included_segments:['Subscribed Users'],
    headings:{en:heading,pt:heading},
    contents:{en:titulo+' — '+mensagem,pt:titulo+' — '+mensagem},
    url:TACS_PUSH_PORTAL_V1.PORTAL_URL,
    data:{source:'portal-tacs',tipo:tipo,id:origemId},
    idempotency_key:idempotencyKey
  };

  var resposta=tacsPushV1EnviarOneSignal_(apiKey,payload);
  if(resposta.ok){
    cache.put(TACS_PUSH_PORTAL_V1.DEDUPE_PREFIX+fingerprint,'1',TACS_PUSH_PORTAL_V1.DEDUPE_SECONDS);
  }
  return resposta;
}

function tacsPushV1EnviarOneSignal_(apiKey,payload){
  var ultimo=null;
  for(var tentativa=1;tentativa<=2;tentativa+=1){
    var resposta=UrlFetchApp.fetch(TACS_PUSH_PORTAL_V1.ENDPOINT,{
      method:'post',
      contentType:'application/json',
      headers:{Authorization:'Key '+apiKey},
      payload:JSON.stringify(payload),
      muteHttpExceptions:true
    });
    var status=Number(resposta.getResponseCode());
    var texto=String(resposta.getContentText()||'');
    var corpo={};
    try{corpo=texto?JSON.parse(texto):{}}catch(erro){corpo={raw:texto.slice(0,500)}}
    ultimo={status:status,body:corpo};

    if(status>=200&&status<300){
      if(corpo&&corpo.id){
        return {ok:true,push:true,messageId:String(corpo.id),recipients:Number(corpo.recipients||0),message:'Notificação criada no OneSignal.'};
      }
      return {ok:true,push:false,skipped:true,reason:'no-targets',recipients:Number(corpo&&corpo.recipients||0),message:'Nenhum aparelho inscrito foi encontrado para esta notificação.'};
    }
    if(!(status===429||status>=500)||tentativa===2)break;
    Utilities.sleep(350);
  }
  var detalhe=ultimo&&ultimo.body&&(ultimo.body.errors||ultimo.body.error||ultimo.body.message);
  if(Array.isArray(detalhe))detalhe=detalhe.join('; ');
  throw new Error('Falha ao enviar a notificação'+(detalhe?': '+String(detalhe).slice(0,300):'.'));
}

function tacsPushV1ValidarSessao_(p){
  if(typeof profissionaisDinamicosV1ValidarSessao_==='function'){
    return profissionaisDinamicosV1ValidarSessao_(p);
  }
  var token=tacsPushV1Texto_(p.token),dispositivo=tacsPushV1Texto_(p.dispositivo);
  if(!token||!dispositivo)throw new Error('Sessão administrativa ausente. Entre novamente com o PIN.');

  var rotaPost=typeof tacsPushV1DoPostAnterior_==='function'?tacsPushV1DoPostAnterior_:tacsPushV1PostAnterior_;
  var rotaGet=typeof tacsPushV1DoGetAnterior_==='function'?tacsPushV1DoGetAnterior_:tacsPushV1GetAnterior_;
  if(typeof rotaPost!=='function'||typeof rotaGet!=='function')throw new Error('Não foi possível validar a sessão administrativa.');

  var requestId='push_auth_'+Utilities.getUuid().replace(/-/g,'');
  rotaPost(tacsPushV1Evento_({action:'admin_dados',token:token,dispositivo:dispositivo,requestId:requestId}));
  var envelope=null;
  for(var tentativa=0;tentativa<20;tentativa+=1){
    envelope=tacsPushV1ConteudoResposta_(rotaGet(tacsPushV1Evento_({action:'admin_result',requestId:requestId,callback:''})));
    if(envelope&&envelope.ok===true&&envelope.pendente===false)break;
    Utilities.sleep(150);
  }
  if(!envelope||envelope.ok!==true||envelope.pendente!==false||!envelope.result||envelope.result.ok!==true){
    throw new Error(envelope&&envelope.result&&envelope.result.message||'Sessão administrativa inválida ou expirada.');
  }
  return envelope.result;
}

function tacsPushV1ValidarRequestId_(valor){
  var id=tacsPushV1Texto_(valor);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da operação de push inválido.');
  return id;
}
function tacsPushV1GuardarResultado_(id,resultado){
  try{CacheService.getScriptCache().put(TACS_PUSH_PORTAL_V1.RESULT_PREFIX+id,JSON.stringify(resultado),TACS_PUSH_PORTAL_V1.RESULT_SECONDS)}catch(erro){}
}
function tacsPushV1LerResultado_(id){
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(String(id||'')))return null;
  try{var texto=CacheService.getScriptCache().get(TACS_PUSH_PORTAL_V1.RESULT_PREFIX+id);return texto?JSON.parse(texto):null}catch(erro){return null}
}
function tacsPushV1ResponderPost_(requestId,resultado){
  var mensagem={source:'admin-painel-tacs-v1',requestId:requestId,result:resultado};
  var saida=HtmlService.createHtmlOutput('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(mensagem).replace(/</g,'\\u003c')+',"*");<\/script></body></html>');
  return saida.setXFrameOptionsMode?saida.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL):saida;
}
function tacsPushV1ResponderJson_(dados,callback){
  var json=JSON.stringify(dados);
  if(callback&&/^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(callback))return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
function tacsPushV1Evento_(parametros){
  var lista={};Object.keys(parametros||{}).forEach(function(k){lista[k]=[String(parametros[k]==null?'':parametros[k])]});
  return {parameter:parametros||{},parameters:lista,postData:{type:'application/x-www-form-urlencoded',contents:''}};
}
function tacsPushV1ConteudoResposta_(resposta){
  if(!resposta)return null;var conteudo=typeof resposta.getContent==='function'?resposta.getContent():String(resposta||'');
  try{return JSON.parse(conteudo)}catch(erro){return null}
}
function tacsPushV1Fingerprint_(valor){
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(valor),Utilities.Charset.UTF_8);
  return bytes.map(function(byte){var n=byte<0?byte+256:byte;return('0'+n.toString(16)).slice(-2)}).join('').slice(0,40);
}
function tacsPushV1Booleano_(valor){
  if(valor===true||valor===1)return true;
  return ['TRUE','1','SIM','YES','ATIVO','ATIVA','VERDADEIRO'].indexOf(tacsPushV1Texto_(valor).toUpperCase())!==-1;
}
function tacsPushV1Texto_(valor){return String(valor==null?'':valor).trim()}

/** Diagnóstico sem envio. */
function testarConfiguracaoNotificacoesPushPortalV1(){
  var chave=String(PropertiesService.getScriptProperties().getProperty(TACS_PUSH_PORTAL_V1.API_KEY_PROPERTY)||'').trim();
  var resultado={ok:Boolean(chave),versao:TACS_PUSH_PORTAL_V1.VERSAO,appId:TACS_PUSH_PORTAL_V1.APP_ID,chaveConfigurada:Boolean(chave),endpoint:TACS_PUSH_PORTAL_V1.ENDPOINT,nenhumEnvioRealizado:true};
  console.log(JSON.stringify(resultado));
  return resultado;
}
