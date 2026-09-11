/**
 * Portal TACS — Estabilização de notificações V8
 *
 * Objetivos:
 * - separar "Push ativo" de "apto para mensagem individual";
 * - manter o vínculo familiar mesmo quando a inscrição Push gira;
 * - fazer o primeiro vínculo atualizar também a Saúde das notificações;
 * - usar o cadastro técnico do aparelho como fallback seguro para envio individual;
 * - oferecer leitura rápida local e conferência remota separada do OneSignal.
 */
var TACS_ESTABILIZACAO_NOTIFICACOES_V8=Object.freeze({
  VERSAO:'1.0.0',
  CACHE_PREFIX:'tacs_notif_v8_health_',
  CACHE_SECONDS:300
});

var notificacoesV8DoPostAnterior_=typeof doPost==='function'?doPost:null;
var notificacoesV8PostPainelAnterior_=typeof tratarPostPainelTacs_==='function'?tratarPostPainelTacs_:null;

(function instalarEstabilizacaoNotificacoesV8_(){
  if(notificacoesV8DoPostAnterior_){
    doPost=function(e){var r=notificacoesV8TratarPost_(e);return r||notificacoesV8DoPostAnterior_(e);};
  }
  if(notificacoesV8PostPainelAnterior_){
    tratarPostPainelTacs_=function(e){var r=notificacoesV8TratarPost_(e);return r||notificacoesV8PostPainelAnterior_(e);};
  }
})();

function notificacoesV8Texto_(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function notificacoesV8Area_(v){return moradoresAdminV1NormalizarAreaId_(v||'JAPARANDUBA');}
function notificacoesV8Sub_(v){var s=notificacoesV8Texto_(v).toLowerCase();return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)?s:'';}
function notificacoesV8Familia_(v){var s=notificacoesV8Texto_(v).toUpperCase().replace(/\s+/g,''),m=s.match(/^(\d{1,4})([A-Z])?$/);if(!m)return'';var n=m[1];if(n.length<=3)n=('000'+n).slice(-3);return n+(m[2]||'');}
function notificacoesV8CacheKey_(areaId){return TACS_ESTABILIZACAO_NOTIFICACOES_V8.CACHE_PREFIX+notificacoesV8Area_(areaId);}
function notificacoesV8CacheLer_(areaId){try{var raw=CacheService.getScriptCache().get(notificacoesV8CacheKey_(areaId));return raw?JSON.parse(raw):null;}catch(e){return null;}}
function notificacoesV8CacheSalvar_(areaId,resultado){try{CacheService.getScriptCache().put(notificacoesV8CacheKey_(areaId),JSON.stringify(resultado),TACS_ESTABILIZACAO_NOTIFICACOES_V8.CACHE_SECONDS);}catch(e){}}

function notificacoesV8TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{},action=notificacoesV8Texto_(p.action).toLowerCase();
  if(['admin_notificacoes_saude_rapida','admin_notificacoes_saude_remota'].indexOf(action)===-1)return null;
  var requestId=notificacoesV8Texto_(p.requestId),resultado;
  try{
    requestId=saudeNotificacoesV1ValidarRequestId_(requestId);
    var acesso=tacsTerritorioV1ValidarAcesso_(p,false);saudeNotificacoesV1ExigirAcesso_(acesso);
    var contexto=moradoresAdminV1ResolverContexto_(acesso,p.areaId||p.area||'');
    resultado=action==='admin_notificacoes_saude_rapida'
      ?notificacoesV8SaudeRapida_(contexto,acesso)
      :notificacoesV8SaudeRemota_(contexto,acesso);
  }catch(erro){resultado={ok:false,message:notificacoesV8Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500)};}
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))saudeNotificacoesV1GuardarResultado_(requestId,resultado);
  return saudeNotificacoesV1ResponderPost_(requestId,resultado);
}

