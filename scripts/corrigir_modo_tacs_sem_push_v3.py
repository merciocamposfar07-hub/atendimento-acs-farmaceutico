from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def write_text(path, content):
    p = ROOT / path
    p.write_text(content.rstrip() + "\n", encoding="utf-8")


def replace_any(path, olds, new):
    p = ROOT / path
    text = p.read_text(encoding="utf-8")
    if new in text:
        return
    found = [old for old in olds if old in text]
    if len(found) != 1:
        raise SystemExit(f"{path}: não foi possível localizar de forma única o trecho esperado ({len(found)} variantes encontradas)")
    p.write_text(text.replace(found[0], new, 1), encoding="utf-8")


BACKEND = r'''/**
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

function aparelhoTacsTesteV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{},action=aparelhoTacsTesteV1Texto_(p.action).toLowerCase();if(action!=='admin_notificacoes_aparelho_tacs_teste')return null;
  var requestId=aparelhoTacsTesteV1Texto_(p.requestId),resultado;
  try{
    requestId=saudeNotificacoesV1ValidarRequestId_(requestId);
    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);saudeNotificacoesV1ExigirAcesso_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||''),device=aparelhoTacsTesteV1Dispositivo_(p.dispositivo||p.deviceId),sub=aparelhoTacsTesteV1Sub_(p.subscriptionId||p.subscription_id),modo=aparelhoTacsTesteV1Texto_(p.modo||'CONSULTAR').toUpperCase(),chave=aparelhoTacsTesteV1Chave_(p.chaveTacsTeste||p.chaveTecnica||'');
    if(!device)throw new Error('Este aparelho ainda não foi identificado pela Central TACS. Atualize a Central e tente novamente.');
    if(['CONSULTAR','ATIVAR','DESATIVAR'].indexOf(modo)===-1)throw new Error('Modo do aparelho inválido.');
    if(modo==='ATIVAR'){
      chave=aparelhoTacsTesteV1NovaChave_();aparelhoTacsTesteV1SalvarDispositivo_(device,contexto.areaId,aparelhoTacsTesteV1Operador_(acesso,contexto),true,chave,sub);
      if(sub){aparelhoTacsTesteV1RemoverVinculoFamilia_(sub,contexto.areaId);aparelhoTacsTesteV1LimparMoradorRegistro_(sub,contexto.areaId);}
      resultado=aparelhoTacsTesteV1Estado_(device,sub,contexto,chave);resultado.chaveTecnica=chave;
    }else if(modo==='DESATIVAR'){
      var atual=aparelhoTacsTesteV1RegistroDispositivo_(device,contexto.areaId),subAtual=atual&&atual.subscriptionId||sub;
      aparelhoTacsTesteV1SalvarDispositivo_(device,contexto.areaId,aparelhoTacsTesteV1Operador_(acesso,contexto),false,'',subAtual);
      resultado=aparelhoTacsTesteV1Estado_(device,subAtual,contexto,'');
    }else resultado=aparelhoTacsTesteV1Estado_(device,sub,contexto,chave);
  }catch(erro){resultado={ok:false,message:aparelhoTacsTesteV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))saudeNotificacoesV1GuardarResultado_(requestId,resultado);
  return saudeNotificacoesV1ResponderPost_(requestId,resultado);
}

function aparelhoTacsTesteV1Checkin_(p){
  p=p&&typeof p==='object'?p:{};var sub=aparelhoTacsTesteV1Sub_(p.subscriptionId||p.subscription_id),area=aparelhoTacsTesteV1Area_(p.areaId||p.area||'JAPARANDUBA');
  if(!sub||!aparelhoTacsTesteV1LegacyAtivo_(sub,area))return aparelhoTacsTesteV1CheckinAnterior_(p);
  aparelhoTacsTesteV1RemoverVinculoFamilia_(sub,area);aparelhoTacsTesteV1LimparMoradorRegistro_(sub,area);
  var parametros={};Object.keys(p).forEach(function(k){parametros[k]=p[k];});delete parametros.documento;delete parametros.cpf;delete parametros.cns;
  var resultado=aparelhoTacsTesteV1CheckinAnterior_(parametros);if(!resultado||typeof resultado!=='object')resultado={ok:true};resultado.aparelhoTacsTeste=true;resultado.vinculadoFamilia=false;resultado.familiaId='';resultado.familiaDiferente=false;resultado.message='Aparelho TACS / teste ativo. O Push geral permanece separado e nenhum vínculo familiar é criado durante os testes.';return resultado;
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
  var autorizado=device&&aparelhoTacsTesteV1TokenValido_(device,area,chave);if(!autorizado)return aparelhoTacsTesteV1ConsultaFamiliaAnterior_(p);
  if(sub)aparelhoTacsTesteV1AssociarSubscription_(device,area,chave,sub);
  var contexto=identificacaoFamiliarPublicaV1Contexto_(area),familia=identificacaoFamiliarPublicaV1NormalizarFamilia_(p.familia||p.familiaId||'');if(!familia)throw new Error('Informe um número de cadastro familiar válido.');
  var membros=identificacaoFamiliarPublicaV1Membros_(familia,contexto);if(!membros.length)return {ok:true,autorizada:false,requerConfirmacao:false,familiaId:familia,message:'Nenhum cadastro ativo desta família foi localizado na área atual.'};
  return {ok:true,autorizada:true,requerConfirmacao:false,familiaId:familia,autorizacao:'APARELHO_TACS_TESTE',membros:membros,aparelhoTacsTeste:true};
}'''


