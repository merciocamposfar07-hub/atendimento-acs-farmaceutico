/**
 * ZZZZ_19_NotificacoesSegmentadasV1.gs
 * Portal TACS — envio de notificações segmentadas por área V1.1.0
 *
 * A área e a tag são resolvidas no servidor. O navegador não pode fornecer um
 * filtro livre. Quando houver mais de uma área ativa, o envio é bloqueado se a
 * chave privada do OneSignal não estiver configurada, evitando vazamento entre
 * áreas. Repetir uma publicação cria um novo evento; repetir a mesma requisição
 * não envia duas vezes.
 *
 * Comprovação individual V1.1:
 * - envia uma notificação por inscrição, com comprovante secreto próprio;
 * - registra exibição técnica no Android/Chrome pelo webhook do OneSignal;
 * - registra a confirmação expressa pelo botão sem abrir o Portal no Android;
 * - registra a confirmação expressa pela página mínima aberta no iPhone/Safari;
 * - nunca trata aceitação pelo serviço Push como recebimento;
 * - preserva o fluxo de publicação existente.
 */
var TACS_NOTIFICACOES_AREA_V1 = Object.freeze({
  VERSAO:'1.1.0',
  TRACKING_VERSION:'1.1.0',
  DEFAULT_AREA_ID:'JAPARANDUBA',
  DEFAULT_APP_ID:'e2294b98-c72b-4f8c-a055-de28979676dc',
  MAINTENANCE_TITLE:'PORTAL EM MANUTENÇÃO',
  MAINTENANCE_MESSAGE:'O Portal TACS está temporariamente em manutenção. Aguarde a liberação para fazer novas solicitações.',
  APP_ID_PROPERTIES:Object.freeze(['TACS_ONESIGNAL_APP_ID','ONESIGNAL_APP_ID']),
  API_KEY_PROPERTIES:Object.freeze([
    'TACS_ONESIGNAL_API_KEY',
    'ONESIGNAL_APP_API_KEY',
    'ONESIGNAL_REST_API_KEY',
    'ONESIGNAL_API_KEY'
  ]),
  ENDPOINT:'https://api.onesignal.com/notifications',
  PORTAL_URL:'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/',
  AUDIT_SHEET:'TACS_AUDIT_NOTIFICACOES',
  AUDIT_HEADERS:Object.freeze([
    'EVENTO_ID','AREA_ID','TIPO','REFERENCIA_ID','TITULO','OPERADOR_ID','ONESIGNAL_ID',
    'DESTINATARIOS','RESULTADO','REGISTRADO_EM'
  ]),
  OPEN_SHEET:'TACS_NOTIFICACOES_ABERTURAS',
  OPEN_HEADERS:Object.freeze([
    'EVENTO_ID','AREA_ID','TIPO','REFERENCIA_ID','ONESIGNAL_ID','SUBSCRIPTION_ID','ID_PORTAL','ABERTO_EM'
  ]),
  RECEIPT_SHEET:'TACS_NOTIFICACOES_COMPROVANTES',
  RECEIPT_HEADERS:Object.freeze([
    'EVENTO_ID','AREA_ID','TIPO','REFERENCIA_ID','ONESIGNAL_ID','SUBSCRIPTION_ID','ID_PORTAL',
    'TOKEN_HASH','TIPO_APARELHO','NAVEGADOR','SISTEMA','ESTADO','CRIADO_EM','ENCAMINHADO_EM',
    'EXIBIDO_EM','CONFIRMADO_EM','ORIGEM','DETALHE'
  ]),
  CONFIRM_PAGE:'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/confirmar-recebimento.html',
  CONFIRM_ACTION:'confirmar_recebimento',
  RESULT_PREFIX:'tacs_notificacao_area_v1_result_',
  RESULT_SECONDS:300,
  IDEMPOTENCY_PREFIX:'tacs_notificacao_area_v1_evento_',
  REPAIR_RATE_PREFIX:'tacs_notificacao_reparo_v1_',
  REPAIR_RATE_SECONDS:20,
  REPAIR_TITLE:'Portal TACS — avisos restabelecidos',
  REPAIR_MESSAGE:'Conexão restabelecida. Este aparelho está pronto para receber novos recados e avisos do Portal TACS.'
});

var notificacoesAreaV1DoGetAnterior_;
var notificacoesAreaV1DoPostAnterior_;
var notificacoesAreaV1GetAnterior_;
var notificacoesAreaV1PostAnterior_;

(function instalarNotificacoesAreaV1_(){
  if(typeof doGet==='function'){
    notificacoesAreaV1DoGetAnterior_=doGet;
    doGet=function(e){var r=notificacoesAreaV1TratarGet_(e);return r||notificacoesAreaV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    notificacoesAreaV1DoPostAnterior_=doPost;
    doPost=function(e){var r=notificacoesAreaV1TratarPost_(e);return r||notificacoesAreaV1DoPostAnterior_(e);};
  }
  if(typeof tratarGetPainelTacs_==='function'){
    notificacoesAreaV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){var r=notificacoesAreaV1TratarGet_(e);return r||notificacoesAreaV1GetAnterior_(e);};
  }
  if(typeof tratarPostPainelTacs_==='function'){
    notificacoesAreaV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){var r=notificacoesAreaV1TratarPost_(e);return r||notificacoesAreaV1PostAnterior_(e);};
  }
})();

function notificacoesAreaV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=notificacoesAreaV1Texto_(p.action).toLowerCase();
  if(['admin_result','publico_notificacao_reparo_result','publico_confirmar_recebimento_result'].indexOf(action)===-1)return null;
  var requestId=notificacoesAreaV1Texto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))return null;
  var resultado=notificacoesAreaV1LerResultado_(requestId);
  if(!resultado)return null;
  return notificacoesAreaV1ResponderJson_({
    ok:true,pendente:false,requestId:requestId,result:resultado
  },p.callback);
}

