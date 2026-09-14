(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',UBS_TOKEN_KEY='portalConectaUbsTokenV1',DEVICE_KEY='portalTacsDispositivoV1',AREA_KEY='portalTacsCentralAreaV1',CONTEXT_CACHE_KEY='portalTacsCentralContextCacheV3',UBS_LOCAL_CONTEXT_KEY='portalConectaUbsContextCacheV1',MODULE_CORE_KEY='portalConectaModuleCoreV1';
var SHARED_WARM_KEY='portalTacsAppsScriptWarmAtV1';
var HEALTH_REFRESH_TTL=30000,HEALTH_CACHE_TTL=300000,HEALTH_DISPLAY_CACHE_TTL=86400000,HEALTH_CACHE_PREFIX='portalTacsHealthConfirmedV1:',healthRefreshInFlight=false,lastHealthRefreshAt=0,lastHealthRefreshArea='',healthRefreshTimer=null;
var NOTIFICATION_CONFIRMED_CACHE_PREFIX='portalTacsNotificationConfirmedV1:',notificationRemoteSeq=0,notificationRemoteArea='',notificationLatestStarted={};
var URL_PARAMS=new URLSearchParams(location.search);
var ADMIN_TRUST_KEY='portalConectaRecoveryTrustV1:admin',ADMIN_LOCAL_VAULT_KEY='conectaPinLocalV3:admin';
function adminDeviceRecognized(){
  try{return Boolean(localStorage.getItem(ADMIN_TRUST_KEY)||localStorage.getItem(ADMIN_LOCAL_VAULT_KEY))}catch(e){return false}
}
var TACS_ONLY=String(URL_PARAMS.get('acesso')||'').toLowerCase()==='tacs'&&!adminDeviceRecognized();
var token=TACS_ONLY?'':(sessionStorage.getItem(TOKEN_KEY)||''),territoryToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',ubsToken=sessionStorage.getItem(UBS_TOKEN_KEY)||'',device=localStorage.getItem(DEVICE_KEY)||'';
var mode=territoryToken?'tacs':(token?'admin':(ubsToken?'ubs':'')),active=null,context=null,selectedAreaId='',pinLocalPendente='',pinLocalPerfil='',acessoLocalAberto='',moduloPendente=null;
/* SINCRONIZACAO_REMOTA_CONTINUA_V1: PIN local abre a Central; a sessão remota continua tentando em memória até confirmar ou receber recusa explícita. */
var remoteAuthTimer=null,remoteAuthSeq=0,remoteAuthAttempt=0,remoteAuthScope='',remoteAuthPin='',remoteAuthHadLocal=false;
var shellFrames={},shellActiveModule='',shellActiveRoute='',shellActiveNative='',shellScopeKey='',adminUbsContext=null,adminUbsPreviousAreaId='';
if(!device){device='iphone-'+Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem(DEVICE_KEY,device)}
function el(id){return document.getElementById(id)}
function text(v){return String(v==null?'':v).trim()}
var CENTRAL_SESSION_AUTH_REFUSAL_RE=/(sess[aã]o|token|autentica[cç][aã]o|acesso).*(inv[aá]lid|expir|recus|revog|desativ|n[aã]o autoriz)|n[aã]o autorizado|unauthor|forbidden|pertence a outro aparelho/i;
function normalizeSessionFailure(result){
  var r=result&&typeof result==='object'?result:{ok:false,message:'Resposta vazia.'};
  if(r.ok===true)return r;
  var message=text(r.message),explicit=Boolean(r.temporario!==true&&CENTRAL_SESSION_AUTH_REFUSAL_RE.test(message)),out={};
  Object.keys(r).forEach(function(k){out[k]=r[k]});
  if(explicit){out.authRecusada=true;out.preservarSessao=false}
  else{out.temporario=true;out.preservarSessao=true}
  return out;
}
function esc(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function digits(v){return text(v).replace(/\D/g,'')}
function setStatus(msg,type){var n=el('loginStatus');if(!n)return;var value=text(msg);n.textContent=value;n.hidden=!value;n.className='status'+(type?' '+type:'')}
function syncAppState(){
  /* FLUXO_CANONICO_LOCAL_FIRST_V1:
     segundo acesso entra no app assim que o PIN destrava o contexto local confirmado.
     O token remoto sincroniza depois e não controla a troca visual Login -> Central. */
  var localUnlocked=Boolean(acessoLocalAberto&&mode&&context);
  var authenticated=Boolean(token||territoryToken||ubsToken||localUnlocked);
  document.documentElement.classList.toggle('csc-central-state-app',authenticated);
  document.documentElement.classList.toggle('csc-central-state-login',!authenticated);
  if(authenticated)document.documentElement.classList.remove('csc-central-login-visible');
}
function requestId(prefix){return 'central_'+prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
function marcarConexaoRecente(){try{localStorage.setItem(SHARED_WARM_KEY,String(Date.now()))}catch(e){}}
var pinWarmupInFlight=false;
function aquecerValidacaoPin(){
  if(pinWarmupInFlight)return;
  var warm=window.PortalTacsAdminWarmup;
  if(warm&&typeof warm.iniciar==='function'){
    pinWarmupInFlight=true;
    Promise.resolve(warm.iniciar()).catch(function(){}).finally(function(){pinWarmupInFlight=false});
    return;
  }
}
function session(extra){var out={dispositivo:device};if(mode==='tacs'&&territoryToken)out.territorioToken=territoryToken;else if(mode==='ubs'&&ubsToken)out.ubsToken=ubsToken;else if(token)out.token=token;if(selectedAreaId)out.areaId=selectedAreaId;Object.keys(extra||{}).forEach(function(k){out[k]=extra[k]});return out}

function applyUiStandard(doc){
  try{
    if(!doc||!doc.documentElement||!doc.head||!doc.body)return;
    var root=doc.documentElement,style=doc.getElementById('portalTacsUiStandardV2Style');
    if(!style){
      style=doc.createElement('style');style.id='portalTacsUiStandardV2Style';style.textContent='\
:root{--tacs-petroleo:#073a55;--tacs-petroleo-2:#0b5878;--tacs-borda:#69c7e7}\
html,body{max-width:100%;overflow-x:hidden}\
.panel,.list,.card,.area-row,details,summary{min-width:0}\
.card summary>div,details summary>div:first-child{min-width:0;flex:1 1 auto}\
.card h3,.sub,.area-row strong,.area-row .sub,summary strong,summary span:not(.signal){overflow-wrap:anywhere;word-break:break-word}\
.signal{flex:0 0 auto!important;max-width:100%;margin-left:auto;white-space:normal!important;overflow-wrap:anywhere}\
input,select,textarea,button{max-width:100%}\
#portalTacsContrastToggleV1,#contrastToggle,#alternarContraste,.contrasteBotao,.preferenciaVisual{display:none!important}\
#portalTacsAtualizarPaginaV1,#portalTacsAdminRefreshV1{display:none!important}\
.btn.green,.botao.verde{background:linear-gradient(145deg,var(--tacs-petroleo),var(--tacs-petroleo-2))!important;color:#fff!important}\
input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible{outline:4px solid #ffd54f!important;outline-offset:2px!important}\
@media(max-width:430px){.card summary{align-items:flex-start!important}.signal{margin-top:2px}}';
      doc.head.appendChild(style);
    }
    root.classList.remove('tacs-high-contrast','high-contrast');
    ['portalTacsContrastToggleV1','contrastToggle','alternarContraste'].forEach(function(id){var n=doc.getElementById(id);if(n)n.hidden=true});
    doc.querySelectorAll('.contrasteBotao,.preferenciaVisual').forEach(function(n){n.hidden=true});
  }catch(e){}
}
function jsonp(action,params,cb){var name='__central_'+Date.now()+'_'+Math.floor(Math.random()*99999),s=document.createElement('script'),done=false,timer=setTimeout(function(){finish({ok:false,message:'Consulta indisponível no momento.'})},15000);function finish(r){if(done)return;done=true;clearTimeout(timer);try{delete window[name]}catch(e){window[name]=undefined}if(s.parentNode)s.remove();if(r&&r.ok===true)marcarConexaoRecente();cb(r)}window[name]=finish;s.onerror=function(){finish({ok:false,message:'Falha de rede.'})};var q=['action='+encodeURIComponent(action),'callback='+encodeURIComponent(name),'_='+Date.now()];Object.keys(params||{}).forEach(function(k){q.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]))});s.src=API+'?'+q.join('&');document.head.appendChild(s)}
function finishPost(result){
  if(!active)return;
  var op=active;active=null;
  clearTimeout(op.timeout);clearTimeout(op.pollTimer);clearTimeout(op.submitTimer);
  if(op.form&&op.form.parentNode)op.form.remove();
  if(op.frame&&op.frame.parentNode)setTimeout(function(){if(op.frame.parentNode)op.frame.remove()},180);
  var finalResult=normalizeSessionFailure(result||{ok:false,message:'Resposta vazia.'});
  if(finalResult&&finalResult.ok===true)marcarConexaoRecente();
  op.cb(finalResult);
}
window.addEventListener('message',function(event){
  if(!active||!active.frame||event.source!==active.frame.contentWindow)return;
  var d=event.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(e){return}}
  if(!d||typeof d!=='object')return;
  var rid=text(d.requestId||(d.result&&d.result.requestId));
  if(rid&&rid!==active.id)return;
  var r=Object.prototype.hasOwnProperty.call(d,'result')?d.result:(Object.prototype.hasOwnProperty.call(d,'payload')?d.payload:(Object.prototype.hasOwnProperty.call(d,'ok')?d:null));
  if(r)finishPost(r);
});
function schedulePoll(delay){
  if(!active)return;
  clearTimeout(active.pollTimer);
  active.pollTimer=setTimeout(poll,Math.max(0,Number(delay==null?(active.nextWait||1600):delay)));
}
function poll(){
  if(!active)return;
  var op=active;
  jsonp(op.resultAction,{requestId:op.id},function(r){
    if(!active||active.id!==op.id)return;
    if(r&&r.ok===true&&r.pendente===false){finishPost(r.result);return}
    if(Date.now()>=op.deadline){
      finishPost({ok:false,temporario:true,message:'A conexão com o servidor não foi confirmada. Toque em Entrar novamente.'});
      return;
    }
    op.nextWait=Math.min(2200,Math.max(1400,op.nextWait+200));
    schedulePoll(op.nextWait);
  });
}
function post(action,payload,resultAction,cb){
  if(active){cb(normalizeSessionFailure({ok:false,message:'Aguarde a operação anterior.'}));return}
  var rid=requestId(action),frame=document.createElement('iframe'),form=document.createElement('form');
  var frameName='centralFrame'+Date.now()+'_'+Math.floor(Math.random()*1000),fields={};
  Object.keys(payload||{}).forEach(function(k){fields[k]=payload[k]});
  fields.action=action;fields.requestId=rid;
  var fastPin=/^(?:admin_login|admin_territorio_login_pin)$/.test(action);
  var duration=fastPin?22000:60000;
  frame.name=frameName;frame.setAttribute('name',frameName);frame.src='about:blank';frame.setAttribute('aria-hidden','true');
  frame.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;border:0;opacity:0;visibility:hidden;pointer-events:none;z-index:-1';
  form.method='POST';form.action=API+'?_='+Date.now();form.target=frameName;form.setAttribute('target',frameName);form.style.display='none';
  Object.keys(fields).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(fields[k]==null?'':fields[k]);form.appendChild(i)});
  active={
    id:rid,action:action,frame:frame,form:form,resultAction:resultAction,cb:cb,
    pollTimer:null,submitTimer:null,nextWait:1600,deadline:Date.now()+duration,
    timeout:setTimeout(function(){
      finishPost({ok:false,temporario:true,message:'A conexão com o servidor não foi confirmada. Toque em Entrar novamente.'});
    },duration+500)
  };
  document.body.appendChild(frame);document.body.appendChild(form);
  var sent=false;
  function sendOnce(){
    if(sent||!active||active.id!==rid)return;
    sent=true;clearTimeout(active.submitTimer);active.submitTimer=null;
    try{form.submit()}catch(e){finishPost({ok:false,message:'O navegador não conseguiu iniciar a comunicação com o servidor. Tente novamente.'});return}
    /* LOGIN_TRANSPORTE_R8: postMessage é a via principal no Safari/iPhone.
       O polling do PIN permanece somente como contingência tardia para não saturar o Apps Script. */
    schedulePoll(fastPin?8000:1800);
  }
  function sendAfterRegistration(){
    if(typeof window.requestAnimationFrame==='function'){
      window.requestAnimationFrame(function(){window.requestAnimationFrame(sendOnce)});
      return;
    }
    setTimeout(sendOnce,60);
  }
  frame.addEventListener('load',sendAfterRegistration,{once:true});
  sendAfterRegistration();
  active.submitTimer=setTimeout(sendOnce,180);
}
function showLogin(kind){var admin=!TACS_ONLY&&kind==='admin';document.documentElement.classList.add('csc-central-login-visible');syncAppState();el('loginPanel').hidden=false;el('adminLogin').hidden=!admin;el('tacsLogin').hidden=admin;el('tabAdmin').hidden=TACS_ONLY;el('tabAdmin').classList.toggle('active',admin);el('tabTacs').classList.toggle('active',!admin);el('tabTacs').parentNode.style.gridTemplateColumns=TACS_ONLY?'1fr':'1fr 1fr';if(TACS_ONLY)setStatus('Entre como TACS da sua área.','')}
function currentUbs(){if(context&&context.ubsAtual)return context.ubsAtual;var list=context&&Array.isArray(context.tacs)?context.tacs:[];for(var i=0;i<list.length;i++)if(list[i]&&centralProfileHasUbs(list[i].perfil)&&text(list[i].unidadeId)===text(selectedArea()&&selectedArea().unidadeId))return list[i];return null}
function permission(name){if(mode==='admin')return true;var perfil=mode==='ubs'?currentUbs():(context&&Array.isArray(context.tacs)?context.tacs[0]:null);var list=perfil&&Array.isArray(perfil.permissoes)?perfil.permissoes:[];return list.indexOf(name)!==-1}
function selectedArea(){var list=context&&Array.isArray(context.areas)?context.areas:[];for(var i=0;i<list.length;i++)if(normArea(list[i].areaId)===selectedAreaId)return list[i];return list[0]||null}
function contextCacheKey(kind){return CONTEXT_CACHE_KEY+':'+(kind==='tacs'?'tacs':(kind==='ubs'?'ubs':'admin'))}
function saveContextCache(){
  try{
    if(!context||!mode)return;
    var snapshot={
      context:context,
      mode:mode,
      selectedAreaId:selectedAreaId,
      savedAt:Date.now()
    };
    sessionStorage.setItem(contextCacheKey(mode),JSON.stringify(snapshot));
    /* CORRECAO_CIRURGICA_ABERTURA_UBS_CACHE_V1:
       somente a UBS mantém também um snapshot local persistente do último contexto válido.
       Isso permite abrir os painéis imediatamente no computador já reconhecido enquanto
       a confirmação remota atualiza o que mudou em segundo plano. */
    if(mode==='ubs')localStorage.setItem(UBS_LOCAL_CONTEXT_KEY,JSON.stringify(snapshot));
  }catch(e){}
}
function pinLocalApi(){
  var api=window.ConectaPinLocalV2;
  return api&&typeof api.abrir==='function'&&typeof api.guardar==='function'?api:null;
}
function cancelRemoteAuthSync(){
  remoteAuthSeq++;remoteAuthAttempt=0;remoteAuthScope='';remoteAuthPin='';remoteAuthHadLocal=false;
  if(remoteAuthTimer){clearTimeout(remoteAuthTimer);remoteAuthTimer=null}
}
function scheduleRemoteAuthSync(seq,delay){
  if(seq!==remoteAuthSeq)return;
  if(remoteAuthTimer)clearTimeout(remoteAuthTimer);
  remoteAuthTimer=setTimeout(function(){remoteAuthTimer=null;runRemoteAuthSync(seq)},Math.max(150,Number(delay||0)));
}
function resumePendingModule(){
  if(!moduloPendente||!(token||territoryToken||ubsToken))return false;
  var proximo=moduloPendente;moduloPendente=null;
  publishModuleCore();
  setTimeout(function(){openModule(proximo.name,proximo.title,proximo.options)},0);
  return true;
}
function priorizarSincronizacaoTerritorioPendente(){
  if(active&&/^(?:admin_login|admin_territorio_login_pin)$/.test(text(active.action))){
    schedulePoll(0);
    return true;
  }
  if(remoteAuthScope&&remoteAuthPin){
    scheduleRemoteAuthSync(remoteAuthSeq,0);
    return true;
  }
  return false;
}
function remoteAuthSuccess(scope,r,pin,hadLocal){
  ubsToken='';sessionStorage.removeItem(UBS_TOKEN_KEY);
  if(scope==='tacs'){
    token='';sessionStorage.removeItem(TOKEN_KEY);territoryToken=text(r&&r.token);mode='tacs';
    if(r&&r.areaId)selectedAreaId=normArea(r.areaId);
    sessionStorage.setItem(TERRITORY_TOKEN_KEY,territoryToken);
  }else{
    territoryToken='';sessionStorage.removeItem(TERRITORY_TOKEN_KEY);token=text(r&&r.token);mode='admin';
    sessionStorage.setItem(TOKEN_KEY,token);
  }
  syncAppState();
  pinLocalPendente=pin;pinLocalPerfil=scope;
  if(window.ConectaAcessoUnificado&&typeof window.ConectaAcessoUnificado.registrarAparelho==='function')window.ConectaAcessoUnificado.registrarAparelho(scope==='tacs'?'TACS':'ADMIN');
  if(!hadLocal)restoreContextCache();
  /* Token válido já basta para o painel pendente sincronizar. Não espera a segunda leitura de contexto. */
  if(context)resumePendingModule();
  loadContext(hadLocal?(scope==='tacs'?'Acesso TACS sincronizado.':'Administrador sincronizado.'):(scope==='tacs'?'Acesso individual validado para '+(text(r&&r.areaNome)||r.areaId)+'.':'Administrador validado.'));
}
function runRemoteAuthSync(seq){
  if(seq!==remoteAuthSeq||!remoteAuthScope||!remoteAuthPin)return;
  if((remoteAuthScope==='admin'&&token)||(remoteAuthScope==='tacs'&&territoryToken)){cancelRemoteAuthSync();return}
  if(navigator&&navigator.onLine===false){scheduleRemoteAuthSync(seq,2500);return}
  if(active){scheduleRemoteAuthSync(seq,300);return}
  remoteAuthAttempt++;
  var scope=remoteAuthScope,pin=remoteAuthPin,hadLocal=remoteAuthHadLocal;
  var action=scope==='tacs'?'admin_territorio_login_pin':'admin_login';
  var resultAction=scope==='tacs'?'admin_territorio_result':'admin_result';
  post(action,{pin:pin,dispositivo:device},resultAction,function(r){
    if(seq!==remoteAuthSeq)return;
    if(r&&r.ok===true&&r.token){
      var keepPin=pin,keepLocal=hadLocal;
      cancelRemoteAuthSync();
      remoteAuthSuccess(scope,r,keepPin,keepLocal);
      return;
    }
    if(r&&r.authRecusada===true){
      var msg=text(r.message)||(scope==='tacs'?'Acesso TACS recusado.':'Acesso administrativo recusado.');
      cancelRemoteAuthSync();
      if(hadLocal)bloquearAcessoLocal(scope,msg);else setStatus(msg,'err');
      return;
    }
    /* Falha temporária nunca encerra a tentativa nem destrói o acesso local. */
    var wait=Math.min(5000,500*Math.pow(1.55,Math.min(remoteAuthAttempt,6)));
    setStatus(hadLocal?'Central disponível. Sincronizando dados em segundo plano…':'Conectando ao servidor…','warn');
    scheduleRemoteAuthSync(seq,wait);
  });
}
function startRemoteAuthSync(scope,pin,hadLocal){
  cancelRemoteAuthSync();
  remoteAuthScope=scope;remoteAuthPin=pin;remoteAuthHadLocal=Boolean(hadLocal);remoteAuthAttempt=0;
  var seq=remoteAuthSeq;
  scheduleRemoteAuthSync(seq,0);
}
window.addEventListener('online',function(){if(remoteAuthScope&&remoteAuthPin)scheduleRemoteAuthSync(remoteAuthSeq,0)});
function guardarAcessoLocal(scope,pin){
  var api=pinLocalApi();
  if(!api||!context||!mode)return Promise.resolve(false);
  return Promise.resolve(api.guardar(scope,pin,{
    device:device,
    context:context,
    selectedAreaId:selectedAreaId,
    mode:scope,
    salvoRemotoEm:Date.now()
  })).catch(function(){return false});
}
function abrirAcessoLocal(scope,pin){
  var api=pinLocalApi();if(!api)return Promise.resolve(null);
  return Promise.resolve(api.abrir(scope,pin)).then(function(saved){
    if(!saved||text(saved.device)!==text(device)||!saved.context)return null;
    if(saved.mode&&text(saved.mode)!==scope)return null;
    return saved;
  }).catch(function(){return null});
}
function aplicarAcessoLocal(scope,saved){
  if(!saved||!saved.context)return false;
  /* PIN_LOCAL_SEM_TOKEN_V3: o PIN libera somente o último contexto confirmado.
     Credenciais do servidor nunca são restauradas do armazenamento persistente. */
  token='';territoryToken='';ubsToken='';
  sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);sessionStorage.removeItem(UBS_TOKEN_KEY);
  mode=scope;context=saved.context;selectedAreaId=normArea(saved.selectedAreaId||'');
  saveContextCache();
  acessoLocalAberto=scope;
  syncAppState();
  renderContext(true);
  setStatus('Acesso liberado. Confirmando a sessão atual em segundo plano…','ok');
  return true;
}
function removerAcessoLocal(scope){
  var api=pinLocalApi();if(api&&typeof api.remover==='function')api.remover(scope);
}
function bloquearAcessoLocal(scope,message){
  cancelRemoteAuthSync();
  removerAcessoLocal(scope);
  resetModuleShell();
  token='';territoryToken='';ubsToken='';mode='';context=null;acessoLocalAberto='';moduloPendente=null;
  sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);sessionStorage.removeItem(UBS_TOKEN_KEY);
  el('identityPanel').hidden=true;el('healthPanel').hidden=true;el('modulesPanel').hidden=true;el('loginPanel').hidden=false;
  showLogin(scope==='tacs'?'tacs':'admin');
  setStatus(message||'O acesso deste perfil precisa ser validado novamente.','err');
}
function restoreContextCache(){
  try{
    if(!(token||territoryToken||ubsToken)||!mode)return false;
    var raw=sessionStorage.getItem(contextCacheKey(mode));
    if(!raw)return false;
    var saved=JSON.parse(raw);
    if(!saved||saved.mode!==mode||!saved.context||!Array.isArray(saved.context.areas)||!saved.context.areas.length)return false;
    context=saved.context;
    selectedAreaId=normArea(saved.selectedAreaId||selectedAreaId);
    renderContext(true);
    setStatus('Dados locais restaurados. Sincronizando somente o que mudou…','ok');
    return true;
  }catch(e){return false}
}
function restoreUbsContextCache(r){
  if(!ubsToken||mode!=='ubs')return false;
  var cadastroId=text(r&&r.cadastroId),unidadeId=text(r&&r.unidadeId),fontes=[];
  try{fontes.push(sessionStorage.getItem(contextCacheKey('ubs'))||'')}catch(e){}
  try{fontes.push(localStorage.getItem(UBS_LOCAL_CONTEXT_KEY)||'')}catch(e){}
  for(var i=0;i<fontes.length;i++){
    if(!fontes[i])continue;
    try{
      var saved=JSON.parse(fontes[i]),ctx=saved&&saved.context,areas=ctx&&Array.isArray(ctx.areas)?ctx.areas:[];
      if(!saved||saved.mode!=='ubs'||!ctx||!areas.length)continue;
      var atual=ctx.ubsAtual&&typeof ctx.ubsAtual==='object'?ctx.ubsAtual:{};
      var cacheCadastro=text(atual.tacsId||atual.cadastroId);
      var cacheUnidade=text(atual.unidadeId);
      if(!cacheUnidade){
        for(var a=0;a<areas.length;a++){if(text(areas[a]&&areas[a].unidadeId)){cacheUnidade=text(areas[a].unidadeId);break}}
      }
      if(cadastroId&&cacheCadastro!==cadastroId)continue;
      if(unidadeId&&cacheUnidade!==unidadeId)continue;
      context=ctx;
      selectedAreaId=normArea(saved.selectedAreaId||areas[0].areaId||'');
      saveContextCache();
      renderContext(true);
      setStatus('Painéis da UBS disponíveis. Sincronizando somente o que mudou…','ok');
      return true;
    }catch(e){}
  }
  return false;
}
function responsible(area){var list=context&&Array.isArray(context.tacs)?context.tacs:[];for(var i=0;i<list.length;i++)if(text(list[i].tacsId)===text(area&&area.tacsId))return list[i];return mode==='tacs'?(list[0]||null):null}
var ACCESS_PROFILE_LABELS={
  ADMIN_TACS_UBS_MORADOR:'Administrador + TACS + UBS + Morador',
  ADMIN_TACS_UBS:'Administrador + TACS + UBS',
  ADMIN_UBS_MORADOR:'Administrador + UBS + Morador',
  TACS_UBS_MORADOR:'TACS + UBS + Morador',
  ADMIN_UBS:'Administrador + UBS',
  TACS_UBS:'TACS + UBS',
  UBS_MORADOR:'UBS + Morador',
  ADMIN_TACS_MORADOR:'Administrador + TACS + Morador',
  ADMIN_TACS:'Administrador + TACS',
  ADMIN_MORADOR:'Administrador + Morador',
  TACS_MORADOR:'TACS + Morador',
  TACS:'TACS',
  ADMIN:'Administrador',
  UBS:'UBS',
  ADMIN_GERAL:'Administrador'
};
function accessProfileLabel(value){
  var key=text(value).toUpperCase().replace(/[+\s-]+/g,'_');
  return ACCESS_PROFILE_LABELS[key]||((key.indexOf('UBS')!==-1)?'UBS':((key.indexOf('TACS')!==-1)?'TACS':'Administrador'));
}
function identityHeadline(nome,perfil){
  return (text(nome)||'—')+' — '+accessProfileLabel(perfil);
}
function currentAdministrator(){
  var atual=context&&context.administradorAtual;
  if(atual&&text(atual.nomeCompleto))return atual;
  var lista=context&&Array.isArray(context.administradores)?context.administradores.filter(function(a){return a&&a.ativo!==false&&text(a.nomeCompleto)}):[];
  return lista.length===1?lista[0]:null;
}
function publishModuleCore(){
  try{
    if(!context||!mode)return false;
    var area=selectedArea(),tacs=responsible(area),admin=currentAdministrator(),ubs=currentUbs();
    var principal=mode==='tacs'?tacs:(mode==='ubs'?ubs:admin);
    var permissions=mode==='admin'?['*']:(principal&&Array.isArray(principal.permissoes)?principal.permissoes.slice():[]);
    var nomePrincipal=mode==='ubs'
      ?(text(area&&area.unidadeNome)||text(principal&&principal.unidadeId)||'UBS')
      :text(principal&&principal.nomeCompleto);
    var payload={
      schemaVersion:1,
      source:'CENTRAL_CONECTA',
      mode:mode,
      authenticated:Boolean(token||territoryToken||ubsToken),
      identity:{
        nome:nomePrincipal,
        perfil:text(principal&&principal.perfil||(mode==='tacs'?'TACS':(mode==='ubs'?'UBS':'ADMIN'))),
        funcao:text(principal&&principal.funcaoUbs),
        unidadeId:text(area&&area.unidadeId||principal&&principal.unidadeId)
      },
      area:{
        areaId:normArea(area&&area.areaId||selectedAreaId),
        areaNome:text(area&&area.areaNome),
        unidadeId:text(area&&area.unidadeId),
        unidadeNome:text(area&&area.unidadeNome)
      },
      permissions:permissions,
      cache:{contextKey:contextCacheKey(mode),strategy:'stale-while-revalidate'},
      savedAt:Date.now()
    };
    sessionStorage.setItem(MODULE_CORE_KEY,JSON.stringify(payload));
    return true;
  }catch(e){return false}
}
function ensureCentralWelcome(){
  var node=el('cscCentralWelcomeCopy');
  if(node)return node;
  var identity=el('identityPanel');if(!identity)return null;
  node=document.createElement('div');node.id='cscCentralWelcomeCopy';node.className='csc-welcome-copy';
  identity.insertBefore(node,identity.firstChild);
  return node;
}
function updateCentralWelcome(area,tacs){
  var node=ensureCentralWelcome();if(!node)return;
  if(mode==='tacs'){
    var nome=text(tacs&&tacs.nomeCompleto)||'TACS';
    var areaNome=text(area&&area.areaNome)||selectedAreaId||'sua área';
    node.innerHTML='<small>Identidade autenticada</small><h1>'+esc(identityHeadline(nome,tacs&&tacs.perfil||'TACS'))+'</h1><p>Acesso atual: TACS da área • '+esc(areaNome)+'.</p>';
    return;
  }
  if(mode==='ubs'){
    var ubs=currentUbs(),unidade=text(area&&area.unidadeNome)||text(area&&area.unidadeId)||text(ubs&&ubs.unidadeId)||'UBS';
    node.innerHTML='<small>UBS autenticada</small><h1>'+esc(unidade)+'</h1><p>Acesso aos painéis da UBS • '+esc(text(area&&area.areaNome)||selectedAreaId||'área vinculada')+'.</p>';
    return;
  }
  var admin=currentAdministrator();
  var adminNome=text(admin&&admin.nomeCompleto)||'Administrador';
  var adminPerfil=accessProfileLabel(admin&&admin.perfil||context&&context.perfil||'ADMIN');
  node.innerHTML='<small>Identidade autenticada</small><h1>'+esc(adminNome+' — '+adminPerfil)+'</h1><p>Gestão administrativa da área selecionada.</p>';
}
function renderContext(skipHealth){syncAppState();var areas=context&&Array.isArray(context.areas)?context.areas.filter(function(a){return a&&a.ativa!==false}):[];if(!areas.length){setStatus('Nenhuma área ativa foi devolvida pelo servidor.','err');return}var stored='';try{stored=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}if(mode==='tacs')selectedAreaId=normArea(areas[0].areaId);else if(!selectedAreaId||!areas.some(function(a){return normArea(a.areaId)===selectedAreaId})){selectedAreaId=areas.some(function(a){return normArea(a.areaId)===stored})?stored:(mode==='admin'&&areas.some(function(a){return normArea(a.areaId)==='JAPARANDUBA'})?'JAPARANDUBA':normArea(areas[0].areaId))}var area=selectedArea(),tacs=responsible(area),admin=currentAdministrator(),ubs=currentUbs();var profileIcon=el('profileIcon');if(profileIcon){profileIcon.src='/atendimento-acs-farmaceutico/icons/central-admin-saude-512.png?v=20260818-icone-central-todos-v2';}var perfilAtual=mode==='tacs'?accessProfileLabel(tacs&&tacs.perfil||'TACS'):(mode==='ubs'?accessProfileLabel(ubs&&ubs.perfil||'UBS'):accessProfileLabel(admin&&admin.perfil||context&&context.perfil||'ADMIN'));el('profileLabel').textContent=perfilAtual;el('professionalName').textContent=mode==='tacs'?(text(tacs&&tacs.nomeCompleto)||'TACS'):(mode==='ubs'?(text(area&&area.unidadeNome)||text(area&&area.unidadeId)||'UBS'):(text(admin&&admin.nomeCompleto)||'Administrador'));el('areaName').textContent=text(area&&area.areaNome)||selectedAreaId;el('unitName').textContent=text(area&&area.unidadeNome)||text(area&&area.unidadeId)||'Unidade não informada';updateCentralWelcome(area,tacs);publishModuleCore();el('identityPanel').hidden=false;el('healthPanel').hidden=mode==='ubs';el('modulesPanel').hidden=false;el('loginPanel').hidden=true;var box=el('adminAreaBox'),select=el('adminArea');box.hidden=(mode!=='admin'&&mode!=='ubs')||areas.length<2;select.innerHTML=areas.map(function(a){return'<option value="'+esc(normArea(a.areaId))+'">'+esc(text(a.areaNome)||a.areaId)+'</option>'}).join('');select.value=selectedAreaId;if(mode!=='ubs'){renderModules();scheduleNativePanelPrewarm();renderHealthInstant(selectedAreaId);if(!skipHealth)scheduleHealthRefresh(false,650)}else{renderModules();scheduleNativePanelPrewarm()}}
function renderModules(){document.querySelectorAll('.module').forEach(function(btn){var adminOnly=btn.dataset.adminOnly==='true',perm=btn.dataset.permission||'',allowed=!adminOnly||mode==='admin';if(perm)allowed=allowed&&permission(perm);if(btn.dataset.module==='portal')allowed=true;btn.hidden=!allowed;btn.classList.toggle('locked',!allowed);btn.disabled=!allowed})}
function markHealth(id,label,state){var n=el(id),s=n.querySelector('span');n.className='health-card'+(state?' '+state:'');s.textContent=label}
function updatePendingBadge(result){
  var badge=el('cscPendingBadge');if(!badge)return;
  var p=result&&result.pendencias?result.pendencias:{},total=Math.max(0,Number(p.total||0));
  badge.hidden=total<1;
  badge.textContent=total>99?'99+':String(total);
  badge.setAttribute('aria-label',total===1?'1 pendência':total+' pendências');
}

