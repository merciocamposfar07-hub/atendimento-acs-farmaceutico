/**
 * Portal TACS — aparelho TACS / teste V1.2.0
 *
 * Escopo:
 * - ativa o aparelho técnico pelo identificador estável da Central TACS, sem exigir Push;
 * - emite uma chave técnica aleatória no servidor e guarda somente o hash na planilha;
 * - só libera consulta familiar sem CPF/CNS quando dispositivo + chave técnica são válidos;
 * - preserva o fluxo comum do morador e a confirmação CPF/CNS;
 * - se houver subscriptionId, associa o Push ao aparelho técnico para excluí-lo apenas
 *   de mensagens individuais/familiares; Recados e Campanhas gerais continuam intactos.
 */
var TACS_APARELHO_TACS_TESTE_V1=Object.freeze({
  VERSAO:'1.2.0',
  LEGACY_SHEET:'TACS_APARELHOS_TACS_TESTE',
  LEGACY_HEADERS:Object.freeze([
    'SUBSCRIPTION_ID','AREA_ID','OPERADOR_ID','ATIVO','MARCADO_EM','ATUALIZADO_EM'
  ]),
  DEVICE_SHEET:'TACS_APARELHOS_TACS_TESTE_DISPOSITIVOS',
  DEVICE_HEADERS:Object.freeze([
    'DISPOSITIVO','AREA_ID','OPERADOR_ID','ATIVO','CHAVE_HASH','MARCADO_EM','ATUALIZADO_EM','SUBSCRIPTION_ID'
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
    identificacaoFamiliarPublicaV1ConsultarFamilia_=function(p){return aparelhoTacsTesteV1ConsultarFamilia_(p);};
  }
})();

function aparelhoTacsTesteV1Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function aparelhoTacsTesteV1Area_(v){return moradoresAdminV1NormalizarAreaId_(v||'JAPARANDUBA');}
function aparelhoTacsTesteV1Sub_(v){var s=aparelhoTacsTesteV1Texto_(v).toLowerCase();return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)?s:'';}
function aparelhoTacsTesteV1Dispositivo_(v){var s=aparelhoTacsTesteV1Texto_(v);return /^[A-Za-z0-9._:-]{8,180}$/.test(s)?s:'';}
function aparelhoTacsTesteV1Chave_(v){var s=aparelhoTacsTesteV1Texto_(v);return /^[A-Za-z0-9_-]{40,180}$/.test(s)?s:'';}
function aparelhoTacsTesteV1Sim_(v){return ['SIM','TRUE','1','ATIVO'].indexOf(aparelhoTacsTesteV1Texto_(v).toUpperCase())!==-1;}
function aparelhoTacsTesteV1Agora_(){return typeof saudeNotificacoesV1Data_==='function'?saudeNotificacoesV1Data_(new Date()):Utilities.formatDate(new Date(),'America/Recife','yyyy-MM-dd HH:mm:ss');}
function aparelhoTacsTesteV1Operador_(acesso,contexto){return aparelhoTacsTesteV1Texto_(acesso&&(acesso.operadorId||acesso.tacsId||acesso.usuarioId)||contexto&&contexto.operadorId||'TACS');}
function aparelhoTacsTesteV1NovaChave_(){return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');}
function aparelhoTacsTesteV1Hash_(valor){
  var s=aparelhoTacsTesteV1Texto_(valor);if(!s)return '';
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8),out='';
  for(var i=0;i<bytes.length;i++){var n=(bytes[i]+256)%256;out+=('0'+n.toString(16)).slice(-2);}
  return out;
}

function aparelhoTacsTesteV1LegacySheet_(){return saudeNotificacoesV1GarantirSheet_(tacsTerritorioV1Planilha_(),TACS_APARELHO_TACS_TESTE_V1.LEGACY_SHEET,TACS_APARELHO_TACS_TESTE_V1.LEGACY_HEADERS);}
function aparelhoTacsTesteV1DeviceSheet_(){return saudeNotificacoesV1GarantirSheet_(tacsTerritorioV1Planilha_(),TACS_APARELHO_TACS_TESTE_V1.DEVICE_SHEET,TACS_APARELHO_TACS_TESTE_V1.DEVICE_HEADERS);}

