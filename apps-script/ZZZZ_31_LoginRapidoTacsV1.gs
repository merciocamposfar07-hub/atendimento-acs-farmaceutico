/**
 * ZZZZ_31_LoginRapidoTacsV1.gs
 * Portal TACS — acesso rápido do TACS por PIN no aparelho já identificado V1.1.0
 *
 * Regras:
 * - o CNS continua obrigatório no cadastro do TACS e no primeiro acesso de cada aparelho;
 * - depois do primeiro acesso válido, o aparelho recebe uma chave rápida assinada e vinculada
 *   ao TACS + identificador local do aparelho;
 * - acessos seguintes usam somente PIN + chave rápida do aparelho;
 * - a chave rápida não substitui o PIN e não concede acesso se o TACS/área estiver inativo;
 * - trocar de aparelho ou apagar os dados locais exige CNS + PIN uma vez novamente;
 * - a ativação da chave rápida funciona mesmo se outro módulo interceptar primeiro o login CNS+PIN.
 */
var TACS_LOGIN_RAPIDO_V1=Object.freeze({
  VERSAO:'1.1.0',
  PREFIXO:'qt1'
});

var tacsLoginRapidoV1DoPostAnterior_;
(function instalarTacsLoginRapidoV1_(){
  if(typeof doPost!=='function')return;
  tacsLoginRapidoV1DoPostAnterior_=doPost;
  doPost=function(e){
    var p=e&&e.parameter?e.parameter:{};
    var action=String(p.action==null?'':p.action).trim().toLowerCase();
    if(action==='admin_territorio_login_tacs'&&typeof tacsTerritorioV1LoginTacs_==='function'){
      return tacsLoginRapidoV1Responder_(p,function(){
        var resultado=tacsTerritorioV1LoginTacs_(p);
        if(resultado&&resultado.ok===true&&resultado.tacsId){
          resultado.quickKey=tacsLoginRapidoV1CriarChave_(resultado.tacsId,p.dispositivo);
          resultado.acessoRapido=true;
        }
        return resultado;
      });
    }
    if(action==='admin_territorio_criar_chave_rapida'){
      return tacsLoginRapidoV1Responder_(p,function(){return tacsLoginRapidoV1CriarParaSessao_(p);});
    }
    if(action==='admin_territorio_login_pin'){
      return tacsLoginRapidoV1Responder_(p,function(){return tacsLoginRapidoV1EntrarPorPin_(p);});
    }
    return tacsLoginRapidoV1DoPostAnterior_(e);
  };
})();

function tacsLoginRapidoV1Responder_(p,executar){
  var requestId=String(p&&p.requestId==null?'':p.requestId).trim();
  var resultado;
  try{
    resultado=executar();
  }catch(erro){
    resultado={ok:false,message:typeof tacsTerritorioV1Erro_==='function'
      ?tacsTerritorioV1Erro_(erro)
      :String(erro&&erro.message?erro.message:erro||'Erro inesperado.')};
  }
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId)&&typeof tacsTerritorioV1GuardarResultado_==='function'){
    tacsTerritorioV1GuardarResultado_(requestId,resultado);
  }
  if(typeof tacsTerritorioV1ResponderPost_==='function'){
    return tacsTerritorioV1ResponderPost_(requestId,resultado);
  }
  return tacsLoginRapidoV1DoPostAnterior_({parameter:p});
}

function tacsLoginRapidoV1CriarParaSessao_(p){
  var dispositivo=tacsTerritorioV1Texto_(p.dispositivo);
  if(!dispositivo)throw new Error('Identificação do aparelho ausente.');
  var acesso=tacsTerritorioV1ValidarSessaoToken_(p,false);
  if(!acesso||acesso.perfil!=='TACS'||!acesso.tacsId)throw new Error('A sessão do TACS não está válida para ativar o acesso rápido.');
  var tacs=tacsTerritorioV1EncontrarTacs_(acesso.tacsId);
  var area=tacs&&tacsTerritorioV1EncontrarArea_(acesso.areaId);
  if(!tacs||!tacs.ativo||!area||!area.ativa||area.tacsId!==tacs.tacsId){
    throw new Error('O acesso deste TACS ou o vínculo com a área não está ativo.');
  }
  return{
    ok:true,quickKey:tacsLoginRapidoV1CriarChave_(tacs.tacsId,dispositivo),
    acessoRapido:true,tacsId:tacs.tacsId,nome:tacs.nomeCompleto,
    areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId
  };
}

