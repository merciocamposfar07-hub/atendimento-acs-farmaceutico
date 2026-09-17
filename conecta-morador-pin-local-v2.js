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

/* CORRECAO_CACHE_FIRST_PAINEIS_20260917_V2
   Bloco isolado de desempenho da Central. Não altera PIN, permissões, áreas,
   agendas, regras de escrita ou dados. Usa somente a API pública do shell e a
   superfície visual já existente: o painel escolhido começa a abrir no pointerdown
   e o clique subsequente é deduplicado. Em painéis legados, o iframe real deixa de
   ficar reduzido/oculto até o load completo. */
(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
if(!/\/central-administrativa-tacs\.html$/i.test(String(location.pathname||'')))return;
if(window.ConectaCacheFirstPanels20260917V2)return;

var state={intentAt:0,module:'',suppressUntil:0,observer:null,marker:'CORRECAO_CACHE_FIRST_PAINEIS_20260917_V2'};
window.ConectaCacheFirstPanels20260917V2=state;

function shell(){var s=window.ConectaCentralShellV1;return s&&typeof s.abrir==='function'?s:null}
function moduleButton(event){return event.target&&event.target.closest?event.target.closest('#moduleGrid .module[data-module]'):null}
function moduleName(button){return String(button&&button.dataset&&button.dataset.module||'').toLowerCase()}
function moduleTitle(button){try{return String((button.querySelector('strong')||{}).textContent||'Painel').trim()||'Painel'}catch(e){return'Painel'}}
function activeFrame(){
  var viewer=document.getElementById('viewer');if(!viewer)return null;
  var frames=viewer.querySelectorAll('iframe');
  for(var i=0;i<frames.length;i++)if(!frames[i].hidden)return frames[i];
  return document.getElementById('viewerFrame');
}
function hideOpeningNotice(){var n=document.getElementById('cscModuleOpening');if(n){n.hidden=true;n.textContent=''}}
function injectStyle(){
  if(document.getElementById('cscCacheFirstPanels20260917V2'))return;
  var style=document.createElement('style');style.id='cscCacheFirstPanels20260917V2';
  style.textContent=''
    +'html body .viewer.csc-frame-viewer.csc-cache-first-opening:not([hidden]){display:flex!important;flex-direction:column!important;overflow:hidden!important;background:#071827!important}'
    +'html body .viewer.csc-frame-viewer.csc-cache-first-opening>.viewer-bar{display:flex!important;position:static!important;flex:0 0 auto!important;width:min(720px,100%)!important;margin:0 auto!important;background:#071827!important;border:0!important;box-shadow:none!important}'
    +'html body .viewer.csc-frame-viewer.csc-cache-first-opening>iframe:not([hidden]){display:block!important;position:static!important;left:auto!important;top:auto!important;width:100%!important;height:auto!important;min-height:0!important;flex:1 1 auto!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;background:#071827!important}'
    +'html body .viewer.csc-frame-viewer.csc-cache-first-opening>#cscModuleOpening{display:none!important}';
  document.head.appendChild(style);
}
function revealLegacyFrame(){
  var viewer=document.getElementById('viewer');if(!viewer||viewer.hidden||!viewer.classList.contains('csc-frame-viewer'))return;
  injectStyle();
  viewer.classList.remove('csc-frame-opening');
  viewer.classList.add('csc-cache-first-opening');
  var frame=activeFrame();
  if(frame){
    frame.style.visibility='visible';
    frame.style.opacity='1';
    frame.style.pointerEvents='auto';
  }
  hideOpeningNotice();
}
function settleLegacyFrame(){
  var viewer=document.getElementById('viewer');if(!viewer)return;
  viewer.classList.remove('csc-cache-first-opening');
  hideOpeningNotice();
}
function afterOpen(){
  revealLegacyFrame();
  if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(revealLegacyFrame);
  setTimeout(revealLegacyFrame,40);
  setTimeout(revealLegacyFrame,100);
}
function openOnIntent(button){
  if(!button||button.hidden||button.disabled)return false;
  var name=moduleName(button);if(!name||name==='portal')return false;
  var api=shell();if(!api)return false;
  state.intentAt=Date.now();state.module=name;state.suppressUntil=state.intentAt+1200;
  try{api.abrir(name,moduleTitle(button));afterOpen();return true}catch(e){state.suppressUntil=0;return false}
}
function onPointerDown(event){var button=moduleButton(event);openOnIntent(button)}
function onClick(event){
  var button=moduleButton(event);if(!button)return;
  var name=moduleName(button);
  if(name&&name===state.module&&Date.now()<=state.suppressUntil){
    event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    state.suppressUntil=0;
  }
}
document.addEventListener('pointerdown',onPointerDown,{capture:true,passive:true});
if(!window.PointerEvent)document.addEventListener('touchstart',onPointerDown,{capture:true,passive:true});
document.addEventListener('click',onClick,true);

/* Se a Central voltar a marcar o frame como "opening" durante a mesma abertura,
   a observação remove somente esse estado visual bloqueante. */
function installObserver(){
  var viewer=document.getElementById('viewer');if(!viewer||state.observer||typeof MutationObserver!=='function')return;
  state.observer=new MutationObserver(function(){
    if(viewer.hidden){viewer.classList.remove('csc-cache-first-opening');return}
    if(viewer.classList.contains('csc-frame-opening'))revealLegacyFrame();
  });
  state.observer.observe(viewer,{attributes:true,attributeFilter:['class','hidden']});
}
document.addEventListener('load',function(event){
  var target=event.target;
  if(target&&target.tagName==='IFRAME'&&target.closest&&target.closest('#viewer'))setTimeout(settleLegacyFrame,0);
},true);

injectStyle();installObserver();
window.addEventListener('pageshow',function(){installObserver();var viewer=document.getElementById('viewer');if(viewer&&viewer.classList.contains('csc-frame-opening'))revealLegacyFrame()});
}());