function aparelhoTacsTesteV1RegistroDispositivo_(dispositivo,areaId){
  var device=aparelhoTacsTesteV1Dispositivo_(dispositivo),area=aparelhoTacsTesteV1Area_(areaId);
  if(!device||!area)return null;
  var sheet=aparelhoTacsTesteV1DeviceSheet_(),last=sheet.getLastRow();if(last<=1)return null;
  var rows=sheet.getRange(2,1,last-1,TACS_APARELHO_TACS_TESTE_V1.DEVICE_HEADERS.length).getDisplayValues();
  for(var i=rows.length-1;i>=0;i--){
    if(aparelhoTacsTesteV1Dispositivo_(rows[i][0])!==device||aparelhoTacsTesteV1Area_(rows[i][1])!==area)continue;
    return {linha:i+2,dispositivo:device,areaId:area,operadorId:rows[i][2],ativo:aparelhoTacsTesteV1Sim_(rows[i][3]),chaveHash:aparelhoTacsTesteV1Texto_(rows[i][4]).toLowerCase(),marcadoEm:rows[i][5],atualizadoEm:rows[i][6],subscriptionId:aparelhoTacsTesteV1Sub_(rows[i][7])};
  }
  return null;
}

function aparelhoTacsTesteV1TokenValido_(dispositivo,areaId,chave){
  var device=aparelhoTacsTesteV1Dispositivo_(dispositivo),token=aparelhoTacsTesteV1Chave_(chave);
  if(!device||!token)return false;
  var reg=aparelhoTacsTesteV1RegistroDispositivo_(device,areaId);
  return Boolean(reg&&reg.ativo&&reg.chaveHash&&reg.chaveHash===aparelhoTacsTesteV1Hash_(token));
}

function aparelhoTacsTesteV1SalvarDispositivo_(dispositivo,areaId,operadorId,ativo,chave,subscriptionId){
  var device=aparelhoTacsTesteV1Dispositivo_(dispositivo),area=aparelhoTacsTesteV1Area_(areaId),sub=aparelhoTacsTesteV1Sub_(subscriptionId);
  if(!device||!area)throw new Error('Este aparelho não possui uma identificação técnica válida. Abra novamente pela Central TACS.');
  var sheet=aparelhoTacsTesteV1DeviceSheet_(),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('O modo deste aparelho está sendo atualizado. Tente novamente.');
  try{
    var last=sheet.getLastRow(),linha=0,marcado='',subAnterior='';
    if(last>1){
      var rows=sheet.getRange(2,1,last-1,TACS_APARELHO_TACS_TESTE_V1.DEVICE_HEADERS.length).getDisplayValues();
      for(var i=rows.length-1;i>=0;i--){
        if(aparelhoTacsTesteV1Dispositivo_(rows[i][0])!==device||aparelhoTacsTesteV1Area_(rows[i][1])!==area)continue;
        linha=i+2;marcado=aparelhoTacsTesteV1Texto_(rows[i][5]);subAnterior=aparelhoTacsTesteV1Sub_(rows[i][7]);break;
      }
    }
    var agora=aparelhoTacsTesteV1Agora_();if(ativo&&!marcado)marcado=agora;
    var hash=ativo?aparelhoTacsTesteV1Hash_(chave):'';
    var values=[device,area,aparelhoTacsTesteV1Texto_(operadorId)||'TACS',ativo?'SIM':'NAO',hash,marcado||agora,agora,sub||subAnterior];
    if(linha)sheet.getRange(linha,1,1,values.length).setValues([values]);else sheet.appendRow(values);
    return {ativo:Boolean(ativo),subscriptionId:sub||subAnterior};
  }finally{lock.releaseLock();}
}

function aparelhoTacsTesteV1AssociarSubscription_(dispositivo,areaId,chave,subscriptionId){
  var device=aparelhoTacsTesteV1Dispositivo_(dispositivo),area=aparelhoTacsTesteV1Area_(areaId),sub=aparelhoTacsTesteV1Sub_(subscriptionId);
  if(!device||!area||!sub||!aparelhoTacsTesteV1TokenValido_(device,area,chave))return false;
  var reg=aparelhoTacsTesteV1RegistroDispositivo_(device,area);if(!reg||reg.subscriptionId===sub)return true;
  var sheet=aparelhoTacsTesteV1DeviceSheet_(),lock=LockService.getScriptLock();if(!lock.tryLock(10000))return false;
  try{sheet.getRange(reg.linha,8).setValue(sub);sheet.getRange(reg.linha,7).setValue(aparelhoTacsTesteV1Agora_());return true;}finally{lock.releaseLock();}
}

