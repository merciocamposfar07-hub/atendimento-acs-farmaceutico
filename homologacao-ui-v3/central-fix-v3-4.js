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

function text(v){return String(v==null?'':v).trim()}
function admin(){try{return text(sessionStorage.getItem(ADMIN)||'')}catch(e){return''}}
function tacs(){try{return text(sessionStorage.getItem(TERR)||'')}catch(e){return''}}
function isAdmin(){return !!admin()&&!tacs()}

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

function sweep(){setAdminIdentity();defaultAdminAreaOnce()}
function boot(){
  sweep();
  var obs=new MutationObserver(function(){sweep()});
  obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']});
  var ticks=0,t=setInterval(function(){ticks++;sweep();if(ticks>=40)clearInterval(t)},250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',sweep);
}());
