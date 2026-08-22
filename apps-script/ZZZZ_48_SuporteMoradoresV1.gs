/**
 * ZZZZ_48_SuporteMoradoresV1.gs
 * Portal TACS — Suporte aos moradores V1.0.0
 *
 * Camada aditiva e somente de leitura sobre os vínculos de aparelhos já existentes.
 * Não apaga, recria, troca ou reassocia subscription_id, OneSignal ID, família ou morador.
 * O diagnóstico usa o registro local como fonte dos aparelhos conhecidos e consulta o
 * OneSignal diretamente por inscrição quando possível, sem depender da exportação CSV.
 */
var TACS_SUPORTE_MORADORES_V1 = Object.freeze({
  VERSAO:'1.0.0',
  RESULT_PREFIX:'tacs_suporte_moradores_v1_',
  RESULT_SECONDS:300,
  MAX_DEVICES:80,
  REMOTE_BUDGET_MS:14000
});

var suporteMoradoresV1DoGetAnterior_;
var suporteMoradoresV1DoPostAnterior_;
var suporteMoradoresV1GetAnterior_;
var suporteMoradoresV1PostAnterior_;

(function instalarSuporteMoradoresV1_(){
  if(typeof doGet==='function'){
    suporteMoradoresV1DoGetAnterior_=doGet;
    doGet=function(e){var r=suporteMoradoresV1TratarGet_(e);return r||suporteMoradoresV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    suporteMoradoresV1DoPostAnterior_=doPost;
    doPost=function(e){var r=suporteMoradoresV1TratarPost_(e);return r||suporteMoradoresV1DoPostAnterior_(e);};
  }
  if(typeof tratarGetPainelTacs_==='function'){
    suporteMoradoresV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){var r=suporteMoradoresV1TratarGet_(e);return r||suporteMoradoresV1GetAnterior_(e);};
  }
  if(typeof tratarPostPainelTacs_==='function'){
    suporteMoradoresV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){var r=suporteMoradoresV1TratarPost_(e);return r||suporteMoradoresV1PostAnterior_(e);};
  }
})();

function suporteMoradoresV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=suporteMoradoresV1Texto_(p.action).toLowerCase();
  if(action!=='admin_suporte_moradores_result')return null;
  var requestId=suporteMoradoresV1Texto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))return null;
  var resultado=suporteMoradoresV1LerResultado_(requestId);
  if(!resultado)return null;
  return suporteMoradoresV1ResponderJson_({ok:true,pendente:false,requestId:requestId,result:resultado},p.callback);
}

function suporteMoradoresV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=suporteMoradoresV1Texto_(p.action).toLowerCase();
  if(action!=='admin_suporte_moradores_diagnostico')return null;
  var requestId=suporteMoradoresV1Texto_(p.requestId),resultado;
  try{
    requestId=suporteMoradoresV1ValidarRequestId_(requestId);
    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
    suporteMoradoresV1ExigirAcesso_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');
    resultado=suporteMoradoresV1Diagnostico_(contexto,acesso);
  }catch(erro){
    resultado={ok:false,message:suporteMoradoresV1Erro_(erro)};
  }
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))suporteMoradoresV1GuardarResultado_(requestId,resultado);
  return suporteMoradoresV1ResponderPost_(requestId,resultado);
}

function suporteMoradoresV1ExigirAcesso_(acesso){
  if(acesso&&acesso.perfil==='TACS'){
    var permissoes=Array.isArray(acesso.permissoes)?acesso.permissoes:[];
    if(permissoes.indexOf('MORADORES_LER')===-1&&permissoes.indexOf('PUBLICACOES_GERENCIAR')===-1){
      throw new Error('Seu cadastro não possui permissão para acessar o suporte aos moradores.');
    }
    return true;
  }
  tacsTerritorioV1ExigirAdmin_(acesso);
  return true;
}

function suporteMoradoresV1PodeReparar_(acesso){
  if(!acesso)return false;
  if(acesso.perfil!=='TACS')return true;
  var permissoes=Array.isArray(acesso.permissoes)?acesso.permissoes:[];
  return permissoes.indexOf('PUBLICACOES_GERENCIAR')!==-1;
}