function aparelhoTacsTesteV1MapaAtivos_(areaId){
  var area=aparelhoTacsTesteV1Area_(areaId),map={};
  var legacy=aparelhoTacsTesteV1LegacySheet_(),last=legacy.getLastRow();
  if(last>1)legacy.getRange(2,1,last-1,TACS_APARELHO_TACS_TESTE_V1.LEGACY_HEADERS.length).getDisplayValues().forEach(function(row){var sub=aparelhoTacsTesteV1Sub_(row[0]);if(sub&&aparelhoTacsTesteV1Area_(row[1])===area&&aparelhoTacsTesteV1Sim_(row[3]))map[sub]=true;});
  var devices=aparelhoTacsTesteV1DeviceSheet_(),dlast=devices.getLastRow();
  if(dlast>1)devices.getRange(2,1,dlast-1,TACS_APARELHO_TACS_TESTE_V1.DEVICE_HEADERS.length).getDisplayValues().forEach(function(row){var sub=aparelhoTacsTesteV1Sub_(row[7]);if(sub&&aparelhoTacsTesteV1Area_(row[1])===area&&aparelhoTacsTesteV1Sim_(row[3]))map[sub]=true;});
  return map;
}

function aparelhoTacsTesteV1LegacyAtivo_(subscriptionId,areaId){var sub=aparelhoTacsTesteV1Sub_(subscriptionId);return Boolean(sub&&aparelhoTacsTesteV1MapaAtivos_(areaId)[sub]);}
function aparelhoTacsTesteV1Ativo_(subscriptionId,areaId,dispositivo,chave){return aparelhoTacsTesteV1TokenValido_(dispositivo,areaId,chave)||aparelhoTacsTesteV1LegacyAtivo_(subscriptionId,areaId);}

function aparelhoTacsTesteV1RemoverVinculoFamilia_(subscriptionId,areaId){
  var sub=aparelhoTacsTesteV1Sub_(subscriptionId),area=aparelhoTacsTesteV1Area_(areaId);if(!sub||!area)return 0;
  var ss=tacsTerritorioV1Planilha_(),nome=typeof TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1!=='undefined'?TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.SHEET:'TACS_NOTIFICACOES_FAMILIAS',sheet=ss.getSheetByName(nome);if(!sheet||sheet.getLastRow()<=1)return 0;
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))return 0;var removidos=0;
  try{var rows=sheet.getRange(2,1,sheet.getLastRow()-1,2).getDisplayValues();for(var i=rows.length-1;i>=0;i--){if(aparelhoTacsTesteV1Sub_(rows[i][0])===sub&&aparelhoTacsTesteV1Area_(rows[i][1])===area){sheet.deleteRow(i+2);removidos++;}}}finally{lock.releaseLock();}
  return removidos;
}

function aparelhoTacsTesteV1LimparMoradorRegistro_(subscriptionId,areaId){
  var sub=aparelhoTacsTesteV1Sub_(subscriptionId),area=aparelhoTacsTesteV1Area_(areaId);if(!sub||!area)return false;
  var ss=tacsTerritorioV1Planilha_(),sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS),last=sheet.getLastRow();if(last<=1)return false;
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))return false;
  try{var rows=sheet.getRange(2,1,last-1,2).getDisplayValues();for(var i=0;i<rows.length;i++){if(aparelhoTacsTesteV1Sub_(rows[i][0])!==sub||aparelhoTacsTesteV1Area_(rows[i][1])!==area)continue;sheet.getRange(i+2,3).setValue('');if(sheet.getLastColumn()>=16)sheet.getRange(i+2,16).setValue(aparelhoTacsTesteV1Agora_());return true;}}finally{lock.releaseLock();}
  return false;
}

function aparelhoTacsTesteV1Estado_(dispositivo,subscriptionId,contexto,chave){
  var device=aparelhoTacsTesteV1Dispositivo_(dispositivo),sub=aparelhoTacsTesteV1Sub_(subscriptionId),area=contexto&&contexto.areaId?contexto.areaId:'',reg=device?aparelhoTacsTesteV1RegistroDispositivo_(device,area):null;
  var ativo=Boolean(reg&&reg.ativo)||aparelhoTacsTesteV1LegacyAtivo_(sub,area),autorizado=Boolean(device&&aparelhoTacsTesteV1TokenValido_(device,area,chave));
  return {ok:true,areaId:area,dispositivoRef:device?device.slice(-10):'',subscriptionRef:(reg&&reg.subscriptionId||sub||'').slice(-8),disponivel:Boolean(device),aparelhoTacsTeste:ativo,autorizadoNesteAparelho:autorizado,recebeRecadosCampanhas:true,recebeMensagensIndividuaisFamiliares:false,message:ativo?(autorizado?'Modo TACS / teste ativo e autorizado neste aparelho. A busca pelo número do cadastro familiar está liberada.':'O modo TACS / teste está ativo no servidor, mas este navegador precisa renovar a autorização técnica.'):'Este aparelho pode ser marcado como TACS / teste sem depender das notificações Push.'};
}

