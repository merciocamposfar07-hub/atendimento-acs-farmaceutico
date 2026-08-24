(function(){
'use strict';
if(window.PortalTacsCentralScrollStabilityV1)return;
window.PortalTacsCentralScrollStabilityV1=true;

var lastTouchBackAt=0;
var observer=null;

function viewer(){return document.getElementById('viewer')}
function pool(){return document.getElementById('portalTacsAdminPreloadPoolV1')}

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
  var wanted={
    display:'flex',
    flex:'1 1 0%',
    width:'100%',
    height:'0px',
    minWidth:'0px',
    minHeight:'0px',
    overflow:'hidden',
    overscrollBehavior:'contain',
    position:'relative',
    touchAction:'auto',
    background:'#dfeef3'
  };
  Object.keys(wanted).forEach(function(key){if(p.style[key]!==wanted[key])p.style[key]=wanted[key]});
}

function stabilizeFrame(frame){
  if(!frame||frame.tagName!=='IFRAME')return;
  frame.setAttribute('scrolling','yes');
  if(frame.getAttribute('aria-hidden')==='true'||frame.style.display==='none')return;
  var wanted={
    display:'block',
    width:'100%',
    height:'100%',
    maxHeight:'100%',
    minWidth:'0px',
    minHeight:'0px',
    flex:'1 1 0%',
    border:'0px',
    background:'#dfeef3',
    opacity:'1',
    overflow:'auto',
    overscrollBehavior:'contain',
    touchAction:'auto',
    pointerEvents:'auto'
  };
  Object.keys(wanted).forEach(function(key){if(frame.style[key]!==wanted[key])frame.style[key]=wanted[key]});
}

function stabilizeAll(){
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
      if(m.type==='attributes'&&m.target&&m.target.tagName==='IFRAME')needs=true;
    });
    if(needs)setTimeout(stabilizeAll,0);
  });
  observer.observe(v,{childList:true,subtree:true,attributes:true,attributeFilter:['style','aria-hidden']});
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
  back.disabled=true;
  try{controller.closeViewer()}finally{setTimeout(function(){back.disabled=false},450)}
}

function install(){
  document.documentElement.dataset.portalTacsScrollStabilityInstalled='1';
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