function notificacoesAreaV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=notificacoesAreaV1Texto_(p.action).toLowerCase();
  if(action==='publico_notificacao_webhook')return notificacoesAreaV1WebhookPost_(e);
  if(action==='publico_confirmar_recebimento')return notificacoesAreaV1ConfirmarRecebimentoPost_(p);
  if(action==='publico_confirmar_reparo_notificacao')return notificacoesAreaV1ConfirmarReparoPost_(p);
  if(action==='publico_notificacao_aberta')return notificacoesAreaV1RegistrarAberturaPost_(p);
  if(['admin_publicar_notificacao','admin_notificacao_resultado'].indexOf(action)===-1)return null;

  var props=PropertiesService.getScriptProperties();
  var appId=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.APP_ID_PROPERTIES)||TACS_NOTIFICACOES_AREA_V1.DEFAULT_APP_ID;
  var apiKey=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.API_KEY_PROPERTIES);
  var quantidadeAreas=notificacoesAreaV1QuantidadeAreas_();

  // Mantém o emissor antigo apenas enquanto existe uma única área. Com duas ou
  // mais áreas, delegar sem filtro seria inseguro e é expressamente bloqueado.
  if(action==='admin_publicar_notificacao'&&!apiKey&&quantidadeAreas<=1)return null;

  var requestId=notificacoesAreaV1Texto_(p.requestId);
  var resultado;
  try{
    requestId=notificacoesAreaV1ValidarRequestId_(requestId);
    if(!apiKey)throw new Error('A chave privada do OneSignal precisa estar configurada para consultar ou enviar notificações.');
    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
    notificacoesAreaV1ExigirPublicacao_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');
    if(action==='admin_notificacao_resultado'){
      resultado=notificacoesAreaV1ResultadoPublicacao_(appId,apiKey,contexto,p);
    }else{
      var titulo=notificacoesAreaV1Texto_(p.titulo).slice(0,120);
      var mensagem=notificacoesAreaV1Texto_(p.mensagem).slice(0,1000);
      var tipo=notificacoesAreaV1Texto_(p.tipo||'recado').toUpperCase();
      var referencia=notificacoesAreaV1Texto_(p.id).slice(0,160);
      var evento=notificacoesAreaV1Texto_(p.eventoPublicacao||requestId);
      var comunicadoManutencao=
        notificacoesAreaV1Booleano_(p.comunicadoManutencao)&&
        titulo===TACS_NOTIFICACOES_AREA_V1.MAINTENANCE_TITLE&&
        mensagem===TACS_NOTIFICACOES_AREA_V1.MAINTENANCE_MESSAGE;
      if(!titulo||!mensagem)throw new Error('Título e mensagem são obrigatórios para enviar a notificação.');
      if(!notificacoesAreaV1Booleano_(p.ativo)){
        resultado={ok:true,skipped:true,push:false,areaId:contexto.areaId,message:'A publicação está inativa; nenhuma notificação foi enviada.'};
      }else{
        resultado=notificacoesAreaV1Enviar_(appId,apiKey,contexto,acesso,{
          titulo:titulo,mensagem:mensagem,tipo:tipo,referencia:referencia,evento:evento,
          manutencao:comunicadoManutencao,quantidadeAreas:quantidadeAreas
        });
      }
    }
  }catch(erro){resultado={ok:false,message:notificacoesAreaV1Erro_(erro)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))notificacoesAreaV1GuardarResultado_(requestId,resultado);
  return notificacoesAreaV1ResponderPost_(requestId,resultado);
}

function notificacoesAreaV1ConfirmarReparoPost_(p){
  var props=PropertiesService.getScriptProperties();
  var appId=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.APP_ID_PROPERTIES)||TACS_NOTIFICACOES_AREA_V1.DEFAULT_APP_ID;
  var apiKey=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.API_KEY_PROPERTIES);
  var requestId=notificacoesAreaV1Texto_(p.requestId);
  var resultado;
  try{
    requestId=notificacoesAreaV1ValidarRequestId_(requestId);
    if(!apiKey)throw new Error('O serviço de confirmação das notificações não está configurado.');
    var subscriptionId=notificacoesAreaV1Texto_(p.subscriptionId||p.subscription_id).toLowerCase();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(subscriptionId)){
      throw new Error('A inscrição deste aparelho não pôde ser validada.');
    }
    var areaId=moradoresAdminV1NormalizarAreaId_(p.areaId||p.area||TACS_NOTIFICACOES_AREA_V1.DEFAULT_AREA_ID);
    var area=moradoresAdminV1EncontrarAreaConfigurada_(areaId);
    if(!area||area.publica===false)throw new Error('A área deste aparelho não está disponível para notificações.');
    resultado=notificacoesAreaV1EnviarConfirmacaoReparo_(appId,apiKey,subscriptionId,area);
  }catch(erro){
    resultado={ok:false,push:false,message:notificacoesAreaV1Erro_(erro)};
  }
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))notificacoesAreaV1GuardarResultado_(requestId,resultado);
  return notificacoesAreaV1ResponderPost_(requestId,resultado);
}

function notificacoesAreaV1RegistrarAberturaPost_(p){
  var requestId=notificacoesAreaV1Texto_(p.requestId),resultado;
  try{
    requestId=notificacoesAreaV1ValidarRequestId_(requestId);
    var evento=notificacoesAreaV1ValidarRequestId_(p.evento||p.eventoPublicacao||'');
    var subscriptionId=notificacoesAreaV1Texto_(p.subscriptionId||p.subscription_id).toLowerCase();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(subscriptionId)){
      throw new Error('A inscrição deste aparelho não pôde ser validada.');
    }
    var areaId=moradoresAdminV1NormalizarAreaId_(p.areaId||p.area||TACS_NOTIFICACOES_AREA_V1.DEFAULT_AREA_ID);
    var area=moradoresAdminV1EncontrarAreaConfigurada_(areaId);
    if(!area||area.publica===false)throw new Error('A área deste aparelho não está disponível.');
    var auditoria=notificacoesAreaV1AuditoriaPorEvento_(areaId,evento);
    if(!auditoria||!auditoria.onesignalId)throw new Error('O envio desta notificação não foi localizado.');
    var tipo=notificacoesAreaV1Texto_(p.tipo||auditoria.tipo).toUpperCase();
    var referencia=notificacoesAreaV1Texto_(p.id||p.referenciaId||auditoria.referenciaId).slice(0,160);
    if(tipo!==auditoria.tipo||referencia!==auditoria.referenciaId)throw new Error('Os dados desta notificação não conferem com o envio registrado.');
    resultado=notificacoesAreaV1RegistrarAbertura_(areaId,auditoria,subscriptionId);
  }catch(erro){resultado={ok:false,message:notificacoesAreaV1Erro_(erro)};}
  return notificacoesAreaV1ResponderPost_(requestId,resultado);
}

