(function(){
'use strict';
if(window.PortalTacsCentralSuporteMoradoresV1)return;
window.PortalTacsCentralSuporteMoradoresV1=true;
var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var AREA_KEY='portalTacsCentralAreaV1';
var PAINT_STYLE_ID='portalTacsCentralIosPaintGuardV1';
function text(v){return String(v==null?'':v).trim()}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function areaId(){var select=document.getElementById('adminArea'),a=normArea(select&&select.value);if(a)return a;try{a=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}return a||'JAPARANDUBA'}
function hasTerritorySession(){try{return Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||''))}catch(e){return false}}
function hasAnySession(){try{return Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'')||text(sessionStorage.getItem(ADMIN_TOKEN_KEY)||''))}catch(e){return false}}

/*
 * CENTRAL_IOS_PAINT_GUARD_V1
 *
 * O Safari/WebKit do iPhone já apresentou neste projeto cortes de pintura
 * quando havia camadas fixas/iframes técnicos compostos sobre páginas longas.
 * Esta proteção atua SOMENTE na Central: não muda dados, permissões, rotas,
 * agendas, moradores, recados ou serviços.
 */
function installPaintGuard(){
  if(!document.getElementById(PAINT_STYLE_ID)){
    var style=document.createElement('style');
    style.id=PAINT_STYLE_ID;
    style.textContent='\
html,body,main,#modulesPanel,#moduleGrid,.panel,.module{\
  -webkit-backface-visibility:visible!important;\
  backface-visibility:visible!important;\
  will-change:auto!important;\
  contain:none!important;\
}\
main,#modulesPanel,#moduleGrid{\
  height:auto!important;\
  max-height:none!important;\
  overflow:visible!important;\
}\
#portalTacsCentralRefreshV1,#portalTacsAdminPreloadPoolV1{display:none!important}\
body>iframe:not(#viewerFrame){\
  position:absolute!important;\
  left:0!important;top:0!important;\
  width:1px!important;height:1px!important;\
  border:0!important;opacity:0!important;\
  visibility:hidden!important;pointer-events:none!important;\
  z-index:-1!important;\
}';
    document.head.appendChild(style);
  }
  var refresh=document.getElementById('portalTacsCentralRefreshV1');
  if(refresh&&refresh.parentNode)refresh.remove();
  var legacyPool=document.getElementById('portalTacsAdminPreloadPoolV1');
  if(legacyPool&&legacyPool.parentNode)legacyPool.remove();
  var modules=document.getElementById('modulesPanel');
  var grid=document.getElementById('moduleGrid');
  if(modules){modules.style.height='auto';modules.style.maxHeight='none';modules.style.overflow='visible'}
  if(grid){grid.style.height='auto';grid.style.maxHeight='none';grid.style.overflow='visible'}
}

function openSupport(button){if(!hasAnySession())return;var viewer=document.getElementById('viewer'),frame=document.getElementById('viewerFrame'),title=document.getElementById('viewerTitle');if(!viewer||!frame)return;var url='/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html?area='+encodeURIComponent(areaId())+(hasTerritorySession()?'&acesso=tacs':'')+'&v=20260822-suporte-moradores-v2';if(title)title.textContent='Suporte aos moradores';frame.src=url;viewer.hidden=false;document.body.classList.add('viewer-open');try{button.blur()}catch(e){}}
function install(){var grid=document.getElementById('moduleGrid');if(!grid||grid.dataset.suporteMoradoresV1==='1')return;grid.dataset.suporteMoradoresV1='1';grid.addEventListener('click',function(event){var button=event.target&&event.target.closest?event.target.closest('.module[data-module="suporte"]'):null;if(!button||button.hidden||button.disabled)return;event.preventDefault();event.stopPropagation();openSupport(button)},false)}
function boot(){installPaintGuard();install()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',boot);
window.addEventListener('focus',installPaintGuard);
}());
