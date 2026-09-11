/**
 * ZZZZ_22_SaudeNotificacoesV1.gs
 * Portal TACS — Saúde das notificações por morador/aparelho V1.1.2
 *
 * Ajustes V1.1.2:
 * - mantém check-in técnico sem exigir CPF/CNS e vínculo nominal preservado;
 * - mantém reparo coletivo seletivo, sem afetar inscrições saudáveis;
 * - adiciona reparo individual por referência técnica curta, resolvida somente no servidor;
 * - múltiplos reparos individuais pendentes coexistem sem apagar alvos anteriores.
 */
var TACS_SAUDE_NOTIFICACOES_V1 = Object.freeze({
  VERSAO:'1.1.2',
  DEFAULT_AREA_ID:'JAPARANDUBA',
  DEFAULT_APP_ID:'e2294b98-c72b-4f8c-a055-de28979676dc',
  APP_ID_PROPERTIES:Object.freeze(['TACS_ONESIGNAL_APP_ID','ONESIGNAL_APP_ID']),
  API_KEY_PROPERTIES:Object.freeze([
    'TACS_ONESIGNAL_API_KEY','ONESIGNAL_APP_API_KEY','ONESIGNAL_REST_API_KEY','ONESIGNAL_API_KEY'
  ]),
  REGISTRY_SHEET:'TACS_NOTIFICACOES_DISPOSITIVOS',
  REGISTRY_HEADERS:Object.freeze([
    'SUBSCRIPTION_ID','AREA_ID','ID_PORTAL','ONESIGNAL_ID','TIPO_APARELHO','NAVEGADOR','SISTEMA',
    'PERMISSAO','OPTED_IN','TOKEN_ATIVO','AREA_CONFIRMADA','ESTADO_LOCAL','ULTIMO_CHECKIN',
    'REPARO_ID_APLICADO','CRIADO_EM','ATUALIZADO_EM'
  ]),
  REPAIR_SHEET:'TACS_REPAROS_NOTIFICACOES_AREA',
  REPAIR_HEADERS:Object.freeze(['AREA_ID','REPARO_ID','SOLICITADO_EM','OPERADOR_ID']),
  REPAIR_TARGET_SHEET:'TACS_REPAROS_NOTIFICACOES_ALVOS',
  REPAIR_TARGET_HEADERS:Object.freeze(['REPARO_ID','AREA_ID','SUBSCRIPTION_ID','MOTIVO','REGISTRADO_EM']),
  RESULT_PREFIX:'tacs_saude_notificacoes_v1_',
  RESULT_SECONDS:300,
  USER_CACHE_PREFIX:'tacs_saude_onesignal_user_v1_',
  USER_CACHE_SECONDS:90,
  MAX_DEVICES:120,
  STALE_DAYS:30,
  ONESIGNAL_BASE:'https://api.onesignal.com',
  EXPORT_ENDPOINT:'https://api.onesignal.com/players/csv_export',
  EXPORT_RETRIES:6,
  EXPORT_WAIT_MS:900
});

var saudeNotificacoesV1DoGetAnterior_;
var saudeNotificacoesV1DoPostAnterior_;
var saudeNotificacoesV1GetAnterior_;
var saudeNotificacoesV1PostAnterior_;

(function instalarSaudeNotificacoesV1_(){
  if(typeof doGet==='function'){
    saudeNotificacoesV1DoGetAnterior_=doGet;
    doGet=function(e){var r=saudeNotificacoesV1TratarGet_(e);return r||saudeNotificacoesV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    saudeNotificacoesV1DoPostAnterior_=doPost;
    doPost=function(e){var r=saudeNotificacoesV1TratarPost_(e);return r||saudeNotificacoesV1DoPostAnterior_(e);};
  }
  if(typeof tratarGetPainelTacs_==='function'){
    saudeNotificacoesV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){var r=saudeNotificacoesV1TratarGet_(e);return r||saudeNotificacoesV1GetAnterior_(e);};
  }
  if(typeof tratarPostPainelTacs_==='function'){
    saudeNotificacoesV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){var r=saudeNotificacoesV1TratarPost_(e);return r||saudeNotificacoesV1PostAnterior_(e);};
  }
})();

function saudeNotificacoesV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=saudeNotificacoesV1Texto_(p.action).toLowerCase();
  if(['publico_notificacao_checkin_result','admin_notificacoes_saude_result'].indexOf(action)===-1)return null;
  var requestId=saudeNotificacoesV1Texto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,160}$/.test(requestId))return null;
  var resultado=saudeNotificacoesV1LerResultado_(requestId);
  if(!resultado)return null;
  return saudeNotificacoesV1ResponderJson_({ok:true,pendente:false,requestId:requestId,result:resultado},p.callback);
}

function saudeNotificacoesV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=saudeNotificacoesV1Texto_(p.action).toLowerCase();
  if(['publico_notificacao_checkin','admin_notificacoes_saude','admin_notificacoes_solicitar_reparo_area','admin_notificacoes_solicitar_reparo_aparelho'].indexOf(action)===-1)return null;
  var requestId=saudeNotificacoesV1Texto_(p.requestId),resultado;
  try{
    requestId=saudeNotificacoesV1ValidarRequestId_(requestId);
    if(action==='publico_notificacao_checkin'){
      resultado=saudeNotificacoesV1CheckinPublico_(p);
    }else{
      var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
      saudeNotificacoesV1ExigirAcesso_(acesso);
      var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');
      if(action==='admin_notificacoes_saude')resultado=saudeNotificacoesV1SaudeAdmin_(contexto,acesso);
      else if(action==='admin_notificacoes_solicitar_reparo_aparelho')resultado=saudeNotificacoesV1SolicitarReparoAparelho_(contexto,acesso,p);
      else resultado=saudeNotificacoesV1SolicitarReparoArea_(contexto,acesso);
    }
  }catch(erro){resultado={ok:false,message:saudeNotificacoesV1Erro_(erro)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))saudeNotificacoesV1GuardarResultado_(requestId,resultado);
  return saudeNotificacoesV1ResponderPost_(requestId,resultado);
}

