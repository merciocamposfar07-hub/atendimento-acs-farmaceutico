/**
 * Conecta Saúde Comunitária — Solicitação Assistida V1
 *
 * Via de leitura isolada para ACS/TACS, UBS e administrador autenticados.
 * Não amplia permissões dos demais painéis e não altera o Portal CSC do morador.
 */
var TACS_SOLICITACAO_ASSISTIDA_V1 = Object.freeze({
  VERSAO:'1.0.0',
  RESULT_PREFIX:'tacs_solicitacao_assistida_v1_',
  RESULT_SECONDS:300
});

var solicitacaoAssistidaV1DoGetAnterior_;
var solicitacaoAssistidaV1DoPostAnterior_;

(function instalarSolicitacaoAssistidaV1_(){
  if(typeof doGet==='function'){
    solicitacaoAssistidaV1DoGetAnterior_=doGet;
    doGet=function(e){
      var r=solicitacaoAssistidaV1TratarGet_(e);
      return r||solicitacaoAssistidaV1DoGetAnterior_(e);
    };
  }
  if(typeof doPost==='function'){
    solicitacaoAssistidaV1DoPostAnterior_=doPost;
    doPost=function(e){
      var r=solicitacaoAssistidaV1TratarPost_(e);
      return r||solicitacaoAssistidaV1DoPostAnterior_(e);
    };
  }
})();

function solicitacaoAssistidaV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=solicitacaoAssistidaV1Texto_(p.action).toLowerCase();
  if(action!=='assistida_moradores_result')return null;
  var requestId=solicitacaoAssistidaV1RequestId_(p.requestId);
  var result=solicitacaoAssistidaV1LerResultado_(requestId);
  return moradoresAdminV1ResponderJson_(
    result?{ok:true,pendente:false,requestId:requestId,result:result}:{ok:true,pendente:true,requestId:requestId},
    p.callback
  );
}

function solicitacaoAssistidaV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=solicitacaoAssistidaV1Texto_(p.action).toLowerCase();
  if(action!=='assistida_moradores_buscar')return null;
  var requestId='',result;
  try{
    requestId=solicitacaoAssistidaV1RequestId_(p.requestId);
    var sessao=moradoresAdminV1ValidarSessao_(p);
    var contexto=moradoresAdminV1ResolverContexto_(sessao,p.areaId||p.area||'');
    solicitacaoAssistidaV1Autorizar_(contexto);
    result=moradoresAdminV1Buscar_(p.q||p.busca||'',contexto);
    if(result&&typeof result==='object'){
      result.origem='SOLICITACAO_ASSISTIDA';
      result.perfilAssistente=solicitacaoAssistidaV1Texto_(contexto.perfil);
    }
  }catch(err){
    result={ok:false,message:solicitacaoAssistidaV1Erro_(err)};
  }
  if(requestId)solicitacaoAssistidaV1GuardarResultado_(requestId,result);
  return solicitacaoAssistidaV1ResponderPost_(requestId,result);
}

function solicitacaoAssistidaV1Autorizar_(contexto){
  var perfil=solicitacaoAssistidaV1Texto_(contexto&&contexto.perfil).toUpperCase();
  if(['ADMIN_GERAL','ADMIN_MUNICIPAL','TACS','UBS'].indexOf(perfil)===-1){
    throw new Error('Este perfil não está autorizado a realizar solicitação assistida.');
  }
  if(!contexto||!contexto.areaId||!contexto.unidadeId){
    throw new Error('A área ou a unidade do atendimento assistido não pôde ser confirmada.');
  }
  return true;
}

function solicitacaoAssistidaV1RequestId_(v){
  var id=solicitacaoAssistidaV1Texto_(v);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da solicitação assistida inválido.');
  return id;
}
function solicitacaoAssistidaV1GuardarResultado_(requestId,result){
  try{CacheService.getScriptCache().put(TACS_SOLICITACAO_ASSISTIDA_V1.RESULT_PREFIX+requestId,JSON.stringify(result),TACS_SOLICITACAO_ASSISTIDA_V1.RESULT_SECONDS);}catch(e){}
}
function solicitacaoAssistidaV1LerResultado_(requestId){
  try{var s=CacheService.getScriptCache().get(TACS_SOLICITACAO_ASSISTIDA_V1.RESULT_PREFIX+requestId);return s?JSON.parse(s):null;}catch(e){return null;}
}
function solicitacaoAssistidaV1ResponderPost_(requestId,result){
  var msg={source:'solicitacao-assistida-csc-v1',requestId:requestId,result:result};
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(msg).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function solicitacaoAssistidaV1Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function solicitacaoAssistidaV1Erro_(e){return solicitacaoAssistidaV1Texto_(e&&e.message?e.message:e||'Erro inesperado.').slice(0,500);}