/* NOTIFICACOES_VERDADE_CONFIRMADA_V1
 * A Central nunca usa a leitura local/provisória como número oficial.
 * Exibe imediatamente o último snapshot confirmado neste aparelho e,
 * em paralelo, valida o estado atual no OneSignal.
 */
function notificationCacheKey(areaId){return NOTIFICATION_CONFIRMED_CACHE_PREFIX+normArea(areaId)}
function notificationCount(value){var n=Number(value);return Number.isFinite(n)&&n>=0?Math.floor(n):null}
function normalizeConfirmedNotification(result,areaId){
  if(!result||result.ok!==true||result.oneSignalConsultado!==true)return null;
  var c=result.contagens||{},ativos=notificationCount(c.ativos),inativos=notificationCount(c.inativos),reparo=notificationCount(c.reparo!=null?c.reparo:c.precisamReparo);
  if(ativos===null||inativos===null||reparo===null)return null;
  return {
    ok:true,
    areaId:normArea(result.areaId||areaId),
    areaNome:text(result.areaNome),
    oneSignalConsultado:true,
    fonteSaude:'ONESIGNAL_ATUAL',
    contagens:{ativos:ativos,inativos:inativos,reparo:reparo},
    pendencias:result.pendencias||{},
    confirmadoEm:Number(result.confirmadoEm||Date.now())
  };
}
function readConfirmedNotification(areaId){
  try{
    var raw=localStorage.getItem(notificationCacheKey(areaId));if(!raw)return null;
    var saved=JSON.parse(raw),confirmedAt=Number(saved&&saved.confirmadoEm||0),age=Date.now()-confirmedAt;
    if(!saved||saved.oneSignalConsultado!==true||!confirmedAt||age<0||age>86400000)return null;
    return normalizeConfirmedNotification(saved,areaId);
  }catch(e){return null}
}
function saveConfirmedNotification(result,areaId){
  var confirmed=normalizeConfirmedNotification(result,areaId);if(!confirmed)return null;
  confirmed.confirmadoEm=Date.now();
  try{localStorage.setItem(notificationCacheKey(areaId),JSON.stringify(confirmed))}catch(e){}
  return confirmed;
}
function renderConfirmedNotification(result,areaId){
  var confirmed=normalizeConfirmedNotification(result,areaId);if(!confirmed||normArea(areaId)!==selectedAreaId)return false;
  var c=confirmed.contagens,label=c.ativos+' aptos • '+c.inativos+' inativos • '+c.reparo+' reparo';
  markHealth('healthNotifications',label,(c.inativos||c.reparo)?'warn':'ok');
  updatePendingBadge(confirmed);
  return true;
}
function notificationPostIsolated(action,areaId,cb){
  var seq=++notificationRemoteSeq,id=requestId(action),body=new URLSearchParams(),started=Date.now(),finished=false,payload=session({areaId:areaId});
  if(action==='admin_notificacoes_saude_remota')notificationLatestStarted[normArea(areaId)]=seq;
  Object.keys(payload).forEach(function(k){body.set(k,payload[k])});
  body.set('action',action);body.set('requestId',id);
  function finish(result){if(finished)return;finished=true;cb(result||{ok:false,message:'Resposta vazia.'},seq)}
  function pollResult(){
    if(finished)return;
    jsonp('admin_notificacoes_saude_result',{requestId:id},function(r){
      if(finished)return;
      if(r&&r.ok===true&&r.pendente===false){finish(r.result);return}
      if(Date.now()-started>=22000){finish({ok:false,temporario:true,message:'A validação das notificações não terminou agora.'});return}
      setTimeout(pollResult,650);
    });
  }
  try{
    fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){});
    setTimeout(pollResult,280);
  }catch(e){finish({ok:false,message:'Não foi possível iniciar a validação das notificações.'})}
}
function healthPostIsolated(action,payload,resultAction,cb){
  var id=requestId(action),body=new URLSearchParams(),started=Date.now(),finished=false,wait=220;
  Object.keys(payload||{}).forEach(function(k){body.set(k,payload[k]==null?'':String(payload[k]))});
  body.set('action',action);body.set('requestId',id);
  function finish(result){if(finished)return;finished=true;cb(result||{ok:false,message:'Resposta vazia.'})}
  function pollResult(){
    if(finished)return;
    jsonp(resultAction,{requestId:id},function(r){
      if(finished)return;
      if(r&&r.ok===true&&r.pendente===false){finish(r.result);return}
      if(Date.now()-started>=8000){finish({ok:false,temporario:true,message:'A leitura rápida não terminou agora.'});return}
      wait=Math.min(650,wait+70);setTimeout(pollResult,wait);
    });
  }
  try{
    fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){});
    setTimeout(pollResult,160);
  }catch(e){finish({ok:false,message:'Não foi possível iniciar a leitura rápida.'})}
}
function healthCacheKey(areaId){return HEALTH_CACHE_PREFIX+normArea(areaId)}
function readHealthCache(areaId){
  try{
    var raw=localStorage.getItem(healthCacheKey(areaId));if(!raw)return null;
    var saved=JSON.parse(raw),age=Date.now()-Number(saved&&saved.confirmadoEm||0);
    if(!saved||!saved.itens||age<0||age>HEALTH_DISPLAY_CACHE_TTL)return null;
    saved._stale=age>HEALTH_CACHE_TTL;saved._age=age;
    return saved;
  }catch(e){return null}
}
function saveHealthItem(areaId,key,label,state){
  try{
    var cacheKey=healthCacheKey(areaId),saved=JSON.parse(localStorage.getItem(cacheKey)||'null')||{itens:{}};
    if(!saved.itens)saved.itens={};
    saved.itens[key]={label:text(label),state:text(state)};
    saved.confirmadoEm=Date.now();
    localStorage.setItem(cacheKey,JSON.stringify(saved));
  }catch(e){}
}
function renderHealthCache(areaId){
  var saved=readHealthCache(areaId),used={};
  if(!saved)return used;
  var map={portal:'healthPortal',residents:'healthResidents',agenda:'healthAgenda',content:'healthContent'};
  Object.keys(map).forEach(function(key){
    var item=saved.itens&&saved.itens[key];if(!item)return;
    markHealth(map[key],item.label,item.state);used[key]=true;
  });
  used._confirmedAt=Number(saved.confirmadoEm||0);used._stale=Boolean(saved._stale);
  return used;
}
function renderHealthInstant(areaId){
  areaId=normArea(areaId);
  var used=renderHealthCache(areaId),notificacao=readConfirmedNotification(areaId),area=selectedArea();
  if(notificacao)renderConfirmedNotification(notificacao,areaId);
  markHealth('healthArea',(text(area&&area.areaNome)||areaId)+' • '+(text(area&&area.unidadeNome)||text(area&&area.unidadeId)||'unidade'),'ok');
  var hasCached=Boolean(used.portal||used.residents||used.agenda||used.content||notificacao);
  if(hasCached)el('healthUpdated').textContent='Última confirmação exibida • sincronizando em segundo plano';
  return used;
}
function refreshNotificationHealth(areaId,force){
  areaId=normArea(areaId);
  if(!permission('PUBLICACOES_GERENCIAR')){markHealth('healthNotifications','Sem permissão','warn');return}

  /* NOTIFICACOES_FONTE_UNICA_ATUAL_V2:
     A Central não apresenta mais snapshot do navegador nem cache rápido como número atual.
     Em cada entrada/atualização, mostra "Confirmando…" e só publica contagens após
     uma consulta remota concluída ao OneSignal. Isso elimina a troca visual entre
     "última confirmação" e "confirmação atual". */
  if(notificationRemoteArea===areaId&&!force)return;
  notificationRemoteArea=areaId;
  var confirmadoAnterior=readConfirmedNotification(areaId);
  if(confirmadoAnterior){
    renderConfirmedNotification(confirmadoAnterior,areaId);
  }else{
    markHealth('healthNotifications','Confirmando…','');
  }

  notificationPostIsolated('admin_notificacoes_saude_remota',areaId,function(remote,seq){
    if(seq!==notificationLatestStarted[areaId])return;
    if(notificationRemoteArea===areaId)notificationRemoteArea='';
    var confirmed=saveConfirmedNotification(remote,areaId);
    if(confirmed){renderConfirmedNotification(confirmed,areaId);return}
    if(areaId!==selectedAreaId)return;
    markHealth('healthNotifications','Sem confirmação','warn');
  });
}
/* CORRECAO_CIRURGICA_DESEMPENHO_PAINEIS_20260913_V1
   A Central entrega primeiro o último estado válido e os painéis já preparados.
   A validação remota continua em segundo plano e não ocupa o caminho crítico do toque. */