function aparelhoTacsTesteV1HandoffCriar_(contexto,acesso){
  var codigo=aparelhoTacsTesteV1NovaChave_(),area=aparelhoTacsTesteV1Area_(contexto&&contexto.areaId||''),operador=aparelhoTacsTesteV1Operador_(acesso,contexto);
  if(!area)throw new Error('Área inválida para abrir o Portal em modo TACS / teste.');
  var payload={areaId:area,operadorId:operador,criadoEm:Date.now()},key='TACS_TACS_TESTE_HANDOFF_'+aparelhoTacsTesteV1Hash_(codigo);
  CacheService.getScriptCache().put(key,JSON.stringify(payload),600);
  return codigo;
}

function aparelhoTacsTesteV1HandoffResgatar_(p){
  p=p&&typeof p==='object'?p:{};
  var codigo=aparelhoTacsTesteV1Chave_(p.codigo||p.handoff||p.codigoTransferencia||''),device=aparelhoTacsTesteV1Dispositivo_(p.dispositivo||p.deviceId),area=aparelhoTacsTesteV1Area_(p.areaId||p.area||'');
  if(!codigo||!device||!area)throw new Error('A autorização temporária deste aparelho é inválida. Abra novamente pelo painel TACS.');
  var cache=CacheService.getScriptCache(),key='TACS_TACS_TESTE_HANDOFF_'+aparelhoTacsTesteV1Hash_(codigo),raw=cache.get(key);
  if(!raw)throw new Error('A autorização temporária expirou ou já foi utilizada. Abra novamente pelo painel TACS.');
  var payload;try{payload=JSON.parse(raw)}catch(e){payload=null}
  if(!payload||aparelhoTacsTesteV1Area_(payload.areaId)!==area)throw new Error('Esta autorização pertence a outra área.');
  cache.remove(key);
  var chave=aparelhoTacsTesteV1NovaChave_();
  aparelhoTacsTesteV1SalvarDispositivo_(device,area,payload.operadorId||'TACS',true,chave,'');
  var resultado=aparelhoTacsTesteV1Estado_(device,'',{areaId:area},chave);
  resultado.ok=true;resultado.chaveTecnica=chave;resultado.transferidoParaPortal=true;
  resultado.message='Modo TACS / teste autorizado neste Portal. A busca pelo cadastro familiar está liberada sem CPF/CNS.';
  return resultado;
}

function aparelhoTacsTesteV1TratarResgate_(p){
  var requestId=aparelhoTacsTesteV1Texto_(p&&p.requestId),resultado;
  try{requestId=saudeNotificacoesV1ValidarRequestId_(requestId);resultado=aparelhoTacsTesteV1HandoffResgatar_(p);}catch(erro){resultado={ok:false,message:aparelhoTacsTesteV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))saudeNotificacoesV1GuardarResultado_(requestId,resultado);
  return saudeNotificacoesV1ResponderPost_(requestId,resultado);
}

