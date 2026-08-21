from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def write_text(path, content):
    p = ROOT / path
    p.write_text(content.rstrip() + "\n", encoding="utf-8")


def replace_once(path, old, new):
    p = ROOT / path
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: esperado 1 ocorrência, encontrado {count}: {old[:90]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


BACKEND = r'''/**
 * Portal TACS — aparelho TACS / teste V1.1.0
 *
 * Ajuste V1.1.0:
 * - o modo técnico não depende mais de inscrição Push/OneSignal;
 * - usa o identificador estável do aparelho já adotado pela Central TACS;
 * - mantém compatibilidade com ativações antigas vinculadas por subscriptionId;
 * - permite busca de família por número no aparelho técnico, sem confirmação CPF/CNS;
 * - se o Push existir, continua excluindo o aparelho de mensagens individuais/familiares;
 * - Recados e Campanhas continuam independentes e só dependem do Push estar ativo.
 */
var TACS_APARELHO_TACS_TESTE_V1=Object.freeze({
  VERSAO:'1.1.0',
  SHEET:'TACS_APARELHOS_TACS_TESTE',
  HEADERS:Object.freeze([
    'SUBSCRIPTION_ID','AREA_ID','OPERADOR_ID','ATIVO','MARCADO_EM','ATUALIZADO_EM'
  ]),
  DEVICE_SHEET:'TACS_APARELHOS_TACS_TESTE_DISPOSITIVOS',
  DEVICE_HEADERS:Object.freeze([
    'DISPOSITIVO','AREA_ID','OPERADOR_ID','ATIVO','MARCADO_EM','ATUALIZADO_EM','SUBSCRIPTION_ID'
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
function aparelhoTacsTesteV1Dispositivo_(v){
  var s=aparelhoTacsTesteV1Texto_(v);
  return /^[A-Za-z0-9._:-]{8,180}$/.test(s)?s:'';
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

function aparelhoTacsTesteV1DeviceSheet_(){
  return saudeNotificacoesV1GarantirSheet_(
    tacsTerritorioV1Planilha_(),
    TACS_APARELHO_TACS_TESTE_V1.DEVICE_SHEET,
    TACS_APARELHO_TACS_TESTE_V1.DEVICE_HEADERS
  );
}

function aparelhoTacsTesteV1MapaDispositivosAtivos_(areaId){
  areaId=aparelhoTacsTesteV1Area_(areaId);
  var map={},sheet=aparelhoTacsTesteV1DeviceSheet_(),last=sheet.getLastRow();
  if(last<=1)return map;
  sheet.getRange(2,1,last-1,TACS_APARELHO_TACS_TESTE_V1.DEVICE_HEADERS.length).getDisplayValues().forEach(function(row){
    var device=aparelhoTacsTesteV1Dispositivo_(row[0]),area=aparelhoTacsTesteV1Area_(row[1]);
    if(device&&area===areaId&&aparelhoTacsTesteV1Sim_(row[3]))map[device]={subscriptionId:aparelhoTacsTesteV1Sub_(row[6])};
  });
  return map;
}

function aparelhoTacsTesteV1MapaAtivos_(areaId){
  areaId=aparelhoTacsTesteV1Area_(areaId);
  var map={},sheet=aparelhoTacsTesteV1Sheet_(),last=sheet.getLastRow();
  if(last>1){
    sheet.getRange(2,1,last-1,TACS_APARELHO_TACS_TESTE_V1.HEADERS.length).getDisplayValues().forEach(function(row){
      var sub=aparelhoTacsTesteV1Sub_(row[0]),area=aparelhoTacsTesteV1Area_(row[1]);
      if(sub&&area===areaId&&aparelhoTacsTesteV1Sim_(row[3]))map[sub]=true;
    });
  }
  var devices=aparelhoTacsTesteV1MapaDispositivosAtivos_(areaId);
  Object.keys(devices).forEach(function(device){
    var sub=aparelhoTacsTesteV1Sub_(devices[device]&&devices[device].subscriptionId);
    if(sub)map[sub]=true;
  });
  return map;
}

function aparelhoTacsTesteV1Ativo_(subscriptionId,areaId,dispositivo){
  var sub=aparelhoTacsTesteV1Sub_(subscriptionId),device=aparelhoTacsTesteV1Dispositivo_(dispositivo);
  if(device&&aparelhoTacsTesteV1MapaDispositivosAtivos_(areaId)[device])return true;
  return Boolean(sub&&aparelhoTacsTesteV1MapaAtivos_(areaId)[sub]);
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

function aparelhoTacsTesteV1SalvarModoDispositivo_(dispositivo,subscriptionId,areaId,operadorId,ativo){
  var device=aparelhoTacsTesteV1Dispositivo_(dispositivo),sub=aparelhoTacsTesteV1Sub_(subscriptionId),area=aparelhoTacsTesteV1Area_(areaId);
  if(!device||!area)throw new Error('Este aparelho ainda não possui identificação técnica válida. Abra novamente pela Central TACS.');
  var sheet=aparelhoTacsTesteV1DeviceSheet_(),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('O modo deste aparelho está sendo atualizado. Tente novamente.');
  try{
    var last=sheet.getLastRow(),linha=0,marcado='',subAtual='';
    if(last>1){
      var rows=sheet.getRange(2,1,last-1,TACS_APARELHO_TACS_TESTE_V1.DEVICE_HEADERS.length).getDisplayValues();
      for(var i=rows.length-1;i>=0;i--){
        if(aparelhoTacsTesteV1Dispositivo_(rows[i][0])!==device||aparelhoTacsTesteV1Area_(rows[i][1])!==area)continue;
        linha=i+2;marcado=aparelhoTacsTesteV1Texto_(rows[i][4]);subAtual=aparelhoTacsTesteV1Sub_(rows[i][6]);break;
      }
    }
    var agora=aparelhoTacsTesteV1Agora_();
    if(ativo&&!marcado)marcado=agora;
    var values=[device,area,aparelhoTacsTesteV1Texto_(operadorId)||'TACS',ativo?'SIM':'NAO',marcado||agora,agora,sub||subAtual];
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

function aparelhoTacsTesteV1Estado_(subscriptionId,dispositivo,contexto){
  var sub=aparelhoTacsTesteV1Sub_(subscriptionId),device=aparelhoTacsTesteV1Dispositivo_(dispositivo),area=contexto&&contexto.areaId?contexto.areaId:'';
  if(!sub&&!device)throw new Error('Este navegador ainda não possui identificação técnica. Abra novamente pela Central TACS.');
  var ativo=aparelhoTacsTesteV1Ativo_(sub,area,device);
  var pushDisponivel=Boolean(sub&&aparelhoTacsTesteV1RegistroSaudeExiste_(sub,area));
  return {
    ok:true,areaId:area,subscriptionRef:sub?sub.slice(-8):'',deviceRef:device?device.slice(-8):'',disponivel:Boolean(device||sub),
    aparelhoTacsTeste:ativo,pushDisponivel:pushDisponivel,
    recebeRecadosCampanhas:pushDisponivel,
    recebeMensagensIndividuaisFamiliares:ativo?false:true,
    message:ativo
      ?(pushDisponivel
        ?'Modo TACS / teste ativo. A busca pelo número da família está liberada; Recados e Campanhas continuam ativos, e mensagens individuais/familiares ficam bloqueadas neste aparelho.'
        :'Modo TACS / teste ativo. A busca pelo número da família funciona mesmo sem Push. Para receber Recados e Campanhas neste aparelho, ative os avisos quando desejar.')
      :'Este aparelho pode ser marcado como TACS / teste mesmo sem Push. O modo técnico libera a busca familiar sem vincular o aparelho às famílias pesquisadas.'
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
    var device=aparelhoTacsTesteV1Dispositivo_(p.dispositivo||p.deviceId||p.device_id);
    if(!sub&&!device)throw new Error('Este aparelho ainda não possui identificação técnica. Volte à Central TACS e abra o painel novamente.');
    var modo=aparelhoTacsTesteV1Texto_(p.modo||'CONSULTAR').toUpperCase();
    if(['CONSULTAR','ATIVAR','DESATIVAR'].indexOf(modo)===-1)throw new Error('Modo do aparelho inválido.');
    var operador=aparelhoTacsTesteV1Operador_(acesso,contexto);
    if(modo==='ATIVAR'){
      if(device)aparelhoTacsTesteV1SalvarModoDispositivo_(device,sub,contexto.areaId,operador,true);
      else aparelhoTacsTesteV1SalvarModo_(sub,contexto.areaId,operador,true);
      if(sub){aparelhoTacsTesteV1RemoverVinculoFamilia_(sub,contexto.areaId);aparelhoTacsTesteV1LimparMoradorRegistro_(sub,contexto.areaId);}
    }else if(modo==='DESATIVAR'){
      if(device)aparelhoTacsTesteV1SalvarModoDispositivo_(device,sub,contexto.areaId,operador,false);
      if(sub)aparelhoTacsTesteV1SalvarModo_(sub,contexto.areaId,operador,false);
    }else if(device&&sub&&aparelhoTacsTesteV1Ativo_(sub,contexto.areaId,device)){
      aparelhoTacsTesteV1SalvarModoDispositivo_(device,sub,contexto.areaId,operador,true);
    }
    resultado=aparelhoTacsTesteV1Estado_(sub,device,contexto);
  }catch(erro){resultado={ok:false,message:aparelhoTacsTesteV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))saudeNotificacoesV1GuardarResultado_(requestId,resultado);
  return saudeNotificacoesV1ResponderPost_(requestId,resultado);
}

function aparelhoTacsTesteV1Checkin_(p){
  p=p&&typeof p==='object'?p:{};
  var sub=aparelhoTacsTesteV1Sub_(p.subscriptionId||p.subscription_id);
  var device=aparelhoTacsTesteV1Dispositivo_(p.dispositivo||p.deviceId||p.device_id);
  var area=aparelhoTacsTesteV1Area_(p.areaId||p.area||'JAPARANDUBA');
  if(!aparelhoTacsTesteV1Ativo_(sub,area,device))return aparelhoTacsTesteV1CheckinAnterior_(p);
  if(device&&sub){try{aparelhoTacsTesteV1SalvarModoDispositivo_(device,sub,area,'PORTAL_CHECKIN',true);}catch(e){}}
  if(sub){aparelhoTacsTesteV1RemoverVinculoFamilia_(sub,area);aparelhoTacsTesteV1LimparMoradorRegistro_(sub,area);}
  var parametros={};Object.keys(p).forEach(function(k){parametros[k]=p[k];});
  delete parametros.documento;delete parametros.cpf;delete parametros.cns;
  var resultado=aparelhoTacsTesteV1CheckinAnterior_(parametros);
  if(!resultado||typeof resultado!=='object')resultado={ok:true};
  resultado.aparelhoTacsTeste=true;
  resultado.vinculadoFamilia=false;
  resultado.familiaId='';
  resultado.familiaDiferente=false;
  resultado.message='Aparelho TACS / teste ativo. Nenhum vínculo familiar é criado por pesquisas técnicas.';
  return resultado;
}

function aparelhoTacsTesteV1SaudeAdmin_(contexto,acesso){
  var resultado=aparelhoTacsTesteV1SaudeAdminAnterior_(contexto,acesso);
  if(!resultado||typeof resultado!=='object')return resultado;
  var mapa=aparelhoTacsTesteV1MapaAtivos_(contexto.areaId),refs={};
  Object.keys(mapa).forEach(function(sub){refs[sub.slice(-8)]=true;});
  var quantidadePush=0;
  (Array.isArray(resultado.aparelhos)?resultado.aparelhos:[]).forEach(function(aparelho){
    var ref=aparelhoTacsTesteV1Texto_(aparelho.subscriptionRef).toLowerCase();
    if(!refs[ref])return;
    quantidadePush++;
    aparelho.nome='🛠 Aparelho TACS / teste';
    aparelho.telefone='';
    aparelho.vinculadoMorador=false;
    aparelho.aparelhoTacsTeste=true;
    aparelho.motivo='Aparelho técnico: recebe Recados e Campanhas quando o Push está ativo; não recebe mensagens individuais ou familiares e não cria vínculo com famílias pesquisadas.';
  });
  var quantidadeDispositivos=Object.keys(aparelhoTacsTesteV1MapaDispositivosAtivos_(contexto.areaId)).length;
  var quantidade=Math.max(quantidadePush,quantidadeDispositivos);
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
  var device=aparelhoTacsTesteV1Dispositivo_(p.dispositivo||p.deviceId||p.device_id);
  var area=aparelhoTacsTesteV1Area_(p.areaId||p.area||'');
  if(!area||!aparelhoTacsTesteV1Ativo_(sub,area,device))return aparelhoTacsTesteV1ConsultaFamiliaAnterior_(p);
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
}'''

ADMIN = r'''(function(){
  'use strict';
  if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
  if(!/\/painel-oficial-recados-campanhas\.html$/.test(String(location.pathname||'')))return;
  if(window.PortalTacsAparelhoTesteAdminV1)return;
  window.PortalTacsAparelhoTesteAdminV1=true;

  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var APP_ID='e2294b98-c72b-4f8c-a055-de28979676dc';
  var SAFARI_ID='web.onesignal.auto.4bead971-106d-461b-853f-83aecbd62d40';
  var TOKEN_KEY='portalTacsAdminTokenV1';
  var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
  var DEVICE_KEY='portalTacsDispositivoV1';
  var BOX_ID='aparelhoTacsTesteV1Box';
  var STYLE_ID='aparelhoTacsTesteV1Style';
  var OneSignalRef=null,operando=false,ultimoEstado=null;

  function txt(v){return String(v==null?'':v).trim()}
  function areaAtual(){
    var select=document.getElementById('areaEnvio');
    var area=txt(select&&select.value)||new URLSearchParams(location.search||'').get('area')||'JAPARANDUBA';
    return String(area).toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA';
  }
  function dispositivo(){try{return txt(localStorage.getItem(DEVICE_KEY)||'')}catch(e){return ''}}
  function sessao(){
    var s={dispositivo:dispositivo(),areaId:areaAtual()};
    var territorio=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'';
    var token=sessionStorage.getItem(TOKEN_KEY)||'';
    if(territorio)s.territorioToken=territorio;else if(token)s.token=token;
    return s;
  }
  function temSessao(){var s=sessao();return Boolean(s.territorioToken||s.token)}
  function estadoPush(){
    try{
      var push=OneSignalRef&&OneSignalRef.User&&OneSignalRef.User.PushSubscription;
      return {id:txt(push&&push.id).toLowerCase(),optedIn:Boolean(push&&push.optedIn===true),permission:Boolean(OneSignalRef&&OneSignalRef.Notifications&&OneSignalRef.Notifications.permission===true)};
    }catch(e){return{id:'',optedIn:false,permission:false}}
  }
  function subValido(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(txt(v).toLowerCase())}
  function requestId(){return 'ap_tacs_teste_'+Date.now()+'_'+Math.random().toString(36).slice(2,11)}

  function estilo(){
    if(document.getElementById(STYLE_ID))return;
    var s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='#'+BOX_ID+'{margin:12px 0;padding:15px;border:2px solid #69c7e7;border-radius:17px;background:#eaf7fc;color:#073a55}#'+BOX_ID+' strong{display:block;font-size:1.08rem}#'+BOX_ID+' .apt-status{margin:7px 0 10px;font-weight:850;line-height:1.45}#'+BOX_ID+' .apt-help{margin:9px 0 0;color:#526d7b;font-size:.9rem;font-weight:750;line-height:1.45}#'+BOX_ID+' button{width:100%;min-height:54px;border:0;border-radius:15px;padding:12px 15px;background:#073a55;color:#fff;font-weight:950}#'+BOX_ID+' button[data-active="1"]{background:#607985}#'+BOX_ID+' button:disabled{opacity:.5;cursor:not-allowed}body.tema-petroleo #'+BOX_ID+'{background:#073a55;border-color:#69c7e7;color:#fff}body.tema-petroleo #'+BOX_ID+' .apt-help{color:#d8edf5}';
    document.head.appendChild(s);
  }
  function garantirBox(){
    var box=document.getElementById(BOX_ID);if(box)return box;
    var sec=document.getElementById('saudeNotificacoes');if(!sec)return null;
    estilo();box=document.createElement('div');box.id=BOX_ID;
    box.innerHTML='<strong>🛠 Este aparelho</strong><div class="apt-status" aria-live="polite">Identificando esta instalação…</div><button type="button" disabled>Preparando…</button><p class="apt-help">O modo TACS / teste usa a identificação técnica deste aparelho. A busca por cadastro familiar funciona mesmo sem Push; avisos Push continuam sendo configurados separadamente.</p>';
    var acoes=sec.querySelector('.saude-acoes');
    if(acoes&&acoes.parentNode)acoes.insertAdjacentElement('afterend',box);else sec.appendChild(box);
    box.querySelector('button').addEventListener('click',alternar);
    return box;
  }
  function render(estado,msgErro){
    var box=garantirBox();if(!box)return;
    var st=box.querySelector('.apt-status'),b=box.querySelector('button');
    if(msgErro){st.textContent=msgErro;b.disabled=true;b.textContent='Modo TACS / teste indisponível';b.dataset.active='0';return}
    if(!temSessao()){st.textContent='Entre no painel para configurar este aparelho.';b.disabled=true;b.textContent='Entre no painel';b.dataset.active='0';return}
    if(!dispositivo()){st.textContent='Este aparelho perdeu a identificação da Central TACS. Volte à Central e abra este painel novamente.';b.disabled=true;b.textContent='Abra novamente pela Central';b.dataset.active='0';return}
    if(!estado){st.textContent='Consultando o modo deste aparelho…';b.disabled=true;b.textContent='Aguarde…';b.dataset.active='0';return}
    var ativo=estado.aparelhoTacsTeste===true;
    st.textContent=txt(estado.message)||(ativo?'Aparelho em modo TACS / teste.':'Aparelho em modo normal.');
    b.disabled=operando||estado.disponivel===false;
    b.dataset.active=ativo?'1':'0';
    b.textContent=ativo?'Voltar este aparelho ao modo morador':'🛠 Marcar este aparelho como TACS / teste';
  }

  function jsonpResultado(id,inicio){
    return new Promise(function(resolve,reject){
      function consultar(){
        var cb='__aptTeste_'+Date.now()+'_'+Math.floor(Math.random()*100000),script=document.createElement('script'),fim=false;
        var timer=setTimeout(function(){encerrar(null)},5500);
        function limpar(){clearTimeout(timer);try{delete window[cb]}catch(e){window[cb]=undefined}if(script.parentNode)script.remove()}
        function encerrar(data){if(fim)return;fim=true;limpar();if(data&&data.ok===true&&data.pendente===false&&data.result){resolve(data.result);return}if(Date.now()-inicio>25000){reject(new Error('A atualização deste aparelho demorou demais. Tente novamente.'));return}setTimeout(consultar,900)}
        window[cb]=encerrar;script.onerror=function(){encerrar(null)};
        script.src=API+'?action=admin_notificacoes_saude_result&requestId='+encodeURIComponent(id)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();
        document.head.appendChild(script);
      }
      consultar();
    });
  }
  function executar(modo){
    if(!temSessao())return Promise.reject(new Error('Entre no painel antes de configurar este aparelho.'));
    var s=sessao(),push=estadoPush();
    if(!s.dispositivo)return Promise.reject(new Error('Abra este painel novamente pela Central TACS para identificar o aparelho.'));
    var id=requestId(),body=new URLSearchParams();
    body.set('action','admin_notificacoes_aparelho_tacs_teste');body.set('requestId',id);body.set('modo',modo);body.set('deviceId',s.dispositivo);
    if(subValido(push.id))body.set('subscriptionId',push.id);
    Object.keys(s).forEach(function(k){body.set(k,s[k])});
    return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'})
      .catch(function(){})
      .then(function(){return jsonpResultado(id,Date.now())});
  }
  function consultarEstado(){
    if(operando)return;
    garantirBox();render(null);
    if(!temSessao()||!dispositivo()){render(null);return}
    executar('CONSULTAR').then(function(r){ultimoEstado=r;render(r)}).catch(function(e){render(null,e.message)});
  }
  function alternar(){
    if(operando)return;
    var ativo=Boolean(ultimoEstado&&ultimoEstado.aparelhoTacsTeste===true);
    var pergunta=ativo
      ?'Voltar este aparelho ao modo morador? O vínculo familiar antigo não será restaurado automaticamente. Ele só voltará a se vincular quando for identificado normalmente no Portal.'
      :'Marcar este aparelho como TACS / teste? A busca pelo número da família ficará liberada sem exigir CPF/CNS e sem criar vínculo familiar. Se os avisos Push estiverem ativos, Recados e Campanhas continuam chegando normalmente.';
    if(!window.confirm(pergunta))return;
    operando=true;render(ultimoEstado);
    var box=garantirBox(),st=box&&box.querySelector('.apt-status');if(st)st.textContent=ativo?'Retirando o modo TACS / teste…':'Ativando o modo TACS / teste…';
    executar(ativo?'DESATIVAR':'ATIVAR').then(function(r){
      if(!r||r.ok!==true)throw new Error(txt(r&&r.message)||'Não foi possível atualizar este aparelho.');
      ultimoEstado=r;operando=false;render(r);
      var atualizar=document.getElementById('atualizarSaudeNotificacoes');if(atualizar)setTimeout(function(){atualizar.click()},250);
    }).catch(function(e){operando=false;render(ultimoEstado,e.message||'Não foi possível atualizar este aparelho.');});
  }

  function iniciarOneSignal(){
    consultarEstado();
    window.OneSignalDeferred=window.OneSignalDeferred||[];
    window.OneSignalDeferred.push(async function(OneSignal){
      try{
        OneSignalRef=OneSignal;
        if(!window.__portalTacsAparelhoTesteOneSignalInitV1){
          window.__portalTacsAparelhoTesteOneSignalInitV1=true;
          await OneSignal.init({
            appId:APP_ID,safari_web_id:SAFARI_ID,
            serviceWorkerPath:'/atendimento-acs-farmaceutico/push/OneSignalSDKWorker.js',
            serviceWorkerParam:{scope:'/atendimento-acs-farmaceutico/push/'},
            autoResubscribe:true,notifyButton:{enable:false},allowLocalhostAsSecureOrigin:false
          });
        }
        consultarEstado();
        var push=OneSignal.User&&OneSignal.User.PushSubscription;
        if(push&&typeof push.addEventListener==='function')push.addEventListener('change',function(){setTimeout(consultarEstado,100)});
      }catch(e){consultarEstado();}
    });
    if(!document.querySelector('script[data-onesignal-sdk]')){
      var script=document.createElement('script');script.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';script.defer=true;script.dataset.onesignalSdk='1';document.head.appendChild(script);
    }
  }

  function instalar(){
    garantirBox();iniciarOneSignal();
    var area=document.getElementById('areaEnvio');if(area)area.addEventListener('change',function(){ultimoEstado=null;setTimeout(consultarEstado,200)});
    var sec=document.getElementById('saudeNotificacoes');if(sec&&typeof MutationObserver!=='undefined'){
      new MutationObserver(function(){if(!sec.classList.contains('oculto'))setTimeout(consultarEstado,120)}).observe(sec,{attributes:true,attributeFilter:['class']});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});else instalar();
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
const loader=read('recados-campanhas-whatsapp-mensal-v12.js');
const familyClient=read('portal-identificacao-familia-v1.js');
const notificationHealth=read('portal-notification-health.js');
const build=read('scripts/build_apps_script_release.js');
const geral=read('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs');
new vm.Script(backend,{filename:'ZZZZ_45_AparelhoTacsTesteV1.gs'});
new vm.Script(admin,{filename:'admin-aparelho-tacs-teste-v1.js'});

const SUB_TEST='11111111-1111-4111-8111-11111111aaaa';
const SUB_NORMAL='22222222-2222-4222-8222-22222222bbbb';
const SUB_OUTRA='33333333-3333-4333-8333-33333333cccc';
const DEVICE_TEST='iphone-1787300000000-abcd1234efgh';
let generalTargetSentinel=function(){return 'GERAL_INTACTO'};
const sandbox={
  console,
  doPost:function(){return 'POST_ANTERIOR'},
  saudeNotificacoesV1CheckinPublico_:function(p){return {ok:true,recebido:p}},
  saudeNotificacoesV1SaudeAdmin_:function(){return {ok:true,contagens:{},aparelhos:[{nome:'Morador teste',subscriptionRef:SUB_TEST.slice(-8),status:'ATIVO',motivo:'normal'},{nome:'Morador normal',subscriptionRef:SUB_NORMAL.slice(-8),status:'ATIVO',motivo:'normal'}]}},
  mensagemIndividualV1Alvos_:function(){return [{subscriptionId:SUB_TEST},{subscriptionId:SUB_NORMAL},{subscriptionId:SUB_OUTRA}]},
  buscaEnvioFamiliaV1Alvos_:function(){return {cfg:{ok:true},alvos:[{subscriptionId:SUB_TEST},{subscriptionId:SUB_NORMAL}]}},
  identificacaoFamiliarPublicaV1ConsultarFamilia_:function(){return {ok:true,autorizada:false,requerConfirmacao:true}},
  moradoresAdminV1NormalizarAreaId_:function(v){return String(v||'').toUpperCase()},
  notificacoesAreaV1AlvosAtivos_:generalTargetSentinel,
  Object
};
vm.createContext(sandbox);
new vm.Script(backend).runInContext(sandbox);

sandbox.aparelhoTacsTesteV1MapaAtivos_=function(){return {[SUB_TEST]:true}};
sandbox.aparelhoTacsTesteV1MapaDispositivosAtivos_=function(){return {[DEVICE_TEST]:{subscriptionId:SUB_TEST}}};
sandbox.aparelhoTacsTesteV1Ativo_=function(sub,area,device){return area==='JAPARANDUBA'&&(sub===SUB_TEST||device===DEVICE_TEST)};
sandbox.aparelhoTacsTesteV1RemoverVinculoFamilia_=function(){return 1};
sandbox.aparelhoTacsTesteV1LimparMoradorRegistro_=function(){return true};
sandbox.aparelhoTacsTesteV1SalvarModoDispositivo_=function(){return true};
sandbox.identificacaoFamiliarPublicaV1Contexto_=function(area){return {areaId:area}};
sandbox.identificacaoFamiliarPublicaV1NormalizarFamilia_=function(v){return String(v)==='34'?'034':String(v)};
sandbox.identificacaoFamiliarPublicaV1Membros_=function(familia){return familia==='034'?[{token:'x',nome:'FILHA'}]:[]};

const individual=Array.from(sandbox.mensagemIndividualV1Alvos_('app','key',{areaId:'JAPARANDUBA'},{}));
assert.deepEqual(individual.map(x=>x.subscriptionId),[SUB_NORMAL,SUB_OUTRA],'Aparelho teste deve ser removido somente dos alvos individuais.');
const familiar=sandbox.buscaEnvioFamiliaV1Alvos_({areaId:'JAPARANDUBA'},'034');
assert.deepEqual(Array.from(familiar.alvos).map(x=>x.subscriptionId),[SUB_NORMAL],'Aparelho teste deve ser removido do envio familiar.');
assert.equal(sandbox.notificacoesAreaV1AlvosAtivos_,generalTargetSentinel,'O emissor geral de Recados/Campanhas não pode ser substituído pelo modo teste.');

const checkin=sandbox.saudeNotificacoesV1CheckinPublico_({subscriptionId:SUB_TEST,dispositivo:DEVICE_TEST,areaId:'JAPARANDUBA',documento:'123',cpf:'456',cns:'789'});
assert.equal(Object.prototype.hasOwnProperty.call(checkin.recebido,'documento'),false);
assert.equal(Object.prototype.hasOwnProperty.call(checkin.recebido,'cpf'),false);
assert.equal(Object.prototype.hasOwnProperty.call(checkin.recebido,'cns'),false);
assert.equal(checkin.aparelhoTacsTeste,true);
assert.equal(checkin.vinculadoFamilia,false);
assert.equal(checkin.familiaId,'');

const health=sandbox.saudeNotificacoesV1SaudeAdmin_({areaId:'JAPARANDUBA'},{});
assert.equal(health.aparelhos[0].nome,'🛠 Aparelho TACS / teste');
assert.equal(health.aparelhos[0].vinculadoMorador,false);
assert.match(health.aparelhos[0].motivo,/Recados e Campanhas/);
assert.equal(health.aparelhos[1].nome,'Morador normal');

const familyByDevice=sandbox.identificacaoFamiliarPublicaV1ConsultarFamilia_({dispositivo:DEVICE_TEST,areaId:'JAPARANDUBA',familia:'34'});
assert.equal(familyByDevice.autorizada,true,'Modo TACS deve consultar família mesmo sem subscriptionId.');
assert.equal(familyByDevice.familiaId,'034');
assert.equal(familyByDevice.autorizacao,'APARELHO_TACS_TESTE');
assert.equal(familyByDevice.aparelhoTacsTeste,true);

assert.match(backend,/VERSAO:'1\.1\.0'/);
assert.match(backend,/DEVICE_SHEET:'TACS_APARELHOS_TACS_TESTE_DISPOSITIVOS'/);
assert.match(backend,/p\.dispositivo\|\|p\.deviceId/);
assert.match(backend,/funciona mesmo sem Push/);
assert.match(backend,/delete parametros\.documento;delete parametros\.cpf;delete parametros\.cns/);
assert.doesNotMatch(backend,/notificacoesAreaV1AlvosAtivos_\s*=/,'O módulo teste não pode substituir a seleção geral de Recados/Campanhas.');
assert.match(geral,/notificacoesAreaV1AlvosAtivos_/,'O emissor geral continua existindo no módulo oficial de notificações.');

assert.match(admin,/Marcar este aparelho como TACS \/ teste/);
assert.match(admin,/Voltar este aparelho ao modo morador/);
assert.match(admin,/busca pelo número da família/);
assert.match(admin,/deviceId/);
assert.match(admin,/dispositivo/);
assert.doesNotMatch(admin,/if\(!subValido\(push\.id\)\|\|!push\.optedIn\|\|!push\.permission\)/,'O botão não pode depender do Push para ativar o modo TACS.');
assert.doesNotMatch(admin,/requestPermission\s*\(/,'O painel não deve pedir nova permissão ao marcar o modo teste.');
assert.doesNotMatch(admin,/\.optOut\s*\(/,'Marcar modo teste não pode desligar a inscrição Push.');
assert.doesNotMatch(admin,/\.optIn\s*\(/,'Marcar modo teste não pode rotacionar a inscrição Push.');
assert.match(loader,/admin-aparelho-tacs-teste-v1\.js\?v=20260821-sem-push-v2/);
assert.match(familyClient,/portalTacsDispositivoV1/);
assert.match(familyClient,/dispositivo:deviceId\(\)/);
assert.match(notificationHealth,/dispositivo:deviceId\(\)/);
assert.match(build,/ZZZZ_45_AparelhoTacsTesteV1\.gs/);
assert.match(build,/TACS_APARELHO_TACS_TESTE_V1/);

console.log('Aparelho TACS/teste V1.1: busca familiar por dispositivo sem dependência do Push, preservando isolamento de mensagens.');'''

write_text('apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs', BACKEND)
write_text('admin-aparelho-tacs-teste-v1.js', ADMIN)
write_text('scripts/test_aparelho_tacs_teste_v1.js', TEST)

replace_once(
    'portal-identificacao-familia-v1.js',
    "  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';\n  var oneSignal=null,pendingMissing='',pendingType='',currentResident=null,complementing=false;",
    "  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';\n  var DEVICE_KEY='portalTacsDispositivoV1';\n  var oneSignal=null,pendingMissing='',pendingType='',currentResident=null,complementing=false;"
)
replace_once(
    'portal-identificacao-familia-v1.js',
    "  function subscriptionId(){try{var p=oneSignal&&oneSignal.User&&oneSignal.User.PushSubscription;return text(p&&p.id).toLowerCase()}catch(e){return ''}}",
    "  function deviceId(){try{return text(localStorage.getItem(DEVICE_KEY)||'')}catch(e){return ''}}\n  function subscriptionId(){try{var p=oneSignal&&oneSignal.User&&oneSignal.User.PushSubscription;return text(p&&p.id).toLowerCase()}catch(e){return ''}}"
)
replace_once(
    'portal-identificacao-familia-v1.js',
    "  function familyCandidate(v){var s=digits(v);return /^\\d{2,3}$/.test(s)?normalizeFamily(s):''}",
    "  function familyCandidate(v){var s=digits(v);return /^\\d{2,4}$/.test(s)?normalizeFamily(s):''}"
)
replace_once(
    'portal-identificacao-familia-v1.js',
    "var params={action:'publico_familia_consultar',areaId:areaId(),familia:fam,subscriptionId:subscriptionId()};",
    "var params={action:'publico_familia_consultar',areaId:areaId(),familia:fam,subscriptionId:subscriptionId(),dispositivo:deviceId()};"
)

replace_once(
    'portal-notification-health.js',
    "  var currentResident=null,oneSignal=null,pendingRepairId='',pendingRepairSubscriptionId='',activeRequest='',lastFingerprint='',counter=0,openCounter=0;\n  var autoRepairTried={},repairCompleted={},repairMode='',repairStateCounter=0,familyCheckTimer=null;",
    "  var currentResident=null,oneSignal=null,pendingRepairId='',pendingRepairSubscriptionId='',activeRequest='',lastFingerprint='',counter=0,openCounter=0;\n  var DEVICE_KEY='portalTacsDispositivoV1';\n  var autoRepairTried={},repairCompleted={},repairMode='',repairStateCounter=0,familyCheckTimer=null;"
)
replace_once(
    'portal-notification-health.js',
    "  function text(v){return String(v==null?'':v).trim()}\n  function digits(v){return text(v).replace(/\\D/g,'')}",
    "  function text(v){return String(v==null?'':v).trim()}\n  function deviceId(){try{return text(localStorage.getItem(DEVICE_KEY)||'')}catch(e){return ''}}\n  function digits(v){return text(v).replace(/\\D/g,'')}"
)
replace_once(
    'portal-notification-health.js',
    "payload={subscriptionId:st.subscriptionId,areaId:areaId(),permission:st.permission?'true':'false'",
    "payload={subscriptionId:st.subscriptionId,dispositivo:deviceId(),areaId:areaId(),permission:st.permission?'true':'false'"
)
replace_once(
    'portal-notification-health.js',
    "var fp=[payload.subscriptionId,payload.areaId,payload.permission",
    "var fp=[payload.subscriptionId,payload.dispositivo,payload.areaId,payload.permission"
)

replace_once(
    'moradores-autofill.js',
    "      } else if (doc.length) {\n        clearResidentFields();\n        setStatus(status, 'Digite um CPF válido ou os 15 números do Cartão SUS (CNS).', 'invalid');\n      } else {",
    "      } else if (/^\\d{2,4}$/.test(doc)) {\n        clearResidentFields();\n        setStatus(status, 'Número de cadastro familiar informado. Toque em Buscar esta família abaixo.', '');\n      } else if (doc.length) {\n        clearResidentFields();\n        setStatus(status, 'Digite um CPF válido ou os 15 números do Cartão SUS (CNS).', 'invalid');\n      } else {"
)

replace_once('portal-auto-update.js', 'portal-identificacao-familia-v1.js?v=20260820-v1', 'portal-identificacao-familia-v1.js?v=20260821-sem-push-v2')
replace_once('recados-campanhas-whatsapp-mensal-v12.js', 'admin-aparelho-tacs-teste-v1.js?v=20260820-v1', 'admin-aparelho-tacs-teste-v1.js?v=20260821-sem-push-v2')
replace_once('painel-oficial-recados-campanhas.html', 'recados-campanhas-whatsapp-mensal-v12.js?v=20260820-aparelho-tacs-teste-v1', 'recados-campanhas-whatsapp-mensal-v12.js?v=20260821-sem-push-v2')
replace_once('index.html', 'portal-notification-health.js?v=20260820-notif-only-v107', 'portal-notification-health.js?v=20260821-sem-push-v2')
replace_once('index.html', 'moradores-autofill.js?v=20260820-familia-autofill-v112', 'moradores-autofill.js?v=20260821-sem-push-v2')
replace_once('index.html', 'portal-auto-update.js?v=20260812-v101', 'portal-auto-update.js?v=20260821-sem-push-v2')

write_text('portal-version.json', json.dumps({
    'version': 'modo-tacs-sem-push-v2-20260821-0952',
    'releasedAt': '2026-08-21T12:52:00Z',
    'scope': 'Modo TACS/teste por dispositivo, busca familiar e cache do Portal'
}, ensure_ascii=False, indent=2))

print('Correção modo TACS sem Push V2 preparada com escopo isolado.')