function scheduleHealthRefresh(force,delay){
  if(healthRefreshTimer){clearTimeout(healthRefreshTimer);healthRefreshTimer=null}
  healthRefreshTimer=setTimeout(function(){
    healthRefreshTimer=null;
    if(!context||mode==='ubs')return;
    if(shellActiveModule){scheduleHealthRefresh(force,700);return}
    refreshHealth(Boolean(force));
  },Math.max(0,Number(delay==null?650:delay)));
}
function refreshHealth(force){
  if(!context)return;
  var areaId=selectedAreaId,now=Date.now();
  if(healthRefreshInFlight)return;
  if(!force&&lastHealthRefreshArea===areaId&&now-lastHealthRefreshAt<HEALTH_REFRESH_TTL){refreshNotificationHealth(areaId,false);return}
  healthRefreshInFlight=true;lastHealthRefreshArea=areaId;lastHealthRefreshAt=now;
  var cacheItens=renderHealthInstant(areaId),notificacaoCache=readConfirmedNotification(areaId),hasCached=Boolean(cacheItens.portal||cacheItens.residents||cacheItens.agenda||cacheItens.content||notificacaoCache);
  if(!cacheItens.portal)markHealth('healthPortal','Verificando…','');
  if(!cacheItens.residents)markHealth('healthResidents','Verificando…','');
  if(!cacheItens.agenda)markHealth('healthAgenda','Verificando…','');
  if(!cacheItens.content)markHealth('healthContent','Verificando…','');
  refreshNotificationHealth(areaId,Boolean(force));
  var area=selectedArea();
  var pending=4;
  function done(){pending--;if(pending<=0){healthRefreshInFlight=false;if(normArea(areaId)===selectedAreaId)el('healthUpdated').textContent='Atualização concluída • área '+(text(area&&area.areaNome)||areaId)}}
  jsonp('portal_manutencao_status',{areaId:areaId},function(r){
    if(normArea(areaId)!==selectedAreaId){done();return}
    if(r&&r.ok===true){var label=r.ativa?'Em manutenção':'Disponível',state=r.ativa?'warn':'ok';markHealth('healthPortal',label,state);saveHealthItem(areaId,'portal',label,state)}
    else if(!cacheItens.portal)markHealth('healthPortal','Sem confirmação','warn');
    done()
  });
  healthPostIsolated('admin_moradores_status',session({areaId:areaId}),'admin_moradores_result',function(r){
    if(normArea(areaId)===selectedAreaId){
      if(r&&r.ok===true){markHealth('healthResidents','Base acessível','ok');saveHealthItem(areaId,'residents','Base acessível','ok')}
      else if(!cacheItens.residents)markHealth('healthResidents','Falha na leitura','err');
    }
    done()
  });
  jsonp('painel_publico',{areaId:areaId},function(r){
    if(normArea(areaId)===selectedAreaId){
      if(r&&r.ok===true){markHealth('healthAgenda','Agenda pública acessível','ok');saveHealthItem(areaId,'agenda','Agenda pública acessível','ok')}
      else if(!cacheItens.agenda)markHealth('healthAgenda','Sem confirmação','warn');
    }
    done()
  });
  jsonp('publico_conteudo_status',{areaId:areaId},function(r){
    if(normArea(areaId)===selectedAreaId){
      if(r&&r.ok===true){markHealth('healthContent','Conteúdo acessível','ok');saveHealthItem(areaId,'content','Conteúdo acessível','ok')}
      else if(!cacheItens.content)markHealth('healthContent','Sem confirmação','warn');
    }
    done()
  });
  el('healthUpdated').textContent=hasCached?'Dados carregados • sincronizando atualização em segundo plano':'Carregando a primeira confirmação dos dados • área '+(text(area&&area.areaNome)||areaId);
  setTimeout(function(){healthRefreshInFlight=false},12000);
}
/* TAREFA_15_NAVEGACAO_INTERNA_V1:
   a seta Voltar usa o shell interno do Conecta e não o histórico imprevisível do Safari.
   Rotas variantes mantêm frames próprios para preservar filtros, posição e estado já carregado. */
