(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',AREA_KEY='portalTacsCentralAreaV1',CONTEXT_CACHE_KEY='portalTacsCentralContextCacheV3',MODULE_CORE_KEY='portalConectaModuleCoreV1';
var SHARED_WARM_KEY='portalTacsAppsScriptWarmAtV1';
var HEALTH_REFRESH_TTL=30000,HEALTH_CACHE_TTL=300000,HEALTH_DISPLAY_CACHE_TTL=86400000,HEALTH_CACHE_PREFIX='portalTacsHealthConfirmedV1:',healthRefreshInFlight=false,lastHealthRefreshAt=0,lastHealthRefreshArea='';
var NOTIFICATION_CONFIRMED_CACHE_PREFIX='portalTacsNotificationConfirmedV1:',notificationRemoteSeq=0,notificationRemoteArea='',notificationLatestStarted={};
var URL_PARAMS=new URLSearchParams(location.search);
var ADMIN_TRUST_KEY='portalConectaRecoveryTrustV1:admin',ADMIN_LOCAL_VAULT_KEY='conectaPinLocalV3:admin';
function adminDeviceRecognized(){
  try{return Boolean(localStorage.getItem(ADMIN_TRUST_KEY)||localStorage.getItem(ADMIN_LOCAL_VAULT_KEY))}catch(e){return false}
}
var TACS_ONLY=String(URL_PARAMS.get('acesso')||'').toLowerCase()==='tacs'&&!adminDeviceRecognized();
var token=TACS_ONLY?'':(sessionStorage.getItem(TOKEN_KEY)||''),territoryToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',device=localStorage.getItem(DEVICE_KEY)||'';
var mode=territoryToken?'tacs':(token?'admin':''),active=null,context=null,selectedAreaId='',pinLocalPendente='',pinLocalPerfil='',acessoLocalAberto='',moduloPendente=null;
var shellFrames={},shellActiveModule='',shellActiveRoute='',shellActiveNative='',shellScopeKey='';
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
  var authenticated=Boolean(token||territoryToken||localUnlocked);
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
function session(extra){var out={dispositivo:device};if(mode==='tacs'&&territoryToken)out.territorioToken=territoryToken;else if(token)out.token=token;if(selectedAreaId)out.areaId=selectedAreaId;Object.keys(extra||{}).forEach(function(k){out[k]=extra[k]});return out}

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
  active.pollTimer=setTimeout(poll,Math.max(0,Number(delay||active.nextWait||1600)));
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
  var duration=fastPin?45000:60000;
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
function permission(name){if(mode==='admin')return true;var tacs=context&&Array.isArray(context.tacs)?context.tacs[0]:null;var list=tacs&&Array.isArray(tacs.permissoes)?tacs.permissoes:[];return list.indexOf(name)!==-1}
function selectedArea(){var list=context&&Array.isArray(context.areas)?context.areas:[];for(var i=0;i<list.length;i++)if(normArea(list[i].areaId)===selectedAreaId)return list[i];return list[0]||null}
function contextCacheKey(kind){return CONTEXT_CACHE_KEY+':'+(kind==='tacs'?'tacs':'admin')}
function saveContextCache(){
  try{
    if(!context||!mode)return;
    sessionStorage.setItem(contextCacheKey(mode),JSON.stringify({
      context:context,
      mode:mode,
      selectedAreaId:selectedAreaId,
      savedAt:Date.now()
    }));
  }catch(e){}
}
function pinLocalApi(){
  var api=window.ConectaPinLocalV2;
  return api&&typeof api.abrir==='function'&&typeof api.guardar==='function'?api:null;
}
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
  token='';territoryToken='';
  sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);
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
  removerAcessoLocal(scope);
  resetModuleShell();
  token='';territoryToken='';mode='';context=null;acessoLocalAberto='';moduloPendente=null;
  sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);
  el('identityPanel').hidden=true;el('healthPanel').hidden=true;el('modulesPanel').hidden=true;el('loginPanel').hidden=false;
  showLogin(scope==='tacs'?'tacs':'admin');
  setStatus(message||'O acesso deste perfil precisa ser validado novamente.','err');
}
function restoreContextCache(){
  try{
    if(!(token||territoryToken)||!mode)return false;
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
    var area=selectedArea(),tacs=responsible(area),admin=currentAdministrator();
    var principal=mode==='tacs'?tacs:admin;
    var permissions=mode==='admin'?['*']:(tacs&&Array.isArray(tacs.permissoes)?tacs.permissoes.slice():[]);
    var payload={
      schemaVersion:1,
      source:'CENTRAL_CONECTA',
      mode:mode,
      authenticated:Boolean(token||territoryToken),
      identity:{
        nome:text(principal&&principal.nomeCompleto),
        perfil:text(principal&&principal.perfil||(mode==='tacs'?'TACS':'ADMIN')),
        funcao:text(principal&&principal.funcaoUbs),
        unidadeId:text(area&&area.unidadeId)
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
    var perfil=accessProfileLabel(tacs&&tacs.perfil||'TACS');
    var areaNome=text(area&&area.areaNome)||selectedAreaId||'sua área';
    node.innerHTML='<small>Identidade autenticada</small><h1>'+esc(identityHeadline(nome,tacs&&tacs.perfil||'TACS'))+'</h1><p>Acesso atual: TACS da área • '+esc(areaNome)+'.</p>';
    return;
  }
  var admin=currentAdministrator();
  var adminNome=text(admin&&admin.nomeCompleto)||'Administrador';
  var adminPerfil=accessProfileLabel(admin&&admin.perfil||context&&context.perfil||'ADMIN');
  node.innerHTML='<small>Identidade autenticada</small><h1>'+esc(identityHeadline(adminNome,admin&&admin.perfil||context&&context.perfil||'ADMIN'))+'</h1><p>Gestão administrativa da área selecionada.</p>';
}
function renderContext(skipHealth){syncAppState();var areas=context&&Array.isArray(context.areas)?context.areas.filter(function(a){return a&&a.ativa!==false}):[];if(!areas.length){setStatus('Nenhuma área ativa foi devolvida pelo servidor.','err');return}var stored='';try{stored=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}if(mode==='tacs')selectedAreaId=normArea(areas[0].areaId);else if(!selectedAreaId){selectedAreaId=areas.some(function(a){return normArea(a.areaId)===stored})?stored:(areas.some(function(a){return normArea(a.areaId)==='JAPARANDUBA'})?'JAPARANDUBA':normArea(areas[0].areaId))}var area=selectedArea(),tacs=responsible(area),admin=currentAdministrator();var profileIcon=el('profileIcon');if(profileIcon){profileIcon.src='/atendimento-acs-farmaceutico/icons/central-admin-saude-512.png?v=20260818-icone-central-todos-v2';}var perfilAtual=mode==='tacs'?accessProfileLabel(tacs&&tacs.perfil||'TACS'):accessProfileLabel(admin&&admin.perfil||context&&context.perfil||'ADMIN');el('profileLabel').textContent=perfilAtual;el('professionalName').textContent=mode==='tacs'?(text(tacs&&tacs.nomeCompleto)||'TACS'):(text(admin&&admin.nomeCompleto)||'Administrador');el('areaName').textContent=text(area&&area.areaNome)||selectedAreaId;el('unitName').textContent=text(area&&area.unidadeNome)||text(area&&area.unidadeId)||'Unidade não informada';updateCentralWelcome(area,tacs);publishModuleCore();el('identityPanel').hidden=false;el('healthPanel').hidden=false;el('modulesPanel').hidden=false;el('loginPanel').hidden=true;var box=el('adminAreaBox'),select=el('adminArea');box.hidden=mode!=='admin'||areas.length<2;select.innerHTML=areas.map(function(a){return'<option value="'+esc(normArea(a.areaId))+'">'+esc(text(a.areaNome)||a.areaId)+'</option>'}).join('');select.value=selectedAreaId;renderModules();renderHealthInstant(selectedAreaId);if(!skipHealth)refreshHealth()}
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
function refreshHealth(force){
  if(!context)return;
  var areaId=selectedAreaId,now=Date.now();
  if(healthRefreshInFlight)return;
  if(!force&&lastHealthRefreshArea===areaId&&now-lastHealthRefreshAt<HEALTH_REFRESH_TTL){refreshNotificationHealth(areaId,false);return}
  healthRefreshInFlight=true;lastHealthRefreshArea=areaId;lastHealthRefreshAt=now;
  var cacheItens=renderHealthInstant(areaId);
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
  el('healthUpdated').textContent='Atualizando dados validados • área '+(text(area&&area.areaNome)||areaId);
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
  var area=encodeURIComponent(selectedAreaId),tacsOnly=mode==='tacs'||TACS_ONLY,access=tacsOnly?'&acesso=tacs':'',revision='20260912-task15-navigation-v1',from='&from=central',opts=moduleRouteOptions(options),extra='';
  if(opts.view)extra+='&view='+encodeURIComponent(opts.view);
  if(opts.all)extra+='&all='+encodeURIComponent(opts.all);
  if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+access+extra+from+'&v='+revision;
  if(name==='suporte')return '/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html?area='+area+access+extra+from+'&v='+revision;
  if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+extra+from+'&v='+revision;
  if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+extra+from+'&v='+revision;
  if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+access+extra+from+'&v='+revision;
  if(name==='territorio')return '/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html?from=central&v='+revision;
  if(name==='municipios')return '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html?from=central&v='+revision;
  if(name==='portal')return '/atendimento-acs-farmaceutico/?area='+area;
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
  node.style.cssText='padding:10px 14px;background:#102d46;color:#adc4d2;border-bottom:1px solid #2b5a76;font-weight:800;font-size:.86rem';
  var nativeHost=el('nativeModuleHost'),frame=el('viewerFrame');viewer.insertBefore(node,nativeHost||frame||null);return node;
}
function setShellOpening(title,visible){
  var node=ensureShellOpening();if(!node)return;
  node.hidden=!visible;if(visible)node.textContent='Abrindo '+text(title||'painel')+' • exibindo a última confirmação disponível enquanto sincroniza';
}
/* TAREFA_16_AGENDAS_NATIVAS_V1:
   Agendas e vagas é o primeiro painel migrado definitivamente para o shell.
   O caminho normal não usa viewerFrame/iframe; os demais módulos permanecem inalterados. */
var task16AgendaAssetsLoading=false,task16AgendaAssetWaiters=[];
function task16LoadStyle(){
  if(document.getElementById('cscAgendaNativeCssV1'))return;
  var link=document.createElement('link');link.id='cscAgendaNativeCssV1';link.rel='stylesheet';
  link.href='/atendimento-acs-farmaceutico/conecta-agendas-native-v1.css?v=20260912-task16-agendas-native-v1';
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
  task16LoadScript('cscModuleCoreTask16','/atendimento-acs-farmaceutico/conecta-module-core-v1.js?v=20260912-task16-agendas-native-v1',function(){return Boolean(window.ConectaModuleCoreV1)},function(ok){
    if(!ok){finish(false);return}
    task16LoadScript('cscAgendaTransportTask16','/atendimento-acs-farmaceutico/conecta-agendas-transport-v1.js?v=20260912-task16-agendas-native-v1',function(){return Boolean(window.ConectaAgendasTransportV1)},function(ok2){
      if(!ok2){finish(false);return}
      task16LoadScript('cscAgendaNativeTask16','/atendimento-acs-farmaceutico/conecta-agendas-native-v1.js?v=20260912-task16-agendas-native-v1',function(){return Boolean(window.ConectaAgendasNativeV1)},finish);
    });
  });
}
function showNativeAgenda(title,routeId){
  prepareShellScope();publishModuleCore();
  Object.keys(shellFrames).forEach(function(key){var frame=shellFrames[key];if(frame)frame.hidden=true});
  var base=el('viewerFrame');if(base)base.hidden=true;
  var host=el('nativeModuleHost'),viewer=el('viewer');
  if(!host||!viewer)return false;
  shellActiveModule='agendas';shellActiveRoute=routeId;shellActiveNative='agendas';
  el('viewerTitle').textContent=title||'Agendas e vagas';
  viewer.classList.add('csc-shell-viewer');viewer.hidden=false;host.hidden=false;
  document.body.classList.add('viewer-open');setShellOpening(title||'Agendas e vagas',true);
  ensureTask16AgendaAssets(function(ok){
    if(shellActiveNative!=='agendas'||shellActiveRoute!==routeId)return;
    if(!ok){
      host.innerHTML='<div style="padding:18px;color:#ffd0d6;background:#071827">Não foi possível carregar o módulo nativo de Agendas. Volte à Central e tente novamente.</div>';
      setShellOpening('',false);return;
    }
    try{window.ConectaAgendasNativeV1.mount(host);setShellOpening('',false)}
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
  link.href='/atendimento-acs-farmaceutico/conecta-moradores-native-v1.css?v=20260912-task17-moradores-native-v1';
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
  task16LoadScript('cscModuleCoreTask17','/atendimento-acs-farmaceutico/conecta-module-core-v1.js?v=20260912-task17-moradores-native-v1',function(){return Boolean(window.ConectaModuleCoreV1)},function(ok){
    if(!ok){finish(false);return}
    task16LoadScript('cscMoradoresNativeTask17','/atendimento-acs-farmaceutico/conecta-moradores-native-v1.js?v=20260912-task17-moradores-native-v1',function(){return Boolean(window.ConectaMoradoresNativeV1)},finish);
  });
}
function showNativeMoradores(title,routeId){
  prepareShellScope();publishModuleCore();
  try{if(window.ConectaAgendasNativeV1&&typeof window.ConectaAgendasNativeV1.hide==='function')window.ConectaAgendasNativeV1.hide()}catch(e){}
  Object.keys(shellFrames).forEach(function(key){var frame=shellFrames[key];if(frame)frame.hidden=true});
  var agendaHost=el('nativeModuleHost');if(agendaHost)agendaHost.hidden=true;
  var host=ensureTask17MoradoresHost(),viewer=el('viewer');
  if(!host||!viewer)return false;
  shellActiveModule='moradores';shellActiveRoute=routeId;shellActiveNative='moradores';
  el('viewerTitle').textContent=title||'Moradores';
  viewer.classList.add('csc-shell-viewer');viewer.hidden=false;host.hidden=false;
  document.body.classList.add('viewer-open');setShellOpening(title||'Moradores',true);
  ensureTask17MoradoresAssets(function(ok){
    if(shellActiveNative!=='moradores'||shellActiveRoute!==routeId)return;
    if(!ok){
      host.innerHTML='<div style="padding:18px;color:#ffd0d6;background:#071827">Não foi possível carregar o módulo nativo de Moradores. Volte à Central e tente novamente.</div>';
      setShellOpening('',false);return;
    }
    try{
      window.ConectaMoradoresNativeV1.mount(host,{areaId:selectedAreaId});
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
  link.href='/atendimento-acs-farmaceutico/conecta-profissionais-native-v1.css?v=20260912-task18-profissionais-native-v1';
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
  task16LoadScript('cscModuleCoreTask18','/atendimento-acs-farmaceutico/conecta-module-core-v1.js?v=20260912-task18-profissionais-native-v1',function(){return Boolean(window.ConectaModuleCoreV1)},function(ok){
    if(!ok){finish(false);return}
    task16LoadScript('cscProfissionaisNativeTask18','/atendimento-acs-farmaceutico/conecta-profissionais-native-v1.js?v=20260912-task18-profissionais-native-v1',function(){return Boolean(window.ConectaProfissionaisNativeV1)},finish);
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
  viewer.classList.add('csc-shell-viewer');viewer.hidden=false;host.hidden=false;
  document.body.classList.add('viewer-open');setShellOpening(title||'Profissionais e serviços',true);
  ensureTask18ProfissionaisAssets(function(ok){
    if(shellActiveNative!=='profissionais'||shellActiveRoute!==routeId)return;
    if(!ok){
      host.innerHTML='<div style="padding:18px;color:#ffd0d6;background:#071827">Não foi possível carregar o módulo nativo de Profissionais e serviços. Volte à Central e tente novamente.</div>';
      setShellOpening('',false);return;
    }
    try{window.ConectaProfissionaisNativeV1.mount(host,{areaId:selectedAreaId});setShellOpening('',false)}
    catch(e){
      host.innerHTML='<div style="padding:18px;color:#ffd0d6;background:#071827">O módulo de Profissionais e serviços não pôde ser iniciado sem perder a sessão. Volte à Central e tente novamente.</div>';
      setShellOpening('',false);
    }
  });
  return true;
}
function enhanceShellFrame(frame){
  if(!frame||frame.dataset.shellEnhanced==='1')return;
  frame.dataset.shellEnhanced='1';
  frame.addEventListener('load',function(){
    frame.dataset.shellReady='1';
    try{applyUiStandard(frame.contentDocument)}catch(e){}
    if(shellActiveFrame()===frame)setShellOpening('',false);
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
  var viewer=el('viewer');viewer.classList.add('csc-shell-viewer');viewer.hidden=false;
  frame.hidden=false;document.body.classList.add('viewer-open');
  /* TAREFA_11_RESPOSTA_VISUAL_IMEDIATA_V1:
     o shell responde no mesmo toque; o módulo pode então pintar seu último dado confirmado
     enquanto a consulta remota continua em paralelo. */
  setShellOpening(title||'Painel',frame.dataset.shellReady!=='1');
  /* TAREFA_10_AGENDA_LAZY_VISIBLE_V1:
     módulos ainda não migrados continuam carregando somente depois que o shell está visível. */
  if(frame.dataset.shellLoaded!=='1'){
    frame.dataset.shellLoaded='1';
    var carregar=function(){var url=frame.dataset.shellUrl||'about:blank';if(frame.src!==url)frame.src=url};
    if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(carregar);else setTimeout(carregar,0);
  }
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
function openModule(name,title,options){
  var routeId=moduleRouteId(name,options),url=moduleUrl(name,options);if(!url)return;
  if(name==='portal'){window.open(url,'_blank','noopener');return}
  if(!(token||territoryToken)){
    moduloPendente={name:name,title:title||'Painel',options:moduleRouteOptions(options)};
    setStatus('Central pronta. Confirmando a sessão para carregar os dados deste painel…','warn');
    return;
  }
  moduloPendente=null;publishModuleCore();
  if(name==='agendas'){showNativeAgenda(title||'Agendas e vagas',routeId);return}
  if(name==='moradores'&&moduleRouteOptions(options).view!=='prontuarios'){showNativeMoradores(title||'Moradores',routeId);return}
  if(name==='profissionais'){showNativeProfissionais(title||'Profissionais e serviços',routeId);return}
  var frame=ensureShellFrame(name,url,title||'Painel',routeId);
  showShellFrame(name,frame,title||'Painel',routeId);
}
function closeViewer(){
  var frame=shellActiveFrame();
  if(shellHasUnsaved(frame)&&!window.confirm('Há alterações que podem não ter sido salvas. Deseja voltar à Central mesmo assim?'))return false;
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
  el('viewer').hidden=true;setShellOpening('',false);document.body.classList.remove('viewer-open');
  shellActiveModule='';shellActiveRoute='';shellActiveNative='';
  refreshHealth(false);return true;
}
function loadContext(message){
  post('admin_territorio_dados',session(),'admin_territorio_result',function(r){
    if(!r||r.ok!==true){
      var falhaMsg=text(r&&r.message)||'A leitura do contexto ainda não foi confirmada.';
      var authInvalida=Boolean(r&&r.authRecusada===true);
      if(!authInvalida){
        if(!context)restoreContextCache();
        setStatus('Sessão preservada. Sincronizando os dados em segundo plano…','warn');
        setTimeout(function(){if(!active&&(token||territoryToken))loadContext(message)},1800);
        return;
      }
      if(acessoLocalAberto){bloquearAcessoLocal(acessoLocalAberto,falhaMsg);return}
      resetModuleShell();token='';territoryToken='';mode='';sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);syncAppState();
      el('loginPanel').hidden=false;el('identityPanel').hidden=true;el('healthPanel').hidden=true;el('modulesPanel').hidden=true;
      setStatus(falhaMsg||'A sessão foi recusada pelo servidor. Entre novamente.','warn');return;
    }
    context=r;mode=r.perfil==='TACS'?'tacs':'admin';saveContextCache();
    var pin=pinLocalPendente,scope=pinLocalPerfil||mode;
    pinLocalPendente='';pinLocalPerfil='';acessoLocalAberto='';
    if(pin)guardarAcessoLocal(scope,pin);
    setStatus(message||'Acesso validado.','ok');renderContext(false);
    if(moduloPendente){
      var proximo=moduloPendente;moduloPendente=null;
      setTimeout(function(){openModule(proximo.name,proximo.title,proximo.options)},0);
    }
  });
}
var logoutEmCurso=false;
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
  var lastMode=mode||'admin',hasSession=Boolean(token||territoryToken);
  var action=lastMode==='tacs'?'admin_territorio_encerrar_sessao':'admin_logout';
  var payload=hasSession?session():null;

  /* LOGOFF_IMEDIATO_V1:
     o primeiro toque encerra a autenticação local imediatamente.
     A confirmação remota não bloqueia a interface nem exige segundo toque. */
  cancelarOperacaoAtivaSemCallback();
  resetModuleShell();
  token='';territoryToken='';mode='';context=null;acessoLocalAberto='';moduloPendente=null;
  sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);
  syncAppState();
  /* LOGOFF_PRESERVA_CACHE_V2: área, aparelho e caches por perfil permanecem intactos. */
  el('identityPanel').hidden=true;el('healthPanel').hidden=true;el('modulesPanel').hidden=true;
  el('loginPanel').hidden=false;showLogin(lastMode==='tacs'?'tacs':'admin');
  setStatus('Sessão encerrada. Seus dados locais foram preservados para o próximo acesso.','ok');
  window.scrollTo({top:0,behavior:'auto'});

  /* LOGOFF_SEGURO_PIN_LOCAL_V3: preserva somente contexto local cifrado.
     A sessão remota anterior é invalidada sem bloquear a interface. */
  if(hasSession&&payload)invalidarSessaoServidorEmSegundoPlano(action,payload);
  setTimeout(function(){logoutEmCurso=false},250);
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
    '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html'
  ].forEach(function(url){
    try{fetch(url+'?v=20260910-login-prefetch-v2',{method:'GET',cache:'force-cache',credentials:'same-origin',priority:'low'}).catch(function(){})}catch(e){}
  });
}
['adminPin','tacsPin'].forEach(function(id){var input=el(id);if(!input)return;input.addEventListener('focus',aquecerValidacaoPin,{once:true});input.addEventListener('input',aquecerValidacaoPin,{once:true})});
window.addEventListener('load',function(){if('requestIdleCallback' in window)requestIdleCallback(prefetchStaticPanels,{timeout:3000});else setTimeout(prefetchStaticPanels,2500)},{once:true});
el('tabAdmin').addEventListener('click',function(){if(!TACS_ONLY)showLogin('admin')});el('tabTacs').addEventListener('click',function(){showLogin('tacs')});
el('loginAdmin').addEventListener('click',function(){
  var pin=digits(el('adminPin').value);
  if(!/^\d{4,8}$/.test(pin)){setStatus('Digite um PIN administrativo de 4 a 8 números.','err');return}
  setStatus('Liberando o acesso…','warn');
  abrirAcessoLocal('admin',pin).then(function(saved){
    if(saved)aplicarAcessoLocal('admin',saved);
    var tentativa=0;
    function sincronizar(){
      tentativa++;
      post('admin_login',{pin:pin,dispositivo:device},'admin_result',function(r){
        if(!r||r.ok!==true||!r.token){
          if(r&&r.temporario===true&&tentativa<2){
            setStatus('Central aberta. Confirmando a sessão para carregar os painéis…','warn');
            setTimeout(sincronizar,700);
            return;
          }
          el('adminPin').value='';
          if(saved&&r&&r.temporario===true){setStatus('Central aberta localmente. A sessão de dados ainda não foi confirmada; os painéis permanecem protegidos até a sincronização.','warn');return}
          if(saved){bloquearAcessoLocal('admin',text(r&&r.message)||'Acesso administrativo recusado.');return}
          setStatus(text(r&&r.message)||'Acesso recusado.','err');return;
        }
        el('adminPin').value='';
        territoryToken='';sessionStorage.removeItem(TERRITORY_TOKEN_KEY);token=r.token;mode='admin';sessionStorage.setItem(TOKEN_KEY,token);syncAppState();
        pinLocalPendente=pin;pinLocalPerfil='admin';
        if(window.ConectaAcessoUnificado&&typeof window.ConectaAcessoUnificado.registrarAparelho==='function')window.ConectaAcessoUnificado.registrarAparelho('ADMIN');
        if(!saved)restoreContextCache();
        loadContext(saved?'Administrador sincronizado.':'Administrador validado.');
      });
    }
    sincronizar();
  });
});
el('loginTacs').addEventListener('click',function(){
  var pin=digits(el('tacsPin').value);
  if(!/^\d{4,8}$/.test(pin)){setStatus('Informe o PIN individual de 4 a 8 números.','err');return}
  setStatus('Liberando o acesso…','warn');
  abrirAcessoLocal('tacs',pin).then(function(saved){
    if(saved)aplicarAcessoLocal('tacs',saved);
    var tentativa=0;
    function sincronizar(){
      tentativa++;
      post('admin_territorio_login_pin',{pin:pin,dispositivo:device},'admin_territorio_result',function(r){
        if(!r||r.ok!==true||!r.token){
          if(r&&r.temporario===true&&tentativa<2){
            setStatus('Área TACS aberta. Confirmando a sessão para carregar os painéis…','warn');
            setTimeout(sincronizar,700);
            return;
          }
          el('tacsPin').value='';
          if(saved&&r&&r.temporario===true){setStatus('Área TACS aberta localmente. A sessão de dados ainda não foi confirmada; os painéis permanecem protegidos até a sincronização.','warn');return}
          if(saved){bloquearAcessoLocal('tacs',text(r&&r.message)||'Acesso TACS recusado.');return}
          setStatus(text(r&&r.message)||'Acesso recusado.','err');return;
        }
        el('tacsPin').value='';
        token='';sessionStorage.removeItem(TOKEN_KEY);territoryToken=r.token;mode='tacs';selectedAreaId=normArea(r.areaId);sessionStorage.setItem(TERRITORY_TOKEN_KEY,territoryToken);syncAppState();
        pinLocalPendente=pin;pinLocalPerfil='tacs';
        if(window.ConectaAcessoUnificado&&typeof window.ConectaAcessoUnificado.registrarAparelho==='function')window.ConectaAcessoUnificado.registrarAparelho('TACS');
        if(!saved)restoreContextCache();
        loadContext(saved?'Acesso TACS sincronizado.':'Acesso individual validado para '+(text(r.areaNome)||r.areaId)+'.');
      });
    }
    sincronizar();
  });
});
el('adminArea').addEventListener('change',function(){if(mode!=='admin')return;resetModuleShell();selectedAreaId=normArea(this.value);try{localStorage.setItem(AREA_KEY,selectedAreaId)}catch(e){}publishModuleCore();renderContext()});el('refreshHealth').addEventListener('click',function(){refreshHealth(true)});el('logout').addEventListener('click',logout);el('viewerBack').addEventListener('click',closeViewer);
el('viewerFrame').addEventListener('load',function(){try{applyUiStandard(el('viewerFrame').contentDocument)}catch(e){}});
el('moduleGrid').addEventListener('click',function(e){var btn=e.target.closest('.module');if(!btn||btn.disabled||btn.hidden)return;openModule(btn.dataset.module,btn.querySelector('strong').textContent)});
/* CENTRAL_RETURN_R6: restaura imediatamente o conteúdo ao voltar pelo histórico/BFCache do iPhone. */
window.addEventListener('pageshow',function(){
  token=TACS_ONLY?'':(sessionStorage.getItem(TOKEN_KEY)||'');
  territoryToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'';
  mode=territoryToken?'tacs':(token?'admin':'');
  document.body.classList.remove('viewer-open');
  var viewer=el('viewer');if(viewer)viewer.hidden=true;
  shellActiveModule='';
  if(token||territoryToken){
    if(context)renderContext(true);
    else restoreContextCache();
    setTimeout(function(){if(!active)loadContext('Sessão existente validada.')},140);
  }
});
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
if(token||territoryToken){
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