function suporteMoradoresV1Diagnostico_(contexto,acesso){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=ss.getSheetByName(TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET);
  var moradores=saudeNotificacoesV1MapaMoradores_(contexto);
  var registros=[],vistos={};

  if(sheet&&sheet.getLastRow()>1){
    var linhas=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues();
    linhas.forEach(function(row){
      if(moradoresAdminV1NormalizarAreaId_(row[1])!==contexto.areaId)return;
      var reg=saudeNotificacoesV1RegistroDaLinha_(row);
      var id=suporteMoradoresV1Texto_(reg.subscriptionId).toLowerCase();
      if(!id||vistos[id])return;
      vistos[id]=true;
      registros.push(reg);
    });
  }

  registros.sort(function(a,b){
    return suporteMoradoresV1Texto_(b.ultimoCheckin).localeCompare(suporteMoradoresV1Texto_(a.ultimoCheckin));
  });
  var limitado=registros.length>TACS_SUPORTE_MORADORES_V1.MAX_DEVICES;
  if(limitado)registros=registros.slice(0,TACS_SUPORTE_MORADORES_V1.MAX_DEVICES);

  var props=PropertiesService.getScriptProperties();
  var appId=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.APP_ID_PROPERTIES)||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_APP_ID;
  var apiKey=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.API_KEY_PROPERTIES);
  var inicio=Date.now(),consultasRemotas=0,falhasRemotas=0,orçamentoEsgotado=false;
  var contagens={ativos:0,inativos:0,reparo:0,semConfirmacao:0,total:0};

  var aparelhos=registros.map(function(reg){
    var subscriptionId=suporteMoradoresV1Texto_(reg.subscriptionId).toLowerCase();
    var morador=reg.idPortal?moradores[reg.idPortal]:null;
    var pendencia=saudeNotificacoesV1ReparoPendenteSubscription_(contexto.areaId,subscriptionId,reg.reparoAplicado);
    var pendente=Boolean(pendencia&&pendencia.reparoId);
    var classificacao=saudeNotificacoesV1Classificar_(reg,null,pendente);
    var remotoEstado='NAO_CONSULTADO';

    if(apiKey&&!pendente&&Date.now()-inicio<TACS_SUPORTE_MORADORES_V1.REMOTE_BUDGET_MS){
      try{
        var onesignalId=suporteMoradoresV1Texto_(reg.onesignalId);
        if(!onesignalId)onesignalId=saudeNotificacoesV1IdentidadePorSubscription_(appId,apiKey,subscriptionId);
        if(onesignalId){
          var usuario=saudeNotificacoesV1ViewUser_(appId,apiKey,onesignalId);
          var remoto=saudeNotificacoesV1EncontrarSubscription_(usuario,subscriptionId);
          consultasRemotas++;
          if(remoto){
            classificacao=saudeNotificacoesV1Classificar_(reg,remoto,false);
            remotoEstado='CONFIRMADO';
          }else{
            remotoEstado='NAO_ENCONTRADO';
            classificacao={status:'SEM_CONFIRMACAO',texto:'Sem confirmação',motivo:'O vínculo local foi preservado, mas a inscrição não pôde ser confirmada no OneSignal nesta consulta.'};
          }
        }else{
          remotoEstado='IDENTIDADE_NAO_CONFIRMADA';
        }
      }catch(erroRemoto){
        falhasRemotas++;
        remotoEstado='INDISPONIVEL';
        if(classificacao.status==='SEM_CONFIRMACAO'){
          classificacao={status:'SEM_CONFIRMACAO',texto:'Sem confirmação',motivo:'O registro local permanece preservado; a conferência direta com o OneSignal ficou indisponível nesta consulta.'};
        }
      }
    }else if(apiKey&&!pendente){
      orçamentoEsgotado=true;
      remotoEstado='ADIADO';
    }else if(!apiKey){
      remotoEstado='SEM_CREDENCIAL';
    }

    suporteMoradoresV1Somar_(contagens,classificacao.status);
    return {
      nome:morador&&moradoresAdminV1Texto_(morador.nome)?moradoresAdminV1Texto_(morador.nome):'Aparelho ainda não identificado',
      telefone:morador?moradoresAdminV1Texto_(morador.celular||morador.telefoneContato):'',
      dispositivo:reg.tipoAparelho||'Aparelho',
      navegador:reg.navegador||'',
      sistema:reg.sistema||'',
      status:classificacao.status,
      statusTexto:classificacao.texto,
      motivo:classificacao.motivo,
      ultimoCheckin:reg.ultimoCheckin||'',
      subscriptionRef:subscriptionId.slice(-8),
      reparoPendente:pendente,
      vinculadoMorador:Boolean(morador),
      consultaRemota:remotoEstado
    };
  });

  contagens.total=aparelhos.length;
  aparelhos.sort(function(a,b){
    var peso={REPARO:0,INATIVO:1,SEM_CONFIRMACAO:2,ATIVO:3};
    var pa=Object.prototype.hasOwnProperty.call(peso,a.status)?peso[a.status]:9;
    var pb=Object.prototype.hasOwnProperty.call(peso,b.status)?peso[b.status]:9;
    if(pa!==pb)return pa-pb;
    return String(a.nome).localeCompare(String(b.nome),'pt-BR');
  });

  return {
    ok:true,
    versao:TACS_SUPORTE_MORADORES_V1.VERSAO,
    areaId:contexto.areaId,
    areaNome:contexto.areaNome,
    contagens:contagens,
    aparelhos:aparelhos,
    limitado:limitado,
    podeReparar:suporteMoradoresV1PodeReparar_(acesso),
    somenteLeitura:true,
    vinculosPreservados:true,
    fonte:'REGISTRO_LOCAL_ONESIGNAL_DIRETO',
    consultasRemotas:consultasRemotas,
    falhasRemotas:falhasRemotas,
    consultasAdiadas:orçamentoEsgotado,
    observacao:'O diagnóstico não apaga, recria nem troca inscrições. Falha temporária de consulta remota não remove o aparelho nem desfaz seu vínculo local.'
  };
}