function notificacoesV8MapaVinculos_(ss,contexto){
  var area=notificacoesV8Area_(contexto&&contexto.areaId),porSub={},porRef={},refsDuplicadas={};
  var nome=(typeof TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1!=='undefined'&&TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.SHEET)||'TACS_NOTIFICACOES_FAMILIAS';
  var sheet=ss.getSheetByName(nome);
  if(sheet&&sheet.getLastRow()>1){
    var rows=sheet.getRange(2,1,sheet.getLastRow()-1,Math.min(sheet.getLastColumn(),8)).getDisplayValues();
    rows.forEach(function(row){
      var sub=notificacoesV8Sub_(row[0]),a=notificacoesV8Area_(row[1]),fam=notificacoesV8Familia_(row[2]);
      if(!sub||a!==area||!fam)return;
      porSub[sub]={subscriptionId:sub,familiaId:fam,idPortal:notificacoesV8Texto_(row[3]),nome:notificacoesV8Texto_(row[4]),origem:'VINCULO_FAMILIAR'};
    });
  }

  var moradores=typeof saudeNotificacoesV1MapaMoradores_==='function'?saudeNotificacoesV1MapaMoradores_(contexto):{};
  var registry=ss.getSheetByName((typeof TACS_SAUDE_NOTIFICACOES_V1!=='undefined'&&TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET)||'TACS_NOTIFICACOES_DISPOSITIVOS');
  if(registry&&registry.getLastRow()>1){
    var rr=registry.getRange(2,1,registry.getLastRow()-1,3).getDisplayValues();
    rr.forEach(function(row){
      var sub=notificacoesV8Sub_(row[0]),a=notificacoesV8Area_(row[1]),idPortal=notificacoesV8Texto_(row[2]);
      if(!sub||a!==area||!idPortal||porSub[sub])return;
      var bruto=moradores&&moradores[idPortal]?moradores[idPortal]:null;
      var morador=bruto&&typeof vinculoFamiliarNotifV1Morador_==='function'?vinculoFamiliarNotifV1Morador_(bruto):null;
      if(!morador||!morador.familiaId)return;
      porSub[sub]={subscriptionId:sub,familiaId:notificacoesV8Familia_(morador.familiaId),idPortal:idPortal,nome:notificacoesV8Texto_(morador.nome),origem:'REGISTRO_SAUDE'};
    });
  }

  Object.keys(porSub).forEach(function(sub){
    var ref=sub.slice(-8);if(porRef[ref]){refsDuplicadas[ref]=true;delete porRef[ref];return;}if(!refsDuplicadas[ref])porRef[ref]=porSub[sub];
  });
  return {porSub:porSub,porRef:porRef};
}

function notificacoesV8VincularRegistroSaude_(subscriptionId,areaId,idPortal){
  var sub=notificacoesV8Sub_(subscriptionId),area=notificacoesV8Area_(areaId),id=notificacoesV8Texto_(idPortal);if(!sub||!area||!id)return false;
  var ss=tacsTerritorioV1Planilha_(),nome=(typeof TACS_SAUDE_NOTIFICACOES_V1!=='undefined'&&TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET)||'TACS_NOTIFICACOES_DISPOSITIVOS',sheet=ss.getSheetByName(nome);if(!sheet||sheet.getLastRow()<=1)return false;
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))return false;
  try{
    var rows=sheet.getRange(2,1,sheet.getLastRow()-1,3).getDisplayValues();
    for(var i=rows.length-1;i>=0;i--){
      if(notificacoesV8Sub_(rows[i][0])!==sub||notificacoesV8Area_(rows[i][1])!==area)continue;
      if(notificacoesV8Texto_(rows[i][2])!==id)sheet.getRange(i+2,3).setValue(id);
      if(sheet.getLastColumn()>=16)sheet.getRange(i+2,16).setValue(typeof saudeNotificacoesV1Data_==='function'?saudeNotificacoesV1Data_(new Date()):new Date());
      return true;
    }
  }finally{lock.releaseLock();}
  return false;
}

function notificacoesV8ResolverVinculoPorOneSignal_(subscriptionId,areaId){
  var sub=notificacoesV8Sub_(subscriptionId),area=notificacoesV8Area_(areaId);if(!sub||!area)return null;
  var ss=tacsTerritorioV1Planilha_(),reg=ss.getSheetByName((typeof TACS_SAUDE_NOTIFICACOES_V1!=='undefined'&&TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET)||'TACS_NOTIFICACOES_DISPOSITIVOS');if(!reg||reg.getLastRow()<=1)return null;
  var rows=reg.getRange(2,1,reg.getLastRow()-1,4).getDisplayValues(),onesignal='';
  rows.forEach(function(r){if(notificacoesV8Sub_(r[0])===sub&&notificacoesV8Area_(r[1])===area)onesignal=notificacoesV8Texto_(r[3]);});
  if(!onesignal)return null;
  var mapa=notificacoesV8MapaVinculos_(ss,{areaId:area});
  for(var i=0;i<rows.length;i++){
    var outro=notificacoesV8Sub_(rows[i][0]);
    if(!outro||outro===sub||notificacoesV8Area_(rows[i][1])!==area||notificacoesV8Texto_(rows[i][3])!==onesignal)continue;
    if(mapa.porSub[outro])return mapa.porSub[outro];
  }
  return null;
}

/*
 * Substitui somente a função chamada pelo wrapper familiar já instalado.
 * O primeiro check-in mantém o CPF/CNS para que a Saúde grave ID_PORTAL.
 * Depois que existe vínculo familiar, o documento é retirado antes da camada
 * de Saúde para impedir que atender outra pessoa troque a família do aparelho.
 */