function saudeNotificacoesV1CheckinPublico_(p){
  var subscriptionId=saudeNotificacoesV1Texto_(p.subscriptionId||p.subscription_id).toLowerCase();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(subscriptionId)){
    throw new Error('A inscrição deste aparelho ainda não está pronta para ser registrada.');
  }
  var areaId=moradoresAdminV1NormalizarAreaId_(p.areaId||p.area||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_AREA_ID);
  var area=moradoresAdminV1EncontrarAreaConfigurada_(areaId);
  if(!area||area.publica===false)throw new Error('A área deste aparelho não está disponível.');
  var morador=saudeNotificacoesV1ResolverMoradorOpcional_(p.documento||p.cpf||p.cns||'',areaId);
  var agora=new Date(),agoraIso=saudeNotificacoesV1Data_(agora);
  var permission=saudeNotificacoesV1Booleano_(p.permission||p.permissao);
  var optedIn=saudeNotificacoesV1Booleano_(p.optedIn||p.opted_in);
  var tokenAtivo=saudeNotificacoesV1Booleano_(p.tokenAtivo||p.token_ativo);
  var areaConfirmada=saudeNotificacoesV1Booleano_(p.areaConfirmada||p.area_confirmada);
  var reparoAplicado=saudeNotificacoesV1Texto_(p.reparoAplicado||p.reparo_id_aplicado).slice(0,160);
  var estadoLocal=saudeNotificacoesV1EstadoLocal_(permission,optedIn,tokenAtivo,areaConfirmada);
  var props=PropertiesService.getScriptProperties();
  var appId=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.APP_ID_PROPERTIES)||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_APP_ID;
  var apiKey=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.API_KEY_PROPERTIES);
  var onesignalId='';
  if(apiKey){
    try{onesignalId=saudeNotificacoesV1IdentidadePorSubscription_(appId,apiKey,subscriptionId);}catch(erroOneSignal){}
  }
  var atual=saudeNotificacoesV1UpsertRegistro_({
    subscriptionId:subscriptionId,areaId:areaId,idPortal:morador.idPortal||'',onesignalId:onesignalId,
    tipoAparelho:saudeNotificacoesV1Texto_(p.tipoAparelho||p.device).slice(0,60),
    navegador:saudeNotificacoesV1Texto_(p.navegador||p.browser).slice(0,60),
    sistema:saudeNotificacoesV1Texto_(p.sistema||p.os).slice(0,80),
    permission:permission,optedIn:optedIn,tokenAtivo:tokenAtivo,areaConfirmada:areaConfirmada,
    estadoLocal:estadoLocal,ultimoCheckin:agoraIso,reparoAplicado:reparoAplicado,atualizadoEm:agoraIso
  });
  var reparo=saudeNotificacoesV1ReparoPendenteSubscription_(areaId,subscriptionId,atual.reparoAplicado);
  var pendente=Boolean(reparo&&reparo.reparoId);
  return {
    ok:true,areaId:areaId,registrado:true,vinculadoMorador:Boolean(atual.idPortal),estadoLocal:estadoLocal,
    reparoPendente:pendente,reparoId:pendente?reparo.reparoId:'',
    solicitadoEm:pendente?reparo.solicitadoEm:'',
    message:pendente?'Há uma atualização de avisos solicitada para este aparelho.':'A situação deste aparelho foi registrada.'
  };
}

function saudeNotificacoesV1ResolverMoradorOpcional_(documento,areaId){
  var doc=moradoresAdminV1Digitos_(documento);
  var cpf=/^[0-9]{11}$/.test(doc)&&moradoresAdminV1CpfValido_(doc)?doc:'';
  var cns=/^[0-9]{15}$/.test(doc)?doc:'';
  if(!cpf&&!cns)return {idPortal:''};
  var area=moradoresAdminV1EncontrarAreaConfigurada_(areaId);
  if(!area||area.publica===false)return {idPortal:''};
  var contexto={perfil:'PUBLICO',operadorId:'PUBLICO',agenteId:area.agenteId,areaId:area.areaId,areaNome:area.areaNome,unidadeId:area.unidadeId,planilhaId:area.planilhaId,permissoes:[]};
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var metaMap=moradoresAdminV1LerMetaMap_(fonte.ss,contexto);
  var encontrados=[];
  moradoresAdminV1LocalizarTodosPorDocumento_(fonte,cpf,cns).forEach(function(registro){
    var origemKey=moradoresAdminV1ChaveOrigem_(registro.origem);
    var chave=moradoresAdminV1ChaveRegistro_(registro.morador);
    var meta=metaMap.porOrigem[origemKey]||metaMap.porChave[chave]||null;
    var situacao=moradoresAdminV1Texto_((meta&&meta.situacao)||registro.morador.status||'ATIVO').toUpperCase();
    if(situacao==='ATIVO')encontrados.push(registro.morador);
  });
  if(encontrados.length!==1)return {idPortal:''};
  var idPortal=moradoresAdminV1Texto_(encontrados[0].idPortal||encontrados[0].id);
  return {idPortal:idPortal||''};
}

