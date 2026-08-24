(function(){
'use strict';
if(window.PortalTacsCentralScrollStabilityV1)return;
window.PortalTacsCentralScrollStabilityV1=true;

var lastTouchBackAt=0;
var observer=null;

function viewer(){return document.getElementById('viewer')}
function pool(){return document.getElementById('portalTacsAdminPreloadPoolV1')}

/*
 * iOS/WebKit: um iframe já carregado não deve alternar display:none/block.
 * Essa alternância pode descartar a superfície de composição e, ao voltar,
 * repintar apenas partes do documento (grandes áreas vazias/cortadas).
 * Mantemos a instância renderizada no mesmo host e escondemos somente por
 * visibility/opacity/pointer-events. O runtime interno e o estado permanecem.
 */
function installStableFrameCss(){
  var id='portalTacsStableIframePaintV1';
  if(document.getElementById(id))return;
  var style=document.createElement('style');
  style.id=id;
  style.textContent='\n#portalTacsAdminPreloadPoolV1>iframe{position:absolute!important;inset:0!important;display:block!important;width:100%!important;height:100%!important;max-height:100%!important;min-width:0!important;min-height:0!important;border:0!important;background:#dfeef3!important;}\n#portalTacsAdminPreloadPoolV1>iframe[aria-hidden="true"]{visibility:hidden!important;opacity:0!important;pointer-events:none!important;z-index:0!important;}\n#portalTacsAdminPreloadPoolV1>iframe:not([aria-hidden="true"]){visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:1!important;}\n';
  document.head.appendChild(style);
}

function stabilizeViewer(){
  var v=viewer();
  if(!v)return;
  v.style.setProperty('min-height','0');
  v.style.setProperty('height','100vh');
  try{if(window.CSS&&CSS.supports&&CSS.supports('height','100dvh'))v.style.setProperty('height','100dvh')}catch(e){}
  v.style.setProperty('max-height','100dvh');
  v.style.setProperty('overflow','hidden');
  v.style.setProperty('overscroll-behavior','none');
  v.style.setProperty('touch-action','auto');
  var bar=v.querySelector('.viewer-bar');
  if(bar){
    bar.style.setProperty('position','relative');
    bar.style.setProperty('z-index','2');
    bar.style.setProperty('flex','0 0 auto');
  }
}

function stabilizePool(){
  var p=pool();
  if(!p)return;
  p.style.setProperty('display','flex');
  p.style.setProperty('flex','1 1 0%');
  p.style.setProperty('width','100%');
  p.style.setProperty('height','0');
  p.style.setProperty('min-width','0');
  p.style.setProperty('min-height','0');
  p.style.setProperty('overflow','hidden');
  p.style.setProperty('overscroll-behavior','contain');
  p.style.setProperty('position','relative');
  p.style.setProperty('touch-action','auto');
}

function stabilizeFrame(frame){
  if(!frame||frame.tagName!=='IFRAME')return;
  frame.setAttribute('scrolling','yes');
  var hidden=frame.getAttribute('aria-hidden')==='true';
  frame.style.setProperty('position','absolute','important');
  frame.style.setProperty('inset','0','important');
  frame.style.setProperty('display','block','important');
  frame.style.setProperty('width','100%','important');
  frame.style.setProperty('height','100%','important');
  frame.style.setProperty('max-height','100%','important');
  frame.style.setProperty('min-width','0','important');
  frame.style.setProperty('min-height','0','important');
  frame.style.setProperty('border','0','important');
  frame.style.setProperty('overflow','auto');
  frame.style.setProperty('overscroll-behavior','contain');
  frame.style.setProperty('touch-action','auto');
  frame.style.setProperty('visibility',hidden?'hidden':'visible','important');
  frame.style.setProperty('opacity',hidden?'0':'1','important');
  frame.style.setProperty('pointer-events',hidden?'none':'auto','important');
  frame.style.setProperty('z-index',hidden?'0':'1','important');
}

function stabilizeAll(){
  installStableFrameCss();
  stabilizeViewer();
  stabilizePool();
  var p=pool();
  if(p)p.querySelectorAll('iframe').forEach(stabilizeFrame);
}

function installObserver(){
  var v=viewer();
  if(!v||!window.MutationObserver)return;
  if(observer)observer.disconnect();
  observer=new MutationObserver(function(mutations){
    var needs=false;
    mutations.forEach(function(m){
      if(m.type==='childList')needs=true;
      if(m.type==='attributes'&&(m.target&&m.target.tagName==='IFRAME'||m.target===pool()))needs=true;
    });
    if(needs)setTimeout(stabilizeAll,0);
  });
  observer.observe(v,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-hidden']});
}

function scheduleAfterPanelOpen(event){
  var target=event&&event.target;
  var card=target&&target.closest?target.closest('#moduleGrid .module[data-module]'):null;
  if(!card||card.dataset.module==='portal')return;
  setTimeout(function(){
    stabilizeAll();
    try{if(document.activeElement&&document.activeElement.tagName==='IFRAME')document.activeElement.blur()}catch(e){}
  },0);
  setTimeout(stabilizeAll,80);
}

function handleBackTouch(event){
  var target=event&&event.target;
  var back=target&&target.closest?target.closest('#viewerBack'):null;
  if(!back)return;
  var now=Date.now();
  if(now-lastTouchBackAt<500)return;
  lastTouchBackAt=now;
  var controller=window.PortalTacsCentralPerformance;
  if(!controller||typeof controller.closeViewer!=='function')return;
  event.preventDefault();
  event.stopPropagation();
  if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  var closed=controller.closeViewer();
  if(closed===false){
    back.disabled=true;
    setTimeout(function(){back.disabled=false},450);
  }
}

function install(){
  document.documentElement.dataset.portalTacsScrollStabilityInstalled='1';
  installStableFrameCss();
  stabilizeAll();
  installObserver();
  document.addEventListener('pointerdown',scheduleAfterPanelOpen,true);
  if(window.PointerEvent)document.addEventListener('pointerup',handleBackTouch,true);
  else document.addEventListener('touchend',handleBackTouch,true);
  window.addEventListener('resize',stabilizeAll,{passive:true});
  window.addEventListener('orientationchange',function(){setTimeout(stabilizeAll,60)},{passive:true});
  if(window.visualViewport)window.visualViewport.addEventListener('resize',stabilizeAll,{passive:true});
  window.addEventListener('pageshow',function(){setTimeout(stabilizeAll,0)});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}());
