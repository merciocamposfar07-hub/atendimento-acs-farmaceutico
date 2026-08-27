/**
 * Portal TACS — saneamento histórico do aparelho TACS / teste V1.0.0
 *
 * Objetivo:
 * - identificar inscrições antigas do MESMO aparelho técnico por evidência forte;
 * - usar o identificador estável do aparelho + histórico técnico + ONESIGNAL_ID;
 * - remover somente vínculo de morador/família das inscrições comprovadas;
 * - nunca apagar cadastro de morador, inscrição Push ou registro técnico;
 * - registrar auditoria de toda alteração;
 * - manter casos apenas semelhantes separados para revisão, sem alteração automática.
 */
var TACS_SANEAMENTO_HISTORICO_APARELHO_V1=Object.freeze({
  VERSAO:'1.0.0',
  HISTORY_SHEET:'TACS_APARELHO_TACS_HISTORICO_SUBS',
  HISTORY_HEADERS:Object.freeze([
    'DISPOSITIVO','AREA_ID','ONESIGNAL_ID','SUBSCRIPTION_ID','PRIMEIRO_VISTO_EM','ULTIMO_VISTO_EM'
  ]),
  AUDIT_SHEET:'TACS_APARELHO_TACS_SANEAMENTO_AUDITORIA',
  AUDIT_HEADERS:Object.freeze([
    'AUDITORIA_ID','AREA_ID','DISPOSITIVO_REF','ONESIGNAL_REF','SUBSCRIPTION_ID',
    'ID_PORTAL_ANTERIOR','MORADOR_ANTERIOR','ACAO','MOTIVO','OPERADOR_ID','EXECUTADO_EM'
  ])
});

var saneamentoHistoricoAparelhoV1DoPostAnterior_;
var saneamentoHistoricoAparelhoV1AssociarAnterior_;
var saneamentoHistoricoAparelhoV1SalvarAnterior_;

(function instalarSaneamentoHistoricoAparelhoV1_(){
  if(typeof doPost==='function'){
    saneamentoHistoricoAparelhoV1DoPostAnterior_=doPost;
    doPost=function(e){
      var r=saneamentoHistoricoAparelhoV1TratarPost_(e);
      return r||saneamentoHistoricoAparelhoV1DoPostAnterior_(e);
    };
  }
  if(typeof aparelhoTacsTesteV1AssociarSubscription_==='function'){
    saneamentoHistoricoAparelhoV1AssociarAnterior_=aparelhoTacsTesteV1AssociarSubscription_;
    aparelhoTacsTesteV1AssociarSubscription_=function(dispositivo,areaId,chave,subscriptionId){
      var regAntes=null;
      try{regAntes=aparelhoTacsTesteV1RegistroDispositivo_(dispositivo,areaId);}catch(e){}
      var ok=saneamentoHistoricoAparelhoV1AssociarAnterior_(dispositivo,areaId,chave,subscriptionId);
      if(ok){
        try{
          if(regAntes&&regAntes.subscriptionId)saneamentoHistoricoAparelhoV1RegistrarSub_(dispositivo,areaId,regAntes.subscriptionId,'');
          saneamentoHistoricoAparelhoV1RegistrarSub_(dispositivo,areaId,subscriptionId,'');
        }catch(e){}
      }
      return ok;
    };
  }
  if(typeof aparelhoTacsTesteV1SalvarDispositivo_==='function'){
    saneamentoHistoricoAparelhoV1SalvarAnterior_=aparelhoTacsTesteV1SalvarDispositivo_;
    aparelhoTacsTesteV1SalvarDispositivo_=function(dispositivo,areaId,operadorId,ativo,chave,subscriptionId){
      var antes=null;
      try{antes=aparelhoTacsTesteV1RegistroDispositivo_(dispositivo,areaId);}catch(e){}
      var resultado=saneamentoHistoricoAparelhoV1SalvarAnterior_(dispositivo,areaId,operadorId,ativo,chave,subscriptionId);
      try{
        if(antes&&antes.subscriptionId)saneamentoHistoricoAparelhoV1RegistrarSub_(dispositivo,areaId,antes.subscriptionId,'');
        if(ativo&&subscriptionId)saneamentoHistoricoAparelhoV1RegistrarSub_(dispositivo,areaId,subscriptionId,'');
      }catch(e){}
      return resultado;
    };
  }
})();