function saudeNotificacoesV1UpsertRegistro_(input){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('O registro de notificações está sendo atualizado. Tente novamente.');
  try{
    var last=sheet.getLastRow(),linha=0,criadoEm=input.atualizadoEm,idPortal=input.idPortal||'';
    if(last>1){
      var ids=sheet.getRange(2,1,last-1,1).getDisplayValues();
      for(var i=0;i<ids.length;i++)if(saudeNotificacoesV1Texto_(ids[i][0]).toLowerCase()===input.subscriptionId){linha=i+2;break;}
    }
    if(linha){
      criadoEm=saudeNotificacoesV1Texto_(sheet.getRange(linha,15).getDisplayValue())||input.atualizadoEm;
      if(!idPortal)idPortal=saudeNotificacoesV1Texto_(sheet.getRange(linha,3).getDisplayValue());
      if(!input.onesignalId)input.onesignalId=saudeNotificacoesV1Texto_(sheet.getRange(linha,4).getDisplayValue());
      if(!input.reparoAplicado)input.reparoAplicado=saudeNotificacoesV1Texto_(sheet.getRange(linha,14).getDisplayValue());
    }
    var values=[
      input.subscriptionId,input.areaId,idPortal,input.onesignalId||'',input.tipoAparelho||'',input.navegador||'',input.sistema||'',
      input.permission?'SIM':'NAO',input.optedIn?'SIM':'NAO',input.tokenAtivo?'SIM':'NAO',input.areaConfirmada?'SIM':'NAO',
      input.estadoLocal,input.ultimoCheckin,input.reparoAplicado||'',criadoEm,input.atualizadoEm
    ];
    if(linha)sheet.getRange(linha,1,1,values.length).setValues([values]);
    else{sheet.appendRow(values);linha=sheet.getLastRow();}
    return {linha:linha,idPortal:idPortal,reparoAplicado:input.reparoAplicado||''};
  }finally{lock.releaseLock();}
}

function saudeNotificacoesV1SaudeAdmin_(contexto,acesso){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);
  var reparo=saudeNotificacoesV1UltimoReparoArea_(contexto.areaId);
  var moradores=saudeNotificacoesV1MapaMoradores_(contexto);
  var props=PropertiesService.getScriptProperties();
  var appId=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.APP_ID_PROPERTIES)||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_APP_ID;
  var apiKey=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.API_KEY_PROPERTIES);
  if(!apiKey)throw new Error('A consulta da audiência Push não está configurada no OneSignal.');

  var registros=[],registroPorId={},last=sheet.getLastRow();
  if(last>1){
    sheet.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues().forEach(function(row){
      if(moradoresAdminV1NormalizarAreaId_(row[1])!==contexto.areaId)return;
      var reg=saudeNotificacoesV1RegistroDaLinha_(row);
      registros.push(reg);
      registroPorId[saudeNotificacoesV1Texto_(reg.subscriptionId).toLowerCase()]=reg;
    });
  }

  var exportados=saudeNotificacoesV1ExportarSubscriptions_(appId,apiKey);
  var quantidadeAreas=saudeNotificacoesV1QuantidadeAreas_();
  var remotoTodos={},remotoArea=[];
  exportados.forEach(function(sub){
    var id=saudeNotificacoesV1Texto_(sub.id).toLowerCase();
    if(!id||!saudeNotificacoesV1EhPush_(sub.device_type))return;
    remotoTodos[id]=true;
    if(saudeNotificacoesV1PertenceArea_(sub,contexto.areaId,quantidadeAreas))remotoArea.push(sub);
  });

  var aparelhos=[],contagens={ativos:0,inativos:0,reparo:0,semConfirmacao:0,total:0};
  remotoArea.forEach(function(sub){
    var id=saudeNotificacoesV1Texto_(sub.id).toLowerCase();
    var reg=registroPorId[id]||null;
    var morador=reg&&reg.idPortal?moradores[reg.idPortal]:null;
    var repairInfo=saudeNotificacoesV1ReparoPendenteSubscription_(contexto.areaId,id,reg?reg.reparoAplicado:'');
    var pending=Boolean(repairInfo&&repairInfo.reparoId);
    var classificacao=saudeNotificacoesV1ClassificarExport_(sub,pending);
    saudeNotificacoesV1Somar_(contagens,classificacao.status);
    var tipo=saudeNotificacoesV1TipoRemoto_(sub.device_type);
    aparelhos.push({
      nome:morador&&moradoresAdminV1Texto_(morador.nome)
        ?moradoresAdminV1Texto_(morador.nome)
        :(classificacao.status==='ATIVO'?'Aparelho ativo ainda não identificado':'Aparelho ainda não identificado'),
      telefone:morador?moradoresAdminV1Texto_(morador.celular||morador.telefoneContato):'',
      dispositivo:reg&&reg.tipoAparelho?reg.tipoAparelho:tipo.dispositivo,
      navegador:reg&&reg.navegador?reg.navegador:tipo.navegador,
      sistema:reg&&reg.sistema?reg.sistema:saudeNotificacoesV1Texto_(sub.device_os),
      status:classificacao.status,statusTexto:classificacao.texto,motivo:classificacao.motivo,
      ultimoCheckin:reg?reg.ultimoCheckin:'',
      subscriptionRef:id.slice(-8),reparoPendente:pending,
      vinculadoMorador:Boolean(morador)
    });
  });

  registros.forEach(function(reg){
    var id=saudeNotificacoesV1Texto_(reg.subscriptionId).toLowerCase();
    if(!id||remotoTodos[id])return;
    var morador=reg.idPortal?moradores[reg.idPortal]:null;
    var repairInfo=saudeNotificacoesV1ReparoPendenteSubscription_(contexto.areaId,id,reg.reparoAplicado);
    var pending=Boolean(repairInfo&&repairInfo.reparoId);
    var classificacao=saudeNotificacoesV1Classificar_(reg,null,pending);
    saudeNotificacoesV1Somar_(contagens,classificacao.status);
    aparelhos.push({
      nome:morador&&moradoresAdminV1Texto_(morador.nome)?moradoresAdminV1Texto_(morador.nome):'Aparelho ainda não identificado',
      telefone:morador?moradoresAdminV1Texto_(morador.celular||morador.telefoneContato):'',
      dispositivo:reg.tipoAparelho||'Aparelho',navegador:reg.navegador||'',sistema:reg.sistema||'',
      status:classificacao.status,statusTexto:classificacao.texto,motivo:classificacao.motivo,
      ultimoCheckin:reg.ultimoCheckin,subscriptionRef:id.slice(-8),reparoPendente:pending,
      vinculadoMorador:Boolean(morador)
    });
  });

  contagens.total=aparelhos.length;
  aparelhos.sort(function(a,b){
    var peso={REPARO:0,INATIVO:1,SEM_CONFIRMACAO:2,ATIVO:3};
    var pa=Object.prototype.hasOwnProperty.call(peso,a.status)?peso[a.status]:9;
    var pb=Object.prototype.hasOwnProperty.call(peso,b.status)?peso[b.status]:9;
    if(pa!==pb)return pa-pb;
    return String(a.nome).localeCompare(String(b.nome),'pt-BR');
  });
  var limitado=aparelhos.length>TACS_SAUDE_NOTIFICACOES_V1.MAX_DEVICES;
  if(limitado)aparelhos=aparelhos.slice(0,TACS_SAUDE_NOTIFICACOES_V1.MAX_DEVICES);

  return {
    ok:true,versao:TACS_SAUDE_NOTIFICACOES_V1.VERSAO,areaId:contexto.areaId,areaNome:contexto.areaNome,
    contagens:contagens,aparelhos:aparelhos,oneSignalConsultado:true,audienciaFonte:'ONESIGNAL_EXPORT',
    reparoArea:reparo||null,limitado:limitado,
    observacao:'Aptos e inativos são apurados na audiência atual do OneSignal. O nome aparece quando a inscrição já foi vinculada ao cadastro do morador. Reparos coletivos e individuais só marcam inscrições problemáticas; aparelhos saudáveis permanecem ativos.'
  };
}

