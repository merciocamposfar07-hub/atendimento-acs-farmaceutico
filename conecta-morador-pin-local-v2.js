(function(){
'use strict';
if(window.ConectaMoradorPinLocalV2)return;

var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var PROFILE_KEY='portalConectaMoradorQuickV1';
var TOKEN_KEY='portalConectaMoradorTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var AREA_KEY='portalTacsCentralAreaV1';
var BOOTSTRAP_KEY='portalConectaMoradorBootstrapV2';
var BG_REQUEST_KEY='portalConectaMoradorLoginRequestV2';

function text(v){return String(v==null?'':v).trim()}
function digits(v){return text(v).replace(/\D/g,'')}
function profile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch(e){return null}}
function device(){try{return text(localStorage.getItem(DEVICE_KEY)||'')}catch(e){return''}}
function vault(){var v=window.ConectaPinLocalV2;return v&&typeof v.abrir==='function'&&typeof v.guardar==='function'?v:null}
function bootstrap(snapshot){try{sessionStorage.setItem(BOOTSTRAP_KEY,JSON.stringify(snapshot||{}))}catch(e){}}
function openPortal(data){
  var area=encodeURIComponent(text(data&&data.areaId)||text(profile()&&profile().areaId)||'JAPARANDUBA');
  var onboarding=data&&data.notificacoesAtivas===true?'':'&onboarding=1';
  location.assign('/atendimento-acs-farmaceutico/?area='+area+'&conecta=1'+onboarding);
}
function backgroundLogin(p,pin){
  if(!p||!p.quickKey||!device())return '';
  var id='conecta_morador_bg_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
  var body=new URLSearchParams();
  body.set('action','conecta_morador_login_pin');body.set('requestId',id);
  body.set('quickKey',p.quickKey);body.set('pin',pin);body.set('dispositivo',device());
  try{sessionStorage.setItem(BG_REQUEST_KEY,id)}catch(e){}
  try{
    fetch(API+'?_='+Date.now(),{
      method:'POST',mode:'no-cors',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:body.toString(),cache:'no-store',keepalive:true
    }).catch(function(){});
  }catch(e){}
  return id;
}
function snapshotFrom(r){
  var p=profile()||{};
  return {
    perfil:'MORADOR',
    areaId:text(r&&r.areaId)||text(p.areaId),
    areaNome:text(r&&r.areaNome)||text(p.areaNome),
    nome:text(r&&r.nome)||text(p.nome),
    notificacoesAtivas:Boolean(r&&r.notificacoesAtivas===true),
    silencioso:Boolean(r&&r.silencioso===true),
    provisorio:Boolean(r&&r.provisorio===true),
    pendenciaId:text(r&&r.pendenciaId),
    familiaId:text(r&&r.familiaId),
    familia:Array.isArray(r&&r.familia)?r.familia.slice():[]
  };
}
function registrar(pin,r,snapshot){
  var v=vault(),p=profile()||{},snap=snapshot&&typeof snapshot==='object'?snapshot:snapshotFrom(r);
  if(!v||!r||!r.token)return Promise.resolve(false);
  bootstrap(snap);
  return Promise.resolve(v.guardar('morador',pin,{
    device:device(),quickKey:text(r.quickKey)||text(p.quickKey),
    areaId:text(r.areaId)||text(p.areaId),areaNome:text(r.areaNome)||text(p.areaNome),
    snapshot:snap,salvoRemotoEm:Date.now()
  })).catch(function(){return false});
}
function remover(){var v=vault();if(v&&typeof v.remover==='function')v.remover('morador')}

document.addEventListener('click',function(event){
  var target=event.target&&event.target.closest?event.target.closest('#cscResidentLogin'):null;
  if(!target)return;
  if(target.dataset.pinLocalBypass==='1'){delete target.dataset.pinLocalBypass;return}
  var input=document.getElementById('cscResidentPin'),pin=digits(input&&input.value),p=profile(),v=vault();
  if(!v||!p||!/^\d{4}$/.test(pin))return;
  event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  Promise.resolve(v.abrir('morador',pin)).then(function(saved){
    if(!saved||text(saved.device)!==device()||(saved.quickKey&&text(saved.quickKey)!==text(p.quickKey))){
      target.dataset.pinLocalBypass='1';target.click();return;
    }
    /* PIN_LOCAL_SEM_TOKEN_V3: o estado local libera a tela; a sessão do servidor é sempre nova. */
    try{sessionStorage.removeItem(TOKEN_KEY);if(saved.areaId)localStorage.setItem(AREA_KEY,saved.areaId)}catch(e){}
    bootstrap(saved.snapshot||snapshotFrom(saved));
    backgroundLogin(p,pin);
    if(input)input.value='';
    openPortal(saved.snapshot||saved);
  }).catch(function(){
    target.dataset.pinLocalBypass='1';target.click();
  });
},true);

document.addEventListener('click',function(event){
  var other=event.target&&event.target.closest?event.target.closest('#cscResidentOther'):null;
  if(other)remover();
},true);

window.ConectaMoradorPinLocalV2={
  registrar:registrar,
  remover:remover,
  removerPerfil:function(role){var r=String(role||'').toUpperCase(),v=vault(),scope=r==='TACS'?'tacs':r==='ADMIN'?'admin':'morador';if(v&&typeof v.remover==='function')v.remover(scope)},
  bootstrap:bootstrap
};
}());

