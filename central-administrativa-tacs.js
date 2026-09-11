(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1',AREA_KEY='portalTacsCentralAreaV1',CONTEXT_CACHE_KEY='portalTacsCentralContextCacheV3';
var SHARED_WARM_KEY='portalTacsAppsScriptWarmAtV1';
var HEALTH_REFRESH_TTL=30000,healthRefreshInFlight=false,lastHealthRefreshAt=0,lastHealthRefreshArea='';
var NOTIFICATION_CONFIRMED_CACHE_PREFIX='portalTacsNotificationConfirmedV1:',notificationRemoteSeq=0,notificationRemoteArea='',notificationLatestStarted={};
var URL_PARAMS=new URLSearchParams(location.search),TACS_ONLY=String(URL_PARAMS.get('acesso')||'').toLowerCase()==='tacs';
var token=TACS_ONLY?'':(sessionStorage.getItem(TOKEN_KEY)||''),territoryToken=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',device=localStorage.getItem(DEVICE_KEY)||'';
var mode=territoryToken?'tacs':(token?'admin':''),active=null,context=null,selectedAreaId='';
if(!device){device='iphone-'+Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem(DEVICE_KEY,device)}
function el(id){return document.getElementById(id)}
function text(v){return String(v==null?'':v).trim()}
function esc(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function digits(v){return text(v).replace(/\D/g,'')}
function setStatus(msg,type){var n=el('loginStatus');n.textContent=msg;n.className='status'+(type?' '+type:'')}
function requestId(prefix){return 'central_'+prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
function marcarConexaoRecente(){try{localStorage.setItem(SHARED_WARM_KEY,String(Date.now()))}catch(e){}}
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
function finishPost(result){if(!active)return;var op=active;active=null;clearTimeout(op.timeout);clearTimeout(op.pollTimer);if(op.form&&op.form.parentNode)op.form.remove();if(op.frame&&op.frame.parentNode)setTimeout(function(){if(op.frame.parentNode)op.frame.remove()},150);var finalResult=result||{ok:false,message:'Resposta vazia.'};if(finalResult&&finalResult.ok===true)marcarConexaoRecente();op.cb(finalResult)}
window.addEventListener('message',function(event){if(!active||!active.frame||event.source!==active.frame.contentWindow)return;var d=event.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(e){return}}if(!d||typeof d!=='object')return;var rid=text(d.requestId||(d.result&&d.result.requestId));if(rid&&rid!==active.id)return;var r=Object.prototype.hasOwnProperty.call(d,'result')?d.result:(Object.prototype.hasOwnProperty.call(d,'payload')?d.payload:(Object.prototype.hasOwnProperty.call(d,'ok')?d:null));if(r)finishPost(r)});
function poll(){if(!active)return;var op=active;jsonp(op.resultAction,{requestId:op.id},function(r){if(!active||active.id!==op.id)return;if(r&&r.ok===true&&r.pendente===false){finishPost(r.result);return}op.pollTimer=setTimeout(poll,900)})}
function post(action,payload,resultAction,cb){if(active){cb({ok:false,message:'Aguarde a operação anterior.'});return}var rid=requestId(action),frame=document.createElement('iframe'),form=document.createElement('form'),frameName='centralFrame'+Date.now()+Math.floor(Math.random()*1000),fields={};Object.keys(payload||{}).forEach(function(k){fields[k]=payload[k]});fields.action=action;fields.requestId=rid;frame.name=frameName;frame.src='about:blank';frame.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';form.method='POST';form.action=API+'?_='+Date.now();form.target=frameName;form.style.display='none';Object.keys(fields).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(fields[k]==null?'':fields[k]);form.appendChild(i)});active={id:rid,frame:frame,form:form,resultAction:resultAction,cb:cb,pollTimer:null,timeout:setTimeout(function(){finishPost({ok:false,message:'O servidor demorou para confirmar a operação.'})},45000)};document.body.appendChild(frame);document.body.appendChild(form);var sent=false;function send(){if(sent||!active||active.id!==rid)return;sent=true;try{form.submit()}catch(e){finishPost({ok:false,message:'Não foi possível iniciar a comunicação.'});return}active.pollTimer=setTimeout(poll,650)}frame.addEventListener('load',send,{once:true});setTimeout(send,120)}
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
function renderContext(skipHealth){var areas=context&&Array.isArray(context.areas)?context.areas.filter(function(a){return a&&a.ativa!==false}):[];if(!areas.length){setStatus('Nenhuma área ativa foi devolvida pelo servidor.','err');return}var stored='';try{stored=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}if(mode==='tacs')selectedAreaId=normArea(areas[0].areaId);else if(!selectedAreaId){selectedAreaId=areas.some(function(a){return normArea(a.areaId)===stored})?stored:(areas.some(function(a){return normArea(a.areaId)==='JAPARANDUBA'})?'JAPARANDUBA':normArea(areas[0].areaId))}var area=selectedArea(),tacs=responsible(area);var profileIcon=el('profileIcon');if(profileIcon){profileIcon.src='/atendimento-acs-farmaceutico/icons/central-admin-saude-512.png?v=20260818-icone-central-todos-v2';}el('profileLabel').textContent=mode==='tacs'?'TACS • acesso da própria área':'ADMINISTRADOR GERAL';el('professionalName').textContent=text(tacs&&tacs.nomeCompleto)||(mode==='admin'?'Administração geral':'TACS');el('areaName').textContent=text(area&&area.areaNome)||selectedAreaId;el('unitName').textContent=text(area&&area.unidadeNome)||text(area&&area.unidadeId)||'Unidade não informada';el('identityPanel').hidden=false;el('healthPanel').hidden=false;el('modulesPanel').hidden=false;el('loginPanel').hidden=true;var box=el('adminAreaBox'),select=el('adminArea');box.hidden=mode!=='admin'||areas.length<2;select.innerHTML=areas.map(function(a){return'<option value="'+esc(normArea(a.areaId))+'">'+esc(text(a.areaNome)||a.areaId)+'</option>'}).join('');select.value=selectedAreaId;renderModules();if(!skipHealth)refreshHealth()}
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
function refreshNotificationHealth(areaId,force){
  areaId=normArea(areaId);
  if(!permission('PUBLICACOES_GERENCIAR')){markHealth('healthNotifications','Sem permissão','warn');return}
  var cached=readConfirmedNotification(areaId);
  if(cached)renderConfirmedNotification(cached,areaId);else markHealth('healthNotifications','Confirmando…','');
  if(notificationRemoteArea===areaId&&!force)return;
  notificationRemoteArea=areaId;
  if(!cached){
    notificationPostIsolated('admin_notificacoes_saude_rapida',areaId,function(quick){
      var confirmed=saveConfirmedNotification(quick,areaId);
      if(confirmed)renderConfirmedNotification(confirmed,areaId);
    });
  }
  notificationPostIsolated('admin_notificacoes_saude_remota',areaId,function(remote,seq){
    if(seq!==notificationLatestStarted[areaId])return;
    if(notificationRemoteArea===areaId)notificationRemoteArea='';
    var confirmed=saveConfirmedNotification(remote,areaId);
    if(confirmed){renderConfirmedNotification(confirmed,areaId);return}
    if(areaId!==selectedAreaId)return;
    var fallback=readConfirmedNotification(areaId);
    if(fallback){renderConfirmedNotification(fallback,areaId);return}
    markHealth('healthNotifications','Sem confirmação','warn');
  });
}
function refreshHealth(force){
  if(!context)return;
  var areaId=selectedAreaId,now=Date.now();
  if(healthRefreshInFlight&&!force)return;
  if(!force&&lastHealthRefreshArea===areaId&&now-lastHealthRefreshAt<HEALTH_REFRESH_TTL){refreshNotificationHealth(areaId,false);return}
  healthRefreshInFlight=true;lastHealthRefreshArea=areaId;lastHealthRefreshAt=now;
  ['healthPortal','healthResidents','healthAgenda','healthContent'].forEach(function(id){markHealth(id,'Verificando…','')});
  refreshNotificationHealth(areaId,Boolean(force));
  var area=selectedArea();markHealth('healthArea',(text(area&&area.areaNome)||areaId)+' • '+(text(area&&area.unidadeNome)||text(area&&area.unidadeId)||'unidade'),'ok');
  var pending=4;
  function done(){pending--;if(pending<=0)healthRefreshInFlight=false}
  jsonp('portal_manutencao_status',{areaId:areaId},function(r){if(normArea(areaId)!==selectedAreaId){done();return}if(r&&r.ok===true)markHealth('healthPortal',r.ativa?'Em manutenção':'Disponível',r.ativa?'warn':'ok');else markHealth('healthPortal','Sem confirmação','warn');done()});
  post('admin_moradores_status',session({areaId:areaId}),'admin_moradores_result',function(r){if(normArea(areaId)===selectedAreaId)markHealth('healthResidents',r&&r.ok===true?'Base acessível':'Falha na leitura',r&&r.ok===true?'ok':'err');done()});
  jsonp('painel_publico',{areaId:areaId},function(r){if(normArea(areaId)===selectedAreaId)markHealth('healthAgenda',r&&r.ok===true?'Agenda pública acessível':'Sem confirmação',r&&r.ok===true?'ok':'warn');done()});
  jsonp('publico_conteudo',{areaId:areaId},function(r){if(normArea(areaId)===selectedAreaId)markHealth('healthContent',r&&r.ok===true?'Conteúdo acessível':'Sem confirmação',r&&r.ok===true?'ok':'warn');done()});
  el('healthUpdated').textContent='Atualizando dados validados • área '+(text(area&&area.areaNome)||areaId);
  setTimeout(function(){healthRefreshInFlight=false},12000);
}
function moduleUrl(name){var area=encodeURIComponent(selectedAreaId),tacsOnly=mode==='tacs'||TACS_ONLY,access=tacsOnly?'&acesso=tacs':'',revision='20260823-recados-safari-render-v1';if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+access+'&v='+revision;if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&v='+revision;if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+'&v='+revision;if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+access+'&v='+revision;if(name==='territorio')return '/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html?v='+revision;if(name==='municipios')return '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html?v='+revision;if(name==='portal')return '/atendimento-acs-farmaceutico/?area='+area;return ''}
function openModule(name,title){var url=moduleUrl(name);if(!url)return;if(name==='portal'){window.open(url,'_blank','noopener');return}var sep=url.indexOf('?')===-1?'?':'&';/* AGENDA_DIRECT_NAV_V1: evita o iframe oculto e o travamento observado no iPhone; o retorno usa from=central. */if(name==='agendas'){location.assign(url+sep+'from=central&_cb='+Date.now());return}url=url+sep+'_cb='+Date.now();el('viewerTitle').textContent=title||'Painel';el('viewerFrame').src=url;el('viewer').hidden=false;document.body.classList.add('viewer-open')}
function closeViewer(){el('viewer').hidden=true;el('viewerFrame').src='about:blank';document.body.classList.remove('viewer-open');refreshHealth()}
function loadContext(message){post('admin_territorio_dados',session(),'admin_territorio_result',function(r){if(!r||r.ok!==true){token='';territoryToken='';mode='';sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);el('loginPanel').hidden=false;el('identityPanel').hidden=true;el('healthPanel').hidden=true;el('modulesPanel').hidden=true;setStatus(text(r&&r.message)||'A sessão não pôde ser reutilizada. Entre novamente.','warn');return}context=r;mode=r.perfil==='TACS'?'tacs':'admin';saveContextCache();setStatus(message||'Acesso validado.','ok');renderContext(false)})}
function logout(){
  var lastMode=mode||'admin';
  function finishLocalLogout(){
    token='';territoryToken='';mode='';context=null;
    sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TERRITORY_TOKEN_KEY);
    /* LOGOFF_PRESERVA_CACHE_V2: encerra somente a autenticação. Área, aparelho e caches por perfil permanecem intactos. */
    el('identityPanel').hidden=true;el('healthPanel').hidden=true;el('modulesPanel').hidden=true;
    el('loginPanel').hidden=false;showLogin(lastMode==='tacs'?'tacs':'admin');
    setStatus('Sessão encerrada. Seus dados locais foram preservados para o próximo acesso.','ok');
    window.scrollTo({top:0,behavior:'auto'});
  }
  if(!(token||territoryToken)){finishLocalLogout();return}
  var action=mode==='tacs'?'admin_territorio_encerrar_sessao':'admin_logout';
  post(action,session(),mode==='tacs'?'admin_territorio_result':'admin_result',function(){finishLocalLogout()})
}
/* LOGIN_PREFETCH_ESTATICO_V2: a tela termina de carregar primeiro. Depois, fetch assíncrono aquece o cache sem iframe oculto e sem bloquear o evento load do Safari. */
var staticPrefetchStarted=false;
function prefetchStaticPanels(){
  if(staticPrefetchStarted)return;staticPrefetchStarted=true;
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
['adminPin','tacsPin'].forEach(function(id){var input=el(id);if(!input)return;input.addEventListener('focus',prefetchStaticPanels,{once:true});input.addEventListener('input',prefetchStaticPanels,{once:true})});
window.addEventListener('load',function(){if('requestIdleCallback' in window)requestIdleCallback(prefetchStaticPanels,{timeout:1800});else setTimeout(prefetchStaticPanels,700)},{once:true});
el('tabAdmin').addEventListener('click',function(){if(!TACS_ONLY)showLogin('admin')});el('tabTacs').addEventListener('click',function(){showLogin('tacs')});
el('loginAdmin').addEventListener('click',function(){var pin=digits(el('adminPin').value);if(!/^\d{4,8}$/.test(pin)){setStatus('Digite um PIN administrativo de 4 a 8 números.','err');return}setStatus('Validando o acesso…','warn');post('admin_login',{pin:pin,dispositivo:device},'admin_result',function(r){el('adminPin').value='';if(!r||r.ok!==true||!r.token){setStatus(text(r&&r.message)||'Acesso recusado.','err');return}territoryToken='';sessionStorage.removeItem(TERRITORY_TOKEN_KEY);token=r.token;mode='admin';sessionStorage.setItem(TOKEN_KEY,token);if(window.ConectaAcessoUnificado&&typeof window.ConectaAcessoUnificado.registrarAparelho==='function')window.ConectaAcessoUnificado.registrarAparelho('ADMIN');restoreContextCache();loadContext('Administrador validado.')})});
el('loginTacs').addEventListener('click',function(){var pin=digits(el('tacsPin').value);if(!/^\d{4,8}$/.test(pin)){setStatus('Informe o PIN individual de 4 a 8 números.','err');return}setStatus('Validando seu PIN…','warn');post('admin_territorio_login_pin',{pin:pin,dispositivo:device},'admin_territorio_result',function(r){el('tacsPin').value='';if(!r||r.ok!==true||!r.token){setStatus(text(r&&r.message)||'Acesso recusado.','err');return}token='';sessionStorage.removeItem(TOKEN_KEY);territoryToken=r.token;mode='tacs';selectedAreaId=normArea(r.areaId);sessionStorage.setItem(TERRITORY_TOKEN_KEY,territoryToken);if(window.ConectaAcessoUnificado&&typeof window.ConectaAcessoUnificado.registrarAparelho==='function')window.ConectaAcessoUnificado.registrarAparelho('TACS');restoreContextCache();loadContext('Acesso individual validado para '+(text(r.areaNome)||r.areaId)+'.')})});
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
applyUiStandard(document);
if(token||territoryToken){var restored=restoreContextCache();if(!restored)setStatus('Conferindo a sessão existente…','warn');setTimeout(function(){if(!active)loadContext('Sessão existente validada.')},restored?120:0)}else{showLogin(TACS_ONLY?'tacs':'admin')}
}());