function saudeNotificacoesV1ExportarSubscriptions_(appId,apiKey){
  var resposta=UrlFetchApp.fetch(
    TACS_SAUDE_NOTIFICACOES_V1.EXPORT_ENDPOINT+'?app_id='+encodeURIComponent(appId),
    {
      method:'post',contentType:'application/json',
      payload:JSON.stringify({extra_fields:['onesignal_id','notification_types']}),
      headers:{Authorization:'Key '+apiKey},muteHttpExceptions:true
    }
  );
  var code=Number(resposta.getResponseCode()),dados={};
  try{dados=JSON.parse(resposta.getContentText()||'{}');}catch(e){}
  if(code<200||code>=300||!dados.csv_file_url){
    throw new Error('O OneSignal não liberou a audiência Push para consulta (HTTP '+code+').');
  }
  var url=saudeNotificacoesV1Texto_(dados.csv_file_url);
  if(!/^https:\/\//i.test(url))throw new Error('O OneSignal retornou um endereço de exportação inválido.');
  var ultimoCodigo=0;
  for(var tentativa=0;tentativa<TACS_SAUDE_NOTIFICACOES_V1.EXPORT_RETRIES;tentativa++){
    if(tentativa)Utilities.sleep(TACS_SAUDE_NOTIFICACOES_V1.EXPORT_WAIT_MS);
    var arquivo=UrlFetchApp.fetch(url,{method:'get',muteHttpExceptions:true});
    ultimoCodigo=Number(arquivo.getResponseCode());
    if(ultimoCodigo===200){
      var blob=arquivo.getBlob(),texto='';
      try{texto=Utilities.ungzip(blob).getDataAsString('UTF-8');}
      catch(erroGzip){texto=blob.getDataAsString('UTF-8');}
      return saudeNotificacoesV1ParseCsv_(texto);
    }
    if(ultimoCodigo!==404&&ultimoCodigo!==202)break;
  }
  throw new Error('A exportação da audiência do OneSignal ainda não ficou disponível (HTTP '+ultimoCodigo+'). Tente atualizar novamente em alguns segundos.');
}

function saudeNotificacoesV1ParseCsv_(texto){
  texto=String(texto==null?'':texto);
  if(!texto)return [];
  var linhas=[],linha=[],campo='',aspas=false;
  for(var i=0;i<texto.length;i++){
    var c=texto.charAt(i);
    if(aspas){
      if(c==='"'){
        if(texto.charAt(i+1)==='"'){campo+='"';i++;}
        else aspas=false;
      }else campo+=c;
    }else{
      if(c==='"')aspas=true;
      else if(c===','){linha.push(campo);campo='';}
      else if(c==='\n'){linha.push(campo);linhas.push(linha);linha=[];campo='';}
      else if(c!=='\r')campo+=c;
    }
  }
  if(campo||linha.length){linha.push(campo);linhas.push(linha);}
  if(!linhas.length)return [];
  var cabecalho=linhas.shift().map(function(v,i){v=String(v||'').trim();return i===0?v.replace(/^\uFEFF/,''):v;});
  return linhas.filter(function(r){return r.some(function(v){return String(v||'').length>0;});}).map(function(r){
    var obj={};cabecalho.forEach(function(h,i){obj[h]=typeof r[i]==='undefined'?'':r[i];});return obj;
  });
}

function saudeNotificacoesV1Tags_(valor){
  var texto=saudeNotificacoesV1Texto_(valor);
  if(!texto)return {};
  try{
    var tags=JSON.parse(texto);
    if(typeof tags==='string')tags=JSON.parse(tags);
    return tags&&typeof tags==='object'&&!Array.isArray(tags)?tags:{};
  }catch(e){return {};}
}

function saudeNotificacoesV1PertenceArea_(sub,areaId,quantidadeAreas){
  var tags=saudeNotificacoesV1Tags_(sub&&sub.tags);
  var tag=saudeNotificacoesV1Texto_(tags.area_tacs).toUpperCase();
  areaId=moradoresAdminV1NormalizarAreaId_(areaId);
  if(tag)return tag===areaId;
  return areaId===TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_AREA_ID&&Number(quantidadeAreas||1)<=1;
}

function saudeNotificacoesV1QuantidadeAreas_(){
  try{
    if(typeof notificacoesAreaV1QuantidadeAreas_==='function')return Number(notificacoesAreaV1QuantidadeAreas_()||1);
    return Number(moradoresAdminV1CatalogoAreas_().length||1);
  }catch(e){return 1;}
}

function saudeNotificacoesV1EhPush_(tipo){return [0,1,2,5,7,17].indexOf(Number(tipo))!==-1;}
function saudeNotificacoesV1TipoRemoto_(tipo){
  tipo=Number(tipo);
  if(tipo===5)return {dispositivo:'Web Push',navegador:'Chrome / navegador compatível'};
  if(tipo===7||tipo===17)return {dispositivo:'Web Push',navegador:'Safari'};
  if(tipo===1)return {dispositivo:'Android',navegador:'Push Android'};
  if(tipo===0)return {dispositivo:'iPhone/iPad',navegador:'Push iOS'};
  if(tipo===2)return {dispositivo:'Fire OS',navegador:'Push'};
  return {dispositivo:'Aparelho Push',navegador:''};
}
function saudeNotificacoesV1CsvBooleano_(v){if(v===true||v===1)return true;return ['t','true','1','sim','yes'].indexOf(saudeNotificacoesV1Texto_(v).toLowerCase())!==-1;}
function saudeNotificacoesV1ClassificarExport_(sub,reparoPendente){
  if(reparoPendente)return {status:'REPARO',texto:'Reparo solicitado',motivo:'Existe uma atualização de avisos pendente para este aparelho.'};
  var invalido=saudeNotificacoesV1CsvBooleano_(sub&&sub.invalid_identifier);
  var nt=Number(sub&&sub.notification_types);
  if(!invalido&&Number.isFinite(nt)&&nt>0)return {status:'ATIVO',texto:'Ativo',motivo:'O OneSignal informa que esta inscrição Push está apta a receber avisos.'};
  if(invalido||(Number.isFinite(nt)&&nt<=0))return {status:'INATIVO',texto:'Inativo',motivo:'O OneSignal informa que esta inscrição Push não está apta a receber avisos.'};
  return {status:'SEM_CONFIRMACAO',texto:'Sem confirmação',motivo:'A inscrição existe no OneSignal, mas o estado atual não pôde ser classificado com segurança.'};
}
function saudeNotificacoesV1Somar_(contagens,status){if(status==='ATIVO')contagens.ativos++;else if(status==='INATIVO')contagens.inativos++;else if(status==='REPARO')contagens.reparo++;else contagens.semConfirmacao++;}

function saudeNotificacoesV1SolicitarReparoArea_(contexto,acesso){
  var props=PropertiesService.getScriptProperties();
  var appId=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.APP_ID_PROPERTIES)||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_APP_ID;
  var apiKey=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.API_KEY_PROPERTIES);
  if(!apiKey)throw new Error('A consulta da audiência Push não está configurada no OneSignal.');
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_HEADERS);
  var targetSheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_HEADERS);
  var reparoId='reparo_'+contexto.areaId.toLowerCase()+'_'+Utilities.getUuid().replace(/-/g,'');
  var quando=saudeNotificacoesV1Data_(new Date());
  var exportados=saudeNotificacoesV1ExportarSubscriptions_(appId,apiKey);
  var quantidadeAreas=saudeNotificacoesV1QuantidadeAreas_(),alvos=[],vistos={};
  exportados.forEach(function(sub){
    var id=saudeNotificacoesV1Texto_(sub.id).toLowerCase();
    if(!id||vistos[id]||!saudeNotificacoesV1EhPush_(sub.device_type)||!saudeNotificacoesV1PertenceArea_(sub,contexto.areaId,quantidadeAreas))return;
    vistos[id]=true;
    var c=saudeNotificacoesV1ClassificarExport_(sub,false);
    if(c.status!=='ATIVO')alvos.push([reparoId,contexto.areaId,id,c.status,quando]);
  });
  var registry=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);
  if(registry.getLastRow()>1){
    registry.getRange(2,1,registry.getLastRow()-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues().forEach(function(row){
      if(moradoresAdminV1NormalizarAreaId_(row[1])!==contexto.areaId)return;
      var reg=saudeNotificacoesV1RegistroDaLinha_(row),id=saudeNotificacoesV1Texto_(reg.subscriptionId).toLowerCase();
      if(!id||vistos[id])return;
      var c=saudeNotificacoesV1Classificar_(reg,null,false);
      if(c.status!=='ATIVO')alvos.push([reparoId,contexto.areaId,id,c.status,quando]);
    });
  }
  sheet.appendRow([contexto.areaId,reparoId,quando,saudeNotificacoesV1Texto_(acesso.operadorId||acesso.tacsId||contexto.operadorId||'ADMIN')]);
  if(alvos.length)targetSheet.getRange(targetSheet.getLastRow()+1,1,alvos.length,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_HEADERS.length).setValues(alvos);
  return {ok:true,areaId:contexto.areaId,areaNome:contexto.areaNome,reparoId:reparoId,solicitadoEm:quando,alvos:alvos.length,message:alvos.length?'Reparo solicitado somente para '+alvos.length+' inscrição(ões) com problema. Aparelhos aptos foram preservados.':'Nenhuma inscrição com problema foi encontrada; os aparelhos aptos foram preservados.'};
}

