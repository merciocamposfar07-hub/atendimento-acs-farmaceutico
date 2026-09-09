(function(){
'use strict';
if(window.PortalTacsSessionV3)return;
window.PortalTacsSessionV3=true;

var ADMIN='portalTacsAdminTokenV1';
var TERR='portalTacsTerritorioTokenV1';
var LAST='portalTacsUltimaInteracaoHumanaV3';
var EXCLUSIVE='portalTacsModoExclusivoV2';
var IDLE_MS=60*60*1000;
var CHECK_MS=15000;
var lastWrite=0;
var expiring=false;

function text(v){return String(v==null?'':v).trim()}
function adminToken(){try{return text(sessionStorage.getItem(ADMIN)||'')}catch(e){return''}}
function tacsToken(){try{return text(sessionStorage.getItem(TERR)||'')}catch(e){return''}}
function hasSession(){return !!(adminToken()||tacsToken())}
function sessionKind(){return tacsToken()?'tacs':(adminToken()?'admin':'')}
function readLast(){try{return Number(sessionStorage.getItem(LAST)||0)||0}catch(e){return 0}}
function writeLast(force){
  if(!hasSession())return;
  var now=Date.now();
  if(!force&&now-lastWrite<4000)return;
  lastWrite=now;
  try{sessionStorage.setItem(LAST,String(now))}catch(e){}
}
function clearSession(){
  try{
    sessionStorage.removeItem(ADMIN);
    sessionStorage.removeItem(TERR);
    sessionStorage.removeItem(LAST);
    sessionStorage.removeItem(EXCLUSIVE);
    sessionStorage.removeItem('portalTacsTerritorioTokenV1');
    sessionStorage.removeItem('portalTacsCentralReturnUrlV1');
    sessionStorage.removeItem('portalTacsRetornoCentralV1');
  }catch(e){}
}
function centralUrl(kind){
  var base='/atendimento-acs-farmaceutico/homologacao-ui-v3/central-administrativa.html';
  return base+(kind==='tacs'?'?acesso=tacs&sessao=expirada':'?sessao=expirada');
}
function expire(){
  if(expiring)return;
  expiring=true;
  var kind=sessionKind();
  clearSession();
  try{location.replace(centralUrl(kind))}catch(e){location.href=centralUrl(kind)}
}
function check(){
  if(!hasSession())return;
  var last=readLast();
  if(!last){writeLast(true);return}
  if(Date.now()-last>=IDLE_MS)expire();
}
function human(){writeLast(false)}

['pointerdown','touchstart','keydown','input','change'].forEach(function(type){
  window.addEventListener(type,human,{capture:true,passive:type!=='keydown'&&type!=='input'&&type!=='change'});
});
window.addEventListener('scroll',human,{capture:true,passive:true});
window.addEventListener('focus',function(){check();writeLast(false)});
window.addEventListener('pageshow',function(){check();writeLast(false)});
document.addEventListener('visibilitychange',function(){if(!document.hidden){check();writeLast(false)}});

if(hasSession()){
  check();
  writeLast(false);
}
setInterval(check,CHECK_MS);

window.PortalTacsSessionV3Api={
  idleMs:IDLE_MS,
  touch:function(){writeLast(true)},
  check:check,
  clear:clearSession,
  kind:sessionKind,
  hasSession:hasSession
};
}());