function saneamentoHistoricoAparelhoV1Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function saneamentoHistoricoAparelhoV1Area_(v){return moradoresAdminV1NormalizarAreaId_(v||'JAPARANDUBA');}
function saneamentoHistoricoAparelhoV1Sub_(v){var s=saneamentoHistoricoAparelhoV1Texto_(v).toLowerCase();return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)?s:'';}
function saneamentoHistoricoAparelhoV1Device_(v){return aparelhoTacsTesteV1Dispositivo_(v);}
function saneamentoHistoricoAparelhoV1Agora_(){return saudeNotificacoesV1Data_(new Date());}
function saneamentoHistoricoAparelhoV1HistorySheet_(){return saudeNotificacoesV1GarantirSheet_(tacsTerritorioV1Planilha_(),TACS_SANEAMENTO_HISTORICO_APARELHO_V1.HISTORY_SHEET,TACS_SANEAMENTO_HISTORICO_APARELHO_V1.HISTORY_HEADERS);}
function saneamentoHistoricoAparelhoV1AuditSheet_(){return saudeNotificacoesV1GarantirSheet_(tacsTerritorioV1Planilha_(),TACS_SANEAMENTO_HISTORICO_APARELHO_V1.AUDIT_SHEET,TACS_SANEAMENTO_HISTORICO_APARELHO_V1.AUDIT_HEADERS);}
function saneamentoHistoricoAparelhoV1RegistrySheet_(){return saudeNotificacoesV1GarantirSheet_(tacsTerritorioV1Planilha_(),TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS);}

function saneamentoHistoricoAparelhoV1RegistroPorSub_(subscriptionId,areaId){
  var sub=saneamentoHistoricoAparelhoV1Sub_(subscriptionId),area=saneamentoHistoricoAparelhoV1Area_(areaId);if(!sub||!area)return null;
  var sheet=saneamentoHistoricoAparelhoV1RegistrySheet_(),last=sheet.getLastRow();if(last<=1)return null;
  var rows=sheet.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues();
  for(var i=rows.length-1;i>=0;i--){
    if(saneamentoHistoricoAparelhoV1Sub_(rows[i][0])!==sub||saneamentoHistoricoAparelhoV1Area_(rows[i][1])!==area)continue;
    var reg=saudeNotificacoesV1RegistroDaLinha_(rows[i]);
    reg.linha=i+2;reg.criadoEm=rows[i][14]||'';reg.atualizadoEm=rows[i][15]||'';return reg;
  }
  return null;
}

function saneamentoHistoricoAparelhoV1OneSignalId_(subscriptionId,areaId,consultarRemoto){
  var reg=saneamentoHistoricoAparelhoV1RegistroPorSub_(subscriptionId,areaId),id=saneamentoHistoricoAparelhoV1Texto_(reg&&reg.onesignalId);
  if(id||!consultarRemoto)return id;
  try{
    var props=PropertiesService.getScriptProperties();
    var appId=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.APP_ID_PROPERTIES)||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_APP_ID;
    var apiKey=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.API_KEY_PROPERTIES);
    if(!apiKey)return '';
    return saneamentoHistoricoAparelhoV1Texto_(saudeNotificacoesV1IdentidadePorSubscription_(appId,apiKey,subscriptionId));
  }catch(e){return '';}
}