function notificacoesAreaV1RegistrarAbertura_(areaId,auditoria,subscriptionId){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=notificacoesAreaV1GarantirAberturas_(ss);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))return {ok:true,registrada:false,aguardando:true};
  try{
    var last=sheet.getLastRow();
    if(last>1){
      var rows=sheet.getRange(2,1,last-1,TACS_NOTIFICACOES_AREA_V1.OPEN_HEADERS.length).getDisplayValues();
      for(var i=rows.length-1;i>=0;i--){
        if(notificacoesAreaV1Texto_(rows[i][0])===auditoria.eventoId&&notificacoesAreaV1Texto_(rows[i][5]).toLowerCase()===subscriptionId){
          return {ok:true,registrada:true,duplicada:true};
        }
      }
    }
    var idPortal=notificacoesAreaV1IdPortalSubscription_(ss,areaId,subscriptionId);
    sheet.appendRow([
      auditoria.eventoId,areaId,auditoria.tipo,auditoria.referenciaId,auditoria.onesignalId,
      subscriptionId,idPortal,new Date()
    ]);
    sheet.getRange(sheet.getLastRow(),8).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    return {ok:true,registrada:true,duplicada:false,vinculadoMorador:Boolean(idPortal)};
  }finally{lock.releaseLock();}
}

function notificacoesAreaV1WebhookPost_(e){
  var resultado;
  try{
    var corpo=e&&e.postData?String(e.postData.contents||''):'';
    var dados=JSON.parse(corpo||'{}'),evento=notificacoesAreaV1Texto_(dados.event);
    var notificationId=notificacoesAreaV1Texto_(dados.notificationId).toLowerCase();
    var adicionais=dados&&dados.additionalData&&typeof dados.additionalData==='object'?dados.additionalData:{};
    var token=notificacoesAreaV1Texto_(adicionais.confirmacaoToken).toLowerCase();
    if(['notification.willDisplay','notification.clicked'].indexOf(evento)===-1){
      return notificacoesAreaV1ResponderJson_({ok:true,ignorado:true});
    }
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(notificationId)){
      throw new Error('Identificador técnico da notificação inválido.');
    }
    if(evento==='notification.clicked'){
      var actionId=notificacoesAreaV1Texto_(dados.actionId);
      if(actionId!==TACS_NOTIFICACOES_AREA_V1.CONFIRM_ACTION){
        return notificacoesAreaV1ResponderJson_({ok:true,ignorado:true,motivo:'CLIQUE_SEM_CONFIRMACAO'});
      }
      resultado=notificacoesAreaV1RegistrarComprovacao_(token,notificationId,'CONFIRMADO','BOTAO_ANDROID_CHROME');
    }else{
      resultado=notificacoesAreaV1RegistrarComprovacao_(token,notificationId,'EXIBIDO_TECNICO','WEBHOOK_ANDROID_CHROME');
    }
  }catch(erro){resultado={ok:false,message:notificacoesAreaV1Erro_(erro)};}
  return notificacoesAreaV1ResponderJson_(resultado);
}

function notificacoesAreaV1ConfirmarRecebimentoPost_(p){
  var requestId=notificacoesAreaV1Texto_(p.requestId),resultado;
  try{
    requestId=notificacoesAreaV1ValidarRequestId_(requestId);
    var token=notificacoesAreaV1Texto_(p.token||p.confirmacaoToken).toLowerCase();
    var origem=notificacoesAreaV1Texto_(p.origem).toUpperCase();
    if(['LINK_IPHONE_SAFARI','LINK_NOTIFICACAO'].indexOf(origem)===-1)origem='LINK_NOTIFICACAO';
    resultado=notificacoesAreaV1RegistrarComprovacao_(token,'','CONFIRMADO',origem);
  }catch(erro){resultado={ok:false,message:notificacoesAreaV1Erro_(erro)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))notificacoesAreaV1GuardarResultado_(requestId,resultado);
  return notificacoesAreaV1ResponderPost_(requestId,resultado);
}

function notificacoesAreaV1RegistrarComprovacao_(token,notificationId,estado,origem){
  token=notificacoesAreaV1Texto_(token).toLowerCase();
  if(!/^[0-9a-f]{64}$/.test(token))throw new Error('O comprovante desta notificação é inválido.');
  notificationId=notificacoesAreaV1Texto_(notificationId).toLowerCase();
  var hash=notificacoesAreaV1HashToken_(token),ss=tacsTerritorioV1Planilha_();
  var sheet=notificacoesAreaV1GarantirComprovantes_(ss),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('O registro está ocupado. Tente novamente em alguns segundos.');
  try{
    if(sheet.getLastRow()<=1)throw new Error('O comprovante desta notificação não foi localizado.');
    var values=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).getValues();
    for(var i=values.length-1;i>=0;i--){
      var row=values[i];
      if(notificacoesAreaV1Texto_(row[7]).toLowerCase()!==hash)continue;
      var idRegistrado=notificacoesAreaV1Texto_(row[4]).toLowerCase();
      if(notificationId&&idRegistrado&&notificationId!==idRegistrado)throw new Error('A notificação não confere com o comprovante registrado.');
      if(notificationId&&!idRegistrado)row[4]=notificationId;
      var agora=new Date(),duplicada=false;
      if(estado==='CONFIRMADO'){
        duplicada=Boolean(row[15]);
        if(!row[15])row[15]=agora;
        row[11]='CONFIRMADO';
        row[16]=origem;
        row[17]='O morador confirmou expressamente o recebimento.';
      }else{
        duplicada=Boolean(row[14]);
        if(!row[14])row[14]=agora;
        if(row[11]!=='CONFIRMADO'){
          row[11]='EXIBIDO_TECNICO';
          row[16]=origem;
          row[17]='O navegador confirmou que a notificação foi exibida no aparelho.';
        }
      }
      sheet.getRange(i+2,1,1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).setValues([row]);
      return {
        ok:true,registrada:true,duplicada:duplicada,estado:row[11],eventoId:notificacoesAreaV1Texto_(row[0]),
        confirmadoEm:row[15]?notificacoesAreaV1DataPainel_(row[15]):'',
        exibidoEm:row[14]?notificacoesAreaV1DataPainel_(row[14]):''
      };
    }
    throw new Error('O comprovante desta notificação não foi localizado.');
  }finally{lock.releaseLock();}
}