function moduleRouteOptions(options){
  var src=options&&typeof options==='object'?options:{};
  var view=text(src.view).toLowerCase().replace(/[^a-z0-9_-]/g,'');
  var all=String(src.all==null?'':src.all)==='1'?'1':'';
  return{view:view,all:all};
}
function moduleRouteId(name,options){
  var opts=moduleRouteOptions(options),id=text(name).toLowerCase();
  if(opts.view)id+='|view='+opts.view;
  if(opts.all)id+='|all='+opts.all;
  return id;
}
function moduleUrl(name,options){
  var area=encodeURIComponent(selectedAreaId),tacsOnly=mode==='tacs'||TACS_ONLY,access=tacsOnly?'&acesso=tacs':'',revision='20260913-apresentacao-paineis-v2',territoryRevision='20260913-territorio-instant-v2',municipiosRevision='20260913-municipios-instant-v1',loadingRevision='20260913-loading-lifecycle-v2',from='&from=central&load='+loadingRevision,opts=moduleRouteOptions(options),extra='';
  if(opts.view)extra+='&view='+encodeURIComponent(opts.view);
  if(opts.all)extra+='&all='+encodeURIComponent(opts.all);
  if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+access+extra+from+'&v='+revision;
  if(name==='suporte')return '/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html?area='+area+access+extra+from+'&v='+revision;
  if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+extra+from+'&v='+revision;
  if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+extra+from+'&v='+revision;
  if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+access+extra+from+'&v='+revision;
  if(name==='territorio')return '/atendimento-acs-farmaceutico/teste-v1/painel-tacs-areas-v1.html?from=central&localfirst=1&v='+territoryRevision;
  if(name==='municipios')return '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html?from=central&v='+municipiosRevision;
  if(name==='portal')return '/atendimento-acs-farmaceutico/?area='+area+'&from=central';
  return ''
}

/* TAREFA_10_SHELL_PERSISTENTE_V1:
   a Central permanece montada e é a única dona da navegação interna.
   Cada módulo é carregado uma vez por perfil/área e preservado ao voltar à Central. */
function shellCurrentScope(){return (mode||'')+'|'+normArea(selectedAreaId)}
function shellFrameKey(routeId){return shellCurrentScope()+'|'+text(routeId).toLowerCase()}
function shellActiveFrame(){return shellActiveRoute&&shellFrames[shellFrameKey(shellActiveRoute)]||null}
function resetModuleShell(){
  var viewer=el('viewer'),base=el('viewerFrame');
  Object.keys(shellFrames).forEach(function(key){
    var frame=shellFrames[key];if(!frame)return;
    try{frame.src='about:blank'}catch(e){}
    if(frame!==base&&frame.parentNode)frame.remove();
  });
  try{if(window.ConectaAgendasNativeV1&&typeof window.ConectaAgendasNativeV1.reset==='function')window.ConectaAgendasNativeV1.reset()}catch(e){}
  try{if(window.ConectaMoradoresNativeV1&&typeof window.ConectaMoradoresNativeV1.reset==='function')window.ConectaMoradoresNativeV1.reset()}catch(e){}
  try{if(window.ConectaProfissionaisNativeV1&&typeof window.ConectaProfissionaisNativeV1.reset==='function')window.ConectaProfissionaisNativeV1.reset()}catch(e){}
  var nativeHost=el('nativeModuleHost');if(nativeHost){nativeHost.hidden=true;nativeHost.innerHTML='';nativeHost.dataset.tacsDirty='0'}
  var moradoresHost=el('nativeMoradoresHost');if(moradoresHost&&moradoresHost.parentNode)moradoresHost.remove()
  var profissionaisHost=el('nativeProfissionaisHost');if(profissionaisHost&&profissionaisHost.parentNode)profissionaisHost.remove()
  shellFrames={};shellActiveModule='';shellActiveRoute='';shellActiveNative='';shellScopeKey='';
  if(base){base.hidden=false;base.removeAttribute('data-shell-key');base.removeAttribute('data-shell-module');base.removeAttribute('data-shell-route');base.removeAttribute('data-shell-url');base.removeAttribute('data-shell-loaded');if(base.src!=='about:blank')base.src='about:blank'}
  if(viewer)viewer.hidden=true;
  setShellOpening('',false);
  document.body.classList.remove('viewer-open');
}
function prepareShellScope(){
  var scope=shellCurrentScope();
  if(shellScopeKey&&shellScopeKey!==scope)resetModuleShell();
  shellScopeKey=scope;
}
function ensureShellOpening(){
  var viewer=el('viewer'),node=el('cscModuleOpening');if(!viewer)return null;
  if(node)return node;
  node=document.createElement('div');node.id='cscModuleOpening';
  node.setAttribute('role','status');node.setAttribute('aria-live','polite');
  node.style.cssText='padding:10px 16px;background:#071827;color:#adc4d2;border:0;box-shadow:none;font-weight:800;font-size:.86rem';
  var nativeHost=el('nativeModuleHost'),frame=el('viewerFrame');viewer.insertBefore(node,nativeHost||frame||null);return node;
}
function setShellOpening(title,visible){
  var node=ensureShellOpening();if(!node)return;
  /* CORRECAO_CIRURGICA_LOADER_SHELL_20260913_V2:
     o shell mostra o aviso somente no intervalo real entre o toque e a montagem do painel.
     Assim que o módulo monta, o aviso some e o ciclo de carregamento passa a pertencer ao painel. */
  if(visible){
    node.hidden=false;
    node.textContent='Aguarde enquanto os dados carregam…';
  }else{
    node.hidden=true;
    node.textContent='';
  }
}
/* TAREFA_16_AGENDAS_NATIVAS_V1:
   Agendas e vagas é o primeiro painel migrado definitivamente para o shell.
   O caminho normal não usa viewerFrame/iframe; os demais módulos permanecem inalterados. */
var task16AgendaAssetsLoading=false,task16AgendaAssetWaiters=[];
function task16LoadStyle(){
  if(document.getElementById('cscAgendaNativeCssV1'))return;
  var link=document.createElement('link');link.id='cscAgendaNativeCssV1';link.rel='stylesheet';
  link.href='/atendimento-acs-farmaceutico/conecta-agendas-native-v1.css?v=20260913-agendas-ios-mount-v1';
  document.head.appendChild(link);
}
function task16LoadScript(id,src,ready,done){
  if(ready()){done(true);return}
  var existing=document.getElementById(id);
  if(existing){
    existing.addEventListener('load',function(){done(ready())},{once:true});
    existing.addEventListener('error',function(){done(false)},{once:true});
    return;
  }
  var s=document.createElement('script');s.id=id;s.src=src;s.async=false;
  s.onload=function(){done(ready())};s.onerror=function(){done(false)};document.head.appendChild(s);
}
function ensureTask16AgendaAssets(callback){
  task16LoadStyle();
  if(window.ConectaModuleCoreV1&&window.ConectaAgendasTransportV1&&window.ConectaAgendasNativeV1){callback(true);return}
  task16AgendaAssetWaiters.push(callback);
  if(task16AgendaAssetsLoading)return;
  task16AgendaAssetsLoading=true;
  function finish(ok){
    task16AgendaAssetsLoading=false;
    var list=task16AgendaAssetWaiters.slice();task16AgendaAssetWaiters=[];
    list.forEach(function(cb){try{cb(ok)}catch(e){}});
  }
  task16LoadScript('cscModuleCoreTask16','/atendimento-acs-farmaceutico/conecta-module-core-v1.js?v=20260913-ubs-panels-v1',function(){return Boolean(window.ConectaModuleCoreV1)},function(ok){
    if(!ok){finish(false);return}
    task16LoadScript('cscAgendaTransportTask16','/atendimento-acs-farmaceutico/conecta-agendas-transport-v1.js?v=20260913-agendas-ios-mount-v1',function(){return Boolean(window.ConectaAgendasTransportV1)},function(ok2){
      if(!ok2){finish(false);return}
      task16LoadScript('cscAgendaNativeTask16','/atendimento-acs-farmaceutico/conecta-agendas-native-v1.js?v=20260913-loading-lifecycle-v2&load=20260913-loading-lifecycle-v2',function(){return Boolean(window.ConectaAgendasNativeV1)},function(ok3){
        if(!ok3){finish(false);return}
        task16LoadScript('cscAgendaWhatsappTask16','/atendimento-acs-farmaceutico/agenda-whatsapp-card-v1.js?v=20260913-agendas-ios-mount-v1',function(){return Boolean(window.PortalTacsAgendaWhatsAppV2API)},finish);
      });
    });
  });
}
function showNativeAgenda(title,routeId){
  prepareShellScope();publishModuleCore();hideAllNativeExcept('agendas');
  Object.keys(shellFrames).forEach(function(key){var frame=shellFrames[key];if(frame)frame.hidden=true});
  var base=el('viewerFrame');if(base)base.hidden=true;
  var host=el('nativeModuleHost'),viewer=el('viewer');
  if(!host||!viewer)return false;
  shellActiveModule='agendas';shellActiveRoute=routeId;shellActiveNative='agendas';
  el('viewerTitle').textContent=title||'Agendas e vagas';
  viewer.classList.add('csc-shell-viewer','csc-native-viewer');viewer.classList.remove('csc-frame-viewer');viewer.hidden=false;host.hidden=false;
  var footer=el('viewerFooter');if(footer)footer.hidden=false;
  document.body.classList.add('viewer-open');setShellOpening(title||'Agendas e vagas',true);
  ensureTask16AgendaAssets(function(ok){
    if(shellActiveNative!=='agendas'||shellActiveRoute!==routeId)return;
    if(!ok){
      host.innerHTML='<div style="padding:18px;color:#ffd0d6;background:#071827">Não foi possível carregar o módulo nativo de Agendas. Volte à Central e tente novamente.</div>';
      setShellOpening('',false);return;
    }
    try{window.ConectaAgendasNativeV1.mount(host);watchAdminUbsRemoteMode(host);setShellOpening('',false)}
    catch(e){
      host.innerHTML='<div style="padding:18px;color:#ffd0d6;background:#071827">O módulo de Agendas não pôde ser iniciado sem perder a sessão. Volte à Central e tente novamente.</div>';
      setShellOpening('',false);
    }
  });
  return true;
}
/* TAREFA_17_MORADORES_NATIVOS_V1:
   Moradores é o segundo painel da migração definitiva.
   A rota normal usa superfície nativa própria; Prontuários permanece no frame legado nesta tarefa. */
var task17MoradoresAssetsLoading=false,task17MoradoresAssetWaiters=[];
function ensureTask17MoradoresHost(){
  var host=el('nativeMoradoresHost');if(host)return host;
  var viewer=el('viewer'),frame=el('viewerFrame');if(!viewer)return null;
  host=document.createElement('div');host.id='nativeMoradoresHost';host.className='csc-native-module-host';host.hidden=true;
  viewer.insertBefore(host,frame||null);return host;
}
function task17LoadStyle(){
  if(document.getElementById('cscMoradoresNativeCssV1'))return;
  var link=document.createElement('link');link.id='cscMoradoresNativeCssV1';link.rel='stylesheet';
  link.href='/atendimento-acs-farmaceutico/conecta-moradores-native-v1.css?v=20260913-apresentacao-paineis-v2';
  document.head.appendChild(link);
}
function ensureTask17MoradoresAssets(callback){
  task17LoadStyle();
  if(window.ConectaModuleCoreV1&&window.ConectaMoradoresNativeV1){callback(true);return}
  task17MoradoresAssetWaiters.push(callback);
  if(task17MoradoresAssetsLoading)return;
  task17MoradoresAssetsLoading=true;
  function finish(ok){
    task17MoradoresAssetsLoading=false;
    var list=task17MoradoresAssetWaiters.slice();task17MoradoresAssetWaiters=[];
    list.forEach(function(cb){try{cb(ok)}catch(e){}});
  }
  task16LoadScript('cscModuleCoreTask17','/atendimento-acs-farmaceutico/conecta-module-core-v1.js?v=20260913-ubs-panels-v1',function(){return Boolean(window.ConectaModuleCoreV1)},function(ok){
    if(!ok){finish(false);return}
    task16LoadScript('cscMoradoresNativeTask17','/atendimento-acs-farmaceutico/conecta-moradores-native-v1.js?v=20260913-loader-moradores-final-v4&load=20260913-loader-moradores-final-v4',function(){return Boolean(window.ConectaMoradoresNativeV1)},finish);
  });
}
function showNativeMoradores(title,routeId){
  prepareShellScope();publishModuleCore();hideAllNativeExcept('moradores');
  Object.keys(shellFrames).forEach(function(key){var frame=shellFrames[key];if(frame)frame.hidden=true});
  var agendaHost=el('nativeModuleHost');if(agendaHost)agendaHost.hidden=true;
  var host=ensureTask17MoradoresHost(),viewer=el('viewer');
  if(!host||!viewer)return false;
  shellActiveModule='moradores';shellActiveRoute=routeId;shellActiveNative='moradores';
  el('viewerTitle').textContent=title||'Moradores';
  viewer.classList.add('csc-shell-viewer','csc-native-viewer');viewer.classList.remove('csc-frame-viewer');viewer.hidden=false;host.hidden=false;
  var footer=el('viewerFooter');if(footer)footer.hidden=false;
  document.body.classList.add('viewer-open');setShellOpening(title||'Moradores',true);
  ensureTask17MoradoresAssets(function(ok){
    if(shellActiveNative!=='moradores'||shellActiveRoute!==routeId)return;
    if(!ok){
      host.innerHTML='<div style="padding:18px;color:#ffd0d6;background:#071827">Não foi possível carregar o módulo nativo de Moradores. Volte à Central e tente novamente.</div>';
      setShellOpening('',false);return;
    }
    try{
      window.ConectaMoradoresNativeV1.mount(host,{areaId:selectedAreaId});
      watchAdminUbsRemoteMode(host);
      setShellOpening('',false);
    }catch(e){
      host.innerHTML='<div style="padding:18px;color:#ffd0d6;background:#071827">O módulo de Moradores não pôde ser iniciado sem perder a sessão. Volte à Central e tente novamente.</div>';
      setShellOpening('',false);
    }
  });
  return true;
}
/* TAREFA_18_PROFISSIONAIS_NATIVOS_V1:
   Profissionais e serviços é o terceiro painel da migração definitiva.
   A rota normal usa superfície nativa própria; o painel legado existe somente como ponte oculta/fallback. */
