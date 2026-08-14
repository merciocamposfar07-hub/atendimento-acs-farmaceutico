/**
 * ZZZZ_25_ReparoAutomaticoFeedbackV1.gs
 * Portal TACS — reparo automático + feedback administrativo V1.0
 *
 * Escopo:
 * - registra quando o aparelho detecta um reparo pendente;
 * - registra tentativa automática, necessidade de ação do morador e conclusão;
 * - registra o Notification ID da confirmação individual de reparo;
 * - enriquece a saúde das notificações sem expor Subscription ID completo;
 * - não altera agendas, odontologia, moradores ou publicações.
 */
var TACS_REPARO_AUTO_FEEDBACK_V1 = Object.freeze({
  VERSAO:'1.0.0',
  SHEET:'TACS_REPAROS_NOTIFICACOES_EVENTOS',
  HEADERS:Object.freeze([
    'REPARO_ID','AREA_ID','SUBSCRIPTION_ID','ESTADO','MODO','REGISTRADO_EM','ONESIGNAL_ID','DETALHE'
  ]),
  ESTADOS:Object.freeze([
    'SOLICITADO','DETECTADO_NO_APARELHO','AUTO_INICIADO','AUTO_FALHOU','ACAO_MORADOR_NECESSARIA',
    'MANUAL_INICIADO','CONCLUIDO_AUTO','CONCLUIDO_MANUAL','CONCLUIDO_SERVIDOR','CONFIRMACAO_PUSH_ENVIADA'
  ]),
  CONFIRM_CACHE_PREFIX:'tacs_reparo_confirmacao_v1_',
  CONFIRM_CACHE_SECONDS:60
});

var reparoAutoFeedbackV1DoPostAnterior_;
var reparoAutoFeedbackV1CheckinAnterior_;
var reparoAutoFeedbackV1SaudeAdminAnterior_;
var reparoAutoFeedbackV1SolicitarAparelhoAnterior_;
var reparoAutoFeedbackV1SolicitarAreaAnterior_;
var reparoAutoFeedbackV1EnviarConfirmacaoAnterior_;

(function instalarReparoAutoFeedbackV1_(){
  if(typeof doPost==='function'){
    reparoAutoFeedbackV1DoPostAnterior_=doPost;
    doPost=function(e){
      var r=reparoAutoFeedbackV1TratarPost_(e);
      return r||reparoAutoFeedbackV1DoPostAnterior_(e);
    };
  }
  if(typeof saudeNotificacoesV1CheckinPublico_==='function'){
    reparoAutoFeedbackV1CheckinAnterior_=saudeNotificacoesV1CheckinPublico_;
    saudeNotificacoesV1CheckinPublico_=function(p){
      var r=reparoAutoFeedbackV1CheckinAnterior_(p);
      try{reparoAutoFeedbackV1RegistrarCheckin_(p,r);}catch(e){}
      return r;
    };
  }
  if(typeof saudeNotificacoesV1SaudeAdmin_==='function'){
    reparoAutoFeedbackV1SaudeAdminAnterior_=saudeNotificacoesV1SaudeAdmin_;
    saudeNotificacoesV1SaudeAdmin_=function(contexto,acesso){
      var r=reparoAutoFeedbackV1SaudeAdminAnterior_(contexto,acesso);
      try{reparoAutoFeedbackV1EnriquecerSaude_(r,contexto);}catch(e){}
      return r;
    };
  }
  if(typeof saudeNotificacoesV1SolicitarReparoAparelho_==='function'){
    reparoAutoFeedbackV1SolicitarAparelhoAnterior_=saudeNotificacoesV1SolicitarReparoAparelho_;
    saudeNotificacoesV1SolicitarReparoAparelho_=function(contexto,acesso,p){
      var r=reparoAutoFeedbackV1SolicitarAparelhoAnterior_(contexto,acesso,p);
      try{if(r&&r.ok===true&&r.reparoId&&!r.skipped)reparoAutoFeedbackV1RegistrarAlvos_(r.reparoId);}catch(e){}
      return r;
    };
  }
  if(typeof saudeNotificacoesV1SolicitarReparoArea_==='function'){
    reparoAutoFeedbackV1SolicitarAreaAnterior_=saudeNotificacoesV1SolicitarReparoArea_;
    saudeNotificacoesV1SolicitarReparoArea_=function(contexto,acesso){
      var r=reparoAutoFeedbackV1SolicitarAreaAnterior_(contexto,acesso);
      try{if(r&&r.ok===true&&r.reparoId)reparoAutoFeedbackV1RegistrarAlvos_(r.reparoId);}catch(e){}
      return r;
    };
  }
  if(typeof notificacoesAreaV1EnviarConfirmacaoReparo_==='function'){
    reparoAutoFeedbackV1EnviarConfirmacaoAnterior_=notificacoesAreaV1EnviarConfirmacaoReparo_;
    notificacoesAreaV1EnviarConfirmacaoReparo_=function(appId,apiKey,subscriptionId,area){
      var alvo=null;
      try{alvo=reparoAutoFeedbackV1AlvoPendente_(area&&area.areaId,subscriptionId);}catch(e){}
      var r=reparoAutoFeedbackV1EnviarConfirmacaoAnterior_(appId,apiKey,subscriptionId,area);
      try{
        if(r&&r.ok===true&&r.push===true&&r.onesignalId&&alvo){
          reparoAutoFeedbackV1RegistrarEvento_(
            alvo.reparoId,alvo.areaId,alvo.subscriptionId,'CONFIRMACAO_PUSH_ENVIADA','SISTEMA',
            r.onesignalId,'Notificação individual de confirmação aceita pelo OneSignal.'
          );
        }
      }catch(e){}
      return r;
    };
  }
})();