function saneamentoHistoricoAparelhoV1RegistrarSub_(dispositivo,areaId,subscriptionId,onesignalId){
  var device=saneamentoHistoricoAparelhoV1Device_(dispositivo),area=saneamentoHistoricoAparelhoV1Area_(areaId),sub=saneamentoHistoricoAparelhoV1Sub_(subscriptionId);if(!device||!area||!sub)return false;
  var one=saneamentoHistoricoAparelhoV1Texto_(onesignalId)||saneamentoHistoricoAparelhoV1OneSignalId_(sub,area,false),sheet=saneamentoHistoricoAparelhoV1HistorySheet_(),agora=saneamentoHistoricoAparelhoV1Agora_(),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))return false;
  try{
    var last=sheet.getLastRow(),linha=0,primeiro=agora;
    if(last>1){
      var rows=sheet.getRange(2,1,last-1,TACS_SANEAMENTO_HISTORICO_APARELHO_V1.HISTORY_HEADERS.length).getDisplayValues();
      for(var i=rows.length-1;i>=0;i--){
        if(saneamentoHistoricoAparelhoV1Device_(rows[i][0])!==device||saneamentoHistoricoAparelhoV1Area_(rows[i][1])!==area||saneamentoHistoricoAparelhoV1Sub_(rows[i][3])!==sub)continue;
        linha=i+2;primeiro=saneamentoHistoricoAparelhoV1Texto_(rows[i][4])||agora;if(!one)one=saneamentoHistoricoAparelhoV1Texto_(rows[i][2]);break;
      }
    }
    var values=[device,area,one,sub,primeiro,agora];
    if(linha)sheet.getRange(linha,1,1,values.length).setValues([values]);else sheet.appendRow(values);
    return true;
  }finally{lock.releaseLock();}
}

function saneamentoHistoricoAparelhoV1SubsHistorico_(dispositivo,areaId){
  var device=saneamentoHistoricoAparelhoV1Device_(dispositivo),area=saneamentoHistoricoAparelhoV1Area_(areaId),out={},sheet=saneamentoHistoricoAparelhoV1HistorySheet_(),last=sheet.getLastRow();if(!device||last<=1)return out;
  sheet.getRange(2,1,last-1,TACS_SANEAMENTO_HISTORICO_APARELHO_V1.HISTORY_HEADERS.length).getDisplayValues().forEach(function(row){
    if(saneamentoHistoricoAparelhoV1Device_(row[0])!==device||saneamentoHistoricoAparelhoV1Area_(row[1])!==area)return;
    var sub=saneamentoHistoricoAparelhoV1Sub_(row[3]);if(sub)out[sub]=saneamentoHistoricoAparelhoV1Texto_(row[2]);
  });
  return out;
}

function saneamentoHistoricoAparelhoV1SubsMesmoOneSignal_(onesignalId,areaId){
  var one=saneamentoHistoricoAparelhoV1Texto_(onesignalId),area=saneamentoHistoricoAparelhoV1Area_(areaId),out={};if(!one)return out;
  var sheet=saneamentoHistoricoAparelhoV1RegistrySheet_(),last=sheet.getLastRow();
  if(last>1)sheet.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues().forEach(function(row){
    if(saneamentoHistoricoAparelhoV1Area_(row[1])!==area||saneamentoHistoricoAparelhoV1Texto_(row[3])!==one)return;
    var sub=saneamentoHistoricoAparelhoV1Sub_(row[0]);if(sub)out[sub]=true;
  });
  try{
    var props=PropertiesService.getScriptProperties(),appId=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.APP_ID_PROPERTIES)||TACS_SAUDE_NOTIFICACOES_V1.DEFAULT_APP_ID,apiKey=saudeNotificacoesV1PrimeiraPropriedade_(props,TACS_SAUDE_NOTIFICACOES_V1.API_KEY_PROPERTIES);
    if(apiKey){
      var user=saudeNotificacoesV1ViewUser_(appId,apiKey,one),lista=user&&Array.isArray(user.subscriptions)?user.subscriptions:[];
      lista.forEach(function(item){var sub=saneamentoHistoricoAparelhoV1Sub_(item&&item.id);if(sub)out[sub]=true;});
    }
  }catch(e){}
  return out;
}