function saudeNotificacoesV1NormalizarRef_(valor){
  var ref=saudeNotificacoesV1Texto_(valor).toLowerCase().replace(/^…/,'').replace(/^\.\.\./,'');
  if(!/^[0-9a-f]{8}$/.test(ref))throw new Error('Referência técnica do aparelho inválida. Atualize a situação e tente novamente.');
  return ref;
}

function saudeNotificacoesV1SolicitarReparoAparelho_(contexto,acesso,p){
  var ref=saudeNotificacoesV1NormalizarRef_(p.subscriptionRef||p.referencia||p.ref||'');
  var props=PropertiesService.getScriptProperties();
  var appId=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.APP_ID_PROPERTIES)||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_APP_ID;
  var apiKey=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.API_KEY_PROPERTIES);
  if(!apiKey)throw new Error('A consulta da audiência Push não está configurada no OneSignal.');
  var ss=tacsTerritorioV1Planilha_();
  var quantidadeAreas=saudeNotificacoesV1QuantidadeAreas_();
  var encontrados={},remotoPorId={},registroPorId={};
  saudeNotificacoesV1ExportarSubscriptions_(appId,apiKey).forEach(function(sub){
    var id=saudeNotificacoesV1Texto_(sub.id).toLowerCase();
    if(!id||id.slice(-8)!==ref||!saudeNotificacoesV1EhPush_(sub.device_type)||!saudeNotificacoesV1PertenceArea_(sub,contexto.areaId,quantidadeAreas))return;
    encontrados[id]=true;remotoPorId[id]=sub;
  });
  var registry=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);
  if(registry.getLastRow()>1){
    registry.getRange(2,1,registry.getLastRow()-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues().forEach(function(row){
      if(moradoresAdminV1NormalizarAreaId_(row[1])!==contexto.areaId)return;
      var reg=saudeNotificacoesV1RegistroDaLinha_(row),id=saudeNotificacoesV1Texto_(reg.subscriptionId).toLowerCase();
      if(!id||id.slice(-8)!==ref)return;
      encontrados[id]=true;registroPorId[id]=reg;
    });
  }
  var ids=Object.keys(encontrados);
  if(ids.length===0)throw new Error('Este aparelho não foi localizado na área. Atualize a situação e tente novamente.');
  if(ids.length!==1)throw new Error('A referência técnica não é única nesta área. Nenhum reparo foi solicitado.');
  var id=ids[0],reg=registroPorId[id]||null,remoto=remotoPorId[id]||null;
  var pendente=saudeNotificacoesV1ReparoPendenteSubscription_(contexto.areaId,id,reg?reg.reparoAplicado:'');
  if(pendente&&pendente.reparoId){
    return {ok:true,areaId:contexto.areaId,areaNome:contexto.areaNome,subscriptionRef:ref,reparoId:pendente.reparoId,solicitadoEm:pendente.solicitadoEm,alreadyPending:true,message:'Este aparelho já possui reparo solicitado. Nenhuma solicitação duplicada foi criada.'};
  }
  var classificacao=remoto?saudeNotificacoesV1ClassificarExport_(remoto,false):saudeNotificacoesV1Classificar_(reg,null,false);
  if(classificacao.status==='ATIVO'){
    return {ok:true,areaId:contexto.areaId,areaNome:contexto.areaNome,subscriptionRef:ref,skipped:true,message:'O OneSignal informa que este aparelho já está apto. Nenhum reparo foi solicitado.'};
  }
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_HEADERS);
  var targetSheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_HEADERS);
  var reparoId='reparo_individual_'+contexto.areaId.toLowerCase()+'_'+Utilities.getUuid().replace(/-/g,'');
  var quando=saudeNotificacoesV1Data_(new Date());
  var operador=saudeNotificacoesV1Texto_(acesso.operadorId||acesso.tacsId||contexto.operadorId||'ADMIN');
  sheet.appendRow([contexto.areaId,reparoId,quando,operador]);
  targetSheet.appendRow([reparoId,contexto.areaId,id,'INDIVIDUAL_'+classificacao.status,quando]);
  return {ok:true,areaId:contexto.areaId,areaNome:contexto.areaNome,subscriptionRef:ref,reparoId:reparoId,solicitadoEm:quando,alvos:1,message:'Reparo solicitado somente para este aparelho. Os demais aparelhos não foram alterados.'};
}