var task18ProfissionaisAssetsLoading=false,task18ProfissionaisAssetWaiters=[];
function ensureTask18ProfissionaisHost(){
  var host=el('nativeProfissionaisHost');if(host)return host;
  var viewer=el('viewer'),frame=el('viewerFrame');if(!viewer)return null;
  host=document.createElement('div');host.id='nativeProfissionaisHost';host.className='csc-native-module-host';host.hidden=true;
  viewer.insertBefore(host,frame||null);return host;
}
function task18LoadStyle(){
  if(document.getElementById('cscProfissionaisNativeCssV1'))return;
  var link=document.createElement('link');link.id='cscProfissionaisNativeCssV1';link.rel='stylesheet';
  link.href='/atendimento-acs-farmaceutico/conecta-profissionais-native-v1.css?v=20260913-cards-azul-escuro-v1';
  document.head.appendChild(link);
}
function ensureTask18ProfissionaisAssets(callback){
  task18LoadStyle();
  if(window.ConectaModuleCoreV1&&window.ConectaProfissionaisNativeV1){callback(true);return}
  task18ProfissionaisAssetWaiters.push(callback);
  if(task18ProfissionaisAssetsLoading)return;
  task18ProfissionaisAssetsLoading=true;
  function finish(ok){
    task18ProfissionaisAssetsLoading=false;
    var list=task18ProfissionaisAssetWaiters.slice();task18ProfissionaisAssetWaiters=[];
    list.forEach(function(cb){try{cb(ok)}catch(e){}});
  }
  task16LoadScript('cscModuleCoreTask18','/atendimento-acs-farmaceutico/conecta-module-core-v1.js?v=20260913-ubs-panels-v1',function(){return Boolean(window.ConectaModuleCoreV1)},function(ok){
    if(!ok){finish(false);return}
    task16LoadScript('cscProfissionaisNativeTask18','/atendimento-acs-farmaceutico/conecta-profissionais-native-v1.js?v=20260913-loading-lifecycle-v2',function(){return Boolean(window.ConectaProfissionaisNativeV1)},finish);
  });
}
function hideAllNativeExcept(kind){
  if(kind!=='agendas'){try{if(window.ConectaAgendasNativeV1&&window.ConectaAgendasNativeV1.hide)window.ConectaAgendasNativeV1.hide()}catch(e){}var a=el('nativeModuleHost');if(a)a.hidden=true}
  if(kind!=='moradores'){try{if(window.ConectaMoradoresNativeV1&&window.ConectaMoradoresNativeV1.hide)window.ConectaMoradoresNativeV1.hide()}catch(e){}var m=el('nativeMoradoresHost');if(m)m.hidden=true}
  if(kind!=='profissionais'){try{if(window.ConectaProfissionaisNativeV1&&window.ConectaProfissionaisNativeV1.hide)window.ConectaProfissionaisNativeV1.hide()}catch(e){}var p=el('nativeProfissionaisHost');if(p)p.hidden=true}
}
function showNativeProfissionais(title,routeId){
  prepareShellScope();publishModuleCore();hideAllNativeExcept('profissionais');
  Object.keys(shellFrames).forEach(function(key){var frame=shellFrames[key];if(frame)frame.hidden=true});
  var host=ensureTask18ProfissionaisHost(),viewer=el('viewer');
  if(!host||!viewer)return false;
  shellActiveModule='profissionais';shellActiveRoute=routeId;shellActiveNative='profissionais';
  el('viewerTitle').textContent=title||'Profissionais e serviços';
  viewer.classList.add('csc-shell-viewer','csc-native-viewer');viewer.classList.remove('csc-frame-viewer');viewer.hidden=false;host.hidden=false;
  var footer=el('viewerFooter');if(footer)footer.hidden=false;
  document.body.classList.add('viewer-open');setShellOpening(title||'Profissionais e serviços',true);
  ensureTask18ProfissionaisAssets(function(ok){
    if(shellActiveNative!=='profissionais'||shellActiveRoute!==routeId)return;
    if(!ok){
      host.innerHTML='<div style="padding:18px;color:#ffd0d6;background:#071827">Não foi possível carregar o módulo nativo de Profissionais e serviços. Volte à Central e tente novamente.</div>';
      setShellOpening('',false);return;
    }
    try{window.ConectaProfissionaisNativeV1.mount(host,{areaId:selectedAreaId});watchAdminUbsRemoteMode(host);setShellOpening('',false)}
    catch(e){
      host.innerHTML='<div style="padding:18px;color:#ffd0d6;background:#071827">O módulo de Profissionais e serviços não pôde ser iniciado sem perder a sessão. Volte à Central e tente novamente.</div>';
      setShellOpening('',false);
    }
  });
  return true;
}
/* ADMIN_UBS_REMOTO_20260913_V1:
   Administrador autenticado acessa a lista das UBS já cadastradas sem usar credencial da UBS.
   Cada unidade possui dois modos distintos: Apenas visualizar e Editar. */
function centralProfileHasUbs(value){
  var p=text(value).toUpperCase().replace(/[+\s-]+/g,'_');
  return p.split('_').indexOf('UBS')!==-1;
}
function adminUbsProfiles(){
  return context&&Array.isArray(context.tacs)?context.tacs.filter(function(item){return item&&centralProfileHasUbs(item.perfil)}):[];
}
function adminUbsAreas(unitId){
  var id=text(unitId);
  return context&&Array.isArray(context.areas)?context.areas.filter(function(a){return a&&text(a.unidadeId)===id}):[];
}
function adminUbsUnitName(unitId){
  var areas=adminUbsAreas(unitId),name='';
  for(var i=0;i<areas.length;i++){name=text(areas[i].unidadeNome);if(name)return name}
  return text(unitId)||'Unidade não informada';
}
function adminUbsGroups(){
  var groups={},order=[];
  adminUbsProfiles().forEach(function(item){
    var unit=text(item.unidadeId)||'SEM_UNIDADE';
    if(!groups[unit]){groups[unit]={unitId:unit,profiles:[],areas:adminUbsAreas(unit)};order.push(unit)}
    groups[unit].profiles.push(item);
  });
  return order.map(function(key){return groups[key]});
}
function ensureAdminUbsStyle(){
  if(document.getElementById('cscAdminUbsRemoteStyle'))return;
  var style=document.createElement('style');style.id='cscAdminUbsRemoteStyle';
  style.textContent=''
    +'.csc-admin-ubs{width:min(720px,100%);margin:0 auto;padding:8px 16px 34px;color:#f7fcff;background:#071827}'
    +'.csc-admin-ubs-intro,.csc-admin-ubs-card,.csc-admin-ubs-detail{margin:0 0 14px;padding:16px;border:1px solid #2b5a76;border-radius:22px;background:linear-gradient(145deg,#153b58,#102d46)}'
    +'.csc-admin-ubs-intro h2,.csc-admin-ubs-card h3,.csc-admin-ubs-detail h2{margin:0 0 7px;color:#fff}'
    +'.csc-admin-ubs-intro p,.csc-admin-ubs-card p,.csc-admin-ubs-detail p{margin:5px 0;color:#adc4d2;line-height:1.42}'
    +'.csc-admin-ubs-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}'
    +'.csc-admin-ubs-btn{min-height:50px;border:1px solid #416f89;border-radius:16px;background:#153b58;color:#fff;font-weight:850;padding:10px 12px}'
    +'.csc-admin-ubs-btn.active,.csc-admin-ubs-btn.edit{background:#176c94;border-color:#6bd3c4}'
    +'.csc-admin-ubs-btn.view{background:#153b58;border-color:#62c8e8}'
    +'.csc-admin-ubs-btn:disabled{opacity:.45}'
    +'.csc-admin-ubs-status{display:inline-block;margin-top:7px;padding:5px 9px;border-radius:999px;background:#0b263d;color:#83efa9;font-size:.78rem;font-weight:850}'
    +'.csc-admin-ubs-panels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}'
    +'.csc-admin-ubs-panel{min-height:92px;border:1px solid #2b5a76;border-radius:19px;background:#153b58;color:#fff;padding:13px;text-align:left;font-weight:850}'
    +'.csc-admin-ubs-panel small{display:block;margin-top:5px;color:#adc4d2;font-weight:650}'
    +'.csc-admin-ubs-back{width:100%;margin-top:2px}'
    +'.csc-admin-ubs select{width:100%;min-height:50px;margin-top:7px;padding:10px 12px;border:1px solid #416f89;border-radius:15px;background:#091e30;color:#fff}'
    +'.csc-ubs-remote-notice{margin:0 0 12px;padding:10px 13px;border-radius:14px;background:#102d46;color:#adc4d2;border:1px solid #2b5a76;font-weight:800}'
    +'@media(max-width:430px){.csc-admin-ubs-panels{grid-template-columns:1fr}.csc-admin-ubs-actions{grid-template-columns:1fr 1fr}}';
  document.head.appendChild(style);
}
function adminUbsCurrentGroup(){
  if(!adminUbsContext)return null;
  var list=adminUbsGroups();
  for(var i=0;i<list.length;i++)if(text(list[i].unitId)===text(adminUbsContext.unitId))return list[i];
  return null;
}
function renderAdminUbsList(host){
  var groups=adminUbsGroups();
  adminUbsContext=null;
  if(!groups.length){
    host.innerHTML='<div class="csc-admin-ubs"><div class="csc-admin-ubs-intro"><h2>UBS cadastradas</h2><p>Nenhuma UBS cadastrada foi encontrada.</p></div></div>';
    return;
  }
  host.innerHTML='<div class="csc-admin-ubs"><div class="csc-admin-ubs-intro"><h2>UBS cadastradas</h2><p>Selecione a unidade. O Administrador não precisa informar PIN ou outra credencial da UBS.</p></div>'+
    groups.map(function(g){
      var ativos=g.profiles.filter(function(p){return p.ativo!==false});
      var responsaveis=g.profiles.filter(function(p){return text(p.perfil).toUpperCase()!=='UBS'}).map(function(p){return text(p.nomeCompleto)}).filter(Boolean);
      return '<div class="csc-admin-ubs-card" data-ubs-unit="'+esc(g.unitId)+'"><h3>'+esc(adminUbsUnitName(g.unitId))+'</h3>'+
        '<p>ID da unidade: '+esc(g.unitId)+'</p>'+(responsaveis.length?'<p>Responsável(is) vinculado(s): '+esc(responsaveis.join(', '))+'</p>':'')+
        '<span class="csc-admin-ubs-status">'+(ativos.length?'Ativa':'Inativa')+'</span>'+
        '<div class="csc-admin-ubs-actions"><button class="csc-admin-ubs-btn view" type="button" data-ubs-open="view" data-unit="'+esc(g.unitId)+'">Apenas visualizar</button>'+
        '<button class="csc-admin-ubs-btn edit" type="button" data-ubs-open="edit" data-unit="'+esc(g.unitId)+'">Editar</button></div></div>';
    }).join('')+'</div>';
}

function renderAdminUbsDetail(host){
  var g=adminUbsCurrentGroup();if(!g){renderAdminUbsList(host);return}
  var areas=g.areas||[],areaId=text(adminUbsContext.areaId);
  if(!areaId&&areas.length)areaId=normArea(areas[0].areaId);
  adminUbsContext.areaId=areaId;
  var responsaveis=g.profiles.filter(function(p){return text(p.perfil).toUpperCase()!=='UBS'}).map(function(p){return text(p.nomeCompleto)}).filter(Boolean);
  var edit=adminUbsContext.mode==='edit',semArea=!areas.length;
  var panels=[
    ['moradores','Moradores','Cadastros e situação dos moradores'],
    ['suporte','Suporte aos moradores','Chamados e diagnóstico dos aparelhos'],
    ['recados','Recados e campanhas','Publicações da unidade/área'],
    ['agendas','Agendas e vagas','Agendas e disponibilidade'],
    ['profissionais','Profissionais e serviços','Equipe e serviços da unidade']
  ];
  host.innerHTML='<div class="csc-admin-ubs"><div class="csc-admin-ubs-detail"><h2>'+esc(adminUbsUnitName(g.unitId))+'</h2>'+
    (responsaveis.length?'<p>'+esc(responsaveis.join(', '))+'</p>':'')+
    '<div class="csc-admin-ubs-actions"><button type="button" class="csc-admin-ubs-btn view '+(!edit?'active':'')+'" data-ubs-mode="view">Apenas visualizar</button>'+
    '<button type="button" class="csc-admin-ubs-btn edit '+(edit?'active':'')+'" data-ubs-mode="edit">Editar</button></div>'+
    '<p><strong>Modo atual:</strong> '+(edit?'Editar — o Administrador pode corrigir os painéis da UBS.':'Apenas visualizar — alterações ficam bloqueadas.')+'</p>'+
    (areas.length?'<label for="cscAdminUbsArea">Área vinculada à UBS</label><select id="cscAdminUbsArea">'+areas.map(function(a){return '<option value="'+esc(normArea(a.areaId))+'" '+(normArea(a.areaId)===areaId?'selected':'')+'>'+esc(text(a.areaNome)||a.areaId)+'</option>'}).join('')+'</select>':
      '<p>Esta UBS ainda não possui área vinculada. O cadastro pode ser corrigido no modo Editar.</p>')+
    '<div class="csc-admin-ubs-panels">'+panels.map(function(p){return '<button type="button" class="csc-admin-ubs-panel" data-ubs-panel="'+p[0]+'" '+(semArea?'disabled':'')+'>'+p[1]+'<small>'+p[2]+'</small></button>'}).join('')+
    (edit?'<button type="button" class="csc-admin-ubs-panel" data-ubs-panel="territorio">Cadastro da UBS<small>Unidade de saúde, PIN, perfil e permissões</small></button>':'')+
    '</div></div><button type="button" class="csc-admin-ubs-btn csc-admin-ubs-back" data-ubs-back="1">Voltar à lista de UBS</button></div>';
}

