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

  /*
   * CENTRAL_VIEWER_PARKED_OFFSCREEN_V1
   * O viewer precisa continuar dimensionado para preservar o viewport interno
   * dos iframes no iOS/BFCache, mas não pode permanecer como uma camada fixed
   * invisível sobre a Central. Quando estacionado, mantemos 100vw x 100dvh e
   * deslocamos a camada inteira para fora do viewport. Ao reabrir um painel,
   * ela volta para inset:0 sem reparenting nem novo load do iframe.
   */
  var parked=v.getAttribute('aria-hidden')==='true'||!document.body.classList.contains('viewer-open');
  if(parked){
    v.style.setProperty('left','-200vw');
    v.style.setProperty('right','auto');
    v.style.setProperty('top','0');
    v.style.setProperty('bottom','auto');
    v.style.setProperty('width','100vw');
    v.style.setProperty('visibility','hidden');
    v.style.setProperty('opacity','0');
    v.style.setProperty('pointer-events','none');
  }else{
    v.style.setProperty('left','0');
    v.style.setProperty('right','0');
    v.style.setProperty('top','0');
    v.style.setProperty('bottom','0');
    v.style.removeProperty('width');
    v.style.setProperty('visibility','visible');
    v.style.setProperty('opacity','1');
    v.style.setProperty('pointer-events','auto');
  }

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

  var hidden=frame.getAttribute('aria-hidden')==='true'||frame.style.display==='none';
  if(hidden){
    /*
     * HOTFIX_IOS_IFRAME_COMPOSITOR_V2
     * No Safari/WebKit do iPhone, visibility:hidden/opacity:0 e até mesmo
     * estacionar o iframe fora do viewport podem manter uma camada gráfica
     * composta viva. Essa camada pode reaparecer como um retângulo #dfeef3
     * cobrindo trechos do painel ativo durante a rolagem.
     *
     * A solução robusta é retirar completamente o iframe INATIVO da composição
     * com display:none. O documento continua no DOM e mantém src/estado para o
     * preload; quando o módulo volta a ser ativo, ele é exibido novamente.
     */
    frame.style.setProperty('display','none','important');
    frame.style.setProperty('position','absolute');
    frame.style.setProperty('inset','auto');
    frame.style.setProperty('left','0');
    frame.style.setProperty('top','0');
    frame.style.setProperty('right','auto');
    frame.style.setProperty('bottom','auto');
    frame.style.setProperty('width','100%');
    frame.style.setProperty('height','100%');
    frame.style.setProperty('max-height','100%');
    frame.style.setProperty('min-width','0');
    frame.style.setProperty('min-height','0');
    frame.style.setProperty('border','0');
    frame.style.setProperty('visibility','hidden');
    frame.style.setProperty('opacity','0');
    frame.style.setProperty('pointer-events','none');
    return;
  }

  /* Somente o painel ativo existe na superfície gráfica visível e tocável. */
  frame.style.setProperty('display','block','important');
  frame.style.setProperty('position','relative');
  frame.style.setProperty('inset','auto');
  frame.style.setProperty('left','0');
  frame.style.setProperty('top','0');
  frame.style.setProperty('right','auto');
  frame.style.setProperty('bottom','auto');
  frame.style.setProperty('width','100%');
  frame.style.setProperty('height','100%');
  frame.style.setProperty('max-height','100%');
  frame.style.setProperty('min-width','0');
  frame.style.setProperty('min-height','0');
  frame.style.setProperty('flex','1 1 0%');
  frame.style.setProperty('border','0');
  frame.style.setProperty('visibility','visible');
  frame.style.setProperty('opacity','1');
  frame.style.setProperty('overflow','auto');
  frame.style.setProperty('overscroll-behavior','contain');
  frame.style.setProperty('touch-action','auto');
  frame.style.setProperty('pointer-events','auto');
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
      if(m.type==='attributes'&&(m.target&&m.target.tagName==='IFRAME'||m.target===pool()||m.target===v))needs=true;
    });
    /* MutationObserver roda antes da próxima pintura; não introduzir setTimeout aqui. */
    if(needs)stabilizeAll();
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
    return;
  }
  /* Fecha e retira a camada da superfície visível no mesmo gesto. */
  stabilizeAll();
}

function install(){
  document.documentElement.dataset.portalTacsScrollStabilityInstalled='2';
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