/* CORRECAO_CACHE_FIRST_PAINEIS_20260917_V1
   Bloco isolado de desempenho da Central. Não altera PIN, permissões, áreas,
   agendas, regras de escrita ou dados. O toque passa a preparar somente o painel
   escolhido; painéis legados deixam de ficar ocultos até o load completo e as
   leituras de saúde da Central cedem prioridade à navegação. */
(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
if(!/\/central-administrativa-tacs\.html$/i.test(String(location.pathname||'')))return;
if(window.ConectaCacheFirstPanels20260917V1)return;

var state={intentAt:0,marker:'CORRECAO_CACHE_FIRST_PAINEIS_20260917_V1'};
window.ConectaCacheFirstPanels20260917V1=state;

function recentIntent(ms){return Date.now()-Number(state.intentAt||0)<Number(ms||1800)}
function remoteReady(){
  try{
    return Boolean(
      String(sessionStorage.getItem('portalTacsAdminTokenV1')||'').trim()||
      String(sessionStorage.getItem('portalTacsTerritorioTokenV1')||'').trim()||
      String(sessionStorage.getItem('portalConectaUbsTokenV1')||'').trim()
    );
  }catch(e){return false}
}
function injectStyle(){
  if(document.getElementById('cscCacheFirstPanels20260917V1'))return;
  var style=document.createElement('style');
  style.id='cscCacheFirstPanels20260917V1';
  style.textContent=''
    +'html body .viewer.csc-frame-viewer.csc-cache-first-opening:not([hidden]){display:flex!important;flex-direction:column!important;overflow:hidden!important;background:#071827!important}'
    +'html body .viewer.csc-frame-viewer.csc-cache-first-opening>.viewer-bar{display:flex!important;position:static!important;flex:0 0 auto!important;width:min(720px,100%)!important;margin:0 auto!important;background:#071827!important;border:0!important;box-shadow:none!important}'
    +'html body .viewer.csc-frame-viewer.csc-cache-first-opening>iframe:not([hidden]){display:block!important;position:static!important;width:100%!important;height:auto!important;min-height:0!important;flex:1 1 auto!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;background:#071827!important}'
    +'html body .viewer.csc-frame-viewer.csc-cache-first-opening>#cscModuleOpening{display:none!important}';
  document.head.appendChild(style);
}

function hideShellWait(){
  var node=document.getElementById('cscModuleOpening');
  if(node){node.hidden=true;node.textContent='';}
}

/* O iframe real fica visível enquanto termina a hidratação; não esperamos o evento
   load de todos os recursos para só então mostrar o painel. */
var originalSetLegacyFrameOpening=window.setLegacyFrameOpening;
if(typeof originalSetLegacyFrameOpening==='function'){
  window.setLegacyFrameOpening=function(frame,visible){
    injectStyle();
    var viewer=document.getElementById('viewer');
    if(frame){
      frame.style.visibility='visible';
      frame.style.opacity='1';
      frame.style.pointerEvents='auto';
    }
    if(viewer){
      viewer.classList.remove('csc-frame-opening');
      viewer.classList.toggle('csc-cache-first-opening',Boolean(visible));
    }
    hideShellWait();
    if(!visible&&viewer)viewer.classList.remove('csc-cache-first-opening');
  };
}

function warmNative(name){
  var loader=null;
  if(name==='moradores')loader=window.ensureTask17MoradoresAssets;
  else if(name==='agendas')loader=window.ensureTask16AgendaAssets;
  else if(name==='profissionais')loader=window.ensureTask18ProfissionaisAssets;
  if(typeof loader!=='function')return;
  var run=function(){try{loader(function(){})}catch(e){}};
  if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(run);else setTimeout(run,0);
}

function warmLegacy(name,title){
  if(!remoteReady()&&name!=='territorio')return;
  if(typeof window.moduleRouteId!=='function'||typeof window.moduleUrl!=='function'||typeof window.ensureShellFrame!=='function')return;
  try{
    var routeId=window.moduleRouteId(name,{}),url=window.moduleUrl(name,{});if(!url)return;
    var frame=window.ensureShellFrame(name,url,title||'Painel',routeId);if(!frame)return;
    if(frame.dataset.shellLoaded!=='1'){
      frame.dataset.shellLoaded='1';
      frame.dataset.cscIntentPreload='1';
      var target=frame.dataset.shellUrl||url;
      if(typeof window.shellFrameAtTarget!=='function'||!window.shellFrameAtTarget(frame))frame.src=target;
    }
  }catch(e){}
}

function prioritizePanel(button){
  if(!button||button.hidden||button.disabled)return;
  var name=String(button.dataset.module||'').toLowerCase();if(!name||name==='portal'||name==='ubs')return;
  state.intentAt=Date.now();
  /* Se a Saúde geral ainda aguardava seu timer, ela não disputa rede/CPU com o toque. */
  try{if(window.healthRefreshTimer){clearTimeout(window.healthRefreshTimer);window.healthRefreshTimer=null}}catch(e){}
  var title='';try{title=String((button.querySelector('strong')||{}).textContent||'Painel')}catch(e){}
  if(name==='moradores'||name==='agendas'||name==='profissionais')warmNative(name);
  else warmLegacy(name,title);
}

function onPointerDown(event){
  var button=event.target&&event.target.closest?event.target.closest('#moduleGrid .module[data-module]'):null;
  prioritizePanel(button);
}
document.addEventListener('pointerdown',onPointerDown,{capture:true,passive:true});
if(!window.PointerEvent)document.addEventListener('touchstart',onPointerDown,{capture:true,passive:true});

/* Saúde geral continua atualizando em segundo plano, mas somente quando a Central
   está ociosa. Atualização manual permanece intocada. */
var originalScheduleHealthRefresh=window.scheduleHealthRefresh;
if(typeof originalScheduleHealthRefresh==='function'){
  window.scheduleHealthRefresh=function(force,delay){
    if(force)return originalScheduleHealthRefresh.apply(this,arguments);
    try{if(window.healthRefreshTimer){clearTimeout(window.healthRefreshTimer);window.healthRefreshTimer=null}}catch(e){}
    var wait=Math.max(2200,Number(delay==null?2200:delay));
    window.healthRefreshTimer=setTimeout(function attempt(){
      window.healthRefreshTimer=null;
      if(!window.context||window.mode==='ubs')return;
      if(window.shellActiveModule||recentIntent(1800)){
        window.healthRefreshTimer=setTimeout(attempt,900);
        return;
      }
      var run=function(){
        if(window.shellActiveModule||recentIntent(900)){
          window.healthRefreshTimer=setTimeout(attempt,900);
          return;
        }
        if(typeof window.refreshHealth==='function')window.refreshHealth(false);
      };
      if('requestIdleCallback' in window)window.requestIdleCallback(run,{timeout:1300});else setTimeout(run,0);
    },wait);
  };
}

injectStyle();
}());
