(function(){
'use strict';
var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var ACCESS_MODE_KEY='portalTacsModoExclusivoV2';
function text(v){return String(v==null?'':v).trim()}
function queryTacs(){try{return String(new URLSearchParams(location.search).get('acesso')||'').toLowerCase()==='tacs'}catch(e){return false}}
function hasTerritorySession(){try{return !!text(sessionStorage.getItem(TERRITORY_TOKEN_KEY))}catch(e){return false}}
function markedTacs(){try{return sessionStorage.getItem(ACCESS_MODE_KEY)==='tacs'}catch(e){return false}}
function remember(){if(queryTacs()||hasTerritorySession()){try{sessionStorage.setItem(ACCESS_MODE_KEY,'tacs')}catch(e){}}}
function exclusive(){remember();return queryTacs()||hasTerritorySession()||markedTacs()}
function enforce(){
  if(!exclusive())return;
  var tabAdmin=document.getElementById('tabAdmin');
  var tabTacs=document.getElementById('tabTacs');
  var adminLogin=document.getElementById('adminLogin');
  var tacsLogin=document.getElementById('tacsLogin');
  var tabs=tabTacs&&tabTacs.parentNode;
  if(tabAdmin){tabAdmin.hidden=true;tabAdmin.classList.remove('active');tabAdmin.setAttribute('aria-hidden','true')}
  if(adminLogin)adminLogin.hidden=true;
  if(tabTacs){tabTacs.hidden=false;tabTacs.classList.add('active');tabTacs.setAttribute('aria-selected','true')}
  if(tabs&&tabs.style)tabs.style.gridTemplateColumns='1fr';
  var loginPanel=document.getElementById('loginPanel');
  if(loginPanel&&!loginPanel.hidden&&tacsLogin)tacsLogin.hidden=false;
}
remember();
enforce();
var observer=new MutationObserver(function(){enforce()});
if(document.body)observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','class','style']});
window.addEventListener('pageshow',enforce);
window.addEventListener('focus',enforce);
})();