function notificacoesAreaV1EnviarConfirmacaoReparo_(appId,apiKey,subscriptionId,area){
  var cache=CacheService.getScriptCache();
  var hash=(typeof moradoresAdminV1Hash_==='function')
    ?moradoresAdminV1Hash_(subscriptionId)
    :subscriptionId.replace(/-/g,'').slice(0,32);
  var chave=TACS_NOTIFICACOES_AREA_V1.REPAIR_RATE_PREFIX+hash;
  var anterior=cache.get(chave);
  if(anterior){
    try{return JSON.parse(anterior);}catch(erroCache){}
  }
  var payload={
    app_id:appId,
    target_channel:'push',
    headings:{pt:TACS_NOTIFICACOES_AREA_V1.REPAIR_TITLE,en:TACS_NOTIFICACOES_AREA_V1.REPAIR_TITLE},
    contents:{pt:TACS_NOTIFICACOES_AREA_V1.REPAIR_MESSAGE,en:TACS_NOTIFICACOES_AREA_V1.REPAIR_MESSAGE},
    include_subscription_ids:[subscriptionId],
    url:TACS_NOTIFICACOES_AREA_V1.PORTAL_URL,
    data:{tipo:'REPARO_NOTIFICACAO',areaId:area.areaId}
  };
  var resposta=UrlFetchApp.fetch(TACS_NOTIFICACOES_AREA_V1.ENDPOINT,{
    method:'post',contentType:'application/json',payload:JSON.stringify(payload),
    headers:{Authorization:'Key '+apiKey},muteHttpExceptions:true
  });
  var code=Number(resposta.getResponseCode());
  var texto=resposta.getContentText();
  var data={};try{data=JSON.parse(texto||'{}');}catch(erroJson){}
  if(code<200||code>=300){
    var detalhe=data&&data.errors?JSON.stringify(data.errors):('HTTP '+code);
    throw new Error('O OneSignal recusou a confirmação individual: '+detalhe);
  }
  var destinatarios=(data.recipients===null||typeof data.recipients==='undefined'||data.recipients==='')
    ?null:Number(data.recipients);
  if(!data.id||destinatarios===0){
    throw new Error('O OneSignal não encontrou uma inscrição ativa para este aparelho.');
  }
  var resultado={
    ok:true,push:true,areaId:area.areaId,onesignalId:String(data.id),
    destinatarios:destinatarios,
    message:'A notificação de confirmação foi enviada somente para este aparelho.'
  };
  cache.put(chave,JSON.stringify(resultado),TACS_NOTIFICACOES_AREA_V1.REPAIR_RATE_SECONDS);
  return resultado;
}

function notificacoesAreaV1ExigirPublicacao_(acesso){
  if(acesso&&acesso.perfil==='TACS'){
    if((acesso.permissoes||[]).indexOf('PUBLICACOES_GERENCIAR')===-1){
      throw new Error('Seu cadastro não possui permissão para publicar notificações.');
    }
    return true;
  }
  tacsTerritorioV1ExigirAdmin_(acesso);
  return true;
}

function notificacoesAreaV1Enviar_(appId,apiKey,contexto,acesso,input){
  if(typeof portalManutencaoV1Estado_==='function'){
    var manutencao=portalManutencaoV1Estado_(contexto.areaId);
    if(manutencao.ativa&&!input.manutencao){
      return {ok:true,skipped:true,push:false,maintenance:true,areaId:contexto.areaId,message:'Portal em manutenção: conteúdo salvo sem notificar os moradores.'};
    }
  }
  var chave=TACS_NOTIFICACOES_AREA_V1.IDEMPOTENCY_PREFIX+moradoresAdminV1Hash_(contexto.areaId+'|'+input.evento);
  var cache=CacheService.getScriptCache();
  var anterior=cache.get(chave);
  if(anterior){
    try{return JSON.parse(anterior);}catch(erroCache){}
  }
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(15000))throw new Error('Outro envio está sendo processado. Tente novamente.');
  try{
    anterior=cache.get(chave);
    if(anterior){try{return JSON.parse(anterior);}catch(erroCache2){}}
    var alvos=notificacoesAreaV1AlvosAtivos_(appId,apiKey,contexto,input.quantidadeAreas);
    if(!alvos.length){
      var semDestinatarios={
        ok:true,push:false,skipped:true,zeroAudience:true,areaId:contexto.areaId,
        appId:appId,filtro:{campo:'area_tacs',valor:contexto.areaId,modo:'INSCRICOES_ATIVAS_INDIVIDUAIS'},
        onesignalId:'',destinatarios:0,
        message:'Nenhum aparelho com inscrição ativa foi encontrado para a área '+contexto.areaNome+'.'
      };
      cache.put(chave,JSON.stringify(semDestinatarios),TACS_NOTIFICACOES_AREA_V1.RESULT_SECONDS);
      notificacoesAreaV1Auditar_(contexto,acesso,input,'',0,'SEM_DESTINATARIOS');
      return semDestinatarios;
    }
    var preparados=notificacoesAreaV1PrepararComprovantes_(contexto,input,alvos);
    lock.releaseLock();
    lock=null;
    var respostas;
    try{
      respostas=UrlFetchApp.fetchAll(preparados.map(function(item){
        return {
          url:TACS_NOTIFICACOES_AREA_V1.ENDPOINT,
          method:'post',contentType:'application/json',
          payload:JSON.stringify(notificacoesAreaV1PayloadIndividual_(appId,contexto,input,item)),
          headers:{Authorization:'Key '+apiKey},muteHttpExceptions:true
        };
      }));
    }catch(erroLote){
      notificacoesAreaV1MarcarFalhaLote_(preparados,erroLote);
      notificacoesAreaV1Auditar_(contexto,acesso,input,'',0,'ERRO_REDE_ENVIO_INDIVIDUAL');
      throw new Error('A conexão com o serviço Push falhou antes de concluir os encaminhamentos. Nenhum aparelho será contado como recebido.');
    }
    var resumo=notificacoesAreaV1AplicarRespostasEnvio_(preparados,respostas);
    if(!resumo.encaminhados){
      notificacoesAreaV1Auditar_(contexto,acesso,input,'',0,'ERRO_TODOS_ENVIOS_INDIVIDUAIS');
      throw new Error('O OneSignal não aceitou nenhuma das notificações individuais. Atualize a situação dos aparelhos e tente novamente.');
    }
    var resultado={
      ok:true,push:true,skipped:false,areaId:contexto.areaId,
      appId:appId,filtro:{campo:'area_tacs',valor:contexto.areaId,modo:'INSCRICOES_ATIVAS_INDIVIDUAIS'},
      onesignalId:resumo.primeiroId,destinatarios:alvos.length,encaminhados:resumo.encaminhados,
      falhas:resumo.falhas,
      message:'Notificação encaminhada individualmente para '+resumo.encaminhados+' aparelho(s). O recebimento só será contabilizado após exibição técnica ou confirmação do morador.'
    };
    cache.put(chave,JSON.stringify(resultado),TACS_NOTIFICACOES_AREA_V1.RESULT_SECONDS);
    notificacoesAreaV1Auditar_(contexto,acesso,input,resultado.onesignalId,resultado.destinatarios,'ENCAMINHADA_INDIVIDUAL');
    return resultado;
  }finally{if(lock)lock.releaseLock();}
}

