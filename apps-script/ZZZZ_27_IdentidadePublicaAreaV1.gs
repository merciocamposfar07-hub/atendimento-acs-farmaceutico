/**
 * ZZZZ_27_IdentidadePublicaAreaV1.gs
 * Portal TACS — identidade pública territorial V1.0.0
 *
 * Expõe somente os dados necessários para personalizar visualmente o Portal
 * do Morador conforme a área ativa. Não devolve CNS, CPF, telefone, e-mail,
 * PIN, hashes, IDs internos do profissional nem dados de moradores.
 */
var TACS_IDENTIDADE_PUBLICA_AREA_V1 = Object.freeze({
  VERSAO:'1.0.0',
  DEFAULT_AREA_ID:'JAPARANDUBA',
  DEFAULT_AREA_NOME:'Sítio Japaranduba',
  DEFAULT_UNIDADE_NOME:'Unidade de Saúde Posto Matias',
  DEFAULT_TACS_NOME:'Mércio José Campos dos Santos'
});

var identidadePublicaAreaV1DoGetAnterior_;
var identidadePublicaAreaV1GetAnterior_;

(function instalarIdentidadePublicaAreaV1_(){
  if(typeof doGet==='function'){
    identidadePublicaAreaV1DoGetAnterior_=doGet;
    doGet=function(e){
      var resposta=identidadePublicaAreaV1TratarGet_(e);
      return resposta||identidadePublicaAreaV1DoGetAnterior_(e);
    };
  }
  if(typeof tratarGetPainelTacs_==='function'){
    identidadePublicaAreaV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){
      var resposta=identidadePublicaAreaV1TratarGet_(e);
      return resposta||identidadePublicaAreaV1GetAnterior_(e);
    };
  }
})();

function identidadePublicaAreaV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=identidadePublicaAreaV1Texto_(p.action).toLowerCase();
  if(action!=='publico_identidade_area')return null;
  var resultado;
  try{
    resultado=identidadePublicaAreaV1Dados_(p.areaId||p.area||'');
  }catch(erro){
    resultado={ok:false,message:'Não foi possível carregar a identificação desta área agora.'};
  }
  return identidadePublicaAreaV1Responder_(resultado,p.callback);
}

function identidadePublicaAreaV1Dados_(areaSolicitada){
  if(typeof tacsTerritorioV1EncontrarArea_!=='function'||typeof tacsTerritorioV1EncontrarTacs_!=='function'){
    throw new Error('Cadastro territorial indisponível.');
  }
  var areaId=typeof tacsTerritorioV1Id_==='function'
    ?tacsTerritorioV1Id_(areaSolicitada||TACS_IDENTIDADE_PUBLICA_AREA_V1.DEFAULT_AREA_ID)
    :identidadePublicaAreaV1Id_(areaSolicitada||TACS_IDENTIDADE_PUBLICA_AREA_V1.DEFAULT_AREA_ID);
  if(!areaId)areaId=TACS_IDENTIDADE_PUBLICA_AREA_V1.DEFAULT_AREA_ID;
  var area=tacsTerritorioV1EncontrarArea_(areaId);
  if(!area||area.ativa!==true)throw new Error('Área indisponível.');

  var tacs=area.tacsId?tacsTerritorioV1EncontrarTacs_(area.tacsId):null;
  var areaNome=identidadePublicaAreaV1Texto_(area.areaNome);
  var unidadeNome=identidadePublicaAreaV1Texto_(area.unidadeNome);
  var tacsNome=tacs&&tacs.ativo===true?identidadePublicaAreaV1Texto_(tacs.nomeCompleto):'';

  if(areaId===TACS_IDENTIDADE_PUBLICA_AREA_V1.DEFAULT_AREA_ID){
    if(!areaNome)areaNome=TACS_IDENTIDADE_PUBLICA_AREA_V1.DEFAULT_AREA_NOME;
    if(!unidadeNome||identidadePublicaAreaV1Id_(unidadeNome)===identidadePublicaAreaV1Id_(area.unidadeId))unidadeNome=TACS_IDENTIDADE_PUBLICA_AREA_V1.DEFAULT_UNIDADE_NOME;
    if(!tacsNome)tacsNome=TACS_IDENTIDADE_PUBLICA_AREA_V1.DEFAULT_TACS_NOME;
  }
  if(!areaNome||!unidadeNome||!tacsNome)throw new Error('Identidade territorial incompleta.');

  return {
    ok:true,
    versao:TACS_IDENTIDADE_PUBLICA_AREA_V1.VERSAO,
    areaId:areaId,
    areaNome:areaNome,
    unidadeNome:unidadeNome,
    tacsNome:tacsNome
  };
}

function identidadePublicaAreaV1Responder_(dados,callback){
  var json=JSON.stringify(dados),cb=identidadePublicaAreaV1Texto_(callback);
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb)){
    return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function identidadePublicaAreaV1Id_(valor){
  var texto=identidadePublicaAreaV1Texto_(valor).toUpperCase();
  if(texto.normalize)texto=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return texto.replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
}
function identidadePublicaAreaV1Texto_(valor){return String(valor==null?'':valor).replace(/\s+/g,' ').trim();}
