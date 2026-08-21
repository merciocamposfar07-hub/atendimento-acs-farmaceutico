/**
 * Portal TACS — aparelho TACS / teste V1.0.0
 *
 * Escopo estrito:
 * - identifica uma instalação OneSignal como aparelho técnico de teste da área;
 * - preserva a inscrição Push e o recebimento normal de Recados/Campanhas;
 * - remove e bloqueia vínculo familiar para o aparelho técnico;
 * - exclui o aparelho técnico somente de mensagens individuais e familiares;
 * - permite ao aparelho técnico testar a busca familiar dentro da própria área;
 * - não altera agendas, odontologia, publicações, webhooks ou o emissor Push geral.
 */
var TACS_APARELHO_TACS_TESTE_V1=Object.freeze({
  VERSAO:'1.0.0',
  SHEET:'TACS_APARELHOS_TACS_TESTE',
  HEADERS:Object.freeze([
    'SUBSCRIPTION_ID','AREA_ID','OPERADOR_ID','ATIVO','MARCADO_EM','ATUALIZADO_EM'
  ])
});

var aparelhoTacsTesteV1DoPostAnterior_;
var aparelhoTacsTesteV1CheckinAnterior_;
var aparelhoTacsTesteV1SaudeAdminAnterior_;
var aparelhoTacsTesteV1MensagemIndividualAlvosAnterior_;
var aparelhoTacsTesteV1MensagemFamiliaAlvosAnterior_;
var aparelhoTacsTesteV1ConsultaFamiliaAnterior_;

(function instalarAparelhoTacsTesteV1_(){
  if(typeof doPost==='function'){
    aparelhoTacsTesteV1DoPostAnterior_=doPost;
    doPost=function(e){
      var r=aparelhoTacsTesteV1TratarPost_(e);
      return r||aparelhoTacsTesteV1DoPostAnterior_(e);
    };
  }
  if(typeof saudeNotificacoesV1CheckinPublico_==='function'){
    aparelhoTacsTesteV1CheckinAnterior_=saudeNotificacoesV1CheckinPublico_;
    saudeNotificacoesV1CheckinPublico_=function(p){return aparelhoTacsTesteV1Checkin_(p);};
  }
  if(typeof saudeNotificacoesV1SaudeAdmin_==='function'){
    aparelhoTacsTesteV1SaudeAdminAnterior_=saudeNotificacoesV1SaudeAdmin_;
    saudeNotificacoesV1SaudeAdmin_=function(contexto,acesso){return aparelhoTacsTesteV1SaudeAdmin_(contexto,acesso);};
  }
  if(typeof mensagemIndividualV1Alvos_==='function'){
    aparelhoTacsTesteV1MensagemIndividualAlvosAnterior_=mensagemIndividualV1Alvos_;
    mensagemIndividualV1Alvos_=function(appId,apiKey,contexto,morador){
      return aparelhoTacsTesteV1FiltrarIndividual_(appId,apiKey,contexto,morador);
    };
  }
  if(typeof buscaEnvioFamiliaV1Alvos_==='function'){
    aparelhoTacsTesteV1MensagemFamiliaAlvosAnterior_=buscaEnvioFamiliaV1Alvos_;
    buscaEnvioFamiliaV1Alvos_=function(contexto,familia){
      return aparelhoTacsTesteV1FiltrarFamilia_(contexto,familia);
    };
  }
  if(typeof identificacaoFamiliarPublicaV1ConsultarFamilia_==='function'){
    aparelhoTacsTesteV1ConsultaFamiliaAnterior_=identificacaoFamiliarPublicaV1ConsultarFamilia_;
    identificacaoFamiliarPublicaV1ConsultarFamilia_=function(p){
      return aparelhoTacsTesteV1ConsultarFamilia_(p);
    };
  }
})();

function aparelhoTacsTesteV1Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function aparelhoTacsTesteV1Sub_(v){
  var s=aparelhoTacsTesteV1Texto_(v).toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)?s:'';
}
function aparelhoTacsTesteV1Area_(v){return moradoresAdminV1NormalizarAreaId_(v||'JAPARANDUBA');}
function aparelhoTacsTesteV1Sim_(v){return ['SIM','TRUE','1','ATIVO'].indexOf(aparelhoTacsTesteV1Texto_(v).toUpperCase())!==-1;}
function aparelhoTacsTesteV1Agora_(){return typeof saudeNotificacoesV1Data_==='function'?saudeNotificacoesV1Data_(new Date()):Utilities.formatDate(new Date(),'America/Recife','dd/MM/yyyy HH:mm:ss');}