function notificacoesAreaV1AlvosAtivos_(appId,apiKey,contexto,quantidadeAreas){
  if(
    typeof saudeNotificacoesV1ExportarSubscriptions_!=='function'||
    typeof saudeNotificacoesV1EhPush_!=='function'||
    typeof saudeNotificacoesV1PertenceArea_!=='function'||
    typeof saudeNotificacoesV1ClassificarExport_!=='function'
  )throw new Error('O cadastro técnico dos aparelhos ainda não está disponível para o envio individual.');
  var exportados=saudeNotificacoesV1ExportarSubscriptions_(appId,apiKey);
  var ss=tacsTerritorioV1Planilha_(),registros=notificacoesAreaV1RegistrosDispositivos_(ss,contexto.areaId);
  var vistos={},alvos=[];
  exportados.forEach(function(sub){
    var id=notificacoesAreaV1Texto_(sub&& (sub.id||sub.subscription_id)).toLowerCase();
    if(!id||vistos[id]||!saudeNotificacoesV1EhPush_(sub&&sub.device_type))return;
    if(!saudeNotificacoesV1PertenceArea_(sub,contexto.areaId,quantidadeAreas))return;
    if(saudeNotificacoesV1ClassificarExport_(sub,false).status!=='ATIVO')return;
    vistos[id]=true;
    var reg=registros[id]||{},remoto=typeof saudeNotificacoesV1TipoRemoto_==='function'
      ?saudeNotificacoesV1TipoRemoto_(sub.device_type):{};
    alvos.push({
      subscriptionId:id,
      idPortal:notificacoesAreaV1Texto_(reg.idPortal),
      tipoAparelho:notificacoesAreaV1Texto_(reg.tipoAparelho||remoto.dispositivo||'Aparelho Push'),
      navegador:notificacoesAreaV1Texto_(reg.navegador||remoto.navegador),
      sistema:notificacoesAreaV1Texto_(reg.sistema)
    });
  });
  return alvos;
}

function notificacoesAreaV1RegistrosDispositivos_(ss,areaId){
  var mapa={},sheet=ss.getSheetByName('TACS_NOTIFICACOES_DISPOSITIVOS');
  if(!sheet||sheet.getLastRow()<=1)return mapa;
  var total=Math.min(sheet.getLastColumn(),16);
  sheet.getRange(2,1,sheet.getLastRow()-1,total).getDisplayValues().forEach(function(row){
    var id=notificacoesAreaV1Texto_(row[0]).toLowerCase();
    if(!id||notificacoesAreaV1Texto_(row[1]).toUpperCase()!==notificacoesAreaV1Texto_(areaId).toUpperCase())return;
    mapa[id]={idPortal:row[2],tipoAparelho:row[4],navegador:row[5],sistema:row[6]};
  });
  return mapa;
}

function notificacoesAreaV1PrepararComprovantes_(contexto,input,alvos){
  var ss=tacsTerritorioV1Planilha_(),sheet=notificacoesAreaV1GarantirComprovantes_(ss);
  var inicio=sheet.getLastRow()+1,agora=new Date(),linhas=[],preparados=[];
  alvos.forEach(function(alvo,i){
    var token=notificacoesAreaV1NovoToken_(),hash=notificacoesAreaV1HashToken_(token);
    linhas.push([
      input.evento,contexto.areaId,input.tipo,input.referencia,'',alvo.subscriptionId,alvo.idPortal,hash,
      alvo.tipoAparelho,alvo.navegador,alvo.sistema,'PREPARADO',agora,'','','','',''
    ]);
    preparados.push({row:inicio+i,token:token,tokenHash:hash,alvo:alvo});
  });
  sheet.getRange(inicio,1,linhas.length,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).setValues(linhas);
  sheet.getRange(inicio,13,linhas.length,4).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  return preparados;
}

function notificacoesAreaV1PayloadIndividual_(appId,contexto,input,item){
  var pagina=TACS_NOTIFICACOES_AREA_V1.CONFIRM_PAGE+'?t='+encodeURIComponent(item.token);
  var mensagem=input.mensagem.slice(0,850)+'\n\nConfirme o recebimento.';
  return {
    app_id:appId,
    target_channel:'push',
    headings:{pt:input.titulo,en:input.titulo},
    contents:{pt:mensagem,en:mensagem},
    include_subscription_ids:[item.alvo.subscriptionId],
    url:pagina,
    web_buttons:[{
      id:TACS_NOTIFICACOES_AREA_V1.CONFIRM_ACTION,
      text:'Confirmar recebimento',
      url:'_osp=do_not_open'
    }],
    data:{
      areaId:contexto.areaId,tipo:input.tipo,referenciaId:input.referencia,evento:input.evento,
      confirmacaoToken:item.token
    }
  };
}

