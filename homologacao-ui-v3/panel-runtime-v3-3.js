(function(){
'use strict';
if(window.PortalTacsPanelRuntimeV33)return;
window.PortalTacsPanelRuntimeV33=true;

var ADMIN='portalTacsAdminTokenV1';
var TERR='portalTacsTerritorioTokenV1';
function text(v){return String(v==null?'':v).trim()}
function admin(){try{return text(sessionStorage.getItem(ADMIN)||'')}catch(e){return''}}
function tacs(){try{return text(sessionStorage.getItem(TERR)||'')}catch(e){return''}}
function hasSession(){return !!(admin()||tacs())}
function params(){try{return new URLSearchParams(location.search||'')}catch(e){return new URLSearchParams()}}
function centralUrl(){return '/atendimento-acs-farmaceutico/homologacao-ui-v3/central-administrativa.html'+(tacs()?'?acesso=tacs':'')}

function showExistingSession(root){
  if(!hasSession())return;root=root||document;
  var html=root.documentElement||document.documentElement;if(html){html.classList.add('v3-session-reused');html.dataset.v3Session=tacs()?'tacs':'admin'}
  ['loginPanel','adminLogin','tacsLogin','loginAdminTab','loginTacsTab','adminPin','tacsPinLogin','adminLoginButton','tacsLoginButton','logoutButton','loginStatus'].forEach(function(id){var n=root.getElementById&&root.getElementById(id);if(n)n.style.setProperty('display','none','important')});
  var dash=root.getElementById&&root.getElementById('dashboard');if(dash){dash.hidden=false;dash.classList.remove('hidden','oculto')}
  var genericPin=root.getElementById&&root.getElementById('pin');if(genericPin)genericPin.hidden=true;
  var genericEnter=root.getElementById&&root.getElementById('entrar');if(genericEnter)genericEnter.hidden=true;
  var accessTitle=root.getElementById&&root.getElementById('accessTitle');if(accessTitle)accessTitle.hidden=true;
  var actions=root.getElementById&&root.getElementById('accessActions');
  if(actions)Array.prototype.forEach.call(actions.querySelectorAll('button'),function(b){var s=text(b.textContent).toLowerCase();if(/^(entrar|validar|acessar|carregar)/.test(s))b.hidden=true});
}
function hideTransientWaits(root){
  if(!hasSession())return;root=root||document;
  Array.prototype.forEach.call(root.querySelectorAll('.status,.empty,.vazio,.loading,.carregando'),function(n){
    var s=text(n.textContent).toLowerCase();
    if(/^(aguardando|aguarde|validando|verificando|carregando|conectando|preparando|consultando)/.test(s)&&!/erro|falha|indispon|expirad/.test(s))n.classList.add('v3-loading-hidden');
    else if(n.classList.contains('v3-loading-hidden')&&!/^(aguardando|aguarde|validando|verificando|carregando|conectando|preparando|consultando)/.test(s))n.classList.remove('v3-loading-hidden');
  });
}
function normalizeRepair(root){
  root=root||document;
  Array.prototype.forEach.call(root.querySelectorAll('button,.repair,.btn,.botao'),function(b){
    if(!/reparo já solicitado/i.test(text(b.textContent)))return;
    b.textContent='✓ Reparo solicitado • aguardando nova checagem';b.classList.add('v33-repair-requested');
    var card=b.closest('.device,.saude-aparelho,.card,.ticket,.item,article');if(!card)return;
    Array.prototype.forEach.call(card.querySelectorAll('.pill,.status,.signal,.badge,.reason,.sub'),function(n){
      var s=text(n.textContent);
      if(/ação do morador necessária|reparo detectado no aparelho/i.test(s)){
        n.textContent='Reparo solicitado • aguardando nova checagem';n.classList.add('v33-repair-requested');
      }
    });
  });
}
function addBack(){
  if(document.getElementById('v3BackCentral'))return;
  if(String(params().get('from')||'').toLowerCase()!=='central')return;
  var b=document.createElement('button');b.id='v3BackCentral';b.type='button';b.setAttribute('aria-label','Voltar à Central');b.textContent='‹';b.addEventListener('click',function(){try{window.top.location.href=centralUrl()}catch(e){location.href=centralUrl()}});document.body.appendChild(b);
}
function injectTheme(doc){
  if(!doc||!doc.head||!doc.documentElement)return;
  [['v33BaseTheme','/atendimento-acs-farmaceutico/homologacao-ui-v3/painel-v3.css?v=20260909-2'],['v33PatchTheme','/atendimento-acs-farmaceutico/homologacao-ui-v3/painel-v3-3-patch.css?v=20260909-3']].forEach(function(x){if(doc.getElementById(x[0]))return;var l=doc.createElement('link');l.id=x[0];l.rel='stylesheet';l.href=x[1];doc.head.appendChild(l)});
  showExistingSession(doc);hideTransientWaits(doc);normalizeRepair(doc);
}
function watchDocument(doc){
  if(!doc||!doc.documentElement||doc.documentElement.dataset.v33Observed==='1')return;
  doc.documentElement.dataset.v33Observed='1';
  var obs=new MutationObserver(function(){showExistingSession(doc);hideTransientWaits(doc);normalizeRepair(doc)});
  obs.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']});
}
function themeFrames(){
  Array.prototype.forEach.call(document.querySelectorAll('iframe'),function(fr){
    if(fr.dataset.v33ThemeHook==='1')return;fr.dataset.v33ThemeHook='1';
    function apply(){try{var d=fr.contentDocument;if(d&&d.location&&d.location.origin===location.origin){injectTheme(d);watchDocument(d)}}catch(e){}}
    fr.addEventListener('load',apply);setTimeout(apply,0);
  });
}
function sweep(){showExistingSession(document);hideTransientWaits(document);normalizeRepair(document);themeFrames()}
function observe(){var obs=new MutationObserver(function(){sweep()});obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']})}
function boot(){sweep();addBack();observe();var ticks=0,t=setInterval(function(){ticks++;sweep();if(ticks>=24)clearInterval(t)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',sweep);
}());