function adminUbsReadonlyNavigationControl(n){
  if(!n||!n.matches)return false;
  if(n.matches('.tab,.sectionTab,[data-section],[data-diag-filter],[aria-controls],[role="tab"],.csc-appbar-back,.viewer-back,[data-nav],[data-view],[data-tab],[data-filter],input[type="search"]'))return true;
  var hint=[
    text(n.id),text(n.getAttribute&&n.getAttribute('name')),
    text(n.className),text(n.getAttribute&&n.getAttribute('placeholder')),
    text(n.getAttribute&&n.getAttribute('aria-label'))
  ].join(' ').toLowerCase();
  if(/busca|buscar|pesquisa|search|filtro|filter|consulta|navega|navigation|voltar|back|anterior|proximo|próximo/.test(hint))return true;
  if(n.tagName==='BUTTON'){
    var label=text(n.textContent).toLowerCase();
    if(/^(voltar|fechar|anterior|pr[oó]ximo|abrir|visualizar|ver\b|detalhes|filtrar|buscar|pesquisar|atualizar|recarregar)/.test(label))return true;
  }
  return false;
}
function applyAdminUbsRemoteMode(root){
  if(!root)return;
  var doc=root.ownerDocument||document,view=Boolean(adminUbsContext&&adminUbsContext.mode==='view'&&shellActiveModule!=='ubs');
  try{
    root.querySelectorAll('[data-csc-ubs-readonly-disabled="1"]').forEach(function(n){n.disabled=false;n.removeAttribute('data-csc-ubs-readonly-disabled')});
    var old=doc.getElementById('cscUbsRemoteModeNotice');if(old)old.remove();
    if(!view)return;
    var notice=doc.createElement('div');notice.id='cscUbsRemoteModeNotice';notice.className='csc-ubs-remote-notice';notice.textContent='Modo apenas visualizar — alterações estão bloqueadas.';
    if(root.firstChild)root.insertBefore(notice,root.firstChild);else root.appendChild(notice);
    root.querySelectorAll('input,select,textarea,button').forEach(function(n){
      if(adminUbsReadonlyNavigationControl(n))return;
      if(!n.disabled){n.disabled=true;n.setAttribute('data-csc-ubs-readonly-disabled','1')}
    });
  }catch(e){}
}
function watchAdminUbsRemoteMode(root){
  if(!root)return;
  try{
    if(root.__cscUbsRemoteObserver){root.__cscUbsRemoteObserver.disconnect();root.__cscUbsRemoteObserver=null}
    applyAdminUbsRemoteMode(root);
    if(adminUbsContext&&adminUbsContext.mode==='view'&&typeof MutationObserver==='function'){
      var timer=0,observer=new MutationObserver(function(){
        clearTimeout(timer);timer=setTimeout(function(){applyAdminUbsRemoteMode(root)},25);
      });
      observer.observe(root,{childList:true,subtree:true});
      root.__cscUbsRemoteObserver=observer;
    }
  }catch(e){}
}
function applyAdminUbsRemoteToFrame(frame){
  try{if(frame&&frame.contentDocument&&frame.contentDocument.body)watchAdminUbsRemoteMode(frame.contentDocument.body)}catch(e){}
}
function openAdminUbsRemotePanel(name,title){
  if(!adminUbsContext||mode!=='admin')return;
  if(name!=='territorio'){
    if(!adminUbsContext.areaId){var s=el('cscAdminUbsArea');if(s)adminUbsContext.areaId=normArea(s.value)}
    if(!adminUbsContext.areaId)return;
    selectedAreaId=normArea(adminUbsContext.areaId);
    publishModuleCore();
  }
  openModule(name,title,{});
}
function showAdminUbs(title){
  if(mode!=='admin')return false;
  if(!adminUbsPreviousAreaId)adminUbsPreviousAreaId=selectedAreaId;
  prepareShellScope();hideAllNativeExcept('ubs');
  Object.keys(shellFrames).forEach(function(key){var frame=shellFrames[key];if(frame)frame.hidden=true});
  var host=el('nativeModuleHost'),viewer=el('viewer');if(!host||!viewer)return false;
  ensureAdminUbsStyle();
  shellActiveModule='ubs';shellActiveRoute='ubs';shellActiveNative='ubs';
  el('viewerTitle').textContent=title||'UBS';
  viewer.classList.add('csc-shell-viewer','csc-native-viewer');viewer.classList.remove('csc-frame-viewer');viewer.hidden=false;
  host.hidden=false;var footer=el('viewerFooter');if(footer)footer.hidden=false;
  document.body.classList.add('viewer-open');setShellOpening('',false);
  if(adminUbsContext)renderAdminUbsDetail(host);else renderAdminUbsList(host);
  if(host.dataset.cscUbsBound!=='1'){
    host.dataset.cscUbsBound='1';
    host.addEventListener('click',function(e){
      if(shellActiveModule!=='ubs')return;
      var open=e.target.closest('[data-ubs-open]');
      if(open){var unit=text(open.getAttribute('data-unit')),groups=adminUbsGroups(),g=groups.find(function(x){return text(x.unitId)===unit});adminUbsContext={unitId:unit,mode:open.getAttribute('data-ubs-open')==='edit'?'edit':'view',areaId:g&&g.areas&&g.areas.length?normArea(g.areas[0].areaId):''};renderAdminUbsDetail(host);return}
      var modeBtn=e.target.closest('[data-ubs-mode]');if(modeBtn&&adminUbsContext){adminUbsContext.mode=modeBtn.getAttribute('data-ubs-mode')==='edit'?'edit':'view';renderAdminUbsDetail(host);return}
      var back=e.target.closest('[data-ubs-back]');if(back){renderAdminUbsList(host);return}
      var panel=e.target.closest('[data-ubs-panel]');if(panel&&!panel.disabled){var names={moradores:'Moradores',suporte:'Suporte aos moradores',recados:'Recados e campanhas',agendas:'Agendas e vagas',profissionais:'Profissionais e serviços',territorio:'TACS e áreas'};openAdminUbsRemotePanel(panel.getAttribute('data-ubs-panel'),names[panel.getAttribute('data-ubs-panel')]||'Painel');return}
    });
    host.addEventListener('change',function(e){if(e.target&&e.target.id==='cscAdminUbsArea'&&adminUbsContext)adminUbsContext.areaId=normArea(e.target.value)});
  }
  return true;
}
function normalizeEmbeddedPanelFrame(frame){
  try{
    var doc=frame&&frame.contentDocument;if(!doc)return;
    var style=doc.getElementById('cscEmbeddedApp4SingleHeaderV1');
    if(!style){
      style=doc.createElement('style');style.id='cscEmbeddedApp4SingleHeaderV1';
      style.textContent=[
        '#cscInstitutionalAppbar{display:flex!important;position:static!important;top:auto!important;inset:auto!important;background:#071827!important;border:0!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
        (frame&&frame.dataset&&frame.dataset.shellModule==='portal')?'#portalTacsBackCentralV1{display:none!important}#portalTacsAtualizarPaginaV1{display:inline-flex!important}':'#portalTacsBackCentralV1{display:none!important}',
        'html,body,main,footer,.footer{background:#071827!important;background-image:none!important;border-top:0!important}',
        '#cscPlatformFooter{display:flex!important;position:static!important;background:#071827!important;border:0!important;box-shadow:none!important}'
      ].join('');
      (doc.head||doc.documentElement).appendChild(style);
    }
    var internal=doc.getElementById('cscInstitutionalAppbar');if(internal)internal.removeAttribute('aria-hidden');
  }catch(e){}
}
/* CORRECAO_FRAME_PREPAINT_CANONICO_V1
   O iframe legado só se torna visível depois de carregar a rota real e receber
   a normalização canônica. about:blank nunca conta como painel pronto. */
function shellFrameAtTarget(frame){
  if(!frame)return false;
  var expected=text(frame.dataset.shellUrl||'');if(!expected)return false;
  try{
    var current=text(frame.contentWindow&&frame.contentWindow.location&&frame.contentWindow.location.href);
    if(!current||current==='about:blank')return false;
    var a=new URL(current,location.href),b=new URL(expected,location.href);
    return a.pathname===b.pathname&&a.search===b.search;
  }catch(e){
    var src=text(frame.getAttribute('src')||'');
    return Boolean(src&&src!=='about:blank'&&src.indexOf(expected.split('?')[0])!==-1);
  }
}
function setLegacyFrameOpening(frame,visible){
  var node=ensureShellOpening();
  if(frame)frame.style.visibility=visible?'hidden':'visible';
  if(!node)return;
  if(visible){
    node.hidden=false;
    node.textContent='Aguarde enquanto os dados carregam…';
  }else{
    node.hidden=true;
    node.textContent='';
  }
}
function enhanceShellFrame(frame){
  if(!frame||frame.dataset.shellEnhanced==='1')return;
  frame.dataset.shellEnhanced='1';
  frame.addEventListener('load',function(){
    if(!shellFrameAtTarget(frame)){
      frame.dataset.shellReady='0';
      return;
    }
    frame.dataset.shellReady='1';
    try{applyUiStandard(frame.contentDocument)}catch(e){}
    normalizeEmbeddedPanelFrame(frame);
    applyAdminUbsRemoteToFrame(frame);
    setTimeout(function(){normalizeEmbeddedPanelFrame(frame);applyAdminUbsRemoteToFrame(frame)},0);
    setTimeout(function(){normalizeEmbeddedPanelFrame(frame);applyAdminUbsRemoteToFrame(frame)},300);
    if(shellActiveFrame()===frame){
      setLegacyFrameOpening(frame,false);
      setShellOpening('',false);
    }
  });
}
function ensureShellFrame(name,url,title,routeId){
  prepareShellScope();
  var key=shellFrameKey(routeId),frame=shellFrames[key],base=el('viewerFrame'),viewer=el('viewer');
  if(frame)return frame;
  if(base&&!base.dataset.shellKey){
    frame=base;
  }else{
    frame=document.createElement('iframe');
    frame.className='csc-module-frame';
    frame.setAttribute('title',title||'Painel administrativo');
    frame.src='about:blank';
    viewer.appendChild(frame);
  }
  frame.dataset.shellKey=key;frame.dataset.shellModule=name;frame.dataset.shellRoute=routeId;frame.dataset.shellUrl=url;frame.hidden=true;
  enhanceShellFrame(frame);shellFrames[key]=frame;
  return frame;
}
function showShellFrame(name,frame,title,routeId){
  hideAllNativeExcept('');
  var nativeHost=el('nativeModuleHost');if(nativeHost)nativeHost.hidden=true;
  var moradoresHost=el('nativeMoradoresHost');if(moradoresHost)moradoresHost.hidden=true;
  var profissionaisHost=el('nativeProfissionaisHost');if(profissionaisHost)profissionaisHost.hidden=true;
  Object.keys(shellFrames).forEach(function(key){var item=shellFrames[key];if(item)item.hidden=item!==frame});
  shellActiveModule=name;shellActiveRoute=routeId;shellActiveNative='';
  el('viewerTitle').textContent=title||'Painel';
  var viewer=el('viewer');viewer.classList.add('csc-shell-viewer','csc-frame-viewer');viewer.classList.remove('csc-native-viewer');viewer.hidden=false;
  var footer=el('viewerFooter');if(footer)footer.hidden=true;
  frame.hidden=false;document.body.classList.add('viewer-open');
  var shellReady=frame.dataset.shellReady==='1'&&shellFrameAtTarget(frame);
  if(shellReady)applyAdminUbsRemoteToFrame(frame);
  /* TAREFA_11_RESPOSTA_VISUAL_IMEDIATA_V1 + PREPAINT_CANONICO_V1:
     o shell responde no mesmo toque, mas a rota HTML antiga não é exibida durante
     a hidratação. Enquanto a rota real carrega, aparece somente o status canônico. */
  setLegacyFrameOpening(frame,!shellReady);
  /* TAREFA_10_AGENDA_LAZY_VISIBLE_V1:
     módulos ainda não migrados continuam carregando somente depois que o shell está visível. */
  if(frame.dataset.shellLoaded!=='1'){
    frame.dataset.shellLoaded='1';
    var carregar=function(){var url=frame.dataset.shellUrl||'about:blank';if(frame.src!==url)frame.src=url};
    if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(carregar);else setTimeout(carregar,0);
  }
}
/* CORRECAO_PRIMEIRO_TOQUE_PAINEIS_V1
   A Central pode estar legitimamente aberta pelo PIN/local-first antes de existir token remoto.
   Nesse intervalo, o toque precisa responder imediatamente. Escritas continuam protegidas
   porque os módulos só liberam gravação quando a sessão remota estiver confirmada. */
function localPanelAccessReady(){
  return Boolean(acessoLocalAberto&&mode&&context);
}
/* PADRAO_ABERTURA_PAINEIS_20260913_V1:
   primeiro toque mostra o conteúdo/estrutura interna do painel; nunca uma tela lisa.
   avisos de espera usam somente "Aguarde enquanto os dados carregam…" dentro do painel. */
