(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',AREA_KEY='portalTacsCentralAreaV1',CONTEXT_CACHE_KEY='portalTacsCentralContextCacheV3';
var SHARED_WARM_KEY='portalTacsAppsScriptWarmAtV1';
var HEALTH_REFRESH_TTL=30000,healthRefreshInFlight=false,lastHealthRefreshAt=0,lastHealthRefreshArea='';
var HEALTH_CACHE_PREFIX='portalTacsHealthSnapshotV2:',HEALTH_CACHE_MAX_AGE=7*24*60*60*1000;
var NOTIFICATION_CONFIRMED_CACHE_PREFIX='portalTacsNotificationConfirmedV1:',notificationRemoteSeq=0,notificationRemoteArea='',notificationLatestStarted={};
var URL_PARAMS=new URLSearchParams(location.search),TACS_ONLY=String(URL_PARAMS.get('acesso')||'').toLowerCase()==='tacs';
var token=TACS_ONLY?'':(sessionStorage.getItem(TOKEN_KEY)||''),territoryToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',device=localStorage.getItem(DEVICE_KEY)||'';
var mode=territoryToken?'tacs':(token?'admin':''),active=null,context=null,selectedAreaId='',pinLocalPendente='',pinLocalPerfil='',acessoLocalAberto='',moduloPendente=null,pendingAdminIdentity=null;
if(!device){device='iphone-'+Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem(DEVICE_KEY,device)}
function el(id){return document.getElementById(id)}
function text(v){return String(v==null?'':v).trim()}
function esc(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function digits(v){return text(v).replace(/\D/g,'')}
function setStatus(msg,type){var n=el('loginStatus');n.textContent=msg;n.className='status'+(type?' '+type:'')}
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
  var finalResult=result||{ok:false,message:'Resposta vazia.'};
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
  if(active){cb({ok:false,message:'Aguarde a operação anterior.'});return}
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
    /* LOGIN_TRANSPORTE_R8: a resposta direta por postMessage é a via principal.
       O polling só entra como fallback tardio, evitando dezenas de chamadas paralelas ao Apps Script. */
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
function showLogin(kind){var admin=!TACS_ONLY&&kind==='admin';el('adminLogin').hidden=!admin;el('tacsLogin').hidden=admin;el('tabAdmin').hidden=TACS_ONLY;el('tabAdmin').classList.toggle('active',admin);el('tabTacs').classList.toggle('active',!admin);el('tabTacs').parentNode.style.gridTemplateColumns=TACS_ONLY?'1fr':'1fr 1fr';if(TACS_ONLY)setStatus('Entre como TACS da sua área.','')}
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
  renderContext(true);
  setStatus('Acesso liberado. Confirmando a sessão atual em segundo plano…','ok');
  return true;
}
function removerAcessoLocal(scope){
  var api=pinLocalApi();if(api&&typeof api.remover==='function')api.remover(scope);
}
function bloquearAcessoLocal(scope,message){
  removerAcessoLocal(scope);
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
  ADMIN_TACS_MORADOR:'Administrador + TACS + Morador',
  ADMIN_TACS:'Administrador + TACS',
  ADMIN_MORADOR:'Administrador + Morador',
  TACS_MORADOR:'TACS + Morador',
  TACS:'TACS',
  ADMIN:'Administrador',
  ADMIN_GERAL:'Administrador'
};
function accessProfileLabel(value){
  var key=text(value).toUpperCase().replace(/[+\s-]+/g,'_');
  return ACCESS_PROFILE_LABELS[key]||((key.indexOf('TACS')!==-1)?'TACS':'Administrador');
}
function identityFrom(value,perfilPadrao){
  value=value&&typeof value==='object'?value:{};
  var nome=text(value.nomeCompleto||value.nome||value.operadorNome||value.usuarioNome||value.displayName);
  if(!nome||/^(ADMIN_GERAL|ADMINISTRADOR GERAL|ADMINISTRAÇÃO GERAL|AG\d+)$/i.test(nome))return null;
  return {nomeCompleto:nome,perfil:text(value.perfil||value.tipo||perfilPadrao||'ADMIN'),ativo:value.ativo!==false};
}
function rememberAdminIdentity(value){
  var id=identityFrom(value,'ADMIN');if(id)pendingAdminIdentity=id;
  return id;
}
function currentAdministrator(){
  var atual=context&&context.administradorAtual;
  if(atual&&text(atual.nomeCompleto))return atual;
  var autenticada=context&&context.identidadeAutenticada;
  if(autenticada&&text(autenticada.nomeCompleto))return autenticada;
  if(pendingAdminIdentity&&text(pendingAdminIdentity.nomeCompleto))return pendingAdminIdentity;
  var lista=context&&Array.isArray(context.administradores)?context.administradores.filter(function(a){return a&&a.ativo!==false&&text(a.nomeCompleto)}):[];
  return lista.length===1?lista[0]:null;
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
    node.innerHTML='<small>Olá, '+esc(nome)+'</small><h1>'+esc(perfil)+'</h1><p>Acesso atual: TACS da área • '+esc(areaNome)+'.</p>';
    return;
  }
  var admin=currentAdministrator();
  var adminNome=text(admin&&admin.nomeCompleto)||'Administrador';
  var adminPerfil=accessProfileLabel(admin&&admin.perfil||context&&context.perfil||'ADMIN');
  node.innerHTML='<small>Olá, '+esc(adminNome)+'</small><h1>'+esc(adminPerfil)+'</h1><p>Gestão administrativa da área selecionada.</p>';
}
function renderContext(skipHealth){
  var areas=context&&Array.isArray(context.areas)?context.areas.filter(function(a){return a&&a.ativa!==false}):[];
  if(!areas.length){setStatus('Nenhuma área ativa foi devolvida pelo servidor.','err');return}
  var stored='';try{stored=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}
  if(mode==='tacs')selectedAreaId=normArea(areas[0].areaId);
  else if(!selectedAreaId)selectedAreaId=areas.some(function(a){return normArea(a.areaId)===stored})?stored:(areas.some(function(a){return normArea(a.areaId)==='JAPARANDUBA'})?'JAPARANDUBA':normArea(areas[0].areaId));
  var area=selectedArea(),tacs=responsible(area),admin=currentAdministrator(),profileIcon=el('profileIcon');
  if(profileIcon)profileIcon.src='/atendimento-acs-farmaceutico/icons/central-admin-saude-512.png?v=20260818-icone-central-todos-v2';
  var perfilAtual=mode==='tacs'?accessProfileLabel(tacs&&tacs.perfil||'TACS'):accessProfileLabel(admin&&admin.perfil||context&&context.perfil||'ADMIN');
  el('profileLabel').textContent=perfilAtual;
  el('professionalName').textContent=mode==='tacs'?(text(tacs&&tacs.nomeCompleto)||'TACS'):(text(admin&&admin.nomeCompleto)||'Administrador');
  el('areaName').textContent=text(area&&area.areaNome)||selectedAreaId;
  el('unitName').textContent=text(area&&area.unidadeNome)||text(area&&area.unidadeId)||'Unidade não informada';
  updateCentralWelcome(area,tacs);
  el('identityPanel').hidden=false;el('healthPanel').hidden=false;el('modulesPanel').hidden=false;el('loginPanel').hidden=true;
  var box=el('adminAreaBox'),select=el('adminArea');box.hidden=mode!=='admin'||areas.length<2;
  select.innerHTML=areas.map(function(a){return'<option value="'+esc(normArea(a.areaId))+'">'+esc(text(a.areaNome)||a.areaId)+'</option>'}).join('');select.value=selectedAreaId;
  renderModules();
  renderHealthSnapshot(selectedAreaId);
  if(!skipHealth)refreshHealth();
}
function renderModules(){document.querySelectorAll('.module').forEach(function(btn){var adminOnly=btn.dataset.adminOnly==='true',perm=btn.dataset.permission||'',allowed=!adminOnly||mode==='admin';if(perm)allowed=allowed&&permission(perm);if(btn.dataset.module==='portal')allowed=true;btn.hidden=!allowed;btn.classList.toggle('locked',!allowed);btn.disabled=!allowed})}
function healthCacheKey(areaId){return HEALTH_CACHE_PREFIX+normArea(areaId)}
function readHealthSnapshot(areaId){
  try{
    var raw=localStorage.getItem(healthCacheKey(areaId));if(!raw)return null;
    var saved=JSON.parse(raw),age=Date.now()-Number(saved&&saved.savedAt||0);
    if(!saved||!saved.cards||age<0||age>HEALTH_CACHE_MAX_AGE)return null;
    return saved;
  }catch(e){return null}
}
function saveHealthValue(areaId,id,label,state){
  areaId=normArea(areaId);if(!areaId||!id||!label)return;
  try{
    var saved=readHealthSnapshot(areaId)||{areaId:areaId,cards:{},savedAt:0};
    saved.cards[id]={label:text(label),state:text(state),confirmedAt:Date.now()};
    saved.savedAt=Date.now();
    localStorage.setItem(healthCacheKey(areaId),JSON.stringify(saved));
  }catch(e){}
}
function renderHealthSnapshot(areaId){
  var saved=readHealthSnapshot(areaId);if(!saved||!saved.cards)return false;
  Object.keys(saved.cards).forEach(function(id){
    var card=saved.cards[id];if(card&&el(id))markHealth(id,card.label,card.state);
  });
  var stamp=el('healthUpdated');
  if(stamp)stamp.textContent='Última leitura confirmada exibida • sincronizando em segundo plano';
  return true;
}
function hasHealthValue(areaId,id){var s=readHealthSnapshot(areaId);return Boolean(s&&s.cards&&s.cards[id])}
function markHealth(id,label,state){var n=el(id);if(!n)return;var s=n.querySelector('span');n.className='health-card'+(state?' '+state:'');if(s)s.textContent=label}
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
  var c=confirmed.contagens,label=c.ativos+' aptos • '+c.inativos+' inativos • '+c.reparo+' reparo',state=(c.inativos||c.reparo)?'warn':'ok';
  markHealth('healthNotifications',label,state);saveHealthValue(areaId,'healthNotifications',label,state);
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
function refreshNotificationHealth(areaId,force){
  areaId=normArea(areaId);
  if(!permission('PUBLICACOES_GERENCIAR')){markHealth('healthNotifications','Sem permissão','warn');return}
  var cached=readConfirmedNotification(areaId);
  if(cached)renderConfirmedNotification(cached,areaId);
  if(notificationRemoteArea===areaId&&!force)return;
  notificationRemoteArea=areaId;
  if(!cached&&!hasHealthValue(areaId,'healthNotifications'))markHealth('healthNotifications','Confirmando…','');
  notificationPostIsolated('admin_notificacoes_saude_remota',areaId,function(remote,seq){
    if(seq!==notificationLatestStarted[areaId])return;
    if(notificationRemoteArea===areaId)notificationRemoteArea='';
    var confirmed=saveConfirmedNotification(remote,areaId);
    if(confirmed){renderConfirmedNotification(confirmed,areaId);return}
    if(areaId!==selectedAreaId)return;
    if(!cached&&!hasHealthValue(areaId,'healthNotifications'))markHealth('healthNotifications','Sem confirmação','warn');
  });
}
function isolatedPost(action,payload,resultAction,cb,timeoutMs){
  var id=requestId(action),body=new URLSearchParams(),started=Date.now(),finished=false;
  Object.keys(payload||{}).forEach(function(k){body.set(k,payload[k]==null?'':String(payload[k]))});
  body.set('action',action);body.set('requestId',id);
  function finish(result){if(finished)return;finished=true;cb(result||{ok:false,temporario:true})}
  function pollResult(){
    if(finished)return;
    jsonp(resultAction,{requestId:id},function(r){
      if(finished)return;
      if(r&&r.ok===true&&r.pendente===false){finish(r.result);return}
      if(Date.now()-started>=Number(timeoutMs||12000)){finish({ok:false,temporario:true});return}
      setTimeout(pollResult,700);
    });
  }
  try{
    fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){});
    setTimeout(pollResult,320);
  }catch(e){finish({ok:false,temporario:true})}
}
function refreshHealth(force){
  if(!context)return;
  var areaId=selectedAreaId,now=Date.now(),hadCache=renderHealthSnapshot(areaId);
  if(healthRefreshInFlight)return;
  if(!force&&lastHealthRefreshArea===areaId&&now-lastHealthRefreshAt<HEALTH_REFRESH_TTL){refreshNotificationHealth(areaId,false);return}
  healthRefreshInFlight=true;lastHealthRefreshArea=areaId;lastHealthRefreshAt=now;
  ['healthPortal','healthResidents','healthAgenda','healthContent'].forEach(function(id){if(!hasHealthValue(areaId,id))markHealth(id,'Verificando…','')});
  refreshNotificationHealth(areaId,Boolean(force));
  var area=selectedArea(),areaLabel=(text(area&&area.areaNome)||areaId)+' • '+(text(area&&area.unidadeNome)||text(area&&area.unidadeId)||'unidade');
  markHealth('healthArea',areaLabel,'ok');saveHealthValue(areaId,'healthArea',areaLabel,'ok');
  var pending=4;
  function done(){pending--;if(pending<=0){healthRefreshInFlight=false;var stamp=el('healthUpdated');if(stamp)stamp.textContent='Dados confirmados atualizados • área '+(text(area&&area.areaNome)||areaId)}}
  function keepOrFallback(id,label,state){if(!hasHealthValue(areaId,id))markHealth(id,label,state)}
  jsonp('portal_manutencao_status',{areaId:areaId},function(r){
    if(normArea(areaId)!==selectedAreaId){done();return}
    if(r&&r.ok===true){var label=r.ativa?'Em manutenção':'Disponível',state=r.ativa?'warn':'ok';markHealth('healthPortal',label,state);saveHealthValue(areaId,'healthPortal',label,state)}
    else keepOrFallback('healthPortal','Sem confirmação','warn');done();
  });
  isolatedPost('admin_moradores_status',session({areaId:areaId}),'admin_moradores_result',function(r){
    if(normArea(areaId)===selectedAreaId){
      if(r&&r.ok===true){markHealth('healthResidents','Base acessível','ok');saveHealthValue(areaId,'healthResidents','Base acessível','ok')}
      else keepOrFallback('healthResidents','Sem confirmação','warn');
    }done();
  },12000);
  jsonp('painel_publico',{areaId:areaId},function(r){
    if(normArea(areaId)===selectedAreaId){
      if(r&&r.ok===true){markHealth('healthAgenda','Agenda pública acessível','ok');saveHealthValue(areaId,'healthAgenda','Agenda pública acessível','ok')}
      else keepOrFallback('healthAgenda','Sem confirmação','warn');
    }done();
  });
  jsonp('publico_conteudo',{areaId:areaId},function(r){
    if(normArea(areaId)===selectedAreaId){
      if(r&&r.ok===true){markHealth('healthContent','Conteúdo acessível','ok');saveHealthValue(areaId,'healthContent','Conteúdo acessível','ok')}
      else keepOrFallback('healthContent','Sem confirmação','warn');
    }done();
  });
  var stamp=el('healthUpdated');if(stamp)stamp.textContent=hadCache?'Última leitura confirmada exibida • atualizando em segundo plano':'Atualizando dados validados • área '+(text(area&&area.areaNome)||areaId);
  setTimeout(function(){healthRefreshInFlight=false},12000);
}
function moduleUrl(name){var area=encodeURIComponent(selectedAreaId),tacsOnly=mode==='tacs'||TACS_ONLY,access=tacsOnly?'&acesso=tacs':'',revision='20260823-recados-safari-render-v1';if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+access+'&v='+revision;if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v='+revision;if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+'&v='+revision;if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+access+'&v='+revision;if(name==='territorio')return '/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html?v='+revision;if(name==='municipios')return '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html?v='+revision;if(name==='portal')return '/atendimento-acs-farmaceutico/?area='+area;return ''}
function openModule(name,title){
  var url=moduleUrl(name);if(!url)return;
  if(name==='portal'){window.open(url,'_blank','noopener');return}
  if(acessoLocalAberto&&!(token||territoryToken)){
    moduloPendente={name:name,title:title||'Painel'};
    setStatus('Central aberta. Confirmando a sessão atual para liberar este painel…','warn');
    return;
  }
  moduloPendente=null;
  var sep=url.indexOf('?')===-1?'?':'&';
  /* AGENDA_DIRECT_NAV_V1: evita o iframe oculto e o travamento observado no iPhone; o retorno usa from=central. */
  if(name==='agendas'){location.assign(url+sep+'from=central&_cb='+Date.now());return}
  url=url+sep+'_cb='+Date.now();el('viewerTitle').textContent=title||'Painel';el('viewerFrame').src=url;el('viewer').hidden=false;document.body.classList.add('viewer-open')
}
function closeViewer(){el('viewer').hidden=true;el('viewerFrame').src='about:blank';document.body.classList.remove('viewer-open');refreshHealth()}
function loadContext(message){
  post('admin_territorio_dados',session(),'admin_territorio_result',function(r){
    if(!r||r.ok!==true){
      if(acessoLocalAberto&&r&&r.temporario===true){setStatus('Painéis locais disponíveis. A sincronização continuará quando o servidor responder.','warn');return}
      if(acessoLocalAberto){bloquearAcessoLocal(acessoLocalAberto,text(r&&r.message)||'O servidor recusou a sessão deste perfil.');return}
      token='';territoryToken='';mode='';sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);
      el('loginPanel').hidden=false;el('identityPanel').hidden=true;el('healthPanel').hidden=true;el('modulesPanel').hidden=true;
      setStatus(text(r&&r.message)||'A sessão não pôde ser reutilizada. Entre novamente.','warn');return;
    }
    if(mode==='admin'&&!r.administradorAtual&&pendingAdminIdentity){r.administradorAtual=pendingAdminIdentity;r.identidadeAutenticada=pendingAdminIdentity}
    context=r;mode=r.perfil==='TACS'?'tacs':'admin';saveContextCache();
    var pin=pinLocalPendente,scope=pinLocalPerfil||mode;
    pinLocalPendente='';pinLocalPerfil='';acessoLocalAberto='';
    if(pin)guardarAcessoLocal(scope,pin);
    setStatus(message||'Acesso validado.','ok');renderContext(false);
    if(moduloPendente){
      var proximo=moduloPendente;moduloPendente=null;
      setTimeout(function(){openModule(proximo.name,proximo.title)},0);
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
  token='';territoryToken='';mode='';context=null;
  sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);
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
/* PREPARACAO_CONTINUA_V1: a tela de PIN aparece primeiro; logo após o primeiro paint,
   o app aquece servidor, arquivos estáticos e leituras públicas sem bloquear Safari. */
var staticPrefetchStarted=false,publicHealthPrefetchStarted=false;
function prefetchStaticPanels(){
  if(staticPrefetchStarted)return;
  staticPrefetchStarted=true;
  [
    '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html',
    '/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html',
    '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html',
    '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html',
    '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html'
  ].forEach(function(url){
    try{fetch(url+'?v=20260911-performance-continuo-v1',{method:'GET',cache:'force-cache',credentials:'same-origin',priority:'low'}).catch(function(){})}catch(e){}
  });
}
function prefetchPublicHealth(){
  if(publicHealthPrefetchStarted)return;publicHealthPrefetchStarted=true;
  var areaId='';try{areaId=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}
  if(!areaId)return;
  jsonp('portal_manutencao_status',{areaId:areaId},function(r){if(r&&r.ok===true){var label=r.ativa?'Em manutenção':'Disponível',state=r.ativa?'warn':'ok';saveHealthValue(areaId,'healthPortal',label,state)}});
  jsonp('painel_publico',{areaId:areaId},function(r){if(r&&r.ok===true)saveHealthValue(areaId,'healthAgenda','Agenda pública acessível','ok')});
  jsonp('publico_conteudo',{areaId:areaId},function(r){if(r&&r.ok===true)saveHealthValue(areaId,'healthContent','Conteúdo acessível','ok')});
}
function startEarlyPreparation(){
  var warm=window.PortalTacsAdminWarmup;
  if(warm&&typeof warm.preaquecer==='function')warm.preaquecer();
  else try{fetch(API+'?action=admin_status&_='+Date.now(),{method:'GET',mode:'no-cors',cache:'no-store'}).catch(function(){})}catch(e){}
  prefetchStaticPanels();prefetchPublicHealth();
}
function scheduleEarlyPreparation(){
  var start=function(){setTimeout(startEarlyPreparation,0)};
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(function(){requestAnimationFrame(start)});
  else setTimeout(start,30);
}
['adminPin','tacsPin'].forEach(function(id){var input=el(id);if(!input)return;input.addEventListener('focus',aquecerValidacaoPin,{once:true});input.addEventListener('input',aquecerValidacaoPin,{once:true})});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleEarlyPreparation,{once:true});else scheduleEarlyPreparation();
el('tabAdmin').addEventListener('click',function(){if(!TACS_ONLY)showLogin('admin')});el('tabTacs').addEventListener('click',function(){showLogin('tacs')});
el('loginAdmin').addEventListener('click',function(){
  var pin=digits(el('adminPin').value);
  if(!/^\d{4,8}$/.test(pin)){setStatus('Digite um PIN administrativo de 4 a 8 números.','err');return}
  setStatus('Liberando o acesso…','warn');
  abrirAcessoLocal('admin',pin).then(function(saved){
    if(saved)aplicarAcessoLocal('admin',saved);
    post('admin_login',{pin:pin,dispositivo:device},'admin_result',function(r){
      el('adminPin').value='';
      if(!r||r.ok!==true||!r.token){
        if(saved&&r&&r.temporario===true){setStatus('Central aberta com os dados locais. O servidor ainda está sincronizando.','warn');return}
        if(saved){bloquearAcessoLocal('admin',text(r&&r.message)||'Acesso administrativo recusado.');return}
        setStatus(text(r&&r.message)||'Acesso recusado.','err');return;
      }
      territoryToken='';sessionStorage.removeItem(TERRITORY_TOKEN_KEY);token=r.token;mode='admin';sessionStorage.setItem(TOKEN_KEY,token);
      rememberAdminIdentity(r);
      pinLocalPendente=pin;pinLocalPerfil='admin';
      if(window.ConectaAcessoUnificado&&typeof window.ConectaAcessoUnificado.registrarAparelho==='function')window.ConectaAcessoUnificado.registrarAparelho('ADMIN');
      if(!saved)restoreContextCache();
      loadContext(saved?'Administrador sincronizado.':'Administrador validado.');
    });
  });
});
el('loginTacs').addEventListener('click',function(){
  var pin=digits(el('tacsPin').value);
  if(!/^\d{4,8}$/.test(pin)){setStatus('Informe o PIN individual de 4 a 8 números.','err');return}
  setStatus('Liberando o acesso…','warn');
  abrirAcessoLocal('tacs',pin).then(function(saved){
    if(saved)aplicarAcessoLocal('tacs',saved);
    post('admin_territorio_login_pin',{pin:pin,dispositivo:device},'admin_territorio_result',function(r){
      el('tacsPin').value='';
      if(!r||r.ok!==true||!r.token){
        if(saved&&r&&r.temporario===true){setStatus('Área TACS aberta com os dados locais. O servidor ainda está sincronizando.','warn');return}
        if(saved){bloquearAcessoLocal('tacs',text(r&&r.message)||'Acesso TACS recusado.');return}
        setStatus(text(r&&r.message)||'Acesso recusado.','err');return;
      }
      token='';sessionStorage.removeItem(TOKEN_KEY);territoryToken=r.token;mode='tacs';selectedAreaId=normArea(r.areaId);sessionStorage.setItem(TERRITORY_TOKEN_KEY,territoryToken);
      pinLocalPendente=pin;pinLocalPerfil='tacs';
      if(window.ConectaAcessoUnificado&&typeof window.ConectaAcessoUnificado.registrarAparelho==='function')window.ConectaAcessoUnificado.registrarAparelho('TACS');
      if(!saved)restoreContextCache();
      loadContext(saved?'Acesso TACS sincronizado.':'Acesso individual validado para '+(text(r.areaNome)||r.areaId)+'.');
    });
  });
});
el('adminArea').addEventListener('change',function(){if(mode!=='admin')return;selectedAreaId=normArea(this.value);try{localStorage.setItem(AREA_KEY,selectedAreaId)}catch(e){}renderContext()});el('refreshHealth').addEventListener('click',function(){refreshHealth(true)});el('logout').addEventListener('click',logout);el('viewerBack').addEventListener('click',closeViewer);
el('viewerFrame').addEventListener('load',function(){try{applyUiStandard(el('viewerFrame').contentDocument)}catch(e){}});
el('moduleGrid').addEventListener('click',function(e){var btn=e.target.closest('.module');if(!btn||btn.disabled||btn.hidden)return;openModule(btn.dataset.module,btn.querySelector('strong').textContent)});
/* CENTRAL_RETURN_R6: restaura imediatamente o conteúdo ao voltar pelo histórico/BFCache do iPhone. */
window.addEventListener('pageshow',function(){
  token=TACS_ONLY?'':(sessionStorage.getItem(TOKEN_KEY)||'');
  territoryToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'';
  mode=territoryToken?'tacs':(token?'admin':'');
  document.body.classList.remove('viewer-open');
  var viewer=el('viewer');if(viewer)viewer.hidden=true;
  var frame=el('viewerFrame');if(frame&&frame.src!=='about:blank')frame.src='about:blank';
  if(token||territoryToken){
    if(context)renderContext(true);
    else restoreContextCache();
    setTimeout(function(){if(!active)loadContext('Sessão existente validada.')},140);
  }
});
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