function reparoAutoFeedbackV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=reparoAutoFeedbackV1Texto_(p.action).toLowerCase();
  if(action!=='publico_notificacao_reparo_estado')return null;
  var resultado;
  try{
    var requestId=reparoAutoFeedbackV1Texto_(p.requestId);
    if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))throw new Error('Identificador da atualização inválido.');
    var subscriptionId=reparoAutoFeedbackV1Texto_(p.subscriptionId||p.subscription_id).toLowerCase();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(subscriptionId)){
      throw new Error('A inscrição deste aparelho não pôde ser validada.');
    }
    var areaId=moradoresAdminV1NormalizarAreaId_(p.areaId||p.area||'JAPARANDUBA');
    var estado=reparoAutoFeedbackV1Texto_(p.estado).toUpperCase();
    if(TACS_REPARO_AUTO_FEEDBACK_V1.ESTADOS.indexOf(estado)===-1)throw new Error('Estado de reparo inválido.');
    var alvo=reparoAutoFeedbackV1UltimoAlvo_(areaId,subscriptionId);
    if(!alvo)throw new Error('Nenhum reparo foi localizado para este aparelho.');
    var modo=reparoAutoFeedbackV1ModoEstado_(estado);
    var detalhe=reparoAutoFeedbackV1Texto_(p.detalhe).slice(0,220);
    reparoAutoFeedbackV1RegistrarEvento_(alvo.reparoId,areaId,subscriptionId,estado,modo,'',detalhe);
    resultado={ok:true,reparoId:alvo.reparoId,estado:estado};
  }catch(erro){resultado={ok:false,message:reparoAutoFeedbackV1Erro_(erro)};}
  return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON);
}

function reparoAutoFeedbackV1RegistrarCheckin_(p,r){
  if(!r||r.ok!==true)return;
  var subscriptionId=reparoAutoFeedbackV1Texto_(p&&p.subscriptionId||p&&p.subscription_id).toLowerCase();
  if(!subscriptionId)return;
  var areaId=moradoresAdminV1NormalizarAreaId_(p&&p.areaId||p&&p.area||r.areaId||'JAPARANDUBA');
  if(r.reparoPendente&&r.reparoId){
    reparoAutoFeedbackV1RegistrarEvento_(
      r.reparoId,areaId,subscriptionId,'DETECTADO_NO_APARELHO','SISTEMA','',
      'O aparelho abriu o Portal TACS e recebeu a informação de que havia reparo pendente.'
    );
  }
  var aplicado=reparoAutoFeedbackV1Texto_(p&&p.reparoAplicado||p&&p.reparo_id_aplicado);
  if(aplicado&&!r.reparoPendente){
    var ultimo=reparoAutoFeedbackV1UltimoAlvo_(areaId,subscriptionId);
    if(ultimo&&ultimo.reparoId===aplicado){
      reparoAutoFeedbackV1RegistrarEvento_(
        aplicado,areaId,subscriptionId,'CONCLUIDO_SERVIDOR','SISTEMA','',
        'O aparelho confirmou ao servidor a aplicação deste reparo.'
      );
    }
  }
}