function aparelhoTacsTesteV1Sheet_(){
  return saudeNotificacoesV1GarantirSheet_(
    tacsTerritorioV1Planilha_(),
    TACS_APARELHO_TACS_TESTE_V1.SHEET,
    TACS_APARELHO_TACS_TESTE_V1.HEADERS
  );
}

function aparelhoTacsTesteV1MapaAtivos_(areaId){
  areaId=aparelhoTacsTesteV1Area_(areaId);
  var map={},sheet=aparelhoTacsTesteV1Sheet_(),last=sheet.getLastRow();
  if(last<=1)return map;
  sheet.getRange(2,1,last-1,TACS_APARELHO_TACS_TESTE_V1.HEADERS.length).getDisplayValues().forEach(function(row){
    var sub=aparelhoTacsTesteV1Sub_(row[0]),area=aparelhoTacsTesteV1Area_(row[1]);
    if(sub&&area===areaId)map[sub]=aparelhoTacsTesteV1Sim_(row[3]);
  });
  Object.keys(map).forEach(function(sub){if(!map[sub])delete map[sub];});
  return map;
}

function aparelhoTacsTesteV1Ativo_(subscriptionId,areaId){
  var sub=aparelhoTacsTesteV1Sub_(subscriptionId);
  if(!sub)return false;
  return Boolean(aparelhoTacsTesteV1MapaAtivos_(areaId)[sub]);
}

function aparelhoTacsTesteV1RegistroSaudeExiste_(subscriptionId,areaId){
  var sub=aparelhoTacsTesteV1Sub_(subscriptionId),area=aparelhoTacsTesteV1Area_(areaId);
  if(!sub)return false;
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);
  var last=sheet.getLastRow();if(last<=1)return false;
  var rows=sheet.getRange(2,1,last-1,2).getDisplayValues();
  for(var i=0;i<rows.length;i++){
    if(aparelhoTacsTesteV1Sub_(rows[i][0])===sub&&aparelhoTacsTesteV1Area_(rows[i][1])===area)return true;
  }
  return false;
}

function aparelhoTacsTesteV1SalvarModo_(subscriptionId,areaId,operadorId,ativo){
  var sub=aparelhoTacsTesteV1Sub_(subscriptionId),area=aparelhoTacsTesteV1Area_(areaId);
  if(!sub||!area)throw new Error('A inscrição deste aparelho não pôde ser identificada.');
  var sheet=aparelhoTacsTesteV1Sheet_(),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('O modo deste aparelho está sendo atualizado. Tente novamente.');
  try{
    var last=sheet.getLastRow(),linha=0,marcado='';
    if(last>1){
      var rows=sheet.getRange(2,1,last-1,TACS_APARELHO_TACS_TESTE_V1.HEADERS.length).getDisplayValues();
      for(var i=rows.length-1;i>=0;i--){
        if(aparelhoTacsTesteV1Sub_(rows[i][0])!==sub||aparelhoTacsTesteV1Area_(rows[i][1])!==area)continue;
        linha=i+2;marcado=aparelhoTacsTesteV1Texto_(rows[i][4]);break;
      }
    }
    var agora=aparelhoTacsTesteV1Agora_();
    if(ativo&&!marcado)marcado=agora;
    var values=[sub,area,aparelhoTacsTesteV1Texto_(operadorId)||'TACS',ativo?'SIM':'NAO',marcado||agora,agora];
    if(linha)sheet.getRange(linha,1,1,values.length).setValues([values]);
    else sheet.appendRow(values);
    return ativo;
  }finally{lock.releaseLock();}
}

function aparelhoTacsTesteV1RemoverVinculoFamilia_(subscriptionId,areaId){
  var sub=aparelhoTacsTesteV1Sub_(subscriptionId),area=aparelhoTacsTesteV1Area_(areaId);
  if(!sub||!area)return 0;
  var ss=tacsTerritorioV1Planilha_();
  var nome=typeof TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1!=='undefined'
    ?TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.SHEET:'TACS_NOTIFICACOES_FAMILIAS';
  var sheet=ss.getSheetByName(nome);if(!sheet||sheet.getLastRow()<=1)return 0;
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('O vínculo familiar do aparelho está sendo atualizado. Tente novamente.');
  var removidos=0;
  try{
    var rows=sheet.getRange(2,1,sheet.getLastRow()-1,2).getDisplayValues();
    for(var i=rows.length-1;i>=0;i--){
      if(aparelhoTacsTesteV1Sub_(rows[i][0])!==sub||aparelhoTacsTesteV1Area_(rows[i][1])!==area)continue;
      sheet.deleteRow(i+2);removidos++;
    }
  }finally{lock.releaseLock();}
  return removidos;
}