function saudeNotificacoesV1UltimoReparoArea_(areaId){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_HEADERS);
  var last=sheet.getLastRow();if(last<=1)return null;
  var rows=sheet.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_HEADERS.length).getDisplayValues();
  for(var i=rows.length-1;i>=0;i--)if(moradoresAdminV1NormalizarAreaId_(rows[i][0])===areaId)return {areaId:areaId,reparoId:rows[i][1],solicitadoEm:rows[i][2]};
  return null;
}

function saudeNotificacoesV1ReparoPorId_(areaId,reparoId){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_HEADERS);
  var last=sheet.getLastRow();if(last<=1)return null;
  var rows=sheet.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_HEADERS.length).getDisplayValues();
  for(var i=rows.length-1;i>=0;i--){
    if(moradoresAdminV1NormalizarAreaId_(rows[i][0])===areaId&&saudeNotificacoesV1Texto_(rows[i][1])===reparoId){
      return {areaId:areaId,reparoId:reparoId,solicitadoEm:rows[i][2]};
    }
  }
  return null;
}

function saudeNotificacoesV1ReparoPendenteSubscription_(areaId,subscriptionId,reparoAplicado){
  var ss=tacsTerritorioV1Planilha_();
  var sheet=saudeNotificacoesV1GarantirSheet_(ss,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_HEADERS);
  var last=sheet.getLastRow();if(last<=1)return null;
  var rows=sheet.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REPAIR_TARGET_HEADERS.length).getDisplayValues();
  var id=saudeNotificacoesV1Texto_(subscriptionId).toLowerCase();
  var aplicado=saudeNotificacoesV1Texto_(reparoAplicado);
  for(var i=rows.length-1;i>=0;i--){
    if(moradoresAdminV1NormalizarAreaId_(rows[i][1])!==areaId||saudeNotificacoesV1Texto_(rows[i][2]).toLowerCase()!==id)continue;
    var reparoId=saudeNotificacoesV1Texto_(rows[i][0]);
    if(reparoId===aplicado)return null;
    return saudeNotificacoesV1ReparoPorId_(areaId,reparoId)||{areaId:areaId,reparoId:reparoId,solicitadoEm:rows[i][4]};
  }
  return null;
}