ADMIN = r'''(function(){
  'use strict';
  if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
  if(!/\/painel-oficial-recados-campanhas\.html$/.test(String(location.pathname||'')))return;
  if(window.PortalTacsAparelhoTesteAdminV1)return;window.PortalTacsAparelhoTesteAdminV1=true;
  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',TECH_TOKEN_PREFIX='portalTacsAparelhoTesteTokenV3:';
  var BOX_ID='aparelhoTacsTesteV1Box',STYLE_ID='aparelhoTacsTesteV1Style',operando=false,ultimoEstado=null;
  function txt(v){return String(v==null?'':v).trim()}
  function areaAtual(){var s=document.getElementById('areaEnvio'),a=txt(s&&s.value)||new URLSearchParams(location.search||'').get('area')||'JAPARANDUBA';return String(a).toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA'}
  function novoDevice(){var bytes=new Uint8Array(16),out='';if(window.crypto&&window.crypto.getRandomValues){window.crypto.getRandomValues(bytes);for(var i=0;i<bytes.length;i++)out+=('0'+bytes[i].toString(16)).slice(-2)}else out=Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);return'iphone-'+out}
  function device(){var d='';try{d=txt(localStorage.getItem(DEVICE_KEY)||'');if(!d){d=novoDevice();localStorage.setItem(DEVICE_KEY,d)}}catch(e){}return d}
  function tokenStorageKey(){return TECH_TOKEN_PREFIX+areaAtual()+':'+device()}
  function chaveTecnica(){try{return txt(localStorage.getItem(tokenStorageKey())||'')}catch(e){return''}}
  function salvarChave(v){try{if(v)localStorage.setItem(tokenStorageKey(),v);else localStorage.removeItem(tokenStorageKey())}catch(e){}}
  function sessao(){var s={dispositivo:device(),areaId:areaAtual()},t=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',a=sessionStorage.getItem(TOKEN_KEY)||'';if(t)s.territorioToken=t;else if(a)s.token=a;var c=chaveTecnica();if(c)s.chaveTacsTeste=c;return s}
  function temSessao(){var s=sessao();return Boolean(s.territorioToken||s.token)}
  function requestId(){return'ap_tacs_device_'+Date.now()+'_'+Math.random().toString(36).slice(2,11)}
  function estilo(){if(document.getElementById(STYLE_ID))return;var s=document.createElement('style');s.id=STYLE_ID;s.textContent='#'+BOX_ID+'{margin:12px 0;padding:15px;border:2px solid #69c7e7;border-radius:17px;background:#eaf7fc;color:#073a55}#'+BOX_ID+' strong{display:block;font-size:1.08rem}#'+BOX_ID+' .apt-status{margin:7px 0 10px;font-weight:850;line-height:1.45}#'+BOX_ID+' .apt-help{margin:9px 0 0;color:#526d7b;font-size:.9rem;font-weight:750;line-height:1.45}#'+BOX_ID+' button{width:100%;min-height:54px;border:0;border-radius:15px;padding:12px 15px;background:#073a55;color:#fff;font-weight:950}#'+BOX_ID+' button[data-active="1"]{background:#607985}#'+BOX_ID+' button:disabled{opacity:.5;cursor:not-allowed}body.tema-petroleo #'+BOX_ID+'{background:#073a55;border-color:#69c7e7;color:#fff}body.tema-petroleo #'+BOX_ID+' .apt-help{color:#d8edf5}';document.head.appendChild(s)}
  function box(){var b=document.getElementById(BOX_ID);if(b)return b;var sec=document.getElementById('saudeNotificacoes');if(!sec)return null;estilo();b=document.createElement('div');b.id=BOX_ID;b.innerHTML='<strong>🛠 Este aparelho</strong><div class="apt-status" aria-live="polite">Identificando este aparelho…</div><button type="button" disabled>Preparando…</button><p class="apt-help">O modo TACS / teste libera a busca técnica pelo número do cadastro familiar nesta área. Não depende do Push. Recados e Campanhas continuam separados.</p>';var a=sec.querySelector('.saude-acoes');if(a&&a.parentNode)a.insertAdjacentElement('afterend',b);else sec.appendChild(b);b.querySelector('button').addEventListener('click',alternar);return b}
  function render(estado,erro){var b=box();if(!b)return;var st=b.querySelector('.apt-status'),bt=b.querySelector('button');if(erro){st.textContent=erro;bt.disabled=false;bt.dataset.active='0';bt.textContent='Tentar novamente';return}if(!temSessao()){st.textContent='Entre no painel para configurar este aparelho.';bt.disabled=true;bt.textContent='Entre no painel';return}if(!estado){st.textContent='Consultando a autorização técnica deste aparelho…';bt.disabled=true;bt.textContent='Aguarde…';return}var ativo=estado.aparelhoTacsTeste===true,autorizado=estado.autorizadoNesteAparelho===true;st.textContent=txt(estado.message)||(ativo?'Modo TACS / teste ativo.':'Modo TACS / teste desativado.');bt.disabled=operando;bt.dataset.active=ativo&&autorizado?'1':'0';bt.textContent=ativo&&autorizado?'Voltar este aparelho ao modo morador':(ativo?'🔐 Renovar autorização deste aparelho':'🛠 Ativar modo TACS / teste')}
  function jsonpResultado(id,inicio){return new Promise(function(resolve,reject){function consultar(){var cb='__aptDevice_'+Date.now()+'_'+Math.floor(Math.random()*100000),s=document.createElement('script'),done=false,t=setTimeout(function(){finish(null)},5000);function clean(){clearTimeout(t);try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.remove()}function finish(data){if(done)return;done=true;clean();if(data&&data.ok===true&&data.pendente===false&&data.result){resolve(data.result);return}if(Date.now()-inicio>25000){reject(new Error('A atualização deste aparelho demorou demais. Tente novamente.'));return}setTimeout(consultar,850)}window[cb]=finish;s.onerror=function(){finish(null)};s.src=API+'?action=admin_notificacoes_saude_result&requestId='+encodeURIComponent(id)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s)}consultar()})}
  function executar(modo){if(!temSessao())return Promise.reject(new Error('Entre no painel antes de configurar este aparelho.'));var id=requestId(),body=new URLSearchParams(),s=sessao();body.set('action','admin_notificacoes_aparelho_tacs_teste');body.set('requestId',id);body.set('modo',modo);Object.keys(s).forEach(function(k){body.set(k,s[k])});return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function(){return jsonpResultado(id,Date.now())})}
  function consultar(){if(operando)return;box();render(null);if(!temSessao()){render(null);return}executar('CONSULTAR').then(function(r){if(!r||r.ok!==true)throw new Error(txt(r&&r.message)||'Não foi possível consultar este aparelho.');ultimoEstado=r;render(r)}).catch(function(e){render(ultimoEstado,e.message)})}
  function alternar(){if(operando)return;if(!ultimoEstado){consultar();return}var ativo=ultimoEstado.aparelhoTacsTeste===true&&ultimoEstado.autorizadoNesteAparelho===true,modo=ativo?'DESATIVAR':'ATIVAR',pergunta=ativo?'Voltar este aparelho ao modo morador?':'Ativar o modo TACS / teste neste aparelho? A autorização ficará vinculada a este navegador e a esta área.';if(!window.confirm(pergunta))return;operando=true;render(ultimoEstado);var b=box(),st=b&&b.querySelector('.apt-status');if(st)st.textContent=ativo?'Desativando o modo TACS / teste…':'Ativando e autorizando este aparelho…';executar(modo).then(function(r){if(!r||r.ok!==true)throw new Error(txt(r&&r.message)||'Não foi possível atualizar este aparelho.');if(modo==='ATIVAR'){if(!r.chaveTecnica)throw new Error('O servidor não devolveu a autorização técnica deste aparelho.');salvarChave(r.chaveTecnica);r.autorizadoNesteAparelho=true}else salvarChave('');ultimoEstado=r;operando=false;render(r);var atualizar=document.getElementById('atualizarSaudeNotificacoes');if(atualizar)setTimeout(function(){atualizar.click()},250)}).catch(function(e){operando=false;render(ultimoEstado,e.message)})}
  function instalar(){box();consultar();var a=document.getElementById('areaEnvio');if(a)a.addEventListener('change',function(){ultimoEstado=null;setTimeout(consultar,150)});var sec=document.getElementById('saudeNotificacoes');if(sec&&typeof MutationObserver!=='undefined')new MutationObserver(function(){if(!sec.classList.contains('oculto'))setTimeout(consultar,100)}).observe(sec,{attributes:true,attributeFilter:['class']})}
  window.PortalTacsAparelhoTesteV3={deviceId:device,chave:chaveTecnica,consultar:consultar};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});else instalar();
}());'''