function notificacoesAreaV1AplicarRespostasEnvio_(preparados,respostas){
  var ss=tacsTerritorioV1Planilha_(),sheet=notificacoesAreaV1GarantirComprovantes_(ss),lock=LockService.getScriptLock();
  if(!lock.tryLock(15000))throw new Error('As notificações foram encaminhadas, mas o registro técnico ainda está ocupado. Atualize o painel em instantes.');
  var resumo={encaminhados:0,falhas:0,primeiroId:''};
  try{
    preparados.forEach(function(item,i){
      var resposta=respostas[i],code=resposta?Number(resposta.getResponseCode()):0,texto=resposta?resposta.getContentText():'',data={};
      try{data=JSON.parse(texto||'{}');}catch(erroJson){}
      var linha=sheet.getRange(item.row,1,1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).getValues()[0];
      var destinatarios=(data.recipients===null||typeof data.recipients==='undefined'||data.recipients==='')?null:Number(data.recipients);
      if(code>=200&&code<300&&data.id&&destinatarios!==0){
        var id=notificacoesAreaV1Texto_(data.id);
        linha[4]=id;
        var aguardava=linha[11]==='PREPARADO'||linha[11]==='ENCAMINHADO';
        if(linha[11]==='PREPARADO')linha[11]='ENCAMINHADO';
        if(!linha[13])linha[13]=new Date();
        if(aguardava)linha[17]='Encaminhamento individual aceito pelo serviço Push.';
        resumo.encaminhados++;
        if(!resumo.primeiroId)resumo.primeiroId=id;
      }else{
        var detalhe=data&&data.errors?JSON.stringify(data.errors):('HTTP '+code);
        if(['EXIBIDO_TECNICO','CONFIRMADO'].indexOf(linha[11])===-1){
          linha[11]='FALHA_ENVIO';
          linha[17]=('O serviço Push recusou este aparelho: '+detalhe).slice(0,500);
        }
        resumo.falhas++;
      }
      sheet.getRange(item.row,1,1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).setValues([linha]);
    });
    return resumo;
  }finally{lock.releaseLock();}
}

function notificacoesAreaV1MarcarFalhaLote_(preparados,erro){
  var ss=tacsTerritorioV1Planilha_(),sheet=notificacoesAreaV1GarantirComprovantes_(ss),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))return;
  try{
    preparados.forEach(function(item){
      var linha=sheet.getRange(item.row,1,1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).getValues()[0];
      if(['EXIBIDO_TECNICO','CONFIRMADO'].indexOf(linha[11])!==-1)return;
      linha[11]='FALHA_ENVIO';
      linha[17]=('Falha de conexão com o serviço Push: '+notificacoesAreaV1Erro_(erro)).slice(0,500);
      sheet.getRange(item.row,1,1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).setValues([linha]);
    });
  }finally{lock.releaseLock();}
}

function notificacoesAreaV1Comprovacao_(contexto,eventoId){
  var ss=tacsTerritorioV1Planilha_(),sheet=notificacoesAreaV1GarantirComprovantes_(ss),rows=[];
  if(sheet.getLastRow()>1)rows=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).getDisplayValues();
  rows=rows.filter(function(row){
    return notificacoesAreaV1Texto_(row[0])===eventoId&&
      notificacoesAreaV1Texto_(row[1]).toUpperCase()===notificacoesAreaV1Texto_(contexto.areaId).toUpperCase();
  });
  var vistos={},unicos=[];
  for(var i=rows.length-1;i>=0;i--){
    var sub=notificacoesAreaV1Texto_(rows[i][5]).toLowerCase();
    if(sub&&vistos[sub])continue;
    if(sub)vistos[sub]=true;
    unicos.unshift(rows[i]);
  }
  rows=unicos;
  if(!rows.length)return {disponivel:false,destinados:0,comprovados:0,exibidosTecnicos:0,confirmadosMorador:0,pendentes:0,falhas:0,aparelhos:[]};
  var moradores={};
  if(typeof saudeNotificacoesV1MapaMoradores_==='function'){
    try{moradores=saudeNotificacoesV1MapaMoradores_(contexto)||{};}catch(erroMapa){moradores={};}
  }
  var contagem={disponivel:true,destinados:rows.length,comprovados:0,exibidosTecnicos:0,confirmadosMorador:0,pendentes:0,falhas:0,aparelhos:[]};
  rows.forEach(function(row){
    var estado=notificacoesAreaV1Texto_(row[11]).toUpperCase(),idPortal=notificacoesAreaV1Texto_(row[6]);
    var exibidoEm=notificacoesAreaV1Texto_(row[14]),confirmadoEm=notificacoesAreaV1Texto_(row[15]);
    var confirmado=Boolean(confirmadoEm)||estado==='CONFIRMADO',exibido=Boolean(exibidoEm)||estado==='EXIBIDO_TECNICO';
    var falha=estado==='FALHA_ENVIO';
    if(exibido)contagem.exibidosTecnicos++;
    if(confirmado)contagem.confirmadosMorador++;
    if(exibido||confirmado)contagem.comprovados++;
    else if(falha)contagem.falhas++;
    else contagem.pendentes++;
    var morador=idPortal&&moradores[idPortal]?moradores[idPortal]:null;
    contagem.aparelhos.push({
      nome:morador&&morador.nome?notificacoesAreaV1Texto_(morador.nome):'',idPortal:idPortal,
      referenciaTecnica:notificacoesAreaV1Texto_(row[5]).slice(-8),
      tipoAparelho:notificacoesAreaV1Texto_(row[8]),navegador:notificacoesAreaV1Texto_(row[9]),
      sistema:notificacoesAreaV1Texto_(row[10]),estado:estado,
      encaminhadoEm:notificacoesAreaV1Texto_(row[13]),exibidoEm:exibidoEm,confirmadoEm:confirmadoEm,
      origem:notificacoesAreaV1Texto_(row[16]),detalhe:notificacoesAreaV1Texto_(row[17])
    });
  });
  contagem.aparelhos.sort(function(a,b){
    var peso=function(x){return x.confirmadoEm?0:(x.exibidoEm?1:(x.estado==='FALHA_ENVIO'?3:2));};
    return peso(a)-peso(b)||String(a.nome||a.referenciaTecnica).localeCompare(String(b.nome||b.referenciaTecnica),'pt-BR');
  });
  return contagem;
}

