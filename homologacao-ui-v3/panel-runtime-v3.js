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

  var pin=document.getElementById('pin'); if(pin)pin.hidden=true;
  var pinLabel=document.getElementById('pinLabel')||document.querySelector('label[for="pin"]'); if(pinLabel)pinLabel.hidden=true;
  var pinHelp=document.getElementById('pinHelp'); if(pinHelp)pinHelp.hidden=true;
  var title=document.getElementById('accessTitle'); if(title)title.hidden=true;
  var entrar=document.getElementById('entrar'); if(entrar)entrar.hidden=true;

  var actions=document.getElementById('accessActions');
  if(actions){
    Array.prototype.forEach.call(actions.querySelectorAll('button'),function(b){
      var s=text(b.textContent).toLowerCase();
      if(/^(entrar|validar|acessar|carregar)/.test(s))b.hidden=true;
    });
  }
  var loginStatus=document.getElementById('loginStatus');
  if(loginStatus&&!/erro|err/.test(loginStatus.className||''))loginStatus.classList.add('v3-loading-hidden');
}

function hideTransientWaits(root){
  if(!hasSession())return;
  root=root||document;
  Array.prototype.forEach.call(root.querySelectorAll('.status'),function(n){
    var s=text(n.textContent).toLowerCase();
    if(/^(aguarde|validando|verificando|carregando|conectando|preparando)/.test(s)&&!/erro|falha|indispon/.test(s))n.classList.add('v3-loading-hidden');
    if(/dados exibidos da última leitura|atualizando dados em segundo plano/.test(s))n.classList.add('v3-loading-hidden');
  });
}

function addBack(){
  if(document.getElementById('v3BackCentral'))return;
  var p=params();
  if(String(p.get('from')||'').toLowerCase()!=='central')return;
  var b=document.createElement('button');
  b.id='v3BackCentral';b.type='button';b.setAttribute('aria-label','Voltar à Central');b.textContent='‹';
  b.addEventListener('click',function(){location.href=centralUrl()});
  document.body.appendChild(b);
}

function observe(){
  var obs=new MutationObserver(function(muts){
    markSession();
    muts.forEach(function(m){m.addedNodes&&Array.prototype.forEach.call(m.addedNodes,function(n){if(n&&n.querySelectorAll)hideTransientWaits(n)})});
    hideTransientWaits(document);
  });
  obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden']});
}

function boot(){
  markSession();
  hideTransientWaits(document);
  addBack();
  observe();
  var s=window.PortalTacsSessionV3Api;if(s&&typeof s.touch==='function')s.touch();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',function(){markSession();hideTransientWaits(document)});
}());