FAMILY = r'''(function(){
  'use strict';
  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var oneSignal=null,FAMILY_BOX='portalFamilyLookupV1',STYLE_ID='portalFamilyLookupStyleV1',DEVICE_KEY='portalTacsDispositivoV1',TECH_TOKEN_PREFIX='portalTacsAparelhoTesteTokenV3:';
  function text(v){return String(v==null?'':v).trim()}
  function digits(v){return text(v).replace(/\D/g,'').slice(0,15)}
  function normalizeFamily(v){var s=text(v).toUpperCase().replace(/\s+/g,''),m=s.match(/^(\d{1,4})([A-Z])?$/);if(!m)return'';var n=m[1];if(n.length<=3)n=('000'+n).slice(-3);return n+(m[2]||'')}
  function familyCandidate(v){var s=digits(v);return /^\d{2,4}$/.test(s)?normalizeFamily(s):''}
  function areaId(){var a='';try{var p=new URLSearchParams(location.search||'');a=p.get('areaId')||p.get('area')||p.get('territorio')||''}catch(e){}if(!a)try{a=window.PortalTacsArea&&typeof window.PortalTacsArea.id==='function'?window.PortalTacsArea.id():window.TACS_AREA_ID}catch(e){}return text(a||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA'}
  function subscriptionId(){try{var p=oneSignal&&oneSignal.User&&oneSignal.User.PushSubscription;return text(p&&p.id).toLowerCase()}catch(e){return''}}
  function deviceId(){try{return text(localStorage.getItem(DEVICE_KEY)||'')}catch(e){return''}}
  function tokenKey(){var d=deviceId();return d?TECH_TOKEN_PREFIX+areaId()+':'+d:''}
  function technicalToken(){try{var k=tokenKey();return k?text(localStorage.getItem(k)||''):''}catch(e){return''}}
  function tacsTeste(){return Boolean(deviceId()&&technicalToken())}
  function escapeHtml(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]})}
  function ensureStyle(){if(document.getElementById(STYLE_ID))return;var s=document.createElement('style');s.id=STYLE_ID;s.textContent='#'+FAMILY_BOX+'{grid-column:1/-1;margin-top:10px;padding:15px;border:2px solid #69c7e7;border-radius:16px;background:#eaf7fc;color:#083550}#'+FAMILY_BOX+'[hidden]{display:none!important}.tacs-family-action,.tacs-family-member{width:100%;min-height:54px;border:2px solid #49bfe6;border-radius:14px;background:#074b68;color:#fff;padding:11px 14px;font-weight:900;font-size:16px;cursor:pointer}.tacs-family-member{margin-top:9px;text-align:left;background:#fff;color:#073a55}.tacs-family-member span{display:block;margin-top:3px;color:#4e6672;font-size:13px}.tacs-family-title{display:block;margin-bottom:8px;font-size:18px;font-weight:950}.tacs-family-help{margin:7px 0 0;font-weight:750}.tacs-family-confirm{display:grid;gap:9px;margin-top:10px}.tacs-family-confirm input{min-height:54px;width:100%;border:2px solid #8aa7b5;border-radius:14px;padding:11px 13px}.tacs-family-ok{border-color:#78cea0!important;background:#eaf8ef!important;color:#076b35!important}.tacs-family-warn{border-color:#e0ad4d!important;background:#fff5dd!important;color:#714300!important}';document.head.appendChild(s)}
  function box(){var b=document.getElementById(FAMILY_BOX);if(b)return b;var status=document.getElementById('cpfStatus'),label=status&&status.closest?status.closest('label'):null;if(!label||!label.parentNode)return null;b=document.createElement('div');b.id=FAMILY_BOX;b.hidden=true;b.setAttribute('role','status');label.parentNode.insertBefore(b,label.nextSibling);return b}
  function setBox(html,cls){var b=box();if(!b)return;b.className=cls||'';b.innerHTML=html;b.hidden=false}
  function hide(){var b=box();if(b){b.hidden=true;b.innerHTML='';b.className=''}}
  function jsonp(params){return new Promise(function(resolve,reject){var cb='__tacsFam_'+Date.now()+'_'+Math.floor(Math.random()*1e6),s=document.createElement('script'),done=false,t=setTimeout(function(){finish(null,new Error('A consulta demorou demais. Tente novamente.'))},12000);function finish(data,err){if(done)return;done=true;clearTimeout(t);try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.remove();err?reject(err):resolve(data)}window[cb]=function(d){finish(d,null)};s.onerror=function(){finish(null,new Error('Não foi possível consultar agora.'))};params.callback=cb;params._=Date.now();s.src=API+'?'+Object.keys(params).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k])}).join('&');document.head.appendChild(s)})}
  function renderStart(){var input=document.getElementById('cpf'),fam=familyCandidate(input&&input.value);if(!fam){hide();return}setBox('<strong class="tacs-family-title">Cadastro familiar '+escapeHtml(fam)+'</strong><button type="button" class="tacs-family-action" data-family-search="'+escapeHtml(fam)+'">👨‍👩‍👧‍👦 Buscar esta família</button><p class="tacs-family-help">'+(tacsTeste()?'Modo TACS / teste autorizado: consulta técnica desta família.':'Para proteger os dados da família, será necessário confirmar um integrante cadastrado.')+'</p>','')}
  function renderConfirm(fam,msg){setBox('<strong class="tacs-family-title">Família '+escapeHtml(fam)+'</strong><p>'+escapeHtml(msg||'Confirme um integrante da família.')+'</p><div class="tacs-family-confirm"><input id="tacsFamilyConfirmDoc" inputmode="numeric" autocomplete="off" placeholder="CPF ou Cartão SUS de um integrante"><button type="button" class="tacs-family-action" data-family-confirm="'+escapeHtml(fam)+'">Confirmar família</button></div>','tacs-family-warn')}
  function renderMembers(r){var m=Array.isArray(r&&r.membros)?r.membros:[],html='<strong class="tacs-family-title">Quem precisa do atendimento?</strong><p class="tacs-family-help">Família '+escapeHtml(r.familiaId)+'. Toque no nome para carregar nome, nascimento e localidade.</p>';m.forEach(function(i){html+='<button type="button" class="tacs-family-member" data-member-token="'+escapeHtml(i.token)+'"'+(i.temDocumento?'':' disabled')+'>'+escapeHtml(i.nome)+'<span>'+(i.nascimento?'Nascimento: '+escapeHtml(i.nascimento):'')+(i.temDocumento?'':' • Sem CPF/CNS para carregamento automático')+'</span></button>'});setBox(html,'tacs-family-ok')}
  function searchFamily(fam,confirmation){setBox('<strong class="tacs-family-title">Procurando a família '+escapeHtml(fam)+'…</strong>','');var p={action:'publico_familia_consultar',areaId:areaId(),familia:fam,subscriptionId:subscriptionId(),dispositivo:deviceId(),chaveTacsTeste:technicalToken()};if(confirmation)p.documentoConfirmacao=digits(confirmation);jsonp(p).then(function(r){if(r&&r.ok===true&&r.autorizada===true){renderMembers(r);return}if(r&&r.requerConfirmacao===true){renderConfirm(r.familiaId||fam,r.message);return}setBox(escapeHtml(r&&r.message||'Não foi possível consultar a família.'),'tacs-family-warn')}).catch(function(e){setBox(escapeHtml(e.message),'tacs-family-warn')})}
  function selectMember(token){setBox('<strong class="tacs-family-title">Carregando o cadastro selecionado…</strong>','');jsonp({action:'publico_familia_membro',areaId:areaId(),token:token}).then(function(r){if(!r||r.ok!==true||!r.documentoAcesso){setBox(escapeHtml(r&&r.message||'Não foi possível carregar este integrante.'),'tacs-family-warn');return}var input=document.getElementById('cpf');if(!input)return;input.value=r.documentoAcesso;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));setBox('<strong class="tacs-family-title">'+escapeHtml(r.nome||'Cadastro selecionado')+'</strong><p class="tacs-family-help">Carregando nome, nascimento e localidade…</p>','tacs-family-ok');setTimeout(hide,1800)}).catch(function(e){setBox(escapeHtml(e.message),'tacs-family-warn')})}
  function install(){ensureStyle();var input=document.getElementById('cpf'),status=document.getElementById('cpfStatus');if(!input||!status){setTimeout(install,120);return}var label=input.closest('label');if(label&&label.firstChild){label.firstChild.textContent='CPF, Cartão SUS (CNS) ou cadastro da família ';input.placeholder='CPF, Cartão SUS ou família (ex.: 053)'}box();renderStart()}
  document.addEventListener('input',function(e){if(e.target&&e.target.id==='cpf')setTimeout(renderStart,0)});
  document.addEventListener('click',function(e){var t=e.target;if(!t||!t.getAttribute)return;var f=t.getAttribute('data-family-search');if(f){searchFamily(f,'');return}var c=t.getAttribute('data-family-confirm');if(c){var i=document.getElementById('tacsFamilyConfirmDoc');searchFamily(c,i&&i.value);return}var token=t.getAttribute('data-member-token');if(token)selectMember(token)});
  window.OneSignalDeferred=window.OneSignalDeferred||[];window.OneSignalDeferred.push(function(o){oneSignal=o});
  window.PortalTacsIdentificacaoFamilia={instalar:install,buscarFamilia:searchFamily};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}());'''