function aparelhoTacsTesteV1LimparMoradorRegistro_(subscriptionId,areaId){
  var sub=aparelhoTacsTesteV1Sub_(subscriptionId),area=aparelhoTacsTesteV1Area_(areaId);
  if(!sub||!area)return false;
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);
  var last=sheet.getLastRow();if(last<=1)return false;
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('O registro técnico do aparelho está sendo atualizado. Tente novamente.');
  try{
    var rows=sheet.getRange(2,1,last-1,2).getDisplayValues();
    for(var i=0;i<rows.length;i++){
      if(aparelhoTacsTesteV1Sub_(rows[i][0])!==sub||aparelhoTacsTesteV1Area_(rows[i][1])!==area)continue;
      sheet.getRange(i+2,3).setValue('');
      if(sheet.getLastColumn()>=16)sheet.getRange(i+2,16).setValue(aparelhoTacsTesteV1Agora_());
      return true;
    }
  }finally{lock.releaseLock();}
  return false;
}

function aparelhoTacsTesteV1Operador_(acesso,contexto){
  return aparelhoTacsTesteV1Texto_(
    acesso&&(acesso.operadorId||acesso.tacsId||acesso.usuarioId)||contexto&&contexto.operadorId||'TACS'
  );
}

function aparelhoTacsTesteV1Estado_(subscriptionId,contexto){
  var sub=aparelhoTacsTesteV1Sub_(subscriptionId),area=contexto&&contexto.areaId?contexto.areaId:'';
  if(!sub)throw new Error('Este navegador ainda não possui uma inscrição Push identificável.');
  var disponivel=aparelhoTacsTesteV1RegistroSaudeExiste_(sub,area);
  var ativo=aparelhoTacsTesteV1Ativo_(sub,area);
  return {
    ok:true,areaId:area,subscriptionRef:sub.slice(-8),disponivel:disponivel,
    aparelhoTacsTeste:ativo,
    recebeRecadosCampanhas:true,
    recebeMensagensIndividuaisFamiliares:false,
    message:ativo
      ?'Este aparelho está em modo TACS / teste. Continua recebendo Recados e Campanhas e não recebe mensagens individuais ou familiares.'
      :(disponivel?'Este aparelho pode ser marcado como TACS / teste.':'Abra primeiro o Portal TACS neste aparelho, ative os avisos e depois volte a este painel.')
  };
}

function aparelhoTacsTesteV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=aparelhoTacsTesteV1Texto_(p.action).toLowerCase();
  if(action!=='admin_notificacoes_aparelho_tacs_teste')return null;
  var requestId=aparelhoTacsTesteV1Texto_(p.requestId),resultado;
  try{
    requestId=saudeNotificacoesV1ValidarRequestId_(requestId);
    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
    saudeNotificacoesV1ExigirAcesso_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');
    var sub=aparelhoTacsTesteV1Sub_(p.subscriptionId||p.subscription_id);
    if(!sub)throw new Error('A inscrição Push deste aparelho ainda não está disponível.');
    var modo=aparelhoTacsTesteV1Texto_(p.modo||'CONSULTAR').toUpperCase();
    if(['CONSULTAR','ATIVAR','DESATIVAR'].indexOf(modo)===-1)throw new Error('Modo do aparelho inválido.');
    if(modo==='ATIVAR'){
      if(!aparelhoTacsTesteV1RegistroSaudeExiste_(sub,contexto.areaId)){
        throw new Error('Este aparelho ainda não foi identificado no Portal desta área. Abra o Portal TACS, mantenha os avisos ativos e tente novamente.');
      }
      aparelhoTacsTesteV1SalvarModo_(sub,contexto.areaId,aparelhoTacsTesteV1Operador_(acesso,contexto),true);
      aparelhoTacsTesteV1RemoverVinculoFamilia_(sub,contexto.areaId);
      aparelhoTacsTesteV1LimparMoradorRegistro_(sub,contexto.areaId);
    }else if(modo==='DESATIVAR'){
      aparelhoTacsTesteV1SalvarModo_(sub,contexto.areaId,aparelhoTacsTesteV1Operador_(acesso,contexto),false);
    }
    resultado=aparelhoTacsTesteV1Estado_(sub,contexto);
  }catch(erro){resultado={ok:false,message:aparelhoTacsTesteV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))saudeNotificacoesV1GuardarResultado_(requestId,resultado);
  return saudeNotificacoesV1ResponderPost_(requestId,resultado);
}

