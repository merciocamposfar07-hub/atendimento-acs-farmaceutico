(function(){
'use strict';
if(window.PortalTacsCentralSuporteMoradoresV1)return;
window.PortalTacsCentralSuporteMoradoresV1=true;

var PERFORMANCE_SCRIPT_ID='portalTacsCentralPerformanceLoaderV1';
var PERFORMANCE_SRC='/atendimento-acs-farmaceutico/central-admin-performance-v1.js?v=20260823-admin-performance-v1';
var STABILITY_SCRIPT_ID='portalTacsCentralScrollStabilityLoaderV1';
var STABILITY_SRC='/atendimento-acs-farmaceutico/central-admin-scroll-stability-v1.js?v=20260824-scroll-stability-v1';

/*
 * BLOCO_1_CONTROLE_UNICO_V1
 *
 * Este arquivo não navega mais para nenhum painel. Sua única função nesta
 * etapa é garantir que nenhum controlador legado responda ao toque durante a
 * curta janela em que a camada oficial de desempenho ainda está carregando.
 * Depois que PortalTacsCentralPerformanceV1 assume, somente ela executa a
 * navegação da Central.
 */
function navigationTarget(event){
  var target=event&&event.target;
  if(!target||typeof target.closest!=='function')return null;
  return target.closest('#viewerBack,#moduleGrid .module[data-module]');
}

function navigationGate(event){
  if(window.PortalTacsCentralPerformanceV1)return;
  var target=navigationTarget(event);
  if(!target)return;
  event.preventDefault();
  event.stopPropagation();
  if(event.stopImmediatePropagation)event.stopImmediatePropagation();
}

document.addEventListener('click',navigationGate,true);

function beginOfficialPreload(){
  var controller=window.PortalTacsCentralPerformance;
  if(controller&&typeof controller.beginPreload==='function')controller.beginPreload();
}

function loadStabilityLayer(){
  if(window.PortalTacsCentralScrollStabilityV1)return;
  if(document.getElementById(STABILITY_SCRIPT_ID))return;
  var script=document.createElement('script');
  script.id=STABILITY_SCRIPT_ID;
  script.src=STABILITY_SRC;
  script.async=false;
  document.head.appendChild(script);
}

function afterPerformanceReady(){
  beginOfficialPreload();
  loadStabilityLayer();
}

function loadPerformanceLayer(){
  if(window.PortalTacsCentralPerformanceV1){afterPerformanceReady();return;}
  if(document.getElementById(PERFORMANCE_SCRIPT_ID))return;
  var script=document.createElement('script');
  script.id=PERFORMANCE_SCRIPT_ID;
  script.src=PERFORMANCE_SRC;
  script.async=false;
  script.onload=afterPerformanceReady;
  document.head.appendChild(script);
}

loadPerformanceLayer();
window.addEventListener('pageshow',function(){
  if(window.PortalTacsCentralPerformanceV1)afterPerformanceReady();
  else loadPerformanceLayer();
});
}());
