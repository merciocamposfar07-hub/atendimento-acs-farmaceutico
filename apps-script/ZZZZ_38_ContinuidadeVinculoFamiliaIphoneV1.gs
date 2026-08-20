/**
 * ZZZZ_38_ContinuidadeVinculoFamiliaIphoneV1.gs
 * Portal TACS — continuidade segura do vínculo familiar no iPhone V1.0.3
 *
 * Escopo estrito:
 * - NÃO altera permissão Push, opt-in, token, tags, envio ou reparo do OneSignal;
 * - NÃO altera MORADORES, agendas, odontologia, recados ou campanhas;
 * - atua apenas quando a Subscription ID atual ainda não possui vínculo familiar;
 * - tenta recuperar o vínculo de uma Subscription ID anterior do MESMO onesignal_id;
 * - se a identidade OneSignal ainda não puder ser confirmada, NÃO cria vínculo novo
 *   a partir do CPF digitado, evitando que um aparelho já conhecido seja reatribuído
 *   acidentalmente a outra família.
 */
var TACS_CONTINUIDADE_VINCULO_FAMILIA_IPHONE_V1=Object.freeze({VERSAO:'1.0.3'});

var continuidadeFamiliaIphoneV1CheckinAnterior_=typeof saudeNotificacoesV1CheckinPublico_==='function'
  ?saudeNotificacoesV1CheckinPublico_:null;

(function instalarContinuidadeFamiliaIphoneV1_(){
  if(continuidadeFamiliaIphoneV1CheckinAnterior_){
    saudeNotificacoesV1CheckinPublico_=function(p){return continuidadeFamiliaIphoneV1Checkin_(p);};
  }
})();

function continuidadeFamiliaIphoneV1Checkin_(p){
  p=p&&typeof p==='object'?p:{};
  var subscriptionId=continuidadeFamiliaIphoneV1Texto_(p.subscriptionId||p.subscription_id).toLowerCase();
  var areaId=moradoresAdminV1NormalizarAreaId_(p.areaId||p.area||'JAPARANDUBA');
  var documento=p.documento||p.cpf||p.cns||'';

  if(!continuidadeFamiliaIphoneV1Uuid_(subscriptionId)||!documento){
    return continuidadeFamiliaIphoneV1CheckinAnterior_(p);
  }

  var atual=vinculoFamiliarNotifV1Ler_(subscriptionId,areaId);
  if(atual)return continuidadeFamiliaIphoneV1CheckinAnterior_(p);

  var onesignalId=continuidadeFamiliaIphoneV1OnesignalId_(subscriptionId,areaId);
  var anterior=onesignalId?continuidadeFamiliaIphoneV1VinculoAnterior_(subscriptionId,areaId,onesignalId):null;
  if(anterior&&anterior.familiaId){
    vinculoFamiliarNotifV1Gravar_(subscriptionId,areaId,anterior,'MIGRADO_ONESIGNAL_ID');
    return continuidadeFamiliaIphoneV1CheckinAnterior_(p);
  }

  if(onesignalId){
    // Identidade confirmada e nenhum vínculo anterior: pode ser uma primeira vinculação legítima.
    return continuidadeFamiliaIphoneV1CheckinAnterior_(p);
  }

  // A identidade ainda não foi confirmada. Faz o check-in técnico sem o documento,
  // impedindo que um CPF de teste troque a família do aparelho por acidente.
  var parametros=Object.assign({},p);
  delete parametros.documento;delete parametros.cpf;delete parametros.cns;
  var resultado=continuidadeFamiliaIphoneV1CheckinAnterior_(parametros);
  if(!resultado||typeof resultado!=='object')resultado={ok:true};

  // O check-in anterior pode ter acabado de registrar o onesignal_id. Releia e conclua
  // a continuidade no mesmo ciclo, sem exigir que o morador recarregue a página.
  onesignalId=continuidadeFamiliaIphoneV1OnesignalId_(subscriptionId,areaId);
  if(!onesignalId){
    resultado.vinculoFamiliaAguardandoIdentidade=true;
    return resultado;
  }

  anterior=continuidadeFamiliaIphoneV1VinculoAnterior_(subscriptionId,areaId,onesignalId);
  var morador=vinculoFamiliarNotifV1ResolverMoradorDocumento_(documento,areaId);
  if(anterior&&anterior.familiaId){
    atual=vinculoFamiliarNotifV1Gravar_(subscriptionId,areaId,anterior,'MIGRADO_ONESIGNAL_ID');
  }else if(morador&&morador.familiaId){
    atual=vinculoFamiliarNotifV1Gravar_(subscriptionId,areaId,morador,'DOCUMENTO_VALIDADO');
  }

  var decisao=vinculoFamiliarNotifV1Decidir_(atual,morador);
  resultado.vinculadoFamilia=Boolean(atual&&atual.familiaId);
  resultado.familiaId=atual&&atual.familiaId?atual.familiaId:'';
  resultado.familiaDiferente=decisao.acao==='OUTRA_FAMILIA';
  resultado.familiaBeneficiario=morador&&morador.familiaId?morador.familiaId:'';
  resultado.vinculoFamiliaAguardandoIdentidade=false;
  resultado.continuidadeFamiliaIphoneVersao=TACS_CONTINUIDADE_VINCULO_FAMILIA_IPHONE_V1.VERSAO;
  if(resultado.familiaDiferente){
    resultado.message='Esta pessoa pertence a outro cadastro familiar desta mesma área. A solicitação pode continuar normalmente.';
  }
  return resultado;
}