function suporteMoradoresV1Somar_(contagens,status){
  if(status==='ATIVO')contagens.ativos++;
  else if(status==='INATIVO')contagens.inativos++;
  else if(status==='REPARO')contagens.reparo++;
  else contagens.semConfirmacao++;
}

function suporteMoradoresV1GuardarResultado_(requestId,result){
  CacheService.getScriptCache().put(TACS_SUPORTE_MORADORES_V1.RESULT_PREFIX+requestId,JSON.stringify(result),TACS_SUPORTE_MORADORES_V1.RESULT_SECONDS);
}

function suporteMoradoresV1LerResultado_(requestId){
  var raw=CacheService.getScriptCache().get(TACS_SUPORTE_MORADORES_V1.RESULT_PREFIX+requestId);
  if(!raw)return null;
  try{return JSON.parse(raw);}catch(e){return null;}
}

function suporteMoradoresV1ResponderJson_(obj,callback){
  var json=JSON.stringify(obj);
  if(callback&&/^[A-Za-z_$][A-Za-z0-9_$\.]{0,120}$/.test(callback)){
    return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function suporteMoradoresV1ResponderPost_(requestId,result){
  var payload={source:'suporte-moradores-v1',requestId:requestId,result:result};
  var json=JSON.stringify(payload).replace(/</g,'\\u003c');
  var html='<!doctype html><html><head><meta charset="utf-8"></head><body><script>(function(){var p='+json+';try{parent.postMessage(p,"*");}catch(e){}}());<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function suporteMoradoresV1ValidarRequestId_(v){
  v=suporteMoradoresV1Texto_(v);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(v))throw new Error('Identificador da requisição inválido.');
  return v;
}
function suporteMoradoresV1Texto_(v){return String(v==null?'':v).trim();}
function suporteMoradoresV1Erro_(e){return e&&e.message?String(e.message):'Não foi possível consultar o suporte aos moradores.';}