function saneamentoHistoricoAparelhoV1Audit_(dados){
  var sheet=saneamentoHistoricoAparelhoV1AuditSheet_(),agora=saneamentoHistoricoAparelhoV1Agora_();
  sheet.appendRow([
    'audit_'+Utilities.getUuid().replace(/-/g,''),dados.areaId||'',String(dados.dispositivo||'').slice(-12),String(dados.onesignalId||'').slice(-12),dados.subscriptionId||'',
    dados.idPortal||'',dados.morador||'',dados.acao||'DESVINCULO',dados.motivo||'',dados.operadorId||'TACS',agora
  ]);
  return agora;
}

function saneamentoHistoricoAparelhoV1Assinatura_(reg){
  if(!reg)return '';
  return [reg.tipoAparelho,reg.navegador,reg.sistema].map(function(v){return saneamentoHistoricoAparelhoV1Texto_(v).toLowerCase();}).filter(Boolean).join('|');
}

function saneamentoHistoricoAparelhoV1Executar_(contexto,acesso,p){
  var area=contexto.areaId,device=saneamentoHistoricoAparelhoV1Device_(p.dispositivo||p.deviceId),chave=aparelhoTacsTesteV1Chave_(p.chaveTacsTeste||p.chaveTecnica||''),sub=saneamentoHistoricoAparelhoV1Sub_(p.subscriptionId||p.subscription_id);
  if(!device)throw new Error('Este aparelho não possui identificação técnica válida.');
  if(!chave||!aparelhoTacsTesteV1TokenValido_(device,area,chave))throw new Error('Este aparelho precisa estar autorizado no modo TACS / teste antes do saneamento histórico.');
  if(!sub)throw new Error('A inscrição Push atual deste aparelho ainda não está disponível. Abra a área de notificações e tente novamente.');

  aparelhoTacsTesteV1AssociarSubscription_(device,area,chave,sub);
  var atual=saneamentoHistoricoAparelhoV1RegistroPorSub_(sub,area),one=saneamentoHistoricoAparelhoV1Texto_(atual&&atual.onesignalId)||saneamentoHistoricoAparelhoV1OneSignalId_(sub,area,true);
  if(!one)throw new Error('Não foi possível obter a identidade técnica OneSignal deste aparelho. Nenhum vínculo histórico foi alterado.');

  saneamentoHistoricoAparelhoV1RegistrarSub_(device,area,sub,one);
  var comprovadas=saneamentoHistoricoAparelhoV1SubsHistorico_(device,area),mesmoOne=saneamentoHistoricoAparelhoV1SubsMesmoOneSignal_(one,area);
  comprovadas[sub]=one;Object.keys(mesmoOne).forEach(function(id){comprovadas[id]=one;});

  var moradores=saudeNotificacoesV1MapaMoradores_(contexto),operador=saneamentoHistoricoAparelhoV1Texto_(acesso.operadorId||acesso.tacsId||contexto.operadorId||'TACS'),limpos=0,familiasRemovidas=0,nomes={},detalhes=[];
  Object.keys(comprovadas).forEach(function(id){
    var reg=saneamentoHistoricoAparelhoV1RegistroPorSub_(id,area),idPortal=saneamentoHistoricoAparelhoV1Texto_(reg&&reg.idPortal),morador=idPortal&&moradores[idPortal]?moradores[idPortal]:null,nome=saneamentoHistoricoAparelhoV1Texto_(morador&&morador.nome),fam=aparelhoTacsTesteV1RemoverVinculoFamilia_(id,area),moradorLimpo=false;
    if(idPortal)moradorLimpo=aparelhoTacsTesteV1LimparMoradorRegistro_(id,area);
    saneamentoHistoricoAparelhoV1RegistrarSub_(device,area,id,one);
    if(fam||moradorLimpo){
      saneamentoHistoricoAparelhoV1Audit_({areaId:area,dispositivo:device,onesignalId:one,subscriptionId:id,idPortal:idPortal,morador:nome,acao:'DESVINCULO_TACS_TESTE',motivo:'Inscrição comprovada pelo mesmo aparelho técnico/histórico ou pelo mesmo ONESIGNAL_ID.',operadorId:operador});
      if(moradorLimpo)limpos++;if(fam)familiasRemovidas+=fam;if(nome)nomes[nome]=true;
      detalhes.push({subscriptionRef:id.slice(-8),morador:nome||'',idPortalAnterior:idPortal||'',vinculoMoradorRemovido:Boolean(moradorLimpo),vinculosFamiliaRemovidos:Number(fam||0)});
    }
  });

  var assinaturaAtual=saneamentoHistoricoAparelhoV1Assinatura_(atual),suspeitos=[];
  if(assinaturaAtual){
    var registry=saneamentoHistoricoAparelhoV1RegistrySheet_(),last=registry.getLastRow();
    if(last>1)registry.getRange(2,1,last-1,TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_HEADERS.length).getDisplayValues().forEach(function(row){
      if(saneamentoHistoricoAparelhoV1Area_(row[1])!==area)return;
      var reg=saudeNotificacoesV1RegistroDaLinha_(row),id=saneamentoHistoricoAparelhoV1Sub_(reg.subscriptionId);if(!id||comprovadas[id]||!reg.idPortal)return;
      if(saneamentoHistoricoAparelhoV1Assinatura_(reg)!==assinaturaAtual)return;
      var m=moradores[reg.idPortal]||null;suspeitos.push({subscriptionRef:id.slice(-8),morador:saneamentoHistoricoAparelhoV1Texto_(m&&m.nome),ultimoCheckin:reg.ultimoCheckin||'',motivo:'Assinatura de aparelho semelhante, mas sem prova de mesmo ONESIGNAL_ID. Não alterado automaticamente.'});
    });
  }

  var listaNomes=Object.keys(nomes).sort(function(a,b){return a.localeCompare(b,'pt-BR');});
  var msg=limpos||familiasRemovidas?'Saneamento concluído. Foram removidos somente vínculos historicamente comprovados deste aparelho TACS / teste.':'Auditoria concluída. Nenhum vínculo comprovado deste aparelho precisava ser removido.';
  if(listaNomes.length)msg+=' Moradores desvinculados do aparelho de teste: '+listaNomes.join(', ')+'.';
  if(suspeitos.length)msg+=' Existem '+suspeitos.length+' registro(s) semelhante(s) sem prova técnica suficiente; eles foram preservados para revisão.';
  return {ok:true,versao:TACS_SANEAMENTO_HISTORICO_APARELHO_V1.VERSAO,areaId:area,subscriptionRef:sub.slice(-8),onesignalRef:one.slice(-10),inscricoesComprovadas:Object.keys(comprovadas).length,vinculosMoradorRemovidos:limpos,vinculosFamiliaRemovidos:familiasRemovidas,moradoresDesvinculados:listaNomes,detalhes:detalhes,suspeitosSemProva:suspeitos,message:msg};
}

function saneamentoHistoricoAparelhoV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{},action=saneamentoHistoricoAparelhoV1Texto_(p.action).toLowerCase();
  if(action!=='admin_notificacoes_aparelho_tacs_sanear_historico')return null;
  var requestId=saneamentoHistoricoAparelhoV1Texto_(p.requestId),resultado;
  try{
    requestId=saudeNotificacoesV1ValidarRequestId_(requestId);
    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);saudeNotificacoesV1ExigirAcesso_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');
    resultado=saneamentoHistoricoAparelhoV1Executar_(contexto,acesso,p);
  }catch(erro){resultado={ok:false,message:saneamentoHistoricoAparelhoV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))saudeNotificacoesV1GuardarResultado_(requestId,resultado);
  return saudeNotificacoesV1ResponderPost_(requestId,resultado);
}
