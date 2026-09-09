(function(){
'use strict';
if(window.PortalTacsCentralRuntimeV33)return;
window.PortalTacsCentralRuntimeV33=true;

var ADMIN='portalTacsAdminTokenV1';
var TERR='portalTacsTerritorioTokenV1';
var AREA='portalTacsCentralAreaV1';
var ADMIN_NAME='portalTacsAdminNomeV33';
var HEALTH_PREFIX='portalTacsHealthCacheV33:';
function text(v){return String(v==null?'':v).trim()}
function admin(){try{return text(sessionStorage.getItem(ADMIN)||'')}catch(e){return''}}
function tacs(){try{return text(sessionStorage.getItem(TERR)||'')}catch(e){return''}}
function hasSession(){return !!(admin()||tacs())}
function q(){try{return new URLSearchParams(location.search||'')}catch(e){return new URLSearchParams()}}
function tacsOnly(){return String(q().get('acesso')||'').toLowerCase()==='tacs'||(!admin()&&!!tacs())}
function area(){
  var select=document.getElementById('adminArea');
  var a=text(select&&select.value).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64);
  if(a)return a;
  try{a=text(localStorage.getItem(AREA)||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}catch(e){}
  return a||'JAPARANDUBA';
}
function shell(name){return '/atendimento-acs-farmaceutico/homologacao-ui-v3/painel-v3-3.html?target='+encodeURIComponent(name)+'&area='+encodeURIComponent(area())+'&from=central'+(tacsOnly()?'&acesso=tacs':'')+'&v=20260909-3'}
function publicPortal(){return '/atendimento-acs-farmaceutico/?area='+encodeURIComponent(area())+'&from=central'}

document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('.module[data-module]'):null;
  if(!b||b.hidden||b.disabled)return;
  var name=text(b.dataset.module).toLowerCase();if(!name)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(name==='portal'){window.open(publicPortal(),'_blank','noopener');return}
  location.assign(shell(name));
},true);

function installStyle(){
  if(document.getElementById('v33CentralPatch'))return;
  var s=document.createElement('style');s.id='v33CentralPatch';s.textContent='\
#healthPanel{display:none!important}\
input,select,textarea,.field{font-size:16px!important}\
body.v33-admin .login-tabs,body.v33-admin #tacsLogin{display:none!important}\
body.v33-tacs .login-tabs,body.v33-tacs #adminLogin{display:none!important}\
#loginStatus.v33-passive{display:none!important}\
#identityPanel{align-items:center!important}\
#identityPanel #professionalName{display:block!important}\
#identityPanel .v33-context-label{display:block;margin-top:5px;color:#b8cbd8;font-size:.86rem;font-weight:750}\
.module>div{min-width:0!important}.module strong,.module>div>span{display:block!important;width:100%!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important}\
';(document.head||document.documentElement).appendChild(s);
}
function setHidden(n,v){if(n&&n.hidden!==v)n.hidden=v}
function modeUi(){
  if(!document.body)return;
  document.body.classList.toggle('v33-tacs',tacsOnly());
  document.body.classList.toggle('v33-admin',!tacsOnly());
  var tabA=document.getElementById('tabAdmin'),tabT=document.getElementById('tabTacs'),adminLogin=document.getElementById('adminLogin'),tacsLogin=document.getElementById('tacsLogin');
  if(tacsOnly()){setHidden(tabA,true);setHidden(tabT,true);setHidden(adminLogin,true);setHidden(tacsLogin,false)}
  else{setHidden(tabA,true);setHidden(tabT,true);setHidden(tacsLogin,true);setHidden(adminLogin,false)}
  var status=document.getElementById('loginStatus');
  if(status&&hasSession()&&!/erro|err|falha|expirad/i.test(status.className+' '+status.textContent)&&!status.classList.contains('v33-passive'))status.classList.add('v33-passive');
}
function fixAdminIdentity(){
  if(!admin()||tacs())return;
  var label=document.getElementById('profileLabel'),name=document.getElementById('professionalName');
  if(label&&text(label.textContent)!=='ADMINISTRADOR GERAL')label.textContent='ADMINISTRADOR GERAL';
  if(!name)return;
  var cached='';try{cached=text(sessionStorage.getItem(ADMIN_NAME)||'')}catch(e){}
  var current=text(name.textContent);
  if(!cached&&area()==='JAPARANDUBA'&&current&&current!=='—'&&!/administra/i.test(current)){cached=current;try{sessionStorage.setItem(ADMIN_NAME,cached)}catch(e){}}
  var desired=cached||'Administrador autenticado';if(text(name.textContent)!==desired)name.textContent=desired;
  var host=name.parentElement;if(host&&!host.querySelector('.v33-context-label')){var n=document.createElement('span');n.className='v33-context-label';n.textContent='A área abaixo é apenas o contexto de trabalho selecionado.';host.insertBefore(n,name.nextSibling)}
}
function expiredMessage(){
  if(String(q().get('sessao')||'').toLowerCase()!=='expirada')return;
  var n=document.getElementById('loginStatus'),msg='Sessão encerrada após 1 hora sem interação. Digite seu PIN novamente.';
  if(n&&text(n.textContent)!==msg){n.classList.remove('v33-passive');n.className='status warn';n.textContent=msg}
}
function cacheHealth(){
  if(!hasSession())return;
  var defs=[['healthPortal','Portal do Morador'],['healthResidents','Moradores'],['healthAgenda','Agendas'],['healthContent','Recados e campanhas'],['healthNotifications','Notificações'],['healthArea','Área e unidade']];
  var items=[],ready=false;
  defs.forEach(function(d){var card=document.getElementById(d[0]);if(!card)return;var span=card.querySelector('span'),v=text(span&&span.textContent);if(v&&!/verificando/i.test(v))ready=true;items.push({id:d[0],label:d[1],value:v,state:card.className||''})});
  if(!ready)return;
  try{sessionStorage.setItem(HEALTH_PREFIX+area(),JSON.stringify({area:area(),at:Date.now(),items:items}))}catch(e){}
}

