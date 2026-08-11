/**
 * ZZZZ_16_PortalManutencaoNotificacoesV1.gs
 * Portal TACS — manutenção e proteção das notificações V1.0.0
 *
 * Responsabilidades isoladas:
 * - expor o estado público de manutenção por área;
 * - permitir ativar/desativar o estado somente com sessão administrativa;
 * - bloquear notificações comuns enquanto a área estiver em manutenção;
 * - permitir somente o comunicado oficial que acompanha a ativação;
 * - acrescentar o estado de manutenção ao painel público existente;
 * - registrar cada mudança em auditoria própria.
 *
 * Este módulo não altera moradores, agendas, profissionais, odontologia,
 * recados ou campanhas gravados. Ele controla apenas disponibilidade e push.
 */
var TACS_PORTAL_MANUTENCAO_V1 = Object.freeze({
  VERSAO: '1.0.0',
  DEFAULT_AREA_ID: 'JAPARANDUBA',
  PROPERTY: 'PORTAL_TACS_MANUTENCAO_AREAS_JSON',
  AUDIT_SHEET: 'TACS_AUDIT_MANUTENCAO',
  RESULT_PREFIX: 'tacs_portal_manutencao_v1_result_',
  RESULT_SECONDS: 300,
  TITULO_COMUNICADO: 'PORTAL EM MANUTENÇÃO',
  MENSAGEM_COMUNICADO: 'O Portal TACS está temporariamente em manutenção. Aguarde a liberação para fazer novas solicitações.'
});

var portalManutencaoV1DoGetAnterior_;
var portalManutencaoV1DoPostAnterior_;
var portalManutencaoV1GetAnterior_;
var portalManutencaoV1PostAnterior_;
var portalManutencaoV1PublicoIntegralAnterior_;
var portalManutencaoV1PublicoTacsAnterior_;

(function instalarPortalManutencaoV1_(){
  if(typeof doGet==='function'){
    portalManutencaoV1DoGetAnterior_=doGet;
    doGet=function(e){
      var resposta=portalManutencaoV1TratarGet_(e);
      return resposta||portalManutencaoV1DoGetAnterior_(e);
    };
  }

  if(typeof doPost==='function'){
    portalManutencaoV1DoPostAnterior_=doPost;
    doPost=function(e){
      var resposta=portalManutencaoV1TratarPost_(e);
      return resposta||portalManutencaoV1DoPostAnterior_(e);
    };
  }

  if(typeof tratarGetPainelTacs_==='function'){
    portalManutencaoV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){
      var resposta=portalManutencaoV1TratarGet_(e);
      return resposta||portalManutencaoV1GetAnterior_(e);
    };
  }

  if(typeof tratarPostPainelTacs_==='function'){
    portalManutencaoV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){
      var resposta=portalManutencaoV1TratarPost_(e);
      return resposta||portalManutencaoV1PostAnterior_(e);
    };
  }

  if(typeof integralObterPainelPublico_==='function'){
    portalManutencaoV1PublicoIntegralAnterior_=integralObterPainelPublico_;
    integralObterPainelPublico_=function(){
      return portalManutencaoV1EnriquecerPublico_(
        portalManutencaoV1PublicoIntegralAnterior_()
      );
    };
  }

  if(typeof tacsGetPublic_==='function'){
    portalManutencaoV1PublicoTacsAnterior_=tacsGetPublic_;
    tacsGetPublic_=function(){
      return portalManutencaoV1EnriquecerPublico_(
        portalManutencaoV1PublicoTacsAnterior_()
      );
    };
  }
})();

function portalManutencaoV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=portalManutencaoV1Texto_(p.action).toLowerCase();

  if(action==='portal_manutencao_status'){
    return portalManutencaoV1ResponderJson_(
      portalManutencaoV1StatusPublico_(p.areaId||p.area||''),
      p.callback
    );
  }

  if(action!=='admin_result')return null;
  var requestId=portalManutencaoV1Texto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))return null;
  var resultado=portalManutencaoV1LerResultado_(requestId);
  if(!resultado)return null;
  return portalManutencaoV1ResponderJson_({
    ok:true,
    pendente:false,
    requestId:requestId,
    result:resultado
  },p.callback);
}