function vinculoFamiliarNotifV1Checkin_(p){
  p=p&&typeof p==='object'?p:{};
  var sub=notificacoesV8Sub_(p.subscriptionId||p.subscription_id),area=notificacoesV8Area_(p.areaId||p.area||'JAPARANDUBA'),documento=p.documento||p.cpf||p.cns||'';
  var vinculo=vinculoFamiliarNotifV1Ler_(sub,area),morador=vinculoFamiliarNotifV1ResolverMoradorDocumento_(documento,area);
  var parametros={};Object.keys(p).forEach(function(k){parametros[k]=p[k];});
  if(vinculo){delete parametros.documento;delete parametros.cpf;delete parametros.cns;}
  var resultado=vinculoFamiliarNotifV1CheckinAnterior_(parametros);if(!resultado||typeof resultado!=='object')resultado={ok:true};

  if(!vinculo){
    var legado=vinculoFamiliarNotifV1ResolverLegado_(sub,area);
    if(legado&&legado.familiaId)vinculo=vinculoFamiliarNotifV1Gravar_(sub,area,legado,'MIGRADO_ID_PORTAL');
  }
  if(!vinculo){
    var porUser=notificacoesV8ResolverVinculoPorOneSignal_(sub,area);
    if(porUser&&porUser.familiaId)vinculo=vinculoFamiliarNotifV1Gravar_(sub,area,porUser,'MIGRADO_ONESIGNAL');
  }
  if(vinculo)vinculo=vinculoFamiliarNotifV1ReconciliarReferencia_(vinculo,area);

  var decisao=vinculoFamiliarNotifV1Decidir_(vinculo,morador);
  if(decisao.acao==='VINCULAR'){
    vinculo=vinculoFamiliarNotifV1Gravar_(sub,area,morador,'DOCUMENTO_VALIDADO');
    decisao=vinculoFamiliarNotifV1Decidir_(vinculo,morador);
  }
  if(vinculo&&vinculo.idPortal)notificacoesV8VincularRegistroSaude_(sub,area,vinculo.idPortal);

  resultado.vinculadoFamilia=Boolean(vinculo&&vinculo.familiaId);
  resultado.familiaId=vinculo&&vinculo.familiaId?notificacoesV8Familia_(vinculo.familiaId):'';
  resultado.familiaDiferente=decisao.acao==='OUTRA_FAMILIA';
  resultado.familiaBeneficiario=morador&&morador.familiaId?notificacoesV8Familia_(morador.familiaId):'';
  if(resultado.familiaDiferente)resultado.message='Esta pessoa pertence a outro cadastro familiar desta mesma área. A solicitação pode continuar normalmente.';
  return resultado;
}

/* Fallback: se a tabela familiar estiver incompleta, o ID_PORTAL já confirmado na Saúde recompõe a família. */
function mensagemIndividualV1MapaFamilias_(ss,areaId){
  var contexto={areaId:notificacoesV8Area_(areaId)},mapa=notificacoesV8MapaVinculos_(ss,contexto),out={};
  Object.keys(mapa.porSub).forEach(function(sub){var fam=notificacoesV8Familia_(mapa.porSub[sub].familiaId);if(fam)out[sub]=fam;});
  return out;
}

function notificacoesV8Recontar_(aparelhos){
  var c={ativos:0,inativos:0,reparo:0,semConfirmacao:0,total:0};
  (Array.isArray(aparelhos)?aparelhos:[]).forEach(function(a){var s=notificacoesV8Texto_(a.status).toUpperCase();if(s==='ATIVO')c.ativos++;else if(s==='INATIVO')c.inativos++;else if(s==='REPARO')c.reparo++;else c.semConfirmacao++;c.total++;});
  return c;
}

function notificacoesV8EnriquecerSaude_(resultado,contexto){
  resultado=resultado&&typeof resultado==='object'?resultado:{ok:true,aparelhos:[]};
  var ss=tacsTerritorioV1Planilha_(),mapa=notificacoesV8MapaVinculos_(ss,contexto),lista=Array.isArray(resultado.aparelhos)?resultado.aparelhos:[];
  lista.forEach(function(a){
    var ref=notificacoesV8Texto_(a.subscriptionRef).toLowerCase(),v=mapa.porRef[ref]||null;
    a.familiaId=v&&v.familiaId?notificacoesV8Familia_(v.familiaId):'';
    a.vinculadoFamilia=Boolean(a.familiaId);
    if(v&&v.nome&&(!a.nome||/não identificado/i.test(a.nome)))a.nome=v.nome;
    if(a.aparelhoTacsTeste===true){
      a.aptoMensagemIndividual=false;a.status='SEM_CONFIRMACAO';a.statusTexto='TACS / teste';a.motivo='Aparelho técnico TACS/teste: recebe avisos gerais, mas é excluído de mensagens individuais e familiares.';return;
    }
    if(notificacoesV8Texto_(a.status).toUpperCase()==='ATIVO'){
      if(a.vinculadoFamilia){a.aptoMensagemIndividual=true;a.statusTexto='Apto p/ mensagem';a.motivo='Push ativo no OneSignal e aparelho vinculado ao cadastro familiar '+a.familiaId+'.';}
      else{a.aptoMensagemIndividual=false;a.status='SEM_CONFIRMACAO';a.statusTexto='Push ativo • sem vínculo';a.motivo='O OneSignal confirma o Push, mas este aparelho ainda não está vinculado a um cadastro familiar. Mensagens individuais/familiares ficam bloqueadas até o vínculo ser concluído.';}
    }else a.aptoMensagemIndividual=false;
  });
  resultado.aparelhos=lista;resultado.contagens=notificacoesV8Recontar_(lista);resultado.versaoEstabilizacao=TACS_ESTABILIZACAO_NOTIFICACOES_V8.VERSAO;
  return resultado;
}

