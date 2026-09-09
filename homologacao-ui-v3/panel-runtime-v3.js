(function(){
'use strict';
if(window.PortalTacsPanelRuntimeV3)return;
window.PortalTacsPanelRuntimeV3=true;

var ADMIN='portalTacsAdminTokenV1';
var TERR='portalTacsTerritorioTokenV1';
function text(v){return String(v==null?'':v).trim()}
function admin(){try{return text(sessionStorage.getItem(ADMIN)||'')}catch(e){return''}}
function tacs(){try{return text(sessionStorage.getItem(TERR)||'')}catch(e){return''}}
function hasSession(){return !!(admin()||tacs())}
function params(){try{return new URLSearchParams(location.search||'')}catch(e){return new URLSearchParams()}}
function centralUrl(){return '/atendimento-acs-farmaceutico/homologacao-ui-v3/central-administrativa.html'+(tacs()?'?acesso=tacs':'')}

function markSession(){
  if(!hasSession())return;
  document.documentElement.classList.add('v3-session-reused');
  document.documentElement.dataset.v3Session=tacs()?'tacs':'admin';
  var pin=document.getElementById('pin');if(pin&&!pin.hidden)pin.hidden=true;
  var pinLabel=document.getElementById('pinLabel')||document.querySelector('label[for="pin"]');if(pinLabel&&!pinLabel.hidden)pinLabel.hidden=true;
  var pinHelp=document.getElementById('pinHelp');if(pinHelp&&!pinHelp.hidden)pinHelp.hidden=true;
  var title=document.getElementById('accessTitle');if(title&&!title.hidden)title.hidden=true;
  var entrar=document.getElementById('entrar');if(entrar&&!entrar.hidden)entrar.hidden=true;
  var actions=document.getElementById('accessActions');
  if(actions)Array.prototype.forEach.call(actions.querySelectorAll('button'),function(b){var s=text(b.textContent).toLowerCase();if(/^(entrar|validar|acessar|carregar)/.test(s)&&!b.hidden)b.hidden=true});
  var loginStatus=document.getElementById('loginStatus');if(loginStatus&&!/erro|err/.test(loginStatus.className||''))loginStatus.classList.add('v3-loading-hidden');
}
function hideTransientWaits(root){
  if(!hasSession())return;root=root||document;
  Array.prototype.forEach.call(root.querySelectorAll('.status'),function(n){
    var s=text(n.textContent).toLowerCase();
    if(/^(aguarde|validando|verificando|carregando|conectando|preparando)/.test(s)&&!/erro|falha|indispon/.test(s))n.classList.add('v3-loading-hidden');
    if(/dados exibidos da última leitura|atualizando dados em segundo plano/.test(s))n.classList.add('v3-loading-hidden');
  });
}
function addBack(){
  if(document.getElementById('v3BackCentral'))return;
  var p=params();if(String(p.get('from')||'').toLowerCase()!=='central')return;
  var b=document.createElement('button');b.id='v3BackCentral';b.type='button';b.setAttribute('aria-label','Voltar à Central');b.textContent='‹';b.addEventListener('click',function(){location.href=centralUrl()});document.body.appendChild(b);
}
function sweep(){markSession();hideTransientWaits(document)}
function observe(){
  var obs=new MutationObserver(function(muts){
    muts.forEach(function(m){
      if(m.type==='characterData'){var p=m.target&&m.target.parentElement;if(p&&p.closest&&p.closest('.status'))hideTransientWaits(document)}
      if(m.addedNodes)Array.prototype.forEach.call(m.addedNodes,function(n){if(n&&n.querySelectorAll)hideTransientWaits(n)});
    });
  });
  obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
}
function boot(){
  sweep();addBack();observe();
  var api=window.PortalTacsSessionV3Api;if(api&&typeof api.touch==='function')api.touch();
  var ticks=0,t=setInterval(function(){ticks++;sweep();if(ticks>=40)clearInterval(t)},500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',sweep);
}());