function tacsLoginRapidoV1EntrarPorPin_(p){
  var pin=tacsTerritorioV1Texto_(p.pin);
  var dispositivo=tacsTerritorioV1Texto_(p.dispositivo);
  var chave=tacsTerritorioV1Texto_(p.quickKey||p.chaveRapida);
  if(!/^[0-9]{4,8}$/.test(pin))throw new Error('Informe o PIN individual de 4 a 8 números.');
  if(!dispositivo)throw new Error('Identificação do aparelho ausente.');

  var tacsId=tacsLoginRapidoV1ValidarChave_(chave,dispositivo);
  if(!tacsId)throw new Error('A identificação rápida deste aparelho não é válida. Use o CNS uma vez para identificar novamente este aparelho.');

  var chaveTentativa='QUICK:'+tacsId;
  tacsTerritorioV1VerificarTentativasLogin_(chaveTentativa);
  var tacs=tacsTerritorioV1EncontrarTacs_(tacsId);
  if(!tacs||!tacs.ativo){
    tacsTerritorioV1RegistrarFalhaLogin_(chaveTentativa);
    throw new Error('PIN incorreto ou acesso do TACS inativo.');
  }
  if(!tacs.pinSalt||!tacs.pinHash)throw new Error('O PIN individual deste TACS ainda não foi configurado pelo administrador.');
  if(!tacsTerritorioV1CompararSeguro_(tacs.pinHash,tacsTerritorioV1HashPin_(pin,tacs.pinSalt))){
    tacsTerritorioV1RegistrarFalhaLogin_(chaveTentativa);
    throw new Error('PIN incorreto.');
  }
  tacsTerritorioV1LimparFalhasLogin_(chaveTentativa);

  var area=tacsTerritorioV1EncontrarArea_(tacs.areaId);
  if(!area||!area.ativa||area.tacsId!==tacs.tacsId){
    throw new Error('Este TACS ainda não possui uma área ativa e validada.');
  }

  var token=TACS_TERRITORIO_V1.TOKEN_PREFIX+Utilities.getUuid().replace(/-/g,'');
  var sessao={
    tacsId:tacs.tacsId,cns:tacs.cnsProfissional,dispositivo:dispositivo,
    areaId:area.areaId,unidadeId:area.unidadeId,criadoEm:new Date().toISOString()
  };
  CacheService.getScriptCache().put(
    TACS_TERRITORIO_V1.SESSION_PREFIX+tacsTerritorioV1Hash_(token),
    JSON.stringify(sessao),TACS_TERRITORIO_V1.SESSION_SECONDS
  );
  return{
    ok:true,token:token,perfil:'TACS',tacsId:tacs.tacsId,nome:tacs.nomeCompleto,
    areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,
    expiraEm:Date.now()+TACS_TERRITORIO_V1.SESSION_SECONDS*1000,
    quickKey:tacsLoginRapidoV1CriarChave_(tacs.tacsId,dispositivo),
    acessoRapido:true
  };
}

function tacsLoginRapidoV1CriarChave_(tacsId,dispositivo){
  tacsId=tacsTerritorioV1Id_(tacsId);
  dispositivo=tacsTerritorioV1Texto_(dispositivo);
  if(!tacsId||!dispositivo)throw new Error('Não foi possível preparar o acesso rápido deste aparelho.');
  var assinatura=tacsLoginRapidoV1Assinatura_(tacsId,dispositivo);
  return TACS_LOGIN_RAPIDO_V1.PREFIXO+'.'+tacsId+'.'+assinatura;
}

function tacsLoginRapidoV1ValidarChave_(chave,dispositivo){
  var match=String(chave||'').match(/^qt1\.([A-Z0-9_-]{1,64})\.([a-f0-9]{64})$/);
  if(!match)return '';
  var tacsId=tacsTerritorioV1Id_(match[1]);
  var esperado=tacsLoginRapidoV1Assinatura_(tacsId,dispositivo);
  return tacsTerritorioV1CompararSeguro_(match[2],esperado)?tacsId:'';
}

function tacsLoginRapidoV1Assinatura_(tacsId,dispositivo){
  var props=PropertiesService.getScriptProperties();
  var pepper=tacsTerritorioV1Texto_(props.getProperty(TACS_TERRITORIO_V1.PEPPER_PROPERTY));
  if(!pepper){
    pepper=Utilities.getUuid()+Utilities.getUuid();
    props.setProperty(TACS_TERRITORIO_V1.PEPPER_PROPERTY,pepper);
  }
  return tacsTerritorioV1Hash_(
    pepper+'|LOGIN_RAPIDO_V1|'+tacsTerritorioV1Id_(tacsId)+'|'+tacsTerritorioV1Hash_(dispositivo)
  );
}