function saudeNotificacoesV1MapaMoradores_(contexto){
  var fonte=moradoresAdminV1LocalizarFonte_(contexto),mapa={},last=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn();
  if(last<=fonte.headerRow+1)return mapa;
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,last-(fonte.headerRow+1),lastCol);
  var raw=range.getValues(),display=range.getDisplayValues();
  for(var i=0;i<display.length;i++){
    var m=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);if(!m.nome)continue;
    var id=moradoresAdminV1Texto_(m.idPortal||m.id);if(!id)continue;
    mapa[id]=m;
  }
  return mapa;
}
function saudeNotificacoesV1RegistroDaLinha_(r){return {subscriptionId:r[0],areaId:r[1],idPortal:r[2],onesignalId:r[3],tipoAparelho:r[4],navegador:r[5],sistema:r[6],permission:r[7]==='SIM',optedIn:r[8]==='SIM',tokenAtivo:r[9]==='SIM',areaConfirmada:r[10]==='SIM',estadoLocal:r[11],ultimoCheckin:r[12],reparoAplicado:r[13]};}
function saudeNotificacoesV1Classificar_(reg,remoto,reparoPendente){
  if(reparoPendente)return {status:'REPARO',texto:'Reparo solicitado',motivo:'Existe uma atualização de avisos pendente para este aparelho.'};
  if(remoto){
    var nt=Number(remoto.notification_types),enabled=remoto.enabled===true;
    if(enabled&&Number.isFinite(nt)&&nt>0)return {status:'ATIVO',texto:'Ativo',motivo:'Inscrição ativa no OneSignal e vínculo local conferido.'};
    return {status:'INATIVO',texto:'Inativo',motivo:'O OneSignal informa que esta inscrição não está apta a receber Push.'};
  }
  if(!reg.permission)return {status:'REPARO',texto:'Reparo necessário',motivo:'Permissão de notificações não está ativa no último check-in.'};
  if(!reg.optedIn||!reg.tokenAtivo||!reg.areaConfirmada)return {status:'REPARO',texto:'Reparo necessário',motivo:'Inscrição, token ou vínculo da área está incompleto.'};
  var stamp=Date.parse(String(reg.ultimoCheckin||'').replace(' ','T'));
  if(!isNaN(stamp)&&Date.now()-stamp>TACS_SAUDE_NOTIFICACOES_V1.STALE_DAYS*86400000)return {status:'SEM_CONFIRMACAO',texto:'Sem confirmação recente',motivo:'O aparelho não faz uma checagem no Portal há mais de '+TACS_SAUDE_NOTIFICACOES_V1.STALE_DAYS+' dias.'};
  return {status:'SEM_CONFIRMACAO',texto:'Aguardando confirmação',motivo:'O último check-in local está correto, mas o estado atual do OneSignal não pôde ser confirmado agora.'};
}
function saudeNotificacoesV1IdentidadePorSubscription_(appId,apiKey,subscriptionId){var url=TACS_SAUDE_NOTIFICACOES_V1.ONESIGNAL_BASE+'/apps/'+encodeURIComponent(appId)+'/subscriptions/'+encodeURIComponent(subscriptionId)+'/user/identity';var data=saudeNotificacoesV1FetchOneSignal_(url,apiKey);return saudeNotificacoesV1Texto_(data&&data.identity&&data.identity.onesignal_id);}
function saudeNotificacoesV1ViewUser_(appId,apiKey,onesignalId){var cache=CacheService.getScriptCache(),key=TACS_SAUDE_NOTIFICACOES_V1.USER_CACHE_PREFIX+onesignalId,raw=cache.get(key);if(raw){try{return JSON.parse(raw);}catch(e){}}var url=TACS_SAUDE_NOTIFICACOES_V1.ONESIGNAL_BASE+'/apps/'+encodeURIComponent(appId)+'/users/by/onesignal_id/'+encodeURIComponent(onesignalId);var data=saudeNotificacoesV1FetchOneSignal_(url,apiKey);try{cache.put(key,JSON.stringify(data),TACS_SAUDE_NOTIFICACOES_V1.USER_CACHE_SECONDS);}catch(e){}return data;}
function saudeNotificacoesV1EncontrarSubscription_(user,subscriptionId){var lista=user&&Array.isArray(user.subscriptions)?user.subscriptions:[];for(var i=0;i<lista.length;i++)if(saudeNotificacoesV1Texto_(lista[i].id).toLowerCase()===subscriptionId.toLowerCase())return lista[i];return null;}
function saudeNotificacoesV1FetchOneSignal_(url,apiKey){var resp=UrlFetchApp.fetch(url,{method:'get',headers:{Authorization:'Key '+apiKey},muteHttpExceptions:true});var code=Number(resp.getResponseCode()),body=resp.getContentText(),data={};try{data=JSON.parse(body||'{}');}catch(e){}if(code<200||code>=300)throw new Error('Consulta técnica ao OneSignal indisponível (HTTP '+code+').');return data;}
function saudeNotificacoesV1EstadoLocal_(permission,optedIn,tokenAtivo,areaConfirmada){if(!permission)return 'SEM_PERMISSAO';if(!optedIn)return 'SEM_INSCRICAO';if(!tokenAtivo)return 'SEM_TOKEN';if(!areaConfirmada)return 'SEM_AREA';return 'ATIVO_LOCAL';}
function saudeNotificacoesV1ExigirAcesso_(acesso){if(acesso&&acesso.perfil==='TACS'){if((acesso.permissoes||[]).indexOf('PUBLICACOES_GERENCIAR')===-1)throw new Error('Seu cadastro não possui permissão para gerenciar notificações.');return true;}tacsTerritorioV1ExigirAdmin_(acesso);return true;}
function saudeNotificacoesV1GarantirSheet_(ss,nome,headers){var sheet=ss.getSheetByName(nome);if(!sheet)sheet=ss.insertSheet(nome);if(sheet.getLastRow()===0){sheet.getRange(1,1,1,headers.length).setValues([headers.slice()]);sheet.setFrozenRows(1);}var atual=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];if(headers.some(function(v,i){return atual[i]!==v;}))throw new Error('A estrutura da planilha '+nome+' é diferente da versão esperada.');return sheet;}
function saudeNotificacoesV1PrimeiraPropriedade_(props,nomes){for(var i=0;i<nomes.length;i++){var v=saudeNotificacoesV1Texto_(props.getProperty(nomes[i]));if(v)return v;}return '';}
function saudeNotificacoesV1Booleano_(v){if(v===true||v===1)return true;return ['true','1','sim','yes','ativo'].indexOf(saudeNotificacoesV1Texto_(v).toLowerCase())!==-1;}
function saudeNotificacoesV1Texto_(v){return String(v==null?'':v).trim();}
function saudeNotificacoesV1Data_(d){return Utilities.formatDate(d,'America/Recife','yyyy-MM-dd HH:mm:ss');}
function saudeNotificacoesV1Erro_(e){return e&&e.message?String(e.message):'Não foi possível processar a saúde das notificações.';}
function saudeNotificacoesV1ValidarRequestId_(v){v=saudeNotificacoesV1Texto_(v);if(!/^[A-Za-z0-9_-]{8,160}$/.test(v))throw new Error('Identificador da requisição inválido.');return v;}
function saudeNotificacoesV1GuardarResultado_(requestId,result){CacheService.getScriptCache().put(TACS_SAUDE_NOTIFICACOES_V1.RESULT_PREFIX+requestId,JSON.stringify(result),TACS_SAUDE_NOTIFICACOES_V1.RESULT_SECONDS);}
function saudeNotificacoesV1LerResultado_(requestId){var raw=CacheService.getScriptCache().get(TACS_SAUDE_NOTIFICACOES_V1.RESULT_PREFIX+requestId);if(!raw)return null;try{return JSON.parse(raw);}catch(e){return null;}}
function saudeNotificacoesV1ResponderJson_(obj,callback){var json=JSON.stringify(obj);if(callback&&/^[A-Za-z_$][A-Za-z0-9_$\.]{0,120}$/.test(callback))return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function saudeNotificacoesV1ResponderPost_(requestId,result){var payload={source:'notificacao-saude-tacs-v1',requestId:requestId,result:result};var html='<!doctype html><html><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(payload).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
