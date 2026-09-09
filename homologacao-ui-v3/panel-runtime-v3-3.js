(function(){
'use strict';
if(window.PortalTacsPanelRuntimeV33)return;
window.PortalTacsPanelRuntimeV33=true;

var ADMIN='portalTacsAdminTokenV1';
var TERR='portalTacsTerritorioTokenV1';
var HEALTH_PREFIX='portalTacsHealthCacheV33:';
function text(v){return String(v==null?'':v).trim()}
function admin(){try{return text(sessionStorage.getItem(ADMIN)||'')}catch(e){return''}}
function tacs(){try{return text(sessionStorage.getItem(TERR)||'')}catch(e){return''}}
function hasSession(){return !!(admin()||tacs())}
function params(){try{return new URLSearchParams(location.search||'')}catch(e){return new URLSearchParams()}}
function currentArea(){return text(params().get('area')||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)||'JAPARANDUBA'}
function centralUrl(){return '/atendimento-acs-farmaceutico/homologacao-ui-v3/central-administrativa.html'+(tacs()?'?acesso=tacs':'')+'&v=20260909-3'}

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
    if(text(b.textContent)!=='✓ Reparo solicitado • aguardando nova checagem')b.textContent='✓ Reparo solicitado • aguardando nova checagem';
    b.classList.add('v33-repair-requested');
    var card=b.closest('.device,.saude-aparelho,.card,.ticket,.item,article');if(!card)return;
    Array.prototype.forEach.call(card.querySelectorAll('.pill,.status,.signal,.badge,.reason,.sub'),function(n){
      var s=text(n.textContent);
      if(/ação do morador necessária|reparo detectado no aparelho/i.test(s)){
        if(s!=='Reparo solicitado • aguardando nova checagem')n.textContent='Reparo solicitado • aguardando nova checagem';
        n.classList.add('v33-repair-requested');
      }
    });
  });
}
function addBack(){
  if(document.getElementById('v3BackCentral'))return;
  if(String(params().get('from')||'').toLowerCase()!=='central')return;
  var b=document.createElement('button');b.id='v3BackCentral';b.type='button';b.setAttribute('aria-label','Voltar à Central');b.textContent='‹';b.addEventListener('click',function(){try{window.top.location.href=centralUrl()}catch(e){location.href=centralUrl()}});document.body.appendChild(b);
}
function installLateVisualGuard(root){
  root=root||document;if(!root.head||root.getElementById('v33LateVisualGuard'))return;
  var s=root.createElement('style');s.id='v33LateVisualGuard';s.textContent='\
html,body{background:#061421!important;background-image:linear-gradient(180deg,#0b2238 0%,#081829 46%,#061421 100%)!important;color:#f5fbff!important}\
header,main,footer{background:transparent!important;background-image:none!important;border:0!important;box-shadow:none!important}\
.panel,.painel,.card.caixa{background:transparent!important;background-image:none!important;border:0!important;box-shadow:none!important}\
.card:not(.caixa),.item,.numero,.number,.metric,.device,.saude-aparelho,.ticket,.areaEnvio,.maprow,.area-row,.check,.grupoProfissional,.cartao,details{background:linear-gradient(145deg,rgba(24,62,92,.97),rgba(7,29,46,.99))!important;color:#fff!important;border-color:rgba(105,199,231,.34)!important;box-shadow:inset 0 2px 0 rgba(255,255,255,.12),inset 0 -12px 22px rgba(0,0,0,.18),0 16px 30px rgba(0,0,0,.24)!important}\
button,.btn,.botao,.aba,.tab,.refresh,.top-refresh,.clear,.repair,.save{box-shadow:inset 0 2px 0 rgba(255,255,255,.22),inset 0 -8px 15px rgba(0,0,0,.18),0 13px 25px rgba(0,0,0,.27),0 3px 0 rgba(2,15,25,.72)!important}\
.v3-loading-hidden{display:none!important}\
input,select,textarea,.field,.campo{font-size:16px!important}\
';root.head.appendChild(s);
}
function renderSupportHealth(root){
  root=root||document;
  if(!hasSession()||!root.getElementById||!root.getElementById('ticketsPane')||!root.getElementById('devicesPane'))return;
  var raw='';try{raw=sessionStorage.getItem(HEALTH_PREFIX+currentArea())||''}catch(e){}
  if(!raw)return;
  var cache=null;try{cache=JSON.parse(raw)}catch(e){return}
  var items=cache&&Array.isArray(cache.items)?cache.items.filter(function(x){var v=text(x&&x.value);return v&&!/verificando/i.test(v)}):[];
  if(!items.length)return;
  var section=root.getElementById('v33SupportHealth');
  if(!section){
    section=root.createElement('section');section.id='v33SupportHealth';section.className='v33-support-health';
    var tabs=root.querySelector('.tabs');if(tabs&&tabs.parentNode)tabs.parentNode.insertBefore(section,tabs);else{var main=root.querySelector('main');if(main)main.insertBefore(section,main.firstChild)}
  }
  var signature=JSON.stringify(items.map(function(x){return[x.label,x.value,x.state]}));if(section.dataset.signature===signature)return;section.dataset.signature=signature;
  section.innerHTML='<div class="v33-health-head"><div><h2>Saúde geral</h2><p>Visão operacional da área selecionada.</p></div></div><div class="v33-health-grid">'+items.map(function(x){var state=/err/i.test(x.state||'')?'err':(/warn/i.test(x.state||'')?'warn':'ok');return'<div class="v33-health-card '+state+'"><strong>'+escapeHtml(x.label)+'</strong><span>'+escapeHtml(x.value)+'</span></div>'}).join('')+'</div>';
}
function escapeHtml(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function injectTheme(doc){
  if(!doc||!doc.head||!doc.documentElement)return;
  [['v33BaseTheme','/atendimento-acs-farmaceutico/homologacao-ui-v3/painel-v3.css?v=20260909-2'],['v33PatchTheme','/atendimento-acs-farmaceutico/homologacao-ui-v3/painel-v3-3-patch.css?v=20260909-3']].forEach(function(x){if(doc.getElementById(x[0]))return;var l=doc.createElement('link');l.id=x[0];l.rel='stylesheet';l.href=x[1];doc.head.appendChild(l)});
  installLateVisualGuard(doc);showExistingSession(doc);hideTransientWaits(doc);normalizeRepair(doc);renderSupportHealth(doc);
}
function watchDocument(doc){
  if(!doc||!doc.documentElement||doc.documentElement.dataset.v33Observed==='1')return;
  doc.documentElement.dataset.v33Observed='1';
  var obs=new MutationObserver(function(){installLateVisualGuard(doc);showExistingSession(doc);hideTransientWaits(doc);normalizeRepair(doc);renderSupportHealth(doc)});
  obs.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']});
}
function themeFrames(){
  Array.prototype.forEach.call(document.querySelectorAll('iframe'),function(fr){
    if(fr.dataset.v33ThemeHook==='1')return;fr.dataset.v33ThemeHook='1';
    function apply(){try{var d=fr.contentDocument;if(d&&d.location&&d.location.origin===location.origin){injectTheme(d);watchDocument(d)}}catch(e){}}
    fr.addEventListener('load',apply);setTimeout(apply,0);
  });
}
function sweep(){installLateVisualGuard(document);showExistingSession(document);hideTransientWaits(document);normalizeRepair(document);renderSupportHealth(document);themeFrames()}
function observe(){var obs=new MutationObserver(function(){sweep()});obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']})}
function boot(){sweep();addBack();observe();var ticks=0,t=setInterval(function(){ticks++;sweep();if(ticks>=32)clearInterval(t)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',sweep);
}());