function notificacoesAreaV1ResultadoPublicacao_(appId,apiKey,contexto,p){
  var tipo=notificacoesAreaV1Texto_(p.tipo||'recado').toUpperCase();
  var referencia=notificacoesAreaV1Texto_(p.id||p.referenciaId).slice(0,160);
  if(['RECADO','CAMPANHA'].indexOf(tipo)===-1)throw new Error('Tipo de publicação inválido para consultar a entrega.');
  if(!referencia)throw new Error('Identificador da publicação não informado.');
  var envio=notificacoesAreaV1UltimoEnvio_(contexto.areaId,tipo,referencia);
  if(!envio){
    return {ok:true,encontrada:false,areaId:contexto.areaId,tipo:tipo,referenciaId:referencia,message:'Ainda não existe envio Push auditado para esta publicação.'};
  }
  var comprovacao=notificacoesAreaV1Comprovacao_(contexto,envio.eventoId);
  return {
    ok:true,encontrada:true,areaId:contexto.areaId,tipo:tipo,referenciaId:referencia,
    envio:{eventoId:envio.eventoId,onesignalId:envio.onesignalId,destinatarios:envio.destinatarios,registradoEm:envio.registradoEm},
    comprovacao:comprovacao,
    message:comprovacao.disponivel
      ?'Somente exibição técnica no aparelho e confirmação expressa do morador são contabilizadas como recebimento comprovado.'
      :'Este envio é anterior ao sistema de comprovação individual; não existe recibo fiel por aparelho para ele.'
  };
}

function notificacoesAreaV1Metricas_(data){
  function n(v){var x=Number(v);return Number.isFinite(x)?x:0;}
  var confirmados=(data&&data.received!==null&&typeof (data&&data.received)!=='undefined'&&data.received!=='')?n(data.received):null;
  var aceitos=n(data&&data.successful),canceladas=n(data&&data.failed),falhas=n(data&&data.errored);
  return {
    tentativas:aceitos+canceladas+falhas,
    aceitos:aceitos,
    confirmados:confirmados,
    canceladas:canceladas,
    falhas:falhas,
    cliques:n(data&&data.converted),
    pendentes:n(data&&data.remaining),
    concluidoEm:data&&data.completed_at?Number(data.completed_at):null,
    plataformas:data&&data.platform_delivery_stats?data.platform_delivery_stats:{}
  };
}

function notificacoesAreaV1UltimoEnvio_(areaId,tipo,referencia){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.AUDIT_SHEET);
  if(!sheet||sheet.getLastRow()<=1)return null;
  notificacoesAreaV1ValidarAuditoria_(sheet);
  var rows=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.length).getDisplayValues();
  for(var i=rows.length-1;i>=0;i--){
    var row=rows[i];
    if(notificacoesAreaV1Texto_(row[1]).toUpperCase()!==notificacoesAreaV1Texto_(areaId).toUpperCase())continue;
    if(notificacoesAreaV1Texto_(row[2]).toUpperCase()!==tipo)continue;
    if(notificacoesAreaV1Texto_(row[3])!==referencia)continue;
    var onesignalId=notificacoesAreaV1Texto_(row[6]);
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(onesignalId))continue;
    return {eventoId:notificacoesAreaV1Texto_(row[0]),areaId:row[1],tipo:notificacoesAreaV1Texto_(row[2]).toUpperCase(),referenciaId:row[3],titulo:row[4],onesignalId:onesignalId,destinatarios:row[7]===''?null:Number(row[7]),resultado:row[8],registradoEm:row[9]};
  }
  return null;
}

function notificacoesAreaV1AuditoriaPorEvento_(areaId,evento){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.AUDIT_SHEET);
  if(!sheet||sheet.getLastRow()<=1)return null;
  notificacoesAreaV1ValidarAuditoria_(sheet);
  var rows=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.length).getDisplayValues();
  for(var i=rows.length-1;i>=0;i--){
    var row=rows[i];
    if(notificacoesAreaV1Texto_(row[0])!==evento||notificacoesAreaV1Texto_(row[1]).toUpperCase()!==notificacoesAreaV1Texto_(areaId).toUpperCase())continue;
    var onesignalId=notificacoesAreaV1Texto_(row[6]);
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(onesignalId))return null;
    return {eventoId:evento,areaId:row[1],tipo:notificacoesAreaV1Texto_(row[2]).toUpperCase(),referenciaId:notificacoesAreaV1Texto_(row[3]),titulo:row[4],onesignalId:onesignalId,destinatarios:row[7]===''?null:Number(row[7]),resultado:row[8],registradoEm:row[9]};
  }
  return null;
}

function notificacoesAreaV1Aberturas_(contexto,eventoId){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=notificacoesAreaV1GarantirAberturas_(ss),rows=[];
  if(sheet.getLastRow()>1)rows=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_NOTIFICACOES_AREA_V1.OPEN_HEADERS.length).getDisplayValues();
  var registroPorSub=notificacoesAreaV1RegistroPorSubscription_(ss,contexto.areaId),moradores={};
  if(typeof saudeNotificacoesV1MapaMoradores_==='function'){
    try{moradores=saudeNotificacoesV1MapaMoradores_(contexto)||{};}catch(erroMapa){moradores={};}
  }
  var vistos={},aparelhos=[];
  rows.forEach(function(row){
    if(notificacoesAreaV1Texto_(row[0])!==eventoId||notificacoesAreaV1Texto_(row[1]).toUpperCase()!==contexto.areaId)return;
    var sub=notificacoesAreaV1Texto_(row[5]).toLowerCase();if(!sub||vistos[sub])return;vistos[sub]=true;
    var idPortal=notificacoesAreaV1Texto_(row[6])||notificacoesAreaV1Texto_(registroPorSub[sub]);
    var m=idPortal&&moradores[idPortal]?moradores[idPortal]:null;
    aparelhos.push({
      nome:m&&m.nome?notificacoesAreaV1Texto_(m.nome):'',
      idPortal:idPortal||'',
      referenciaTecnica:sub.slice(-8),
      abertoEm:notificacoesAreaV1Texto_(row[7])
    });
  });
  aparelhos.sort(function(a,b){return String(a.nome||a.referenciaTecnica).localeCompare(String(b.nome||b.referenciaTecnica),'pt-BR');});
  return {total:aparelhos.length,identificadas:aparelhos.filter(function(x){return Boolean(x.nome);}).length,aparelhos:aparelhos};
}

function notificacoesAreaV1RegistroPorSubscription_(ss,areaId){
  var map={},sheet=ss.getSheetByName('TACS_NOTIFICACOES_DISPOSITIVOS');
  if(!sheet||sheet.getLastRow()<=1)return map;
  var rows=sheet.getRange(2,1,sheet.getLastRow()-1,3).getDisplayValues();
  rows.forEach(function(row){
    var sub=notificacoesAreaV1Texto_(row[0]).toLowerCase();
    if(!sub||notificacoesAreaV1Texto_(row[1]).toUpperCase()!==notificacoesAreaV1Texto_(areaId).toUpperCase())return;
    map[sub]=notificacoesAreaV1Texto_(row[2]);
  });
  return map;
}