function notificacoesV8SaudeRapidaLocal_(contexto){
  var ss=tacsTerritorioV1Planilha_(),nome=(typeof TACS_SAUDE_NOTIFICACOES_V1!=='undefined'&&TACS_SAUDE_NOTIFICACOES_V1.REGISTRY_SHEET)||'TACS_NOTIFICACOES_DISPOSITIVOS',sheet=ss.getSheetByName(nome),mapa=notificacoesV8MapaVinculos_(ss,contexto),lista=[];
  if(sheet&&sheet.getLastRow()>1){
    var rows=sheet.getRange(2,1,sheet.getLastRow()-1,Math.min(sheet.getLastColumn(),16)).getDisplayValues();
    rows.forEach(function(row){
      var reg=saudeNotificacoesV1RegistroDaLinha_(row),sub=notificacoesV8Sub_(reg.subscriptionId);if(!sub||notificacoesV8Area_(reg.areaId)!==notificacoesV8Area_(contexto.areaId))return;
      var v=mapa.porSub[sub]||null,pending=Boolean(saudeNotificacoesV1ReparoPendenteSubscription_(contexto.areaId,sub,reg.reparoAplicado));
      var classif=saudeNotificacoesV1Classificar_(reg,null,pending),status=classif.status,texto=classif.texto,motivo=classif.motivo;
      if(status==='SEM_CONFIRMACAO'){
        if(v&&v.familiaId){texto='Vínculo pronto • conferindo Push';motivo='Cadastro familiar '+notificacoesV8Familia_(v.familiaId)+' vinculado. Conferindo o estado atual no OneSignal em segundo plano.';}
        else{texto='Sem vínculo familiar';motivo='O aparelho fez check-in no Portal, mas ainda não possui cadastro familiar vinculado para mensagens individuais.';}
      }
      lista.push({nome:v&&v.nome?v.nome:'Aparelho ainda não identificado',telefone:'',dispositivo:reg.tipoAparelho||'Aparelho',navegador:reg.navegador||'',sistema:reg.sistema||'',status:status,statusTexto:texto,motivo:motivo,ultimoCheckin:reg.ultimoCheckin,subscriptionRef:sub.slice(-8),reparoPendente:pending,familiaId:v&&v.familiaId?notificacoesV8Familia_(v.familiaId):'',vinculadoFamilia:Boolean(v&&v.familiaId),aptoMensagemIndividual:false});
    });
  }
  return {ok:true,versao:TACS_ESTABILIZACAO_NOTIFICACOES_V8.VERSAO,areaId:contexto.areaId,areaNome:contexto.areaNome,contagens:notificacoesV8Recontar_(lista),aparelhos:lista,oneSignalConsultado:false,fonteSaude:'REGISTRO_LOCAL',atualizandoOneSignal:true,observacao:'Leitura local imediata. O OneSignal é conferido em seguida sem apagar estes dados.'};
}

function notificacoesV8SaudeRapida_(contexto,acesso){
  var cache=notificacoesV8CacheLer_(contexto.areaId);if(cache&&cache.ok===true){cache.cacheSaude=true;cache.atualizandoOneSignal=true;return cache;}
  return notificacoesV8SaudeRapidaLocal_(contexto);
}

function notificacoesV8SaudeRemota_(contexto,acesso){
  if(typeof saudeNotificacoesV1SaudeAdmin_!=='function')throw new Error('A Saúde das notificações não está disponível.');
  var resultado=saudeNotificacoesV1SaudeAdmin_(contexto,acesso);
  resultado=notificacoesV8EnriquecerSaude_(resultado,contexto);resultado.oneSignalConsultado=true;resultado.fonteSaude='ONESIGNAL_ATUAL';resultado.atualizandoOneSignal=false;notificacoesV8CacheSalvar_(contexto.areaId,resultado);return resultado;
}