function aparelhoTacsTesteV1Checkin_(p){
  p=p&&typeof p==='object'?p:{};
  var sub=aparelhoTacsTesteV1Sub_(p.subscriptionId||p.subscription_id);
  var area=aparelhoTacsTesteV1Area_(p.areaId||p.area||'JAPARANDUBA');
  if(!sub||!aparelhoTacsTesteV1Ativo_(sub,area))return aparelhoTacsTesteV1CheckinAnterior_(p);
  aparelhoTacsTesteV1RemoverVinculoFamilia_(sub,area);
  aparelhoTacsTesteV1LimparMoradorRegistro_(sub,area);
  var parametros={};Object.keys(p).forEach(function(k){parametros[k]=p[k];});
  delete parametros.documento;delete parametros.cpf;delete parametros.cns;
  var resultado=aparelhoTacsTesteV1CheckinAnterior_(parametros);
  if(!resultado||typeof resultado!=='object')resultado={ok:true};
  resultado.aparelhoTacsTeste=true;
  resultado.vinculadoFamilia=false;
  resultado.familiaId='';
  resultado.familiaDiferente=false;
  resultado.message='Aparelho TACS / teste ativo. O Push público permanece ativo e nenhum vínculo familiar é criado por pesquisas de teste.';
  return resultado;
}

function aparelhoTacsTesteV1SaudeAdmin_(contexto,acesso){
  var resultado=aparelhoTacsTesteV1SaudeAdminAnterior_(contexto,acesso);
  if(!resultado||typeof resultado!=='object')return resultado;
  var mapa=aparelhoTacsTesteV1MapaAtivos_(contexto.areaId),refs={};
  Object.keys(mapa).forEach(function(sub){refs[sub.slice(-8)]=true;});
  var quantidade=0;
  (Array.isArray(resultado.aparelhos)?resultado.aparelhos:[]).forEach(function(aparelho){
    var ref=aparelhoTacsTesteV1Texto_(aparelho.subscriptionRef).toLowerCase();
    if(!refs[ref])return;
    quantidade++;
    aparelho.nome='🛠 Aparelho TACS / teste';
    aparelho.telefone='';
    aparelho.vinculadoMorador=false;
    aparelho.aparelhoTacsTeste=true;
    aparelho.motivo='Aparelho técnico: recebe Recados e Campanhas da área; não recebe mensagens individuais ou familiares e não cria vínculo com famílias pesquisadas.';
  });
  if(resultado.contagens&&typeof resultado.contagens==='object')resultado.contagens.tacsTeste=quantidade;
  resultado.aparelhosTacsTeste=quantidade;
  return resultado;
}

function aparelhoTacsTesteV1FiltrarIndividual_(appId,apiKey,contexto,morador){
  var alvos=aparelhoTacsTesteV1MensagemIndividualAlvosAnterior_(appId,apiKey,contexto,morador);
  var mapa=aparelhoTacsTesteV1MapaAtivos_(contexto.areaId);
  return (Array.isArray(alvos)?alvos:[]).filter(function(alvo){
    return !mapa[aparelhoTacsTesteV1Sub_(alvo&&alvo.subscriptionId)];
  });
}

function aparelhoTacsTesteV1FiltrarFamilia_(contexto,familia){
  var resultado=aparelhoTacsTesteV1MensagemFamiliaAlvosAnterior_(contexto,familia);
  if(!resultado||typeof resultado!=='object')return resultado;
  var mapa=aparelhoTacsTesteV1MapaAtivos_(contexto.areaId);
  resultado.alvos=(Array.isArray(resultado.alvos)?resultado.alvos:[]).filter(function(alvo){
    return !mapa[aparelhoTacsTesteV1Sub_(alvo&&alvo.subscriptionId)];
  });
  return resultado;
}

function aparelhoTacsTesteV1ConsultarFamilia_(p){
  p=p&&typeof p==='object'?p:{};
  var sub=aparelhoTacsTesteV1Sub_(p.subscriptionId||p.subscription_id);
  var area=aparelhoTacsTesteV1Area_(p.areaId||p.area||'');
  if(!sub||!area||!aparelhoTacsTesteV1Ativo_(sub,area))return aparelhoTacsTesteV1ConsultaFamiliaAnterior_(p);
  var contexto=identificacaoFamiliarPublicaV1Contexto_(area);
  var familia=identificacaoFamiliarPublicaV1NormalizarFamilia_(p.familia||p.familiaId||'');
  if(!familia)throw new Error('Informe um número de cadastro familiar válido.');
  var membros=identificacaoFamiliarPublicaV1Membros_(familia,contexto);
  if(!membros.length){
    return {ok:true,autorizada:false,requerConfirmacao:false,familiaId:familia,message:'Nenhum cadastro ativo desta família foi localizado na área atual.'};
  }
  return {
    ok:true,autorizada:true,requerConfirmacao:false,familiaId:familia,
    autorizacao:'APARELHO_TACS_TESTE',membros:membros,aparelhoTacsTeste:true
  };
}
