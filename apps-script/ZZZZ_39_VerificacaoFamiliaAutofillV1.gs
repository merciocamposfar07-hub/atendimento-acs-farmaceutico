/**
 * ZZZZ_39_VerificacaoFamiliaAutofillV1.gs
 * Portal TACS — verificação familiar desacoplada do Push V1.0.0
 *
 * Escopo estrito:
 * - usa o mesmo buscar_morador já responsável pelo preenchimento automático;
 * - reutiliza a leitura de código familiar e a decisão do módulo de vínculo familiar;
 * - não consulta nem exige OneSignal, permissão Push, token ou Subscription ID;
 * - não altera MORADORES, agendas, odontologia, recados, campanhas ou profissionais;
 * - a referência familiar é mantida pelo navegador por área e enviada apenas como
 *   código familiar para comparação; CPF/CNS não é armazenado por esta camada.
 */
var TACS_VERIFICACAO_FAMILIA_AUTOFILL_V1=Object.freeze({VERSAO:'1.0.1'});

var verificacaoFamiliaAutofillV1TratarGetAnterior_=typeof moradoresAdminV1TratarGet_==='function'
  ?moradoresAdminV1TratarGet_:null;

(function instalarVerificacaoFamiliaAutofillV1_(){
  if(!verificacaoFamiliaAutofillV1TratarGetAnterior_)return;
  moradoresAdminV1TratarGet_=function(e){
    var p=e&&e.parameter?e.parameter:{};
    var action=moradoresAdminV1Texto_(p.action).toLowerCase();
    if(action!=='buscar_morador'&&action!=='buscar_morador_bridge'){
      return verificacaoFamiliaAutofillV1TratarGetAnterior_(e);
    }

    var publico;
    try{
      publico=moradoresAdminV1BuscarPublico_(p.documento||p.cpf||p.cns||'',p.areaId||p.area||'');
      publico=verificacaoFamiliaAutofillV1Enriquecer_(publico,p.familiaReferencia||p.familia||'');
    }catch(erroPublico){
      publico={ok:false,encontrado:false,message:moradoresAdminV1MensagemErro_(erroPublico)};
    }
    return action==='buscar_morador_bridge'
      ?moradoresAdminV1ResponderBridgePublica_(publico,p.nonce)
      :moradoresAdminV1ResponderJson_(publico,p.callback);
  };
})();

function verificacaoFamiliaAutofillV1Enriquecer_(payload,familiaReferencia){
  if(!payload||payload.ok!==true||payload.encontrado!==true||!payload.morador)return payload;
  if(typeof vinculoFamiliarNotifV1CodigoEndereco_!=='function'||typeof vinculoFamiliarNotifV1Decidir_!=='function'){
    return payload;
  }

  var familiaBeneficiario=vinculoFamiliarNotifV1CodigoEndereco_(
    payload.morador.endereco||payload.morador.localidade||''
  );
  if(!familiaBeneficiario){
    payload.familiaId='';
    payload.familiaBeneficiario='';
    payload.familiaDiferente=false;
    payload.verificacaoFamiliaAutofillVersao=TACS_VERIFICACAO_FAMILIA_AUTOFILL_V1.VERSAO;
    return payload;
  }

  var referencia=verificacaoFamiliaAutofillV1NormalizarFamilia_(familiaReferencia);
  if(!referencia){
    payload.familiaId='';
    payload.familiaBeneficiario=familiaBeneficiario;
    payload.familiaDiferente=true;
    payload.vinculoFamiliarAusente=true;
    payload.verificacaoFamiliaAutofillVersao=TACS_VERIFICACAO_FAMILIA_AUTOFILL_V1.VERSAO;
    payload.messageFamilia='Esta pessoa pertence a outro cadastro familiar desta mesma área. Você pode continuar a solicitação normalmente.';
    return payload;
  }

  var decisao=vinculoFamiliarNotifV1Decidir_(
    {familiaId:referencia},
    {familiaId:familiaBeneficiario}
  );

  payload.familiaId=referencia;
  payload.familiaBeneficiario=familiaBeneficiario;
  payload.familiaDiferente=decisao.acao==='OUTRA_FAMILIA';
  payload.vinculoFamiliarAusente=false;
  payload.verificacaoFamiliaAutofillVersao=TACS_VERIFICACAO_FAMILIA_AUTOFILL_V1.VERSAO;
  if(payload.familiaDiferente){
    payload.messageFamilia='Esta pessoa pertence a outro cadastro familiar desta mesma área. Você pode continuar a solicitação normalmente.';
  }
  return payload;
}

function verificacaoFamiliaAutofillV1NormalizarFamilia_(valor){
  var texto=String(valor==null?'':valor).trim().toUpperCase();
  return /^[0-9]{1,4}[A-Z]?$/.test(texto)?texto:'';
}
