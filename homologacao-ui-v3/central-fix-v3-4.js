(function(){
'use strict';
if(window.PortalTacsCentralFixV34)return;
window.PortalTacsCentralFixV34=true;

var ADMIN='portalTacsAdminTokenV1';
var TERR='portalTacsTerritorioTokenV1';
var AREA='portalTacsCentralAreaV1';
var ADMIN_NAME='portalTacsAdminNomeV33';
var DEFAULT_MARK='portalTacsV34DefaultAdminToken';
var DEFAULT_AREA='JAPARANDUBA';
var DEFAULT_NAME='Mércio Campos';
var warmed='';

function text(v){return String(v==null?'':v).trim()}
function admin(){try{return text(sessionStorage.getItem(ADMIN)||'')}catch(e){return''}}
function tacs(){try{return text(sessionStorage.getItem(TERR)||'')}catch(e){return''}}
function isAdmin(){return !!admin()&&!tacs()}
function hasSession(){return !!(admin()||tacs())}

function installVisual(){
  if(document.getElementById('centralHighlightV34'))return;
  var l=document.createElement('link');l.id='centralHighlightV34';l.rel='stylesheet';l.href='/atendimento-acs-farmaceutico/homologacao-ui-v3/central-highlight-v3-4.css?v=20260909-4';
  (document.head||document.documentElement).appendChild(l);
}

function setAdminIdentity(){
  if(!isAdmin())return;
  try{sessionStorage.setItem(ADMIN_NAME,DEFAULT_NAME)}catch(e){}
  var label=document.getElementById('profileLabel');
  var name=document.getElementById('professionalName');
  if(label&&text(label.textContent)!=='ADMINISTRADOR GERAL')label.textContent='ADMINISTRADOR GERAL';
  if(name&&text(name.textContent)!==DEFAULT_NAME)name.textContent=DEFAULT_NAME;
}

function defaultAdminAreaOnce(){
  if(!isAdmin())return;
  var token=admin(),done='';
  try{done=text(sessionStorage.getItem(DEFAULT_MARK)||'')}catch(e){}
  if(done===token)return;
  try{localStorage.setItem(AREA,DEFAULT_AREA);sessionStorage.setItem(DEFAULT_MARK,token)}catch(e){}
  var select=document.getElementById('adminArea');
  if(!select)return;
  var found=false;
  Array.prototype.forEach.call(select.options||[],function(o){if(String(o.value||'').toUpperCase()===DEFAULT_AREA)found=true});
  if(found&&String(select.value||'').toUpperCase()!==DEFAULT_AREA){
    select.value=DEFAULT_AREA;
    try{select.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){var ev=document.createEvent('Event');ev.initEvent('change',true,true);select.dispatchEvent(ev)}
  }
}

function warmV34(){
  if(!hasSession())return;
  var key=(tacs()?'tacs:':'admin:')+(function(){try{return text(localStorage.getItem(AREA)||DEFAULT_AREA)}catch(e){return DEFAULT_AREA}})();
  if(key===warmed)return;warmed=key;
  [
    '/atendimento-acs-farmaceutico/homologacao-ui-v3/painel-v3-3.html?v=20260909-4',
    '/atendimento-acs-farmaceutico/homologacao-ui-v3/painel-v3-4-patch.css?v=20260909-4',
    '/atendimento-acs-farmaceutico/homologacao-ui-v3/panel-fix-v3-4.js?v=20260909-4',
    '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?v=20260909-warm-v34'
  ].forEach(function(u){try{fetch(u,{cache:'force-cache',credentials:'same-origin'}).catch(function(){})}catch(e){}});
}

function sweep(){installVisual();setAdminIdentity();defaultAdminAreaOnce();warmV34()}
function boot(){
  sweep();
  var obs=new MutationObserver(function(){sweep()});
  obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']});
  var select=document.getElementById('adminArea');if(select)select.addEventListener('change',function(){warmed='';setTimeout(sweep,0)});
  var ticks=0,t=setInterval(function(){ticks++;sweep();if(ticks>=40)clearInterval(t)},250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',function(){warmed='';sweep()});
}());