TEST = r'''\'use strict\';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const backend=read('apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs');
const admin=read('admin-aparelho-tacs-teste-v1.js');
const familyClient=read('portal-identificacao-familia-v1.js');
const loader=read('recados-campanhas-whatsapp-mensal-v12.js');
const build=read('scripts/build_apps_script_release.js');
const geral=read('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs');
new vm.Script(backend,{filename:'ZZZZ_45_AparelhoTacsTesteV1.gs'});
new vm.Script(admin,{filename:'admin-aparelho-tacs-teste-v1.js'});
new vm.Script(familyClient,{filename:'portal-identificacao-familia-v1.js'});
const SUB_TEST='11111111-1111-4111-8111-11111111aaaa',SUB_NORMAL='22222222-2222-4222-8222-22222222bbbb',DEVICE_TEST='iphone-0123456789abcdef0123456789abcdef',TOKEN_TEST='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0123456789_abcd';
let generalTargetSentinel=function(){return'GERAL_INTACTO'};
const sandbox={console,doPost:function(){return'POST_ANTERIOR'},saudeNotificacoesV1CheckinPublico_:function(p){return{ok:true,recebido:p}},saudeNotificacoesV1SaudeAdmin_:function(){return{ok:true,contagens:{},aparelhos:[{nome:'Morador teste',subscriptionRef:SUB_TEST.slice(-8),status:'ATIVO',motivo:'normal'},{nome:'Morador normal',subscriptionRef:SUB_NORMAL.slice(-8),status:'ATIVO',motivo:'normal'}]}},mensagemIndividualV1Alvos_:function(){return[{subscriptionId:SUB_TEST},{subscriptionId:SUB_NORMAL}]},buscaEnvioFamiliaV1Alvos_:function(){return{alvos:[{subscriptionId:SUB_TEST},{subscriptionId:SUB_NORMAL}]}},identificacaoFamiliarPublicaV1ConsultarFamilia_:function(){return{ok:true,autorizada:false,requerConfirmacao:true}},moradoresAdminV1NormalizarAreaId_:function(v){return String(v||'').toUpperCase()},notificacoesAreaV1AlvosAtivos_:generalTargetSentinel,Object};
vm.createContext(sandbox);new vm.Script(backend).runInContext(sandbox);
sandbox.aparelhoTacsTesteV1MapaAtivos_=function(){return{[SUB_TEST]:true}};
sandbox.aparelhoTacsTesteV1TokenValido_=function(device,area,token){return device===DEVICE_TEST&&area==='JAPARANDUBA'&&token===TOKEN_TEST};
sandbox.aparelhoTacsTesteV1AssociarSubscription_=function(){return true};
sandbox.identificacaoFamiliarPublicaV1Contexto_=function(area){return{areaId:area}};
sandbox.identificacaoFamiliarPublicaV1NormalizarFamilia_=function(v){return String(v)==='53'?'053':String(v)};
sandbox.identificacaoFamiliarPublicaV1Membros_=function(f){return f==='053'?[{token:'x',nome:'MORADOR',temDocumento:true}]:[]};
const individual=Array.from(sandbox.mensagemIndividualV1Alvos_('app','key',{areaId:'JAPARANDUBA'},{}));assert.deepEqual(individual.map(x=>x.subscriptionId),[SUB_NORMAL]);
const familiar=sandbox.buscaEnvioFamiliaV1Alvos_({areaId:'JAPARANDUBA'},'053');assert.deepEqual(Array.from(familiar.alvos).map(x=>x.subscriptionId),[SUB_NORMAL]);
assert.equal(sandbox.notificacoesAreaV1AlvosAtivos_,generalTargetSentinel);
const familyOk=sandbox.identificacaoFamiliarPublicaV1ConsultarFamilia_({areaId:'JAPARANDUBA',familia:'53',dispositivo:DEVICE_TEST,chaveTacsTeste:TOKEN_TEST,subscriptionId:SUB_TEST});assert.equal(familyOk.autorizada,true);assert.equal(familyOk.familiaId,'053');assert.equal(familyOk.autorizacao,'APARELHO_TACS_TESTE');
const familyNoToken=sandbox.identificacaoFamiliarPublicaV1ConsultarFamilia_({areaId:'JAPARANDUBA',familia:'53',dispositivo:DEVICE_TEST});assert.equal(familyNoToken.requerConfirmacao,true,'Sem chave técnica deve permanecer no fluxo protegido do morador.');
assert.match(backend,/VERSAO:'1\\.2\\.0'/);assert.match(backend,/CHAVE_HASH/);assert.match(backend,/computeDigest/);assert.match(backend,/chaveTacsTeste/);assert.doesNotMatch(backend,/notificacoesAreaV1AlvosAtivos_\\s*=/);assert.match(geral,/notificacoesAreaV1AlvosAtivos_/);
assert.match(admin,/TECH_TOKEN_PREFIX='portalTacsAparelhoTesteTokenV3:'/);assert.match(admin,/admin_notificacoes_aparelho_tacs_teste/);assert.doesNotMatch(admin,/OneSignal/);assert.doesNotMatch(admin,/requestPermission\\s*\\(/);assert.match(admin,/Ativar modo TACS \\/ teste/);
assert.match(familyClient,/\\^\\\\d\\{2,4\\}\\$/);assert.match(familyClient,/chaveTacsTeste:technicalToken\\(\\)/);assert.match(familyClient,/dispositivo:deviceId\\(\\)/);assert.match(familyClient,/nome, nascimento e localidade/);
assert.match(loader,/admin-aparelho-tacs-teste-v1\\.js\\?v=20260821-tacs-device-v3/);assert.match(build,/ZZZZ_45_AparelhoTacsTesteV1\\.gs/);assert.match(build,/TACS_APARELHO_TACS_TESTE_V1/);
console.log('Modo TACS/teste V1.2: dispositivo autorizado no servidor, sem dependência de Push e com busca familiar protegida.');'''