function reparoAutoFeedbackV1RegistrarAlvos_(reparoId){
  reparoId=reparoAutoFeedbackV1Texto_(reparoId);
  if(!reparoId)return;
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(
    ss,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_HEADERS
  );
  var last=sheet.getLastRow();if(last<=1)return;
  sheet.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_HEADERS.length).getDisplayValues().forEach(function(row){
    if(reparoAutoFeedbackV1Texto_(row[0])!==reparoId)return;
    reparoAutoFeedbackV1RegistrarEvento_(
      reparoId,moradoresAdminV1NormalizarAreaId_(row[1]),reparoAutoFeedbackV1Texto_(row[2]).toLowerCase(),
      'SOLICITADO','ADMIN','',reparoAutoFeedbackV1Texto_(row[3]).slice(0,220)
    );
  });
}

function reparoAutoFeedbackV1UltimoAlvo_(areaId,subscriptionId){
  areaId=moradoresAdminV1NormalizarAreaId_(areaId||'JAPARANDUBA');
  subscriptionId=reparoAutoFeedbackV1Texto_(subscriptionId).toLowerCase();
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(
    ss,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_HEADERS
  );
  var last=sheet.getLastRow();if(last<=1)return null;
  var rows=sheet.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_HEADERS.length).getDisplayValues();
  for(var i=rows.length-1;i>=0;i--){
    if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==areaId)continue;
    if(reparoAutoFeedbackV1Texto_(rows[i][2]).toLowerCase()!==subscriptionId)continue;
    return {
      reparoId:reparoAutoFeedbackV1Texto_(rows[i][0]),areaId:areaId,subscriptionId:subscriptionId,
      motivo:reparoAutoFeedbackV1Texto_(rows[i][3]),solicitadoEm:reparoAutoFeedbackV1Texto_(rows[i][4])
    };
  }
  return null;
}

function reparoAutoFeedbackV1AlvoPendente_(areaId,subscriptionId){
  var alvo=reparoAutoFeedbackV1UltimoAlvo_(areaId,subscriptionId);
  if(!alvo)return null;
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(
    ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS
  );
  var last=sheet.getLastRow();
  if(last>1){
    var rows=sheet.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues();
    for(var i=rows.length-1;i>=0;i--){
      if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==alvo.areaId)continue;
      if(reparoAutoFeedbackV1Texto_(rows[i][0]).toLowerCase()!==alvo.subscriptionId)continue;
      if(reparoAutoFeedbackV1Texto_(rows[i][13])===alvo.reparoId)return null;
      break;
    }
  }
  return alvo;
}

function reparoAutoFeedbackV1RegistrarEvento_(reparoId,areaId,subscriptionId,estado,modo,onesignalId,detalhe){
  reparoId=reparoAutoFeedbackV1Texto_(reparoId);
  areaId=moradoresAdminV1NormalizarAreaId_(areaId||'JAPARANDUBA');
  subscriptionId=reparoAutoFeedbackV1Texto_(subscriptionId).toLowerCase();
  estado=reparoAutoFeedbackV1Texto_(estado).toUpperCase();
  if(!reparoId||!subscriptionId||TACS_REPARO_AUTO_FEEDBACK_V1.ESTADOS.indexOf(estado)===-1)return false;
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_REPARO_AUTO_FEEDBACK_V1.SHEET,TACS_REPARO_AUTO_FEEDBACK_V1.HEADERS);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))return false;
  try{
    var last=sheet.getLastRow();
    if(last>1){
      var start=Math.max(2,last-250),rows=sheet.getRange(start,1,last-start+1,TACS_REPARO_AUTO_FEEDBACK_V1.HEADERS.length).getDisplayValues();
      for(var i=rows.length-1;i>=0;i--){
        if(reparoAutoFeedbackV1Texto_(rows[i][0])===reparoId&&
           reparoAutoFeedbackV1Texto_(rows[i][2]).toLowerCase()===subscriptionId&&
           reparoAutoFeedbackV1Texto_(rows[i][3]).toUpperCase()===estado){return false;}
      }
    }
    sheet.appendRow([
      reparoId,areaId,subscriptionId,estado,reparoAutoFeedbackV1Texto_(modo||reparoAutoFeedbackV1ModoEstado_(estado)),
      reparoAutoFeedbackV1Data_(new Date()),reparoAutoFeedbackV1Texto_(onesignalId).slice(0,160),
      reparoAutoFeedbackV1Texto_(detalhe).slice(0,220)
    ]);
    return true;
  }finally{lock.releaseLock();}
}

