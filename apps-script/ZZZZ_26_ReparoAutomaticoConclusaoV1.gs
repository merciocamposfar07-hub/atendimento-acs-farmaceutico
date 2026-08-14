/**
 * ZZZZ_26_ReparoAutomaticoConclusaoV1.gs
 * Portal TACS — proteção de conclusão do reparo automático V1.0
 *
 * Garante que uma renovação que altere a Subscription ID continue encerrando
 * somente o reparo originalmente destinado àquele aparelho.
 */
var TACS_REPARO_AUTO_CONCLUSAO_V1 = Object.freeze({VERSAO:'1.0.0'});

var reparoAutoConclusaoV1CheckinAnterior_;
var reparoAutoConclusaoV1EstadoAnterior_;

(function instalarReparoAutoConclusaoV1_(){
  if(typeof saudeNotificacoesV1CheckinPublico_==='function'){
    reparoAutoConclusaoV1CheckinAnterior_=saudeNotificacoesV1CheckinPublico_;
    saudeNotificacoesV1CheckinPublico_=function(p){
      var r=reparoAutoConclusaoV1CheckinAnterior_(p);
      try{reparoAutoConclusaoV1AplicarOriginal_(p,r);}catch(e){}
      return r;
    };
  }
  if(typeof reparoAutoFeedbackV1TratarPost_==='function'){
    reparoAutoConclusaoV1EstadoAnterior_=reparoAutoFeedbackV1TratarPost_;
    reparoAutoFeedbackV1TratarPost_=function(e){
      var p=e&&e.parameter?e.parameter:{};
      if(reparoAutoConclusaoV1Texto_(p.action).toLowerCase()==='publico_notificacao_reparo_estado'){
        var erro=reparoAutoConclusaoV1ValidarEstado_(p);
        if(erro)return reparoAutoConclusaoV1Responder_({ok:false,message:erro});
      }
      return reparoAutoConclusaoV1EstadoAnterior_(e);
    };
  }
})();

function reparoAutoConclusaoV1ValidarEstado_(p){
  var reparoId=reparoAutoConclusaoV1Texto_(p.reparoId);
  if(!reparoId)return 'Identificador do reparo não informado.';
  var subscriptionId=reparoAutoConclusaoV1Texto_(p.subscriptionId||p.subscription_id).toLowerCase();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(subscriptionId))return 'A inscrição original do reparo é inválida.';
  var areaId=moradoresAdminV1NormalizarAreaId_(p.areaId||p.area||'JAPARANDUBA');
  var alvo=reparoAutoFeedbackV1UltimoAlvo_(areaId,subscriptionId);
  if(!alvo||alvo.reparoId!==reparoId)return 'Este reparo não corresponde à inscrição original deste aparelho.';
  return '';
}

function reparoAutoConclusaoV1AplicarOriginal_(p,r){
  if(!r||r.ok!==true)return;
  var reparoId=reparoAutoConclusaoV1Texto_(p&&p.reparoAplicado||p&&p.reparo_id_aplicado);
  var original=reparoAutoConclusaoV1Texto_(p&&p.reparoSubscriptionOriginal||p&&p.reparo_subscription_original).toLowerCase();
  if(!reparoId||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(original))return;
  var areaId=moradoresAdminV1NormalizarAreaId_(p&&p.areaId||p&&p.area||r.areaId||'JAPARANDUBA');
  var alvo=reparoAutoFeedbackV1UltimoAlvo_(areaId,original);
  if(!alvo||alvo.reparoId!==reparoId)return;
  reparoAutoConclusaoV1MarcarRegistro_(areaId,original,reparoId);
}

function reparoAutoConclusaoV1MarcarRegistro_(areaId,subscriptionId,reparoId){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);
  var last=sheet.getLastRow();if(last<=1)return false;
  var rows=sheet.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues();
  var linha=0;
  for(var i=rows.length-1;i>=0;i--){
    if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==areaId)continue;
    if(reparoAutoConclusaoV1Texto_(rows[i][0]).toLowerCase()!==subscriptionId)continue;
    linha=i+2;break;
  }
  if(!linha)return false;
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))return false;
  try{
    sheet.getRange(linha,14).setValue(reparoId);
    sheet.getRange(linha,16).setValue(Utilities.formatDate(new Date(),'America/Recife','yyyy-MM-dd HH:mm:ss'));
    return true;
  }finally{lock.releaseLock();}
}

function reparoAutoConclusaoV1Responder_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function reparoAutoConclusaoV1Texto_(v){return String(v==null?'':v).trim();}
