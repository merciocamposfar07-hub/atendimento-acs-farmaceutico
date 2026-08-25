(function(){
'use strict';
if(window.PortalTacsCentralSuporteMoradoresV1)return;
window.PortalTacsCentralSuporteMoradoresV1=true;

var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var AREA_KEY='portalTacsCentralAreaV1';
var RETURN_KEY='portalTacsCentralReturnUrlV1';
var PAINT_STYLE_ID='portalTacsCentralIosPaintGuardV3';
var SAFE_NAV_FLAG='portalTacsSafeNavigationV1';
var REVISION='20260824-admin-safe-nav-v3';

function text(v){return String(v==null?'':v).trim()}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function areaId(){
  var select=document.getElementById('adminArea'),a=normArea(select&&select.value);
  if(a)return a;
  try{a=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}
  return a||'JAPARANDUBA';
}
function hasTerritorySession(){
  try{return Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||''))}catch(e){return false}
}
function hasAnySession(){
  try{return Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'')||text(sessionStorage.getItem(ADMIN_TOKEN_KEY)||''))}catch(e){return false}
}

/*
 * CENTRAL_IOS_PAINT_GUARD_V3
 *
 * A Central deixa de usar o viewer/iframe para abrir módulos administrativos.
 * Mantemos apenas proteções leves de layout e desativamos qualquer viewer legado.
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
#viewer,#portalTacsCentralRefreshV1,#portalTacsAdminPreloadPoolV1{display:none!important}\
body.viewer-open{overflow:auto!important}\
body>iframe{\
  position:absolute!important;\
  left:0!important;top:0!important;\
  width:1px!important;height:1px!important;\
  border:0!important;opacity:0!important;\
  visibility:hidden!important;pointer-events:none!important;\
  z-index:-1!important;\
}';
    document.head.appendChild(style);
  }
  var viewer=document.getElementById('viewer');
  if(viewer){viewer.hidden=true;viewer.setAttribute('aria-hidden','true')}
  var frame=document.getElementById('viewerFrame');
  if(frame){try{frame.src='about:blank'}catch(e){}}
  document.body.classList.remove('viewer-open');
  var refresh=document.getElementById('portalTacsCentralRefreshV1');
  if(refresh&&refresh.parentNode)refresh.remove();
  var legacyPool=document.getElementById('portalTacsAdminPreloadPoolV1');
  if(legacyPool&&legacyPool.parentNode)legacyPool.remove();
}

function moduleUrl(name){
  var area=encodeURIComponent(areaId());
  var access=hasTerritorySession()?'&acesso=tacs':'';
  var from='&from=central';
  if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+access+from+'&v='+REVISION;
  if(name==='suporte')return '/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html?area='+area+access+from+'&v='+REVISION;
  if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+from+'&v='+REVISION;
  if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+from+'&v='+REVISION;
  if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+access+from+'&v='+REVISION;
  if(name==='territorio')return '/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html?from=central&v='+REVISION;
  if(name==='municipios')return '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html?from=central&v='+REVISION;
  if(name==='portal')return '/atendimento-acs-farmaceutico/?area='+area+'&from=central&v='+REVISION;
  return '';
}

function installSafeNavigation(){
  if(document.documentElement.dataset[SAFE_NAV_FLAG]==='1')return;
  document.documentElement.dataset[SAFE_NAV_FLAG]='1';

  document.addEventListener('click',function(event){
    var target=event.target;
    var button=target&&target.closest?target.closest('.module[data-module]'):null;
    if(!button||button.hidden||button.disabled)return;
    if(!hasAnySession()&&button.dataset.module!=='portal')return;

    var url=moduleUrl(button.dataset.module||'');
    if(!url)return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    try{
      sessionStorage.setItem(RETURN_KEY,location.href);
      sessionStorage.setItem('portalTacsRetornoCentralV1','1');
    }catch(e){}

    button.setAttribute('aria-busy','true');
    button.style.pointerEvents='none';
    location.assign(url);
  },true);
}

function boot(){
  installPaintGuard();
  installSafeNavigation();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
window.addEventListener('pageshow',boot);
}());