function reparoAutoFeedbackV1EnriquecerSaude_(resultado,contexto){
  if(!resultado||resultado.ok!==true||!Array.isArray(resultado.aparelhos))return resultado;
  var mapa=reparoAutoFeedbackV1MapaArea_(contexto.areaId);
  resultado.aparelhos.forEach(function(aparelho){
    var ref=reparoAutoFeedbackV1Texto_(aparelho&&aparelho.subscriptionRef).toLowerCase();
    var ciclo=mapa.porRef[ref];
    if(!ciclo||ciclo.ambiguo)return;
    var confirmacao=ciclo.onesignalId?reparoAutoFeedbackV1Confirmacao_(ciclo.onesignalId):null;
    aparelho.reparoFeedback={
      reparoRef:ciclo.reparoId.slice(-8),
      solicitadoEm:ciclo.solicitadoEm||'',detectadoEm:ciclo.detectadoEm||'',autoIniciadoEm:ciclo.autoIniciadoEm||'',
      autoFalhouEm:ciclo.autoFalhouEm||'',acaoMoradorEm:ciclo.acaoMoradorEm||'',manualIniciadoEm:ciclo.manualIniciadoEm||'',
      concluidoEm:ciclo.concluidoEm||'',modoConclusao:ciclo.modoConclusao||'',
      confirmacaoStatus:confirmacao?confirmacao.status:'SEM_CONFIRMACAO_ENVIADA',
      confirmacaoTexto:confirmacao?confirmacao.texto:'Nenhuma notificação de confirmação foi registrada para este reparo.',
      confirmacaoRef:ciclo.onesignalId?ciclo.onesignalId.slice(-8):''
    };
    reparoAutoFeedbackV1AplicarTexto_(aparelho,ciclo,confirmacao);
  });
  resultado.reparoAutomatico=true;
  resultado.reparoFeedbackVersao=TACS_REPARO_AUTO_FEEDBACK_V1.VERSAO;
  return resultado;
}