function ensurePendingPreviewStyle(){
  if(document.getElementById('cscPendingPanelPreviewStyle'))return;
  var style=document.createElement('style');style.id='cscPendingPanelPreviewStyle';
  style.textContent=''
    +'.csc-pending-preview{width:min(720px,100%);margin:0 auto;padding:8px 16px 34px;color:#f7fcff;background:#071827}'
    +'.csc-pending-status{margin:4px 0 14px;padding:8px 11px;border-radius:12px;background:#102d46;color:#adc4d2;font-size:.82rem;font-weight:750;line-height:1.35}'
    +'.csc-pending-card{margin:0 0 14px;padding:16px;border:1px solid #2b5a76;border-radius:22px;background:linear-gradient(145deg,#153b58,#102d46)}'
    +'.csc-pending-card h2{margin:0 0 7px;color:#fff;font-size:1.16rem;line-height:1.2}'
    +'.csc-pending-card p{margin:0;color:#c6d8e2;font-size:.9rem;line-height:1.45}'
    +'.csc-pending-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-bottom:14px}'
    +'.csc-pending-tab{padding:13px 9px;border:1px solid #365f78;border-radius:17px;background:#153b58;color:#d8e6ee;text-align:center;font-weight:850}'
    +'.csc-pending-tab.active{border-color:#6bd3c4;background:#176c94;color:#fff}'
    +'.csc-pending-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}'
    +'.csc-pending-metric{min-height:88px;padding:13px;border-radius:18px;background:#153b58;display:flex;flex-direction:column;justify-content:center;text-align:center}'
    +'.csc-pending-metric strong{color:#83efa9;font-size:1.38rem}.csc-pending-metric span{margin-top:5px;color:#adc4d2;font-size:.82rem}'
    +'.csc-pending-field{min-height:50px;padding:13px;border:1px solid #416f89;border-radius:15px;background:#071827;color:#adc4d2}'
    +'.csc-pending-section{margin-top:12px;color:#fff;font-weight:850;font-size:1rem}';
  document.head.appendChild(style);
}
function pendingPreviewHtml(name,routeId){
  var wait='<div class="csc-pending-status">Aguarde enquanto os dados carregam…</div>';
  var metrics=function(labels){return '<div class="csc-pending-metrics">'+labels.map(function(label){return '<div class="csc-pending-metric"><strong>—</strong><span>'+label+'</span></div>'}).join('')+'</div>'};
  if(name==='suporte')return wait
    +'<div class="csc-pending-card"><h2>Vínculos protegidos</h2><p>Chamados e diagnóstico permanecem no próprio módulo.</p></div>'
    +'<div class="csc-pending-tabs"><div class="csc-pending-tab active">Chamados dos moradores</div><div class="csc-pending-tab">Diagnóstico dos aparelhos</div></div>'
    +'<div class="csc-pending-card">'+metrics(['Novos','Em análise','Respondidos','Resolvidos'])+'</div>';
  if(name==='recados')return wait
    +'<div class="csc-pending-tabs"><div class="csc-pending-tab active">Recados</div><div class="csc-pending-tab">Campanhas</div></div>'
    +'<div class="csc-pending-card">'+metrics(['Recados','Recados ativos','Campanhas','Campanhas ativas'])+'</div>';
  if(name==='territorio')return wait
    +'<div class="csc-pending-card"><h2>Administrador / TACS / UBS</h2><p>Cadastro, perfis e permissões da área.</p></div>'
    +'<div class="csc-pending-tabs"><div class="csc-pending-tab active">Cadastros</div><div class="csc-pending-tab">Áreas</div></div>'
    +'<div class="csc-pending-card"><div class="csc-pending-section">Importação de moradores</div><p>Estrutura do painel disponível; dados confirmados entram em seguida.</p></div>';
  if(name==='municipios')return wait
    +'<div class="csc-pending-card"><h2>Estrutura atual</h2>'+metrics(['Organizações','Municípios','Áreas','Pendências'])+'</div>'
    +'<div class="csc-pending-tabs"><div class="csc-pending-tab active">Organizações</div><div class="csc-pending-tab">Municípios</div></div>';
  if(name==='moradores'&&String(routeId||'').indexOf('view=prontuarios')>=0)return wait
    +'<div class="csc-pending-card">'+metrics(['Moradores ativos','Schema','Novo/Editar','Consolidação'])+'</div>'
    +'<div class="csc-pending-card"><h2>Buscar morador</h2><div class="csc-pending-field">Nome, CPF, CNS, ID Portal, endereço ou telefone</div></div>';
  return wait+'<div class="csc-pending-card"><h2>Conteúdo do painel</h2><p>A estrutura já está disponível enquanto os dados confirmados são carregados.</p></div>';
}
function showPendingModuleShell(name,title,routeId){
  hideAllNativeExcept('');
  Object.keys(shellFrames).forEach(function(key){var item=shellFrames[key];if(item)item.hidden=true});
  var base=el('viewerFrame');if(base)base.hidden=true;
  var viewer=el('viewer'),host=el('nativeModuleHost');if(!viewer||!host)return false;
  ensurePendingPreviewStyle();
  shellActiveModule=name;shellActiveRoute=routeId;shellActiveNative='';
  el('viewerTitle').textContent=title||'Painel';
  viewer.classList.add('csc-shell-viewer','csc-native-viewer');viewer.classList.remove('csc-frame-viewer');viewer.hidden=false;
  host.hidden=false;host.innerHTML='<div class="csc-pending-preview">'+pendingPreviewHtml(name,routeId)+'</div>';
  var footer=el('viewerFooter');if(footer)footer.hidden=false;
  document.body.classList.add('viewer-open');
  var node=ensureShellOpening();if(node){node.hidden=true;node.textContent='';}
  return true;
}
function shellHasUnsaved(frame){
  if(shellActiveNative==='agendas'){
    try{return Boolean(window.ConectaAgendasNativeV1&&window.ConectaAgendasNativeV1.hasUnsaved&&window.ConectaAgendasNativeV1.hasUnsaved())}catch(e){return false}
  }
  if(shellActiveNative==='moradores'){
    try{return Boolean(window.ConectaMoradoresNativeV1&&window.ConectaMoradoresNativeV1.hasUnsaved&&window.ConectaMoradoresNativeV1.hasUnsaved())}catch(e){return false}
  }
  if(shellActiveNative==='profissionais'){
    try{return Boolean(window.ConectaProfissionaisNativeV1&&window.ConectaProfissionaisNativeV1.hasUnsaved&&window.ConectaProfissionaisNativeV1.hasUnsaved())}catch(e){return false}
  }
  try{return Boolean(frame&&frame.contentDocument&&frame.contentDocument.documentElement.dataset.tacsDirty==='1')}catch(e){return false}
}
function showPortalTacs(title,routeId,url){
  /* CORRECAO_CIRURGICA_ATALHO_PORTAL_TACS_20260913_V1:
     O Portal TACS é uma rota pública completa, não um painel administrativo.
     Abrir no viewer genérico deixava o iframe invisível até a hidratação terminar e,
     como o aviso do viewer é ocultado pelo contrato visual, o Safari mostrava apenas
     a tela azul. O atalho agora navega diretamente para o Portal real na mesma aba.
     A sessão da Central permanece em sessionStorage e o botão Voltar à Central usa
     portalTacsCentralReturnUrlV1 para retornar ao ponto administrativo autenticado. */
  publishModuleCore();
  try{sessionStorage.setItem('portalTacsCentralReturnUrlV1',location.href)}catch(e){}
  var target=text(url||moduleUrl('portal'))||'/atendimento-acs-farmaceutico/?from=central';
  try{
    var parsed=new URL(target,location.href);
    parsed.searchParams.set('from','central');
    parsed.searchParams.set('v','20260913-portal-shortcut-v1');
    location.assign(parsed.href);
  }catch(e){
    location.href=target;
  }
}
function openModule(name,title,options){
  if(name==='ubs'){if(mode==='admin')showAdminUbs(title||'UBS');return}
  var routeId=moduleRouteId(name,options),url=moduleUrl(name,options);if(!url)return;
  if(name==='portal'){showPortalTacs(title||'Portal TACS',routeId,url);return}
  var remoteReady=Boolean(token||territoryToken||ubsToken),localReady=localPanelAccessReady();
  if(!remoteReady&&!localReady){
    moduloPendente={name:name,title:title||'Painel',options:moduleRouteOptions(options)};
    setStatus('Central pronta. Confirmando a sessão para carregar os dados deste painel…','warn');
    return;
  }
  publishModuleCore();
  if(!remoteReady){
    /* O PIN já destravou o contexto confirmado. O painel responde no primeiro toque,
       mas fica registrado para receber a sessão remota assim que ela chegar. */
    moduloPendente={name:name,title:title||'Painel',options:moduleRouteOptions(options)};
    if(name==='agendas'){showNativeAgenda(title||'Agendas e vagas',routeId);return}
    if(name==='moradores'&&moduleRouteOptions(options).view!=='prontuarios'){showNativeMoradores(title||'Moradores',routeId);return}
    if(name==='profissionais'){showNativeProfissionais(title||'Profissionais e serviços',routeId);return}
    /* TACS/áreas responde no primeiro toque com a tela real em leitura local.
       Escritas continuam bloqueadas até a sessão remota ser confirmada. */
    if(name==='territorio'){
      priorizarSincronizacaoTerritorioPendente();
      var localFrame=ensureShellFrame(name,url,title||'TACS e áreas',routeId);
      localFrame.dataset.shellLocalFirst='1';
      showShellFrame(name,localFrame,title||'TACS e áreas',routeId);
      return;
    }
    /* Demais painéis em frame preservam a prévia já existente. */
    showPendingModuleShell(name,title||'Painel',routeId);
    return;
  }
  moduloPendente=null;
  if(name==='agendas'){showNativeAgenda(title||'Agendas e vagas',routeId);return}
  if(name==='moradores'&&moduleRouteOptions(options).view!=='prontuarios'){showNativeMoradores(title||'Moradores',routeId);return}
  if(name==='profissionais'){showNativeProfissionais(title||'Profissionais e serviços',routeId);return}
  var frame=ensureShellFrame(name,url,title||'Painel',routeId);
  if(name==='territorio'&&frame.dataset.shellLocalFirst==='1'){
    /* O mesmo painel local permanece visível; ele observa a chegada da sessão remota
       e sincroniza os dados sem voltar para about:blank. */
    delete frame.dataset.shellLocalFirst;
  }
  showShellFrame(name,frame,title||'Painel',routeId);
}
function closeViewer(){
  var frame=shellActiveFrame();
  if(shellHasUnsaved(frame)&&!window.confirm('Há alterações que podem não ter sido salvas. Deseja voltar mesmo assim?'))return false;
  if(adminUbsContext&&shellActiveModule&&shellActiveModule!=='ubs'){showAdminUbs('UBS');return true}
  if(shellActiveModule==='ubs'){
    adminUbsContext=null;
    if(adminUbsPreviousAreaId)selectedAreaId=normArea(adminUbsPreviousAreaId);
    adminUbsPreviousAreaId='';
    publishModuleCore();
  }
  if(shellActiveNative==='agendas'){
    try{if(window.ConectaAgendasNativeV1&&window.ConectaAgendasNativeV1.hide)window.ConectaAgendasNativeV1.hide()}catch(e){}
    var nativeHost=el('nativeModuleHost');if(nativeHost)nativeHost.hidden=true;
  }
  if(shellActiveNative==='moradores'){
    try{if(window.ConectaMoradoresNativeV1&&window.ConectaMoradoresNativeV1.hide)window.ConectaMoradoresNativeV1.hide()}catch(e){}
    var moradoresHost=el('nativeMoradoresHost');if(moradoresHost)moradoresHost.hidden=true;
  }
  if(shellActiveNative==='profissionais'){
    try{if(window.ConectaProfissionaisNativeV1&&window.ConectaProfissionaisNativeV1.hide)window.ConectaProfissionaisNativeV1.hide()}catch(e){}
    var profissionaisHost=el('nativeProfissionaisHost');if(profissionaisHost)profissionaisHost.hidden=true;
  }
  var viewer=el('viewer');viewer.hidden=true;viewer.classList.remove('csc-native-viewer','csc-frame-viewer');setShellOpening('',false);document.body.classList.remove('viewer-open');
  var footer=el('viewerFooter');if(footer)footer.hidden=true;
  shellActiveModule='';shellActiveRoute='';shellActiveNative='';moduloPendente=null;
  if(mode!=='ubs')scheduleHealthRefresh(false,900);return true;
}
function loadContext(message){
  post('admin_territorio_dados',session(),'admin_territorio_result',function(r){
    if(!r||r.ok!==true){
      var falhaMsg=text(r&&r.message)||'A leitura do contexto ainda não foi confirmada.';
      var authInvalida=Boolean(r&&r.authRecusada===true);
      if(!authInvalida){
        if(!context)restoreContextCache();
        setStatus('Sessão preservada. Sincronizando os dados em segundo plano…','warn');
        setTimeout(function(){if(!active&&(token||territoryToken||ubsToken))loadContext(message)},1800);
        return;
      }
      if(acessoLocalAberto){bloquearAcessoLocal(acessoLocalAberto,falhaMsg);return}
      resetModuleShell();token='';territoryToken='';ubsToken='';mode='';sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);sessionStorage.removeItem(UBS_TOKEN_KEY);syncAppState();
      el('loginPanel').hidden=false;el('identityPanel').hidden=true;el('healthPanel').hidden=true;el('modulesPanel').hidden=true;
      setStatus(falhaMsg||'A sessão foi recusada pelo servidor. Entre novamente.','warn');return;
    }
    context=r;mode=r.perfil==='TACS'?'tacs':(r.perfil==='UBS'?'ubs':'admin');saveContextCache();
    var pin=pinLocalPendente,scope=pinLocalPerfil||mode;
    pinLocalPendente='';pinLocalPerfil='';acessoLocalAberto='';
    if(pin)guardarAcessoLocal(scope,pin);
    setStatus(message||'Acesso validado.','ok');renderContext(false);
    resumePendingModule();
  });
}
var logoutEmCurso=false;
/* LOGOFF_RESILIENTE_V5:
   Proteção isolada do botão Logoff. Em sessão ativa ele nunca pode permanecer
   desabilitado por estado visual, modo somente leitura ou restauração BFCache. */
var logoutGuardObserver=null;
function garantirLogoffDisponivel(){
  var btn=el('logout');if(!btn)return;
  if(token||territoryToken||ubsToken)logoutEmCurso=false;
  try{
    btn.disabled=false;
    btn.removeAttribute('disabled');
    btn.removeAttribute('aria-disabled');
    btn.removeAttribute('data-csc-ubs-readonly-disabled');
    if(btn.style){
      btn.style.setProperty('pointer-events','auto','important');
      btn.style.setProperty('touch-action','manipulation','important');
      btn.style.setProperty('-webkit-tap-highlight-color','transparent','important');
      btn.style.setProperty('position','relative','important');
      btn.style.setProperty('z-index','9','important');
    }
    var wrap=btn.closest&&btn.closest('.csc-logout-actions');
    if(wrap&&wrap.style){
      wrap.style.setProperty('position','relative','important');
      wrap.style.setProperty('z-index','8','important');
      wrap.style.setProperty('pointer-events','auto','important');
    }
  }catch(e){}
}
function instalarProtecaoLogoff(){
  var btn=el('logout');if(!btn)return;
  garantirLogoffDisponivel();
  if(logoutGuardObserver||typeof MutationObserver!=='function')return;
  logoutGuardObserver=new MutationObserver(function(){garantirLogoffDisponivel()});
  logoutGuardObserver.observe(btn,{
    attributes:true,
    attributeFilter:['disabled','aria-disabled','data-csc-ubs-readonly-disabled','style']
  });
}
/* LOGOFF_TOQUE_RESILIENTE_V6:
   Correção isolada para Safari/iPhone na Central UBS. O encerramento não depende
   do click sintético do navegador: um toque curto confirmado em pointerup aciona
   o mesmo logout; click permanece como fallback para teclado e navegadores sem
   gesto de ponteiro. O filtro de deslocamento evita encerrar durante rolagem. */