function notificacoesAreaV1IdPortalSubscription_(ss,areaId,subscriptionId){
  var map=notificacoesAreaV1RegistroPorSubscription_(ss,areaId);
  return notificacoesAreaV1Texto_(map[subscriptionId]||'');
}

function notificacoesAreaV1GarantirAberturas_(ss){
  var sheet=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.OPEN_SHEET);
  if(!sheet)sheet=ss.insertSheet(TACS_NOTIFICACOES_AREA_V1.OPEN_SHEET);
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,TACS_NOTIFICACOES_AREA_V1.OPEN_HEADERS.length).setValues([TACS_NOTIFICACOES_AREA_V1.OPEN_HEADERS.slice()]);sheet.setFrozenRows(1);return sheet;}
  var atual=sheet.getRange(1,1,1,TACS_NOTIFICACOES_AREA_V1.OPEN_HEADERS.length).getDisplayValues()[0];
  if(TACS_NOTIFICACOES_AREA_V1.OPEN_HEADERS.some(function(v,i){return atual[i]!==v;}))throw new Error('O histórico de abertura das notificações possui estrutura diferente.');
  return sheet;
}

function notificacoesAreaV1GarantirComprovantes_(ss){
  var sheet=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.RECEIPT_SHEET);
  if(!sheet)sheet=ss.insertSheet(TACS_NOTIFICACOES_AREA_V1.RECEIPT_SHEET);
  if(sheet.getLastRow()===0){
    sheet.getRange(1,1,1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).setValues([TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.slice()]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  var atual=sheet.getRange(1,1,1,TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.length).getDisplayValues()[0];
  if(TACS_NOTIFICACOES_AREA_V1.RECEIPT_HEADERS.some(function(v,i){return atual[i]!==v;})){
    throw new Error('O registro de comprovação das notificações possui estrutura diferente.');
  }
  return sheet;
}

function notificacoesAreaV1NovoToken_(){
  return (Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'').toLowerCase();
}

function notificacoesAreaV1HashToken_(token){
  var bytes=Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(token||''),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
}

function notificacoesAreaV1DataPainel_(valor){
  var data=valor instanceof Date?valor:new Date(valor);
  if(!isNaN(data.getTime()))return Utilities.formatDate(data,'America/Recife','dd/MM/yyyy HH:mm:ss');
  return notificacoesAreaV1Texto_(valor);
}

function notificacoesAreaV1Filtros_(areaId,quantidadeAreas){
  var area=notificacoesAreaV1Texto_(areaId).toUpperCase();
  var filtroArea={field:'tag',key:'area_tacs',relation:'=',value:area};

  // Migração segura das inscrições criadas antes da segmentação. Enquanto
  // Japaranduba for a única área cadastrada, aparelhos antigos sem a tag ainda
  // pertencem necessariamente a ela. Assim que existir outra área, o fallback
  // é removido automaticamente e somente tags explícitas recebem o envio.
  if(
    area===TACS_NOTIFICACOES_AREA_V1.DEFAULT_AREA_ID&&
    Number(quantidadeAreas||1)<=1
  ){
    return [
      filtroArea,
      {operator:'OR'},
      {field:'tag',key:'area_tacs',relation:'not_exists'}
    ];
  }

  return [filtroArea];
}

function notificacoesAreaV1QuantidadeAreas_(){
  try{return moradoresAdminV1CatalogoAreas_().length;}catch(erro){return 1;}
}

function notificacoesAreaV1ValidarAuditoria_(sheet){
  var atual=sheet.getRange(1,1,1,TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.length).getDisplayValues()[0];
  if(TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.some(function(v,i){return atual[i]!==v;}))throw new Error('A auditoria de notificações possui estrutura diferente.');
}

function notificacoesAreaV1Auditar_(contexto,acesso,input,onesignalId,destinatarios,resultado){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=ss.getSheetByName(TACS_NOTIFICACOES_AREA_V1.AUDIT_SHEET);
  if(!sheet)sheet=ss.insertSheet(TACS_NOTIFICACOES_AREA_V1.AUDIT_SHEET);
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.length).setValues([TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.slice()]);sheet.setFrozenRows(1);}
  notificacoesAreaV1ValidarAuditoria_(sheet);
  sheet.appendRow([
    input.evento,contexto.areaId,input.tipo,input.referencia,input.titulo,
    acesso.operadorId||'ADMIN_GERAL',onesignalId,destinatarios,resultado,new Date()
  ]);
  sheet.getRange(sheet.getLastRow(),10).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function notificacoesAreaV1PrimeiraPropriedade_(props,nomes){
  for(var i=0;i<nomes.length;i++){var valor=notificacoesAreaV1Texto_(props.getProperty(nomes[i]));if(valor)return valor;}
  return '';
}
function notificacoesAreaV1Booleano_(valor){return valor===true||['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(notificacoesAreaV1Texto_(valor).toUpperCase())!==-1;}
function notificacoesAreaV1Texto_(valor){return String(valor==null?'':valor).replace(/\s+/g,' ').trim();}
function notificacoesAreaV1ValidarRequestId_(valor){var id=notificacoesAreaV1Texto_(valor);if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da notificação inválido.');return id;}
function notificacoesAreaV1GuardarResultado_(id,r){try{CacheService.getScriptCache().put(TACS_NOTIFICACOES_AREA_V1.RESULT_PREFIX+id,JSON.stringify(r),TACS_NOTIFICACOES_AREA_V1.RESULT_SECONDS);}catch(erro){}}
function notificacoesAreaV1LerResultado_(id){try{var raw=CacheService.getScriptCache().get(TACS_NOTIFICACOES_AREA_V1.RESULT_PREFIX+id);return raw?JSON.parse(raw):null;}catch(erro){return null;}}
function notificacoesAreaV1ResponderPost_(requestId,resultado){var msg={source:'notificacoes-area-tacs-v1',requestId:requestId,result:resultado};var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(msg).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function notificacoesAreaV1ResponderJson_(dados,callback){var json=JSON.stringify(dados),cb=notificacoesAreaV1Texto_(callback);if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function notificacoesAreaV1Erro_(erro){return notificacoesAreaV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,700);}