function reparoAutoFeedbackV1MapaArea_(areaId){
  areaId=moradoresAdminV1NormalizarAreaId_(areaId||'JAPARANDUBA');
  var ss=tacsTerritorioV1Planilha_();
  var target=saudeNotificacoesV1GarantirSheet_(
    ss,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_HEADERS
  );
  var ciclos={},ordem=[];
  if(target.getLastRow()>1){
    target.getRange(2,1,target.getLastRow()-1,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_HEADERS.length).getDisplayValues().forEach(function(row){
      if(moradoresAdminV1NormalizarAreaId_(row[1])!==areaId)return;
      var sub=reparoAutoFeedbackV1Texto_(row[2]).toLowerCase(),rid=reparoAutoFeedbackV1Texto_(row[0]);
      if(!sub||!rid)return;
      var key=rid+'|'+sub;
      if(!ciclos[key]){
        ciclos[key]={reparoId:rid,subscriptionId:sub,solicitadoEm:reparoAutoFeedbackV1Texto_(row[4]),motivo:reparoAutoFeedbackV1Texto_(row[3])};
        ordem.push(key);
      }
    });
  }
  var eventos=saudeNotificacoesV1GarantirSheet_(ss,TACS_REPARO_AUTO_FEEDBACK_V1.SHEET,TACS_REPARO_AUTO_FEEDBACK_V1.HEADERS);
  if(eventos.getLastRow()>1){
    eventos.getRange(2,1,eventos.getLastRow()-1,TACS_REPARO_AUTO_FEEDBACK_V1.HEADERS.length).getDisplayValues().forEach(function(row){
      if(moradoresAdminV1NormalizarAreaId_(row[1])!==areaId)return;
      var rid=reparoAutoFeedbackV1Texto_(row[0]),sub=reparoAutoFeedbackV1Texto_(row[2]).toLowerCase(),key=rid+'|'+sub;
      if(!ciclos[key]){ciclos[key]={reparoId:rid,subscriptionId:sub,solicitadoEm:''};ordem.push(key);}
      var c=ciclos[key],estado=reparoAutoFeedbackV1Texto_(row[3]).toUpperCase(),quando=reparoAutoFeedbackV1Texto_(row[5]);
      if(estado==='SOLICITADO'&&!c.solicitadoEm)c.solicitadoEm=quando;
      else if(estado==='DETECTADO_NO_APARELHO')c.detectadoEm=quando;
      else if(estado==='AUTO_INICIADO')c.autoIniciadoEm=quando;
      else if(estado==='AUTO_FALHOU')c.autoFalhouEm=quando;
      else if(estado==='ACAO_MORADOR_NECESSARIA')c.acaoMoradorEm=quando;
      else if(estado==='MANUAL_INICIADO')c.manualIniciadoEm=quando;
      else if(estado==='CONCLUIDO_AUTO'){c.concluidoEm=quando;c.modoConclusao='AUTOMATICO';}
      else if(estado==='CONCLUIDO_MANUAL'){c.concluidoEm=quando;c.modoConclusao='MANUAL';}
      else if(estado==='CONCLUIDO_SERVIDOR'){c.concluidoEm=quando;c.modoConclusao=c.modoConclusao||'CONFIRMADO_PELO_APARELHO';}
      else if(estado==='CONFIRMACAO_PUSH_ENVIADA'){c.onesignalId=reparoAutoFeedbackV1Texto_(row[6]);c.confirmacaoEnviadaEm=quando;}
    });
  }
  var ultimoPorSub={};
  ordem.forEach(function(key){var c=ciclos[key];ultimoPorSub[c.subscriptionId]=c;});
  var porRef={};
  Object.keys(ultimoPorSub).forEach(function(sub){
    var c=ultimoPorSub[sub],ref=sub.slice(-8);
    if(porRef[ref])porRef[ref]={ambiguo:true};else porRef[ref]=c;
  });
  return {porRef:porRef};
}

function reparoAutoFeedbackV1AplicarTexto_(aparelho,ciclo,confirmacao){
  var partes=[];
  if(aparelho.status==='REPARO'){
    if(ciclo.acaoMoradorEm||ciclo.autoFalhouEm){
      aparelho.statusTexto='Ação do morador necessária';
      partes.push('A tentativa automática não conseguiu concluir o reparo. O botão “Reparar agora” permanece disponível no aparelho.');
    }else if(ciclo.autoIniciadoEm){
      aparelho.statusTexto='Reparando automaticamente';
      partes.push('O aparelho abriu o Portal e a renovação automática da inscrição foi iniciada em '+ciclo.autoIniciadoEm+'.');
    }else if(ciclo.detectadoEm){
      aparelho.statusTexto='Reparo detectado no aparelho';
      partes.push('O aparelho abriu o Portal e detectou o reparo pendente em '+ciclo.detectadoEm+'.');
    }else{
      aparelho.statusTexto='Reparo automático pendente';
      partes.push('Aguardando este aparelho abrir o Portal TACS para tentar o reparo automaticamente.');
    }
  }else if(ciclo.concluidoEm&&aparelho.status==='ATIVO'){
    aparelho.statusTexto='Ativo • reparo concluído';
    partes.push('Reparo '+(ciclo.modoConclusao==='AUTOMATICO'?'automático':(ciclo.modoConclusao==='MANUAL'?'manual':'confirmado pelo aparelho'))+' concluído em '+ciclo.concluidoEm+'.');
  }else if(ciclo.concluidoEm&&aparelho.status!=='ATIVO'){
    partes.push('O aparelho informou conclusão do reparo, mas o OneSignal ainda não o classifica como apto. Atualize novamente em alguns instantes.');
  }
  if(confirmacao)partes.push(confirmacao.texto);
  if(partes.length)aparelho.motivo=partes.join(' ');
}

