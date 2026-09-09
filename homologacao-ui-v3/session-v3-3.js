(function(){
'use strict';
if(window.PortalTacsSessionV33)return;
window.PortalTacsSessionV33=true;

var ADMIN='portalTacsAdminTokenV1';
var TERR='portalTacsTerritorioTokenV1';
var LAST='portalTacsUltimaInteracaoHumanaV3';
var EXCLUSIVE='portalTacsModoExclusivoV2';
var IDLE_MS=60*60*1000;
var CHECK_MS=10000;
var lastWrite=0,expiring=false;
function text(v){return String(v==null?'':v).trim()}
function adminToken(){try{return text(sessionStorage.getItem(ADMIN)||'')}catch(e){return''}}
function tacsToken(){try{return text(sessionStorage.getItem(TERR)||'')}catch(e){return''}}
function hasSession(){return !!(adminToken()||tacsToken())}
function sessionKind(){return tacsToken()?'tacs':(adminToken()?'admin':'')}
function readLast(){try{return Number(sessionStorage.getItem(LAST)||0)||0}catch(e){return 0}}
function writeLast(force){
  if(!hasSession())return;
  var now=Date.now();if(!force&&now-lastWrite<3000)return;lastWrite=now;
  try{sessionStorage.setItem(LAST,String(now))}catch(e){}
}
function clearSession(){
  try{
    sessionStorage.removeItem(ADMIN);sessionStorage.removeItem(TERR);sessionStorage.removeItem(LAST);sessionStorage.removeItem(EXCLUSIVE);
    sessionStorage.removeItem('portalTacsCentralReturnUrlV1');sessionStorage.removeItem('portalTacsRetornoCentralV1');sessionStorage.removeItem('portalTacsAdminNomeV33');
  }catch(e){}
}
function centralUrl(kind){var base='/atendimento-acs-farmaceutico/homologacao-ui-v3/central-administrativa.html';return base+(kind==='tacs'?'?acesso=tacs&sessao=expirada&v=20260909-3':'?sessao=expirada&v=20260909-3')}
function expire(){
  if(expiring)return;expiring=true;var kind=sessionKind();clearSession();
  try{if(window.top&&window.top!==window)window.top.location.replace(centralUrl(kind));else location.replace(centralUrl(kind))}catch(e){location.href=centralUrl(kind)}
}
function check(){
  if(!hasSession())return;
  var last=readLast();if(!last){writeLast(true);return}
  if(Date.now()-last>=IDLE_MS)expire();
}
function human(e){if(!e||e.isTrusted!==true)return;writeLast(false)}

/* Scroll não entra sozinho no relógio: rolagens programáticas do sistema não podem
   manter a sessão viva. Toque/pointer e wheel já registram a navegação humana. */
['pointerdown','touchstart','keydown','input','change','wheel'].forEach(function(type){
  window.addEventListener(type,human,{capture:true,passive:type==='pointerdown'||type==='touchstart'||type==='wheel'});
});
window.addEventListener('focus',check);window.addEventListener('pageshow',check);
document.addEventListener('visibilitychange',function(){if(!document.hidden)check()});
if(hasSession())check();setInterval(check,CHECK_MS);
window.PortalTacsSessionV3Api={idleMs:IDLE_MS,check:check,clear:clearSession,kind:sessionKind,hasSession:hasSession};
}());