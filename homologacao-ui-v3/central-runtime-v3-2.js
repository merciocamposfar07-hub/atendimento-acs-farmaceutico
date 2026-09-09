(function(){
'use strict';
if(window.PortalTacsCentralRuntimeV32)return;
window.PortalTacsCentralRuntimeV32=true;

var ADMIN='portalTacsAdminTokenV1';
var TERR='portalTacsTerritorioTokenV1';
var AREA='portalTacsCentralAreaV1';
function text(v){return String(v==null?'':v).trim()}
function admin(){try{return text(sessionStorage.getItem(ADMIN)||'')}catch(e){return''}}
function tacs(){try{return text(sessionStorage.getItem(TERR)||'')}catch(e){return''}}
function q(){try{return new URLSearchParams(location.search||'')}catch(e){return new URLSearchParams()}}
function tacsOnly(){return String(q().get('acesso')||'').toLowerCase()==='tacs'||!!tacs()}
function hasSession(){return !!(admin()||tacs())}
function area(){
  var select=document.getElementById('adminArea');
  var a=text(select&&select.value).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64);
  if(a)return a;
  try{a=text(localStorage.getItem(AREA)||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}catch(e){}
  return a||'JAPARANDUBA';
}
function sessionTouch(){var s=window.PortalTacsSessionV3Api;if(s&&typeof s.touch==='function')s.touch()}
function shell(name){return '/atendimento-acs-farmaceutico/homologacao-ui-v3/painel.html?target='+encodeURIComponent(name)+'&area='+encodeURIComponent(area())+'&from=central'+(tacsOnly()?'&acesso=tacs':'')+'&v=20260909-2'}
function publicPortal(){return '/atendimento-acs-farmaceutico/?area='+encodeURIComponent(area())+'&from=central'}

document.addEventListener('click',function(e){
  var target=e.target,b=target&&target.closest?target.closest('.module[data-module]'):null;
  if(!b||b.hidden||b.disabled)return;
  var name=text(b.dataset.module).toLowerCase();if(!name)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();sessionTouch();
  if(name==='portal'){window.open(publicPortal(),'_blank','noopener');return}
  location.assign(shell(name));
},true);

function style(){
  if(document.getElementById('v32CentralPatch'))return;
  var s=document.createElement('style');s.id='v32CentralPatch';s.textContent='\
#healthPanel{display:none!important}\
input,select,textarea,.field{font-size:16px!important}\
body.v32-admin .login-tabs,body.v32-admin #tacsLogin{display:none!important}\
body.v32-tacs .login-tabs,body.v32-tacs #adminLogin{display:none!important}\
#loginStatus.v32-passive{display:none!important}\
';(document.head||document.documentElement).appendChild(s);
}
function modeUi(){
  if(!document.body)return;
  document.body.classList.toggle('v32-tacs',tacsOnly());document.body.classList.toggle('v32-admin',!tacsOnly());
  var tabA=document.getElementById('tabAdmin'),tabT=document.getElementById('tabTacs'),adminLogin=document.getElementById('adminLogin'),tacsLogin=document.getElementById('tacsLogin');
  if(tacsOnly()){
    if(tabA&&!tabA.hidden)tabA.hidden=true;if(tabT&&!tabT.hidden)tabT.hidden=true;if(adminLogin&&!adminLogin.hidden)adminLogin.hidden=true;if(tacsLogin&&tacsLogin.hidden)tacsLogin.hidden=false;
  }else{
    if(tabA&&!tabA.hidden)tabA.hidden=true;if(tabT&&!tabT.hidden)tabT.hidden=true;if(tacsLogin&&!tacsLogin.hidden)tacsLogin.hidden=true;if(adminLogin&&adminLogin.hidden)adminLogin.hidden=false;
  }
  var status=document.getElementById('loginStatus');if(status&&hasSession()&&!/erro|err/.test(status.className||''))status.classList.add('v32-passive');
}
function expiredMessage(){
  if(String(q().get('sessao')||'').toLowerCase()!=='expirada')return;
  var n=document.getElementById('loginStatus'),msg='Sessão encerrada após 1 hora sem interação. Digite seu PIN novamente.';
  if(n&&text(n.textContent)!==msg){n.classList.remove('v32-passive');n.className='status warn';n.textContent=msg}
}

var sources={moradores:'/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html',suporte:'/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html',recados:'/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html',agendas:'/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html',profissionais:'/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html',territorio:'/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html',municipios:'/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html'};
var warmed={};
function warmOne(name){if(warmed[name]||!sources[name])return;warmed[name]=1;var u=sources[name]+'?area='+encodeURIComponent(area())+'&from=central'+(tacsOnly()?'&acesso=tacs':'')+'&v=20260909-warm';try{fetch(u,{credentials:'same-origin',cache:'force-cache'}).catch(function(){})}catch(e){}}
function warmAll(){if(!hasSession())return;var names=Object.keys(sources),i=0;function next(){if(i>=names.length)return;warmOne(names[i++]);setTimeout(next,90)}if('requestIdleCallback'in window)requestIdleCallback(next,{timeout:700});else setTimeout(next,500)}
function pollSession(){
  var ticks=0,t=setInterval(function(){ticks++;modeUi();expiredMessage();if(hasSession()){sessionTouch();warmAll();if(ticks>12)clearInterval(t)}else if(ticks>40)clearInterval(t)},250);
}
function boot(){style();modeUi();expiredMessage();pollSession();if(hasSession()){sessionTouch();warmAll()}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',function(){modeUi();expiredMessage();if(hasSession()){sessionTouch();warmAll()}});
}());