function reparoAutoFeedbackV1Confirmacao_(onesignalId){
  onesignalId=reparoAutoFeedbackV1Texto_(onesignalId);
  if(!onesignalId)return null;
  var cache=CacheService.getScriptCache(),key=TACS_REPARO_AUTO_FEEDBACK_V1.CONFIRM_CACHE_PREFIX+onesignalId,raw=cache.get(key);
  if(raw){try{return JSON.parse(raw);}catch(e){}}
  var props=PropertiesService.getScriptProperties();
  var appId=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.APP_ID_PROPERTIES)||TACS_NOTIFICACOES_AREA_V1.DEFAULT_APP_ID;
  var apiKey=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.API_KEY_PROPERTIES);
  if(!apiKey)return {status:'INDISPONIVEL',texto:'A confirmação técnica de recebimento não pôde ser consultada agora.'};
  var resp=UrlFetchApp.fetch(TACS_NOTIFICACOES_AREA_V1.ENDPOINT+'/'+encodeURIComponent(onesignalId)+'?app_id='+encodeURIComponent(appId),{
    method:'get',headers:{Authorization:'Key '+apiKey},muteHttpExceptions:true
  });
  var code=Number(resp.getResponseCode()),data={};
  try{data=JSON.parse(resp.getContentText()||'{}');}catch(e){}
  var r;
  if(code<200||code>=300){
    r={status:'INDISPONIVEL',texto:'A notificação de confirmação foi enviada, mas o resultado técnico não pôde ser consultado agora.'};
  }else{
    var m=typeof notificacoesAreaV1Metricas_==='function'?notificacoesAreaV1Metricas_(data):null;
    var recebidos=m&&m.confirmados;
    var aceitos=m?Number(m.aceitos||0):Number(data.successful||0);
    var falhas=m?Number(m.canceladas||0)+Number(m.falhas||0):Number(data.failed||0)+Number(data.errored||0);
    if(recebidos!==null&&Number(recebidos)>0){
      r={status:'CONFIRMADA_NO_APARELHO',texto:'✅ O OneSignal confirmou que a notificação de teste chegou ao aparelho.'};
    }else if(falhas>0&&aceitos===0){
      r={status:'FALHA',texto:'❌ A notificação de teste não foi entregue pelo serviço Push.'};
    }else if(aceitos>0){
      r={status:'ACEITA_SEM_CONFIRMACAO',texto:'🟡 A notificação de teste foi aceita pelo serviço Push, mas ainda não há confirmação física no aparelho.'};
    }else{
      r={status:'SEM_DADOS',texto:'A notificação de teste foi registrada, mas o OneSignal ainda não disponibilizou confirmação de recebimento.'};
    }
  }
  try{cache.put(key,JSON.stringify(r),TACS_REPARO_AUTO_FEEDBACK_V1.CONFIRM_CACHE_SECONDS);}catch(e){}
  return r;
}

function reparoAutoFeedbackV1ModoEstado_(estado){
  estado=reparoAutoFeedbackV1Texto_(estado).toUpperCase();
  if(estado.indexOf('AUTO')===0||estado==='CONCLUIDO_AUTO')return 'AUTOMATICO';
  if(estado.indexOf('MANUAL')===0||estado==='CONCLUIDO_MANUAL'||estado==='ACAO_MORADOR_NECESSARIA')return 'MANUAL';
  if(estado==='SOLICITADO')return 'ADMIN';
  return 'SISTEMA';
}
function reparoAutoFeedbackV1Texto_(v){return String(v==null?'':v).trim();}
function reparoAutoFeedbackV1Data_(d){return Utilities.formatDate(d,'America/Recife','yyyy-MM-dd HH:mm:ss');}
function reparoAutoFeedbackV1Erro_(e){return e&&e.message?String(e.message):'Não foi possível registrar o andamento do reparo.';}