function portalManutencaoV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=portalManutencaoV1Texto_(p.action).toLowerCase();
  var manutencao=[
    'admin_portal_manutencao_status',
    'admin_portal_manutencao_ativar',
    'admin_portal_manutencao_desativar'
  ].indexOf(action)!==-1;

  if(action==='admin_publicar_notificacao'){
    return portalManutencaoV1ProtegerPush_(p);
  }
  if(!manutencao)return null;

  var requestId=portalManutencaoV1Texto_(p.requestId);
  var resultado;
  try{
    requestId=portalManutencaoV1ValidarRequestId_(requestId);
    var sessao=portalManutencaoV1ValidarSessao_(p);
    var contexto=portalManutencaoV1ResolverContexto_(sessao,p.areaId||p.area||'');

    if(action==='admin_portal_manutencao_status'){
      resultado=portalManutencaoV1StatusAdmin_(contexto);
    }else{
      resultado=portalManutencaoV1Alterar_(
        contexto,
        action==='admin_portal_manutencao_ativar'
      );
    }
  }catch(erro){
    resultado={ok:false,message:portalManutencaoV1MensagemErro_(erro)};
  }

  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId)){
    portalManutencaoV1GuardarResultado_(requestId,resultado);
  }
  return portalManutencaoV1ResponderPost_(requestId,resultado);
}

function portalManutencaoV1ProtegerPush_(p){
  var areaId=portalManutencaoV1AreaId_(p.areaId||p.area||TACS_PORTAL_MANUTENCAO_V1.DEFAULT_AREA_ID);
  var estado=portalManutencaoV1Estado_(areaId);
  if(!estado.ativa)return null;

  var requestId=portalManutencaoV1Texto_(p.requestId);
  var resultado;
  try{
    requestId=portalManutencaoV1ValidarRequestId_(requestId);
    portalManutencaoV1ValidarSessao_(p);

    var comunicado=
      portalManutencaoV1Booleano_(p.comunicadoManutencao)&&
      portalManutencaoV1Texto_(p.titulo)===TACS_PORTAL_MANUTENCAO_V1.TITULO_COMUNICADO&&
      portalManutencaoV1Texto_(p.mensagem)===TACS_PORTAL_MANUTENCAO_V1.MENSAGEM_COMUNICADO;

    if(comunicado)return null;
    resultado={
      ok:true,
      skipped:true,
      maintenance:true,
      areaId:areaId,
      message:'Portal em manutenção: a publicação foi salva para teste, mas a notificação aos moradores foi bloqueada.'
    };
  }catch(erro){
    resultado={ok:false,message:portalManutencaoV1MensagemErro_(erro)};
  }

  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId)){
    portalManutencaoV1GuardarResultado_(requestId,resultado);
  }
  return portalManutencaoV1ResponderPost_(requestId,resultado);
}

function portalManutencaoV1ValidarSessao_(p){
  if(typeof profissionaisDinamicosV1ValidarSessao_==='function'){
    return profissionaisDinamicosV1ValidarSessao_(p);
  }
  if(typeof tacsPushV1ValidarSessao_==='function'){
    return tacsPushV1ValidarSessao_(p);
  }
  throw new Error('Não foi possível validar a sessão administrativa. Entre novamente com o PIN.');
}

function portalManutencaoV1ResolverContexto_(sessao,areaSolicitada){
  if(typeof moradoresAdminV1ResolverContexto_==='function'){
    try{
      return moradoresAdminV1ResolverContexto_(sessao,areaSolicitada);
    }catch(erroContexto){
      if(portalManutencaoV1Texto_(areaSolicitada))throw erroContexto;
    }
  }

  sessao=sessao&&typeof sessao==='object'?sessao:{};
  var escopo=sessao.escopo&&typeof sessao.escopo==='object'?sessao.escopo:{};
  return {
    areaId:portalManutencaoV1AreaId_(
      areaSolicitada||sessao.areaId||escopo.areaId||TACS_PORTAL_MANUTENCAO_V1.DEFAULT_AREA_ID
    ),
    operadorId:portalManutencaoV1Texto_(
      sessao.operadorId||escopo.operadorId||sessao.perfil||escopo.perfil||'ADMIN_VALIDADO'
    )
  };
}