write_text('apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs', BACKEND)
write_text('admin-aparelho-tacs-teste-v1.js', ADMIN)
write_text('portal-identificacao-familia-v1.js', FAMILY)
write_text('scripts/test_aparelho_tacs_teste_v1.js', TEST)

replace_any(
    'moradores-autofill.js',
    [
        "      } else if (doc.length) {\n        clearResidentFields();\n        setStatus(status, 'Digite um CPF válido ou os 15 números do Cartão SUS (CNS).', 'invalid');\n      } else {"
    ],
    "      } else if (/^\\d{2,4}$/.test(doc)) {\n        clearResidentFields();\n        setStatus(status, 'Número de cadastro familiar informado. Toque em Buscar esta família abaixo.', '');\n      } else if (doc.length) {\n        clearResidentFields();\n        setStatus(status, 'Digite um CPF válido ou os 15 números do Cartão SUS (CNS).', 'invalid');\n      } else {"
)

replace_any('portal-auto-update.js',[
    'portal-identificacao-familia-v1.js?v=20260820-v1',
    'portal-identificacao-familia-v1.js?v=20260821-sem-push-v2'
],'portal-identificacao-familia-v1.js?v=20260821-tacs-device-v3')
replace_any('recados-campanhas-whatsapp-mensal-v12.js',[
    'admin-aparelho-tacs-teste-v1.js?v=20260820-v1',
    'admin-aparelho-tacs-teste-v1.js?v=20260821-sem-push-v2'
],'admin-aparelho-tacs-teste-v1.js?v=20260821-tacs-device-v3')
replace_any('painel-oficial-recados-campanhas.html',[
    'recados-campanhas-whatsapp-mensal-v12.js?v=20260820-aparelho-tacs-teste-v1',
    'recados-campanhas-whatsapp-mensal-v12.js?v=20260821-sem-push-v2'
],'recados-campanhas-whatsapp-mensal-v12.js?v=20260821-tacs-device-v3')
replace_any('index.html',[
    'moradores-autofill.js?v=20260820-familia-autofill-v112',
    'moradores-autofill.js?v=20260821-sem-push-v2'
],'moradores-autofill.js?v=20260821-tacs-device-v3')
replace_any('index.html',[
    'portal-auto-update.js?v=20260812-v101',
    'portal-auto-update.js?v=20260821-sem-push-v2'
],'portal-auto-update.js?v=20260821-tacs-device-v3')

write_text('portal-version.json',json.dumps({
    'version':'modo-tacs-device-v3-20260821-1021',
    'releasedAt':'2026-08-21T13:21:00Z',
    'scope':'Modo TACS/teste autorizado por dispositivo e busca familiar por número de cadastro'
},ensure_ascii=False,indent=2))

print('Correção segura do modo TACS por dispositivo V3 preparada.')