function aparelhoTacsTesteV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{},action=aparelhoTacsTesteV1Texto_(p.action).toLowerCase();if(action==='publico_aparelho_tacs_resgatar')return aparelhoTacsTesteV1TratarResgate_(p);if(action!=='admin_notificacoes_aparelho_tacs_teste')return null;
  var requestId=aparelhoTacsTesteV1Texto_(p.requestId),resultado;
  try{
    requestId=saudeNotificacoesV1ValidarRequestId_(requestId);
    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);saudeNotificacoesV1ExigirAcesso_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||''),device=aparelhoTacsTesteV1Dispositivo_(p.dispositivo||p.deviceId),sub=aparelhoTacsTesteV1Sub_(p.subscriptionId||p.subscription_id),modo=aparelhoTacsTesteV1Texto_(p.modo||'CONSULTAR').toUpperCase(),chave=aparelhoTacsTesteV1Chave_(p.chaveTacsTeste||p.chaveTecnica||'');
    if(!device)throw new Error('Este aparelho ainda não foi identificado pela Central TACS. Atualize a Central e tente novamente.');
    if(['CONSULTAR','ATIVAR','DESATIVAR','TRANSFERIR'].indexOf(modo)===-1)throw new Error('Modo do aparelho inválido.');
    if(modo==='TRANSFERIR'){
      resultado={ok:true,areaId:contexto.areaId,codigoTransferencia:aparelhoTacsTesteV1HandoffCriar_(contexto,acesso),message:'Autorização temporária criada para abrir o Portal em modo TACS / teste.'};
    }else if(modo==='ATIVAR'){
      chave=aparelhoTacsTesteV1NovaChave_();aparelhoTacsTesteV1SalvarDispositivo_(device,contexto.areaId,aparelhoTacsTesteV1Operador_(acesso,contexto),true,chave,sub);
      if(sub){aparelhoTacsTesteV1RemoverVinculoFamilia_(sub,contexto.areaId);aparelhoTacsTesteV1LimparMoradorRegistro_(sub,contexto.areaId);}
      resultado=aparelhoTacsTesteV1Estado_(device,sub,contexto,chave);resultado.chaveTecnica=chave;
    }else if(modo==='DESATIVAR'){
      var atual=aparelhoTacsTesteV1RegistroDispositivo_(device,contexto.areaId),subAtual=atual&&atual.subscriptionId||sub;
      aparelhoTacsTesteV1SalvarDispositivo_(device,contexto.areaId,aparelhoTacsTesteV1Operador_(acesso,contexto),false,'',subAtual);
      resultado=aparelhoTacsTesteV1Estado_(device,subAtual,contexto,'');
    }else{
      var precisaMigrar=Boolean(sub&&aparelhoTacsTesteV1LegacyAtivo_(sub,contexto.areaId)&&!aparelhoTacsTesteV1TokenValido_(device,contexto.areaId,chave));
      if(precisaMigrar){
        chave=aparelhoTacsTesteV1NovaChave_();
        aparelhoTacsTesteV1SalvarDispositivo_(device,contexto.areaId,aparelhoTacsTesteV1Operador_(acesso,contexto),true,chave,sub);
        resultado=aparelhoTacsTesteV1Estado_(device,sub,contexto,chave);resultado.chaveTecnica=chave;resultado.migradoLegado=true;
      }else resultado=aparelhoTacsTesteV1Estado_(device,sub,contexto,chave);
    }
  }catch(erro){resultado={ok:false,message:aparelhoTacsTesteV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))saudeNotificacoesV1GuardarResultado_(requestId,resultado);
  return saudeNotificacoesV1ResponderPost_(requestId,resultado);
}

function aparelhoTacsTesteV1Checkin_(p){
  p=p&&typeof p==='object'?p:{};
  var sub=aparelhoTacsTesteV1Sub_(p.subscriptionId||p.subscription_id),area=aparelhoTacsTesteV1Area_(p.areaId||p.area||'JAPARANDUBA');
  var device=aparelhoTacsTesteV1Dispositivo_(p.dispositivo||p.dispositivoTacs||p.deviceId),chave=aparelhoTacsTesteV1Chave_(p.chaveTacsTeste||p.chaveTecnica||'');
  var tokenAutorizado=Boolean(device&&chave&&aparelhoTacsTesteV1TokenValido_(device,area,chave));
  if(sub&&tokenAutorizado)aparelhoTacsTesteV1AssociarSubscription_(device,area,chave,sub);
  var protegido=tokenAutorizado;
  if(!protegido&&sub)protegido=Boolean(aparelhoTacsTesteV1MapaAtivos_(area)[sub]);
  if(!sub||!protegido)return aparelhoTacsTesteV1CheckinAnterior_(p);
  aparelhoTacsTesteV1RemoverVinculoFamilia_(sub,area);
  aparelhoTacsTesteV1LimparMoradorRegistro_(sub,area);
  var parametros={};Object.keys(p).forEach(function(k){parametros[k]=p[k];});
  delete parametros.documento;delete parametros.cpf;delete parametros.cns;
  var resultado=aparelhoTacsTesteV1CheckinAnterior_(parametros);
  if(!resultado||typeof resultado!=='object')resultado={ok:true};
  resultado.aparelhoTacsTeste=true;resultado.vinculadoMorador=false;resultado.vinculadoFamilia=false;resultado.familiaId='';resultado.familiaDiferente=false;
  resultado.message='Aparelho TACS / teste ativo. Este aparelho fica fora de vínculos com moradores e famílias durante os testes.';
  return resultado;
}

