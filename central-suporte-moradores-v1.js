(function(){
'use strict';
if(window.PortalTacsCentralSuporteMoradoresV1)return;
window.PortalTacsCentralSuporteMoradoresV1=true;
var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var AREA_KEY='portalTacsCentralAreaV1';
var PAINT_STYLE_ID='portalTacsCentralIosPaintGuardV2';
var VIEWER_STYLE_ID='portalTacsCentralViewerBridgeV1';
function text(v){return String(v==null?'':v).trim()}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function areaId(){var select=document.getElementById('adminArea'),a=normArea(select&&select.value);if(a)return a;try{a=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}return a||'JAPARANDUBA'}
function hasTerritorySession(){try{return Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||''))}catch(e){return false}}
function hasAnySession(){try{return Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'')||text(sessionStorage.getItem(ADMIN_TOKEN_KEY)||''))}catch(e){return false}}

/*
 * CENTRAL_IOS_PAINT_GUARD_V2
 *
 * Proteção exclusiva da Central para Safari/WebKit no iPhone.
 * Não altera dados, permissões, rotas, agendas, moradores, recados ou serviços.
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

/*
 * VIEWER_SCROLL_BRIDGE_V1
 *
 * O problema observado no iPhone acontece quando uma página longa e interativa
 * rola dentro do iframe que, por sua vez, está dentro da camada fixa da Central.
 * Botões/filtros apenas provocam o repaint que expõe a falha do WebKit.
 * A correção abaixo elimina a rolagem interna do iframe: o iframe passa a ter
 * a altura real do painel e quem rola é somente a Central. Assim existe uma
 * única superfície de rolagem/pintura e os controles continuam clicáveis.
 */
function installViewerShell(){
  if(document.getElementById(VIEWER_STYLE_ID))return;
  var style=document.createElement('style');
  style.id=VIEWER_STYLE_ID;
  style.textContent='\
#viewer.viewer{\
  overflow-x:hidden!important;\
  overflow-y:auto!important;\
  -webkit-overflow-scrolling:touch!important;\
  display:block!important;\
  height:100vh!important;\
  height:100dvh!important;\
}\
#viewer.viewer[hidden]{display:none!important}\
#viewer .viewer-bar{\
  position:sticky!important;\
  top:0!important;\
  z-index:20!important;\
  width:100%!important;\
}\
#viewerFrame{\
  display:block!important;\
  width:100%!important;\
  min-width:0!important;\
  min-height:1px!important;\
  height:1px;\
  flex:none!important;\
  border:0!important;\
  overflow:hidden!important;\
}\
body.viewer-open{overflow:hidden!important}\
';
  document.head.appendChild(style);
}

function disconnectFrameObservers(frame){
  try{if(frame.__tacsResizeObserver)frame.__tacsResizeObserver.disconnect()}catch(e){}
  try{if(frame.__tacsMutationObserver)frame.__tacsMutationObserver.disconnect()}catch(e){}
  frame.__tacsResizeObserver=null;
  frame.__tacsMutationObserver=null;
}
function attachViewerBridge(){
  var viewer=document.getElementById('viewer');
  var frame=document.getElementById('viewerFrame');
  if(!viewer||!frame)return;
  disconnectFrameObservers(frame);
  var doc;
  try{doc=frame.contentDocument}catch(e){return}
  if(!doc||!doc.documentElement||!doc.body)return;
  if(String(frame.src||'').indexOf('about:blank')!==-1){frame.style.height='1px';return}

  var innerStyle=doc.getElementById('portalTacsIframeSingleScrollV1');
  if(!innerStyle){
    innerStyle=doc.createElement('style');
    innerStyle.id='portalTacsIframeSingleScrollV1';
    innerStyle.textContent='\
html,body{\
  height:auto!important;\
  min-height:0!important;\
  max-height:none!important;\
  overflow:visible!important;\
  -webkit-overflow-scrolling:auto!important;\
  contain:none!important;\
  will-change:auto!important;\
  transform:none!important;\
}\
.barra,.barraFixa{position:relative!important;bottom:auto!important}\
';
    (doc.head||doc.documentElement).appendChild(innerStyle);
  }

  var pending=false;
  function syncHeight(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(function(){
      pending=false;
      try{
        var de=doc.documentElement,b=doc.body;
        var h=Math.max(
          de.scrollHeight||0,de.offsetHeight||0,
          b.scrollHeight||0,b.offsetHeight||0
        );
        var bar=document.querySelector('#viewer .viewer-bar');
        var minimum=Math.max(1,window.innerHeight-(bar?bar.offsetHeight:0));
        h=Math.max(h,minimum);
        frame.style.height=Math.ceil(h)+'px';
      }catch(e){}
    });
  }

  try{
    if(window.ResizeObserver){
      frame.__tacsResizeObserver=new ResizeObserver(syncHeight);
      frame.__tacsResizeObserver.observe(doc.documentElement);
      frame.__tacsResizeObserver.observe(doc.body);
    }
  }catch(e){}
  try{
    frame.__tacsMutationObserver=new MutationObserver(syncHeight);
    frame.__tacsMutationObserver.observe(doc.body,{subtree:true,childList:true,attributes:true,characterData:true});
  }catch(e){}

  [0,80,220,600,1200,2500].forEach(function(delay){setTimeout(syncHeight,delay)});
  try{viewer.scrollTop=0}catch(e){}
}
function installViewerBridge(){
  installViewerShell();
  var frame=document.getElementById('viewerFrame');
  if(!frame||frame.dataset.tacsSingleScrollBridge==='1')return;
  frame.dataset.tacsSingleScrollBridge='1';
  frame.addEventListener('load',function(){setTimeout(attachViewerBridge,0);setTimeout(attachViewerBridge,250)});
}

function openSupport(button){if(!hasAnySession())return;var viewer=document.getElementById('viewer'),frame=document.getElementById('viewerFrame'),title=document.getElementById('viewerTitle');if(!viewer||!frame)return;var url='/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html?area='+encodeURIComponent(areaId())+(hasTerritorySession()?'&acesso=tacs':'')+'&v=20260822-suporte-moradores-v2';if(title)title.textContent='Suporte aos moradores';frame.src=url;viewer.hidden=false;document.body.classList.add('viewer-open');try{button.blur()}catch(e){}}
function install(){var grid=document.getElementById('moduleGrid');if(!grid||grid.dataset.suporteMoradoresV1==='1')return;grid.dataset.suporteMoradoresV1='1';grid.addEventListener('click',function(event){var button=event.target&&event.target.closest?event.target.closest('.module[data-module="suporte"]'):null;if(!button||button.hidden||button.disabled)return;event.preventDefault();event.stopPropagation();openSupport(button)},false)}
function boot(){installPaintGuard();installViewerBridge();install()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',boot);
window.addEventListener('focus',function(){installPaintGuard();installViewerBridge()});
}());