function portalManutencaoV1StatusPublico_(areaSolicitada){
  var areaId=portalManutencaoV1AreaId_(areaSolicitada||TACS_PORTAL_MANUTENCAO_V1.DEFAULT_AREA_ID);
  var estado=portalManutencaoV1Estado_(areaId);
  return {
    ok:true,
    versao:TACS_PORTAL_MANUTENCAO_V1.VERSAO,
    areaId:areaId,
    ativa:estado.ativa,
    mensagem:estado.ativa?estado.mensagem:'',
    atualizadoEm:estado.atualizadoEm||''
  };
}

function portalManutencaoV1StatusAdmin_(contexto){
  var publico=portalManutencaoV1StatusPublico_(contexto.areaId);
  publico.operadorId=contexto.operadorId||'';
  return publico;
}

function portalManutencaoV1Alterar_(contexto,ativa){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('O estado do portal está sendo atualizado. Tente novamente.');
  try{
    var props=PropertiesService.getScriptProperties();
    var rawAnterior=props.getProperty(TACS_PORTAL_MANUTENCAO_V1.PROPERTY);
    var todos=portalManutencaoV1LerTodos_();
    var anterior=portalManutencaoV1EstadoDeMapa_(todos,contexto.areaId);
    var alterada=anterior.ativa!==ativa;
    var agora=new Date();
    todos[contexto.areaId]={
      ativa:ativa,
      mensagem:ativa?TACS_PORTAL_MANUTENCAO_V1.MENSAGEM_COMUNICADO:'',
      atualizadoEm:agora.toISOString(),
      operadorId:contexto.operadorId||'ADMIN_VALIDADO'
    };
    props.setProperty(
      TACS_PORTAL_MANUTENCAO_V1.PROPERTY,
      JSON.stringify(todos)
    );

    if(alterada){
      try{
        portalManutencaoV1Auditar_(contexto,ativa,agora);
      }catch(erroAuditoria){
        if(rawAnterior==null){
          props.deleteProperty(TACS_PORTAL_MANUTENCAO_V1.PROPERTY);
        }else{
          props.setProperty(TACS_PORTAL_MANUTENCAO_V1.PROPERTY,rawAnterior);
        }
        throw erroAuditoria;
      }
    }
    return {
      ok:true,
      versao:TACS_PORTAL_MANUTENCAO_V1.VERSAO,
      areaId:contexto.areaId,
      ativa:ativa,
      alterada:alterada,
      mensagem:ativa?TACS_PORTAL_MANUTENCAO_V1.MENSAGEM_COMUNICADO:'',
      message:ativa?'Portal colocado em manutenção.':'Manutenção desativada; Portal TACS liberado.'
    };
  }finally{
    lock.releaseLock();
  }
}

function portalManutencaoV1LerTodos_(){
  var raw=portalManutencaoV1Texto_(
    PropertiesService.getScriptProperties().getProperty(TACS_PORTAL_MANUTENCAO_V1.PROPERTY)
  );
  if(!raw)return {};
  try{
    var parsed=JSON.parse(raw);
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  }catch(erro){
    throw new Error('A configuração de manutenção do portal está inválida. Nenhuma alteração foi feita.');
  }
}

function portalManutencaoV1Estado_(areaId){
  return portalManutencaoV1EstadoDeMapa_(portalManutencaoV1LerTodos_(),areaId);
}

