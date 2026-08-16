/**
 * ZZZZ_33_MultimunicipioAdminApiV1.gs
 * Portal TACS — API administrativa multi-município V1.0.0
 *
 * Expõe somente ao ADMIN_GERAL a leitura e as mutações da camada
 * Organização → Município → Área. Sessões TACS não conseguem usar estas ações.
 */
var TACS_MULTIMUNICIPIO_ADMIN_API_V1=Object.freeze({
  VERSAO:'1.0.0',
  RESULT_PREFIX:'tacs_multimunicipio_admin_v1_result_',
  RESULT_SECONDS:300
});

var tacsMultimunicipioAdminApiV1DoGetAnterior_;
var tacsMultimunicipioAdminApiV1DoPostAnterior_;
var tacsMultimunicipioAdminApiV1GetAnterior_;
var tacsMultimunicipioAdminApiV1PostAnterior_;

(function instalarTacsMultimunicipioAdminApiV1_(){
  if(typeof doGet==='function'){
    tacsMultimunicipioAdminApiV1DoGetAnterior_=doGet;
    doGet=function(e){
      var resposta=tacsMultimunicipioAdminApiV1TratarGet_(e);
      return resposta||tacsMultimunicipioAdminApiV1DoGetAnterior_(e);
    };
  }
  if(typeof doPost==='function'){
    tacsMultimunicipioAdminApiV1DoPostAnterior_=doPost;
    doPost=function(e){
      var resposta=tacsMultimunicipioAdminApiV1TratarPost_(e);
      return resposta||tacsMultimunicipioAdminApiV1DoPostAnterior_(e);
    };
  }
  if(typeof tratarGetPainelTacs_==='function'){
    tacsMultimunicipioAdminApiV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){
      var resposta=tacsMultimunicipioAdminApiV1TratarGet_(e);
      return resposta||tacsMultimunicipioAdminApiV1GetAnterior_(e);
    };
  }
  if(typeof tratarPostPainelTacs_==='function'){
    tacsMultimunicipioAdminApiV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){
      var resposta=tacsMultimunicipioAdminApiV1TratarPost_(e);
      return resposta||tacsMultimunicipioAdminApiV1PostAnterior_(e);
    };
  }
})();

function tacsMultimunicipioAdminApiV1Texto_(valor){
  return String(valor==null?'':valor).replace(/\s+/g,' ').trim();
}

function tacsMultimunicipioAdminApiV1RequestId_(valor){
  var id=tacsMultimunicipioAdminApiV1Texto_(valor);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da operação multi-município inválido.');
  return id;
}

function tacsMultimunicipioAdminApiV1GuardarResultado_(id,resultado){
  try{
    CacheService.getScriptCache().put(
      TACS_MULTIMUNICIPIO_ADMIN_API_V1.RESULT_PREFIX+id,
      JSON.stringify(resultado),
      TACS_MULTIMUNICIPIO_ADMIN_API_V1.RESULT_SECONDS
    );
  }catch(erro){}
}

function tacsMultimunicipioAdminApiV1LerResultado_(id){
  try{
    var raw=CacheService.getScriptCache().get(TACS_MULTIMUNICIPIO_ADMIN_API_V1.RESULT_PREFIX+id);
    return raw?JSON.parse(raw):null;
  }catch(erro){return null;}
}

function tacsMultimunicipioAdminApiV1ResponderJson_(dados,callback){
  if(typeof tacsTerritorioV1ResponderJson_==='function')return tacsTerritorioV1ResponderJson_(dados,callback);
  var json=JSON.stringify(dados),cb=tacsMultimunicipioAdminApiV1Texto_(callback);
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb)){
    return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function tacsMultimunicipioAdminApiV1ResponderPost_(requestId,resultado){
  var mensagem={source:'admin-multimunicipio-v1',requestId:requestId,result:resultado};
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>'+
    'parent.postMessage('+JSON.stringify(mensagem).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function tacsMultimunicipioAdminApiV1Erro_(erro){
  return tacsMultimunicipioAdminApiV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,700);
}

function tacsMultimunicipioAdminApiV1Payload_(p){
  p=p&&typeof p==='object'?p:{};
  if(p.payload&&typeof p.payload==='object')return p.payload;
  if(p.payload){
    try{return JSON.parse(String(p.payload));}catch(erro){throw new Error('Os dados enviados são inválidos.');}
  }
  return p;
}

function tacsMultimunicipioAdminApiV1Acesso_(p){
  if(typeof tacsTerritorioV1ValidarAcesso_!=='function')throw new Error('A camada territorial não está disponível.');
  var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
  tacsOrganizacoesMunicipiosV1ExigirAdminGeral_(acesso);
  return acesso;
}

function tacsMultimunicipioAdminApiV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=tacsMultimunicipioAdminApiV1Texto_(p.action).toLowerCase();
  if(action!=='admin_multimunicipio_result')return null;
  try{
    var requestId=tacsMultimunicipioAdminApiV1RequestId_(p.requestId);
    var resultado=tacsMultimunicipioAdminApiV1LerResultado_(requestId);
    return tacsMultimunicipioAdminApiV1ResponderJson_({
      ok:true,pendente:!resultado,requestId:requestId,result:resultado||null
    },p.callback);
  }catch(erro){
    return tacsMultimunicipioAdminApiV1ResponderJson_({ok:false,message:tacsMultimunicipioAdminApiV1Erro_(erro)},p.callback);
  }
}

function tacsMultimunicipioAdminApiV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=tacsMultimunicipioAdminApiV1Texto_(p.action).toLowerCase();
  var aceitas=[
    'admin_multimunicipio_dados',
    'admin_multimunicipio_salvar_organizacao',
    'admin_multimunicipio_salvar_municipio',
    'admin_multimunicipio_vincular_area'
  ];
  if(aceitas.indexOf(action)===-1)return null;
  var resultado;
  try{
    var acesso=tacsMultimunicipioAdminApiV1Acesso_(p);
    var body=tacsMultimunicipioAdminApiV1Payload_(p);
    if(action==='admin_multimunicipio_dados'){
      resultado=tacsOrganizacoesMunicipiosV1DadosAdmin_(acesso);
    }else if(action==='admin_multimunicipio_salvar_organizacao'){
      tacsOrganizacoesMunicipiosV1SalvarOrganizacao_(body,acesso);
      resultado=tacsOrganizacoesMunicipiosV1DadosAdmin_(acesso);
      resultado.message='Organização salva e integridade territorial confirmada.';
    }else if(action==='admin_multimunicipio_salvar_municipio'){
      tacsOrganizacoesMunicipiosV1SalvarMunicipio_(body,acesso);
      resultado=tacsOrganizacoesMunicipiosV1DadosAdmin_(acesso);
      resultado.message='Município salvo e integridade territorial confirmada.';
    }else{
      tacsOrganizacoesMunicipiosV1VincularArea_(body.areaId,body.municipioId,acesso);
      resultado=tacsOrganizacoesMunicipiosV1DadosAdmin_(acesso);
      resultado.message='Área vinculada ao município e conferida.';
    }
  }catch(erro){
    resultado={ok:false,message:tacsMultimunicipioAdminApiV1Erro_(erro)};
  }
  var requestId=tacsMultimunicipioAdminApiV1Texto_(p.requestId);
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))tacsMultimunicipioAdminApiV1GuardarResultado_(requestId,resultado);
  return tacsMultimunicipioAdminApiV1ResponderPost_(requestId,resultado);
}