var logoutTapGuardInstalled=false,logoutTapLastAt=0,logoutPointerId=null,logoutPointerX=0,logoutPointerY=0;
function alvoLogoff(e){
  var t=e&&e.target;
  return t&&t.closest?t.closest('#logout'):null;
}
function dispararLogoffResiliente(e){
  var btn=alvoLogoff(e);if(!btn)return false;
  garantirLogoffDisponivel();
  var agora=Date.now();
  if(agora-logoutTapLastAt<700){
    if(e&&e.cancelable)try{e.preventDefault()}catch(err){}
    return true;
  }
  logoutTapLastAt=agora;
  if(e&&e.cancelable)try{e.preventDefault()}catch(err){}
  logout();
  return true;
}
function instalarToqueResilienteLogoff(){
  if(logoutTapGuardInstalled)return;
  logoutTapGuardInstalled=true;
  if(window.PointerEvent){
    document.addEventListener('pointerdown',function(e){
      var btn=alvoLogoff(e);if(!btn)return;
      logoutPointerId=e.pointerId;logoutPointerX=e.clientX;logoutPointerY=e.clientY;
    },true);
    document.addEventListener('pointercancel',function(e){
      if(e.pointerId===logoutPointerId)logoutPointerId=null;
    },true);
    document.addEventListener('pointerup',function(e){
      if(e.pointerId!==logoutPointerId)return;
      var dx=e.clientX-logoutPointerX,dy=e.clientY-logoutPointerY;
      logoutPointerId=null;
      if((dx*dx+dy*dy)>324)return;
      dispararLogoffResiliente(e);
    },true);
  }
  document.addEventListener('click',function(e){dispararLogoffResiliente(e)},true);
}
function cancelarOperacaoAtivaSemCallback(){
  if(!active)return;
  var op=active;active=null;
  clearTimeout(op.timeout);clearTimeout(op.pollTimer);
  if(op.form&&op.form.parentNode)op.form.remove();
  if(op.frame&&op.frame.parentNode)op.frame.remove();
}
function invalidarSessaoServidorEmSegundoPlano(action,payload){
  try{
    var body=new URLSearchParams(),rid=requestId(action);
    body.set('action',action);body.set('requestId',rid);
    Object.keys(payload||{}).forEach(function(k){body.set(k,payload[k]==null?'':String(payload[k]))});
    fetch(API+'?_='+Date.now(),{
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:body.toString(),
      cache:'no-store',
      keepalive:true
    }).catch(function(){});
  }catch(e){}
}
function logout(){
  if(logoutEmCurso)return;
  logoutEmCurso=true;
  var lastMode=mode||'admin',hasSession=Boolean(token||territoryToken||ubsToken);
  var action=lastMode==='tacs'?'admin_territorio_encerrar_sessao':(lastMode==='ubs'?'conecta_ubs_encerrar':'admin_logout');
  var payload=null;
  try{if(hasSession)payload=session()}catch(e){}

  /* LOGOFF_IMEDIATO_V4:
     o retorno visual ao Login acontece antes da limpeza pesada do shell.
     Nenhuma falha de cleanup pode bloquear o primeiro toque no Safari/iPhone. */
  try{cancelRemoteAuthSync()}catch(e){}
  try{cancelarOperacaoAtivaSemCallback()}catch(e){}

  token='';territoryToken='';ubsToken='';mode='';context=null;acessoLocalAberto='';moduloPendente=null;
  try{sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);sessionStorage.removeItem(UBS_TOKEN_KEY)}catch(e){}
  try{syncAppState()}catch(e){}

  /* Sincroniza imediatamente o estado visual App4; não depende do timer de 700 ms,
     que pode estar parado depois de retorno por BFCache/pagehide no Safari. */
  try{
    document.documentElement.classList.remove('csc-session-active','csc-central-state-app');
    document.documentElement.classList.add('csc-session-missing','csc-central-state-login','csc-central-login-visible');
    if(document.body){
      document.body.classList.remove('csc-session-active','viewer-open');
      document.body.classList.add('csc-session-missing');
    }
  }catch(e){}

  var identity=el('identityPanel'),health=el('healthPanel'),modules=el('modulesPanel'),login=el('loginPanel');
  if(identity)identity.hidden=true;
  if(health)health.hidden=true;
  if(modules)modules.hidden=true;
  if(login)login.hidden=false;
  try{if(lastMode==='ubs'&&window.ConectaAcessoUnificado&&typeof window.ConectaAcessoUnificado.showRole==='function')window.ConectaAcessoUnificado.showRole('ubs');else showLogin(lastMode==='tacs'?'tacs':'admin')}catch(e){}
  try{setStatus('Sessão encerrada. Seus dados locais foram preservados para o próximo acesso.','ok')}catch(e){}
  try{window.scrollTo({top:0,behavior:'auto'})}catch(e){}

  /* A limpeza dos painéis e a invalidação remota ficam fora do caminho crítico do toque. */
  setTimeout(function(){
    try{resetModuleShell()}catch(e){}
    if(hasSession&&payload)try{invalidarSessaoServidorEmSegundoPlano(action,payload)}catch(e){}
    logoutEmCurso=false;
  },0);
}
/* LOGIN_PREFETCH_ESTATICO_V2: a tela termina de carregar primeiro. Depois, fetch assíncrono aquece o cache sem iframe oculto e sem bloquear o evento load do Safari. */
var staticPrefetchStarted=false;
function prefetchStaticPanels(){
  if(staticPrefetchStarted)return;
  if(active){setTimeout(prefetchStaticPanels,1200);return}
  staticPrefetchStarted=true;
  [
    '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html',
    '/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html',
    '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html',
    '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html',
    '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html',
    '/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html',
    '/atendimento-acs-farmaceutico/teste-v1/painel-tacs-areas-v1.html',
    '/atendimento-acs-farmaceutico/teste-v1/painel-profissionais-servicos-v1.html',
    '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html',
    '/atendimento-acs-farmaceutico/conecta-agendas-native-v1.js',
    '/atendimento-acs-farmaceutico/conecta-moradores-native-v1.js',
    '/atendimento-acs-farmaceutico/conecta-profissionais-native-v1.js',
    '/atendimento-acs-farmaceutico/conecta-agendas-transport-v1.js',
    '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-transport-v2.js'
  ].forEach(function(url){
    try{fetch(url+'?v=20260910-login-prefetch-v2',{method:'GET',cache:'force-cache',credentials:'same-origin',priority:'low'}).catch(function(){})}catch(e){}
  });
}
['adminPin','tacsPin'].forEach(function(id){var input=el(id);if(!input)return;input.addEventListener('focus',aquecerValidacaoPin,{once:true});input.addEventListener('input',aquecerValidacaoPin,{once:true})});
var nativePanelPrewarmStarted=false,nativePanelPrewarmScheduled=false,staticPanelPrefetchScheduled=false;
function prewarmNativePanelAssets(){
  if(nativePanelPrewarmStarted)return;
  nativePanelPrewarmStarted=true;
  try{ensureTask16AgendaAssets(function(){})}catch(e){}
  try{ensureTask17MoradoresAssets(function(){})}catch(e){}
  try{ensureTask18ProfissionaisAssets(function(){})}catch(e){}
}
function scheduleNativePanelPrewarm(){
  if(nativePanelPrewarmStarted||nativePanelPrewarmScheduled)return;
  nativePanelPrewarmScheduled=true;
  var run=function(){nativePanelPrewarmScheduled=false;prewarmNativePanelAssets()};
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:350});else setTimeout(run,60);
  if(!staticPanelPrefetchScheduled){
    staticPanelPrefetchScheduled=true;
    setTimeout(function(){
      if('requestIdleCallback' in window)requestIdleCallback(prefetchStaticPanels,{timeout:900});else prefetchStaticPanels();
    },420);
  }
}
window.addEventListener('load',function(){
  scheduleNativePanelPrewarm();
  if(!staticPanelPrefetchScheduled){staticPanelPrefetchScheduled=true;setTimeout(prefetchStaticPanels,900)}
},{once:true});
el('tabAdmin').addEventListener('click',function(){if(!TACS_ONLY)showLogin('admin')});el('tabTacs').addEventListener('click',function(){showLogin('tacs')});
el('loginAdmin').addEventListener('click',function(){
  var pin=digits(el('adminPin').value);
  if(!/^\d{4,8}$/.test(pin)){setStatus('Digite um PIN administrativo de 4 a 8 números.','err');return}
  setStatus('Liberando o acesso…','warn');
  abrirAcessoLocal('admin',pin).then(function(saved){
    if(saved)aplicarAcessoLocal('admin',saved);
    el('adminPin').value='';
    startRemoteAuthSync('admin',pin,Boolean(saved));
  });
});
el('loginTacs').addEventListener('click',function(){
  var pin=digits(el('tacsPin').value);
  if(!/^\d{4,8}$/.test(pin)){setStatus('Informe o PIN individual de 4 a 8 números.','err');return}
  setStatus('Liberando o acesso…','warn');
  abrirAcessoLocal('tacs',pin).then(function(saved){
    if(saved)aplicarAcessoLocal('tacs',saved);
    el('tacsPin').value='';
    startRemoteAuthSync('tacs',pin,Boolean(saved));
  });
});
el('adminArea').addEventListener('change',function(){if(mode!=='admin'&&mode!=='ubs')return;resetModuleShell();selectedAreaId=normArea(this.value);try{localStorage.setItem(AREA_KEY,selectedAreaId)}catch(e){}publishModuleCore();if(mode==='ubs')loadContext('Área da UBS selecionada.');else renderContext()});el('refreshHealth').addEventListener('click',function(){refreshHealth(true)});instalarProtecaoLogoff();instalarToqueResilienteLogoff();el('viewerBack').addEventListener('click',closeViewer);
el('viewerFrame').addEventListener('load',function(){try{applyUiStandard(el('viewerFrame').contentDocument)}catch(e){}});
el('moduleGrid').addEventListener('click',function(e){var btn=e.target.closest('.module');if(!btn||btn.disabled||btn.hidden)return;if(btn.dataset.module!=='ubs'){adminUbsContext=null;adminUbsPreviousAreaId=''}openModule(btn.dataset.module,btn.querySelector('strong').textContent)});
/* CENTRAL_RETURN_R6: restaura imediatamente o conteúdo ao voltar pelo histórico/BFCache do iPhone. */
window.addEventListener('pageshow',function(){
  token=TACS_ONLY?'':(sessionStorage.getItem(TOKEN_KEY)||'');
  territoryToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'';
  ubsToken=sessionStorage.getItem(UBS_TOKEN_KEY)||'';
  mode=territoryToken?'tacs':(token?'admin':(ubsToken?'ubs':''));
  garantirLogoffDisponivel();
  document.body.classList.remove('viewer-open');
  var viewer=el('viewer');if(viewer)viewer.hidden=true;
  shellActiveModule='';
  if(token||territoryToken||ubsToken){
    if(context&&mode!=='ubs')renderContext(true);
    else restoreContextCache();
    setTimeout(function(){if(!active)loadContext('Sessão existente validada.')},140);
  }
});
function entrarPaineisUbs(r){
  var novoToken=text(r&&r.token);if(!/^cus1\./.test(novoToken))return false;
  try{cancelRemoteAuthSync()}catch(e){}
  try{resetModuleShell()}catch(e){}
  token='';territoryToken='';ubsToken=novoToken;mode='ubs';context=null;selectedAreaId='';
  try{sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);sessionStorage.setItem(UBS_TOKEN_KEY,ubsToken)}catch(e){}
  var areas=Array.isArray(r&&r.areas)?r.areas.filter(function(area){return area&&area.ativa!==false&&normArea(area.areaId)}):[];
  if(areas.length){
    var ubsAtual=r&&r.ubsAtual&&typeof r.ubsAtual==='object'?r.ubsAtual:{
      tacsId:text(r&&r.cadastroId),nomeCompleto:text(r&&r.nome),perfil:text(r&&r.perfil)||'UBS',
      funcaoUbs:text(r&&r.funcaoUbs),unidadeId:text(r&&r.unidadeId),
      permissoes:Array.isArray(r&&r.permissoes)?r.permissoes.slice():[]
    };
    context={
      ok:true,perfil:'UBS',podeAdministrar:false,tacs:[],ubsAtual:ubsAtual,
      administradores:[],administradorAtual:null,areas:areas,isolamento:'UMA_UBS_SOMENTE_SUAS_AREAS'
    };
    selectedAreaId=normArea(areas[0].areaId);
    saveContextCache();
    syncAppState();
    renderContext(true);
    setStatus('Acesso UBS validado.','ok');
    setTimeout(function(){if(!active&&ubsToken)loadContext('Acesso UBS sincronizado.')},0);
    return true;
  }
  if(restoreUbsContextCache(r)){
    setTimeout(function(){if(!active&&ubsToken)loadContext('Acesso UBS sincronizado.')},0);
    return true;
  }
  syncAppState();
  setStatus('Abrindo os painéis da UBS…','warn');
  loadContext('Acesso UBS validado.');
  return true;
}
window.ConectaCentralUbsV1={entrar:entrarPaineisUbs};
window.ConectaCentralModuleCoreV1={publicar:publishModuleCore,chave:MODULE_CORE_KEY};
window.ConectaCentralShellV1={
  abrir:openModule,
  fechar:closeViewer,
  voltar:closeViewer,
  resetar:resetModuleShell,
  ativo:function(){return shellActiveModule},
  rotaAtiva:function(){return shellActiveRoute},
  tipoAtivo:function(){return shellActiveNative?'native':'frame'},
  escopo:function(){return shellCurrentScope()},
  contagemFrames:function(){return Object.keys(shellFrames).length}
};
window.PortalTacsCentralPinLocalV2={
  abrir:function(scope,pin){return abrirAcessoLocal(scope,pin)},
  aplicar:function(scope,saved){return aplicarAcessoLocal(scope,saved)},
  prepararSincronizacao:function(scope,pin){pinLocalPendente=pin;pinLocalPerfil=scope},
  guardar:function(scope,pin){return guardarAcessoLocal(scope,pin)},
  bloquear:function(scope,msg){bloquearAcessoLocal(scope,msg)},
  sincronizar:function(scope,newToken,pin,areaId,message){
    ubsToken='';sessionStorage.removeItem(UBS_TOKEN_KEY);
    if(scope==='tacs'){
      token='';sessionStorage.removeItem(TOKEN_KEY);territoryToken=text(newToken);mode='tacs';
      if(areaId)selectedAreaId=normArea(areaId);
      sessionStorage.setItem(TERRITORY_TOKEN_KEY,territoryToken);
    }else{
      territoryToken='';sessionStorage.removeItem(TERRITORY_TOKEN_KEY);token=text(newToken);mode='admin';
      sessionStorage.setItem(TOKEN_KEY,token);
    }
    pinLocalPendente=pin;pinLocalPerfil=scope;
    loadContext(message||'Acesso sincronizado.');
  }
};
applyUiStandard(document);
syncAppState();
if(token||territoryToken||ubsToken){
  try{
    var pendingPin=sessionStorage.getItem('portalTacsPinLocalPendenteV2')||'';
    var pendingScope=sessionStorage.getItem('portalTacsPinLocalPerfilV2')||'';
    sessionStorage.removeItem('portalTacsPinLocalPendenteV2');sessionStorage.removeItem('portalTacsPinLocalPerfilV2');
    if(/^\d{4,8}$/.test(pendingPin)){pinLocalPendente=pendingPin;pinLocalPerfil=pendingScope||mode}
  }catch(e){}
  var restored=restoreContextCache();
  if(!restored)setStatus('Conferindo a sessão existente…','warn');
  setTimeout(function(){if(!active)loadContext('Sessão existente validada.')},restored?120:0);
}else{showLogin(TACS_ONLY?'tacs':'admin')}
}());