function aparelhoTacsTesteV1SaudeAdmin_(contexto,acesso){
  var resultado=aparelhoTacsTesteV1SaudeAdminAnterior_(contexto,acesso);if(!resultado||typeof resultado!=='object')return resultado;
  var mapa=aparelhoTacsTesteV1MapaAtivos_(contexto.areaId),refs={};Object.keys(mapa).forEach(function(sub){refs[sub.slice(-8)]=true;});var quantidade=0;
  (Array.isArray(resultado.aparelhos)?resultado.aparelhos:[]).forEach(function(aparelho){var ref=aparelhoTacsTesteV1Texto_(aparelho.subscriptionRef).toLowerCase();if(!refs[ref])return;quantidade++;aparelho.nome='🛠 Aparelho TACS / teste';aparelho.telefone='';aparelho.vinculadoMorador=false;aparelho.aparelhoTacsTeste=true;aparelho.motivo='Aparelho técnico: recebe Recados e Campanhas gerais, mas fica fora de mensagens individuais/familiares e não cria vínculo ao pesquisar famílias.';});
  if(resultado.contagens&&typeof resultado.contagens==='object')resultado.contagens.tacsTeste=quantidade;resultado.aparelhosTacsTeste=quantidade;return resultado;
}

function aparelhoTacsTesteV1FiltrarIndividual_(appId,apiKey,contexto,morador){var alvos=aparelhoTacsTesteV1MensagemIndividualAlvosAnterior_(appId,apiKey,contexto,morador),mapa=aparelhoTacsTesteV1MapaAtivos_(contexto.areaId);return (Array.isArray(alvos)?alvos:[]).filter(function(alvo){return !mapa[aparelhoTacsTesteV1Sub_(alvo&&alvo.subscriptionId)];});}
function aparelhoTacsTesteV1FiltrarFamilia_(contexto,familia){var resultado=aparelhoTacsTesteV1MensagemFamiliaAlvosAnterior_(contexto,familia);if(!resultado||typeof resultado!=='object')return resultado;var mapa=aparelhoTacsTesteV1MapaAtivos_(contexto.areaId);resultado.alvos=(Array.isArray(resultado.alvos)?resultado.alvos:[]).filter(function(alvo){return !mapa[aparelhoTacsTesteV1Sub_(alvo&&alvo.subscriptionId)];});return resultado;}

function aparelhoTacsTesteV1ConsultarFamilia_(p){
  p=p&&typeof p==='object'?p:{};var area=aparelhoTacsTesteV1Area_(p.areaId||p.area||''),device=aparelhoTacsTesteV1Dispositivo_(p.dispositivo||p.dispositivoTacs||p.deviceId),chave=aparelhoTacsTesteV1Chave_(p.chaveTacsTeste||p.chaveTecnica||''),sub=aparelhoTacsTesteV1Sub_(p.subscriptionId||p.subscription_id);
  var tokenAutorizado=Boolean(device&&aparelhoTacsTesteV1TokenValido_(device,area,chave)),legadoAutorizado=Boolean(sub&&aparelhoTacsTesteV1LegacyAtivo_(sub,area)),autorizado=tokenAutorizado||legadoAutorizado;if(!autorizado)return aparelhoTacsTesteV1ConsultaFamiliaAnterior_(p);
  if(tokenAutorizado&&sub)aparelhoTacsTesteV1AssociarSubscription_(device,area,chave,sub);
  var contexto=identificacaoFamiliarPublicaV1Contexto_(area),familia=identificacaoFamiliarPublicaV1NormalizarFamilia_(p.familia||p.familiaId||'');if(!familia)throw new Error('Informe um número de cadastro familiar válido.');
  var membros=identificacaoFamiliarPublicaV1Membros_(familia,contexto);if(!membros.length)return {ok:true,autorizada:false,requerConfirmacao:false,familiaId:familia,message:'Nenhum cadastro ativo desta família foi localizado na área atual.'};
  return {ok:true,autorizada:true,requerConfirmacao:false,familiaId:familia,autorizacao:tokenAutorizado?'APARELHO_TACS_TESTE':'APARELHO_TACS_TESTE_LEGADO',membros:membros,aparelhoTacsTeste:true};
}