function continuidadeFamiliaIphoneV1OnesignalId_(subscriptionId,areaId){
  var local=continuidadeFamiliaIphoneV1OnesignalIdRegistro_(subscriptionId,areaId);
  if(local)return local;
  try{
    var props=PropertiesService.getScriptProperties();
    var appId=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.APP_ID_PROPERTIES)||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_APP_ID;
    var apiKey=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.API_KEY_PROPERTIES);
    if(!apiKey)return '';
    return continuidadeFamiliaIphoneV1Texto_(saudeNotificacoesV1IdentidadePorSubscription_(appId,apiKey,subscriptionId)).toLowerCase();
  }catch(e){return '';}
}

function continuidadeFamiliaIphoneV1OnesignalIdRegistro_(subscriptionId,areaId){
  var ss=tacsTerritorioV1Planilha_();
  var registry=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);
  var last=registry.getLastRow();if(last<=1)return '';
  var rows=registry.getRange(2,1,last-1,4).getDisplayValues();
  for(var i=rows.length-1;i>=0;i--){
    if(continuidadeFamiliaIphoneV1Texto_(rows[i][0]).toLowerCase()!==subscriptionId)continue;
    if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==areaId)continue;
    return continuidadeFamiliaIphoneV1Texto_(rows[i][3]).toLowerCase();
  }
  return '';
}

function continuidadeFamiliaIphoneV1VinculoAnterior_(subscriptionId,areaId,onesignalId){
  if(!onesignalId)return null;
  var ss=tacsTerritorioV1Planilha_();
  var registry=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);
  var last=registry.getLastRow();if(last<=1)return null;
  var rows=registry.getRange(2,1,last-1,4).getDisplayValues();
  for(var i=rows.length-1;i>=0;i--){
    var antiga=continuidadeFamiliaIphoneV1Texto_(rows[i][0]).toLowerCase();
    if(!antiga||antiga===subscriptionId)continue;
    if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==areaId)continue;
    if(continuidadeFamiliaIphoneV1Texto_(rows[i][3]).toLowerCase()!==onesignalId)continue;
    var vinculo=vinculoFamiliarNotifV1Ler_(antiga,areaId);
    if(vinculo&&vinculo.familiaId)return vinculo;
  }
  return null;
}

function continuidadeFamiliaIphoneV1Uuid_(valor){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(valor||'').toLowerCase());}
function continuidadeFamiliaIphoneV1Texto_(valor){return String(valor==null?'':valor).trim();}