var sources={
  moradores:'/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html',
  suporte:'/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html',
  recados:'/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html',
  agendas:'/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html',
  profissionais:'/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html',
  territorio:'/atendimento-acs-farmaceutico/teste-v1/painel-tacs-areas-v1.html',
  municipios:'/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html'
};
var warmKey='';
function warmAll(){
  if(!hasSession())return;
  var key=(tacsOnly()?'tacs:':'admin:')+area();if(key===warmKey)return;warmKey=key;
  var common='?area='+encodeURIComponent(area())+'&from=central'+(tacsOnly()?'&acesso=tacs':'')+'&v=20260909-warm-v33';
  try{fetch('/atendimento-acs-farmaceutico/homologacao-ui-v3/painel-v3-3.html',{cache:'force-cache',credentials:'same-origin'}).catch(function(){})}catch(e){}
  Object.keys(sources).forEach(function(name){try{fetch(sources[name]+common,{cache:'force-cache',credentials:'same-origin'}).catch(function(){})}catch(e){}});
  try{fetch('/atendimento-acs-farmaceutico/teste-v1/painel-profissionais-servicos-v1.html?v=20260816-profissionais-v3',{cache:'force-cache',credentials:'same-origin'}).catch(function(){})}catch(e){}
  ['/atendimento-acs-farmaceutico/homologacao-ui-v3/painel-v3.css?v=20260909-2','/atendimento-acs-farmaceutico/homologacao-ui-v3/painel-v3-3-patch.css?v=20260909-3','/atendimento-acs-farmaceutico/homologacao-ui-v3/session-v3-3.js?v=20260909-3','/atendimento-acs-farmaceutico/homologacao-ui-v3/panel-runtime-v3-3.js?v=20260909-3'].forEach(function(u){try{fetch(u,{cache:'force-cache'}).catch(function(){})}catch(e){}});
}
function sweep(){installStyle();modeUi();expiredMessage();fixAdminIdentity();cacheHealth();if(hasSession())warmAll()}
function observe(){var obs=new MutationObserver(function(){sweep()});obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']})}
function boot(){
  sweep();observe();
  var select=document.getElementById('adminArea');if(select)select.addEventListener('change',function(){warmKey='';setTimeout(sweep,0);setTimeout(sweep,80)});
  var ticks=0,t=setInterval(function(){ticks++;sweep();if(ticks>=24)clearInterval(t)},250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',function(){warmKey='';sweep()});
}());