function portalManutencaoV1EstadoDeMapa_(mapa,areaId){
  var item=mapa&&mapa[areaId]&&typeof mapa[areaId]==='object'?mapa[areaId]:{};
  return {
    ativa:portalManutencaoV1Booleano_(item.ativa),
    mensagem:portalManutencaoV1Texto_(item.mensagem)||TACS_PORTAL_MANUTENCAO_V1.MENSAGEM_COMUNICADO,
    atualizadoEm:portalManutencaoV1Texto_(item.atualizadoEm),
    operadorId:portalManutencaoV1Texto_(item.operadorId)
  };
}

function portalManutencaoV1EnriquecerPublico_(dados){
  dados=dados&&typeof dados==='object'?dados:{};
  var status=portalManutencaoV1StatusPublico_(TACS_PORTAL_MANUTENCAO_V1.DEFAULT_AREA_ID);
  dados.portalEmManutencao=status.ativa;
  dados.manutencao={
    ativa:status.ativa,
    areaId:status.areaId,
    mensagem:status.mensagem,
    atualizadoEm:status.atualizadoEm
  };
  return dados;
}

function portalManutencaoV1Auditar_(contexto,ativa,agora){
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss)return;
  var headers=['EVENTO','AREA_ID','ESTADO','OPERADOR','REGISTRADO_EM'];
  var sheet=ss.getSheetByName(TACS_PORTAL_MANUTENCAO_V1.AUDIT_SHEET);
  if(!sheet)sheet=ss.insertSheet(TACS_PORTAL_MANUTENCAO_V1.AUDIT_SHEET);
  if(sheet.getLastRow()===0){
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }else{
    var atual=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
    for(var i=0;i<headers.length;i++){
      if(portalManutencaoV1Texto_(atual[i])!==headers[i]){
        throw new Error('A auditoria de manutenção existe com estrutura diferente. Nenhuma alteração foi feita.');
      }
    }
  }
  sheet.appendRow([
    'EVT-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase(),
    contexto.areaId,
    ativa?'ATIVAR_MANUTENCAO':'DESATIVAR_MANUTENCAO',
    contexto.operadorId||'ADMIN_VALIDADO',
    agora
  ]);
  sheet.getRange(sheet.getLastRow(),5).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function portalManutencaoV1GuardarResultado_(requestId,resultado){
  try{
    CacheService.getScriptCache().put(
      TACS_PORTAL_MANUTENCAO_V1.RESULT_PREFIX+requestId,
      JSON.stringify(resultado),
      TACS_PORTAL_MANUTENCAO_V1.RESULT_SECONDS
    );
  }catch(erro){}
}

function portalManutencaoV1LerResultado_(requestId){
  try{
    var raw=CacheService.getScriptCache().get(TACS_PORTAL_MANUTENCAO_V1.RESULT_PREFIX+requestId);
    return raw?JSON.parse(raw):null;
  }catch(erro){
    return null;
  }
}

function portalManutencaoV1ResponderPost_(requestId,resultado){
  var mensagem={source:'portal-tacs-manutencao-v1',requestId:requestId,result:resultado};
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>'+ 
    'parent.postMessage('+JSON.stringify(mensagem).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function portalManutencaoV1ResponderJson_(dados,callback){
  var json=JSON.stringify(dados);
  var cb=portalManutencaoV1Texto_(callback);
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb)){
    return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function portalManutencaoV1ValidarRequestId_(valor){
  var id=portalManutencaoV1Texto_(valor);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da operação de manutenção inválido.');
  return id;
}

function portalManutencaoV1AreaId_(valor){
  var id=portalManutencaoV1Texto_(valor).toUpperCase().replace(/[^A-Z0-9_-]/g,'');
  if(!/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(id))throw new Error('Área de manutenção inválida.');
  return id;
}

function portalManutencaoV1Booleano_(valor){
  if(valor===true||valor===1)return true;
  return ['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(portalManutencaoV1Texto_(valor).toUpperCase())!==-1;
}

function portalManutencaoV1Texto_(valor){
  return String(valor==null?'':valor).replace(/\s+/g,' ').trim();
}

function portalManutencaoV1MensagemErro_(erro){
  return portalManutencaoV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500);
}
