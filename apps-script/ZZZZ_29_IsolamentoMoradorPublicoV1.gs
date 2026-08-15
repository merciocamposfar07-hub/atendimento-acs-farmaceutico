/*
 * Portal TACS — isolamento territorial da consulta pública de moradores V1.0.0
 * Falha fechada: a consulta pública só ocorre com areaId explícito e a resposta
 * precisa confirmar exatamente a mesma área.
 */
var TACS_MORADORES_PUBLICO_TERRITORIAL_V1=Object.freeze({VERSAO:'1.0.0'});
var moradoresPublicoTerritorialV1BuscarAnterior_=
  typeof moradoresAdminV1BuscarPublico_==='function'?moradoresAdminV1BuscarPublico_:null;

function moradoresPublicoTerritorialV1Area_(valor){
  if(typeof moradoresAdminV1NormalizarAreaId_==='function'){
    return moradoresAdminV1NormalizarAreaId_(valor);
  }
  var area=String(valor==null?'':valor).trim().toUpperCase();
  if(area.normalize)area=area.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return area.replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
}

function moradoresPublicoTerritorialV1Negar_(codigo,mensagem){
  return {ok:false,encontrado:false,code:codigo,message:mensagem};
}

if(moradoresPublicoTerritorialV1BuscarAnterior_){
  moradoresAdminV1BuscarPublico_=function(documento,areaSolicitada){
    var area=moradoresPublicoTerritorialV1Area_(areaSolicitada);
    if(!area){
      return moradoresPublicoTerritorialV1Negar_(
        'AREA_REQUIRED',
        'Área do atendimento não informada. Atualize o portal e tente novamente.'
      );
    }
    var resultado=moradoresPublicoTerritorialV1BuscarAnterior_(documento,area);
    if(resultado&&resultado.ok===true&&resultado.encontrado===true){
      var retornada=moradoresPublicoTerritorialV1Area_(resultado.morador&&resultado.morador.areaId);
      if(!retornada||retornada!==area){
        return moradoresPublicoTerritorialV1Negar_(
          'AREA_MISMATCH',
          'Cadastro bloqueado por divergência territorial. Procure seu TACS.'
        );
      }
    }
    return resultado;
  };
}
