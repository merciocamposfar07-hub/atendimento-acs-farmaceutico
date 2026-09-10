/*
 * Conecta Saúde Comunitária — comportamento do shell App institucional R6
 * Contrato: CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10-R6
 * Regra: identidade institucional única, reação ao toque e reaproveitamento visual da sessão.
 * Este script NÃO autentica nem cria sessão: apenas reutiliza os tokens já validados pelos módulos.
 */
(function(){
'use strict';
if(window.PortalTacsAdminApp4ShellR6)return;
window.PortalTacsAdminApp4ShellR6=true;

var ROOT=document.documentElement;
var PATH=String(location.pathname||'');
var CENTRAL=/\/central-administrativa-tacs\.html$/i.test(PATH);
var ADMIN_PANEL=CENTRAL||(
  /\/teste-v1\/painel-moradores-v2\.html$/i.test(PATH)||
  /\/painel-suporte-moradores(?:-v2)?\.html$/i.test(PATH)||
  /\/painel-oficial-(?:recados-campanhas|agendas-vagas|profissionais-servicos|tacs-areas|organizacoes-municipios)\.html$/i.test(PATH)||
  /\/teste-v1\/painel-(?:profissionais-servicos|tacs-areas)-v1\.html$/i.test(PATH)
);
if(!ADMIN_PANEL)return;

var ADMIN_TOKEN='portalTacsAdminTokenV1';
var TERRITORY_TOKEN='portalTacsTerritorioTokenV1';
var RETURN_FLAG='portalTacsRetornoCentralV1';
var ICON='/atendimento-acs-farmaceutico/conecta-saude-homologacao/v15/assets/conecta-saude-central-canonico-2026-09-09.png?v=20260909-3';
var sessionTimer=0;

function text(v){return String(v==null?'':v).trim()}
function hasSession(){
  try{return Boolean(text(sessionStorage.getItem(ADMIN_TOKEN)||'')||text(sessionStorage.getItem(TERRITORY_TOKEN)||''))}catch(e){return false}
}
function isTerritory(){try{return Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN)||''))}catch(e){return false}}
function syncSessionClass(){
  var active=hasSession();
  ROOT.classList.toggle('csc-session-active',active);
  ROOT.classList.toggle('csc-session-missing',!active);
  if(document.body){
    document.body.classList.toggle('csc-session-active',active);
    document.body.classList.toggle('csc-session-missing',!active);
  }
  enhanceSessionUi();
}
function panelTitle(){
  if(CENTRAL)return 'Central Administrativa';
  if(/\/painel-suporte-moradores\.html$/i.test(PATH))return 'Diagnóstico dos aparelhos';
  if(/\/painel-suporte-moradores-v2\.html$/i.test(PATH))return 'Suporte aos moradores';
  var h=document.querySelector('header h1');
  if(h&&text(h.textContent))return text(h.textContent);
  var t=text(document.title).split('|')[0].split('•')[0];
  return t||'Painel administrativo';
}
function centralUrl(){return '/atendimento-acs-farmaceutico/central-administrativa-tacs.html?v=20260910-app4-r6'+(isTerritory()?'&acesso=tacs':'')}
function backToCentral(){
  try{sessionStorage.setItem(RETURN_FLAG,'1')}catch(e){}
  var params=null,from=false;
  try{params=new URLSearchParams(location.search||'');from=String(params.get('from')||'').toLowerCase()==='central'}catch(e){}
  if(from&&history.length>1){history.back();return}
  location.assign(centralUrl());
}
function vibrate(){try{if(navigator.vibrate)navigator.vibrate(8)}catch(e){}}

function buildAppbar(){
  if(document.getElementById('cscInstitutionalAppbar'))return;
  var bar=document.createElement('div');
  bar.id='cscInstitutionalAppbar';
  bar.className='csc-appbar';
  bar.setAttribute('role','banner');

  var icon=document.createElement('img');
  icon.className='csc-appbar-icon';
  icon.src=ICON;
  icon.alt='Ícone oficial do Conecta Saúde Comunitária';
  icon.decoding='async';

  var title=document.createElement('div');
  title.className='csc-appbar-title';
  var brand=document.createElement('small');
  brand.textContent='CONECTA SAÚDE COMUNITÁRIA';
  var strong=document.createElement('strong');
  strong.textContent=panelTitle();
  title.appendChild(brand);title.appendChild(strong);

  bar.appendChild(icon);bar.appendChild(title);
  if(!CENTRAL){
    var back=document.createElement('button');
    back.type='button';
    back.className='csc-appbar-back';
    back.setAttribute('aria-label','Voltar à Central');
    back.textContent='‹';
    back.addEventListener('click',function(){vibrate();backToCentral()});
    bar.appendChild(back);
  }
  document.body.insertBefore(bar,document.body.firstChild);
  document.body.classList.add('csc-brand-enhanced');
  document.body.classList.toggle('csc-central',CENTRAL);
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content','#071827');
}

function markAuthControls(){
  var loginPasswordIds=['pin','adminPin','tacsPinLogin'];
  loginPasswordIds.forEach(function(id){
    var input=document.getElementById(id);
    if(!input||input.id==='tacsPinAccess'||input.id==='tacsPin')return;
    input.classList.add('csc-auth-control','csc-admin-only-auth');
    if(input.labels){Array.prototype.forEach.call(input.labels,function(label){label.classList.add('csc-auth-control','csc-admin-only-auth')})}
    var wrap=input.closest('#adminLogin,#tacsLogin');
    if(wrap)wrap.classList.add('csc-auth-control','csc-admin-only-auth');
  });
  ['accessActions','pinHelp','loginAdminTab','loginTacsTab','adminLogin','tacsLogin'].forEach(function(id){var n=document.getElementById(id);if(n)n.classList.add('csc-auth-control','csc-admin-only-auth')});
  ['login','entrar','adminLoginButton','tacsLoginButton','sair','logout','logoutButton'].forEach(function(id){var n=document.getElementById(id);if(n)n.classList.add('csc-admin-only-auth')});
  var accessTitle=document.getElementById('accessTitle');if(accessTitle)accessTitle.classList.add('csc-admin-only-auth');
  var tacsPin=document.getElementById('tacsPinAccess');
  if(tacsPin){
    tacsPin.classList.remove('csc-auth-control','csc-admin-only-auth');
    if(tacsPin.labels){Array.prototype.forEach.call(tacsPin.labels,function(label){label.classList.remove('csc-auth-control','csc-admin-only-auth')})}
    var areaBox=tacsPin.closest('.area-control');if(areaBox)areaBox.classList.add('csc-tacs-access');
    var section=tacsPin.closest('section');if(section)section.classList.add('csc-moradores-access');
    var loginTacs=document.getElementById('loginTacs');if(loginTacs)loginTacs.classList.remove('csc-auth-control','csc-admin-only-auth');
  }
  var editorPin=document.getElementById('tacsPin');
  if(editorPin){
    editorPin.classList.remove('csc-auth-control','csc-admin-only-auth');
    if(editorPin.labels){Array.prototype.forEach.call(editorPin.labels,function(label){label.classList.remove('csc-auth-control','csc-admin-only-auth')})}
  }
}

function enhanceSessionUi(){
  if(!document.body)return;
  var active=hasSession(),tacsPin=document.getElementById('tacsPinAccess');
  if(tacsPin){
    var section=tacsPin.closest('section');if(section)section.classList.add('csc-moradores-access');
    var heading=section&&section.querySelector('h2');if(active&&heading)heading.textContent='Acesso individual do TACS';
    var status=document.getElementById('loginStatus');
    if(active&&status&&/aguardando acesso|sess[aã]o administrativa existente|digite o pin/i.test(text(status.textContent))){status.textContent='Sessão administrativa ativa.';status.classList.add('ok')}
  }
}

function buildCentralWelcome(){
  if(!CENTRAL)return;
  var identity=document.getElementById('identityPanel');
  if(identity&&!document.getElementById('cscCentralWelcomeCopy')){
    var copy=document.createElement('div');
    copy.id='cscCentralWelcomeCopy';
    copy.className='csc-welcome-copy';
    copy.innerHTML='<small>Olá, administrador</small><h1>Gestão da área</h1><p>Acesse os serviços, acompanhe a situação e administre sua unidade.</p>';
    identity.insertBefore(copy,identity.firstChild);
  }
  if(document.getElementById('cscInstitutionalDock'))return;
  var dock=document.createElement('nav');
  dock.id='cscInstitutionalDock';
  dock.className='csc-dock';
  dock.setAttribute('aria-label','Navegação da Central');
  var items=[
    ['⌂','Início',function(){window.scrollTo({top:0,behavior:'smooth'})}],
    ['▦','Painéis',function(){var n=document.getElementById('modulesPanel');if(n)n.scrollIntoView({behavior:'smooth',block:'start'})}],
    ['🔔','Avisos',function(){var n=document.getElementById('healthPanel');if(n)n.scrollIntoView({behavior:'smooth',block:'start'})}],
    ['●','Perfil',function(){var n=document.getElementById('identityPanel');if(n)n.scrollIntoView({behavior:'smooth',block:'start'})}]
  ];
  items.forEach(function(item,i){
    var b=document.createElement('button');b.type='button';b.className='csc-navitem'+(i===0?' active':'');
    b.innerHTML='<i>'+item[0]+'</i><span>'+item[1]+'</span>';
    b.addEventListener('click',function(){vibrate();dock.querySelectorAll('.csc-navitem').forEach(function(x){x.classList.toggle('active',x===b)});item[2]()});
    dock.appendChild(b);
  });
  document.body.appendChild(dock);
}

function installTouchFeedback(){
  if(ROOT.dataset.cscTouchR6==='1')return;
  ROOT.dataset.cscTouchR6='1';
  var selector='button,.botao,.btn,.module,.tab,.aba,[role="button"],a.btn,a.botao';
  function target(e){return e.target&&e.target.closest?e.target.closest(selector):null}
  function release(){document.querySelectorAll('.csc-pressed').forEach(function(n){n.classList.remove('csc-pressed')})}
  document.addEventListener('pointerdown',function(e){var b=target(e);if(!b||b.disabled)return;release();b.classList.add('csc-pressed')},{passive:true});
  document.addEventListener('pointerup',release,{passive:true});
  document.addEventListener('pointercancel',release,{passive:true});
  if(!window.PointerEvent){
    document.addEventListener('touchstart',function(e){var b=target(e);if(!b||b.disabled)return;release();b.classList.add('csc-pressed')},{passive:true});
    document.addEventListener('touchend',release,{passive:true});
    document.addEventListener('touchcancel',release,{passive:true});
  }
  window.addEventListener('blur',release);
  document.addEventListener('click',function(e){var b=target(e);if(b&&!b.disabled)vibrate();if(b)setTimeout(function(){b.classList.remove('csc-pressed')},70)},{passive:true});
}

function installFinalSkin(){
  var old=document.getElementById('cscApp4FinalSkinR6');if(old)old.remove();
  var style=document.createElement('style');
  style.id='cscApp4FinalSkinR6';
  style.textContent='html,body{background:#071827!important;background-image:none!important;color:#f7fcff!important}body{background:#071827!important;background-image:none!important}header,footer,.footer{border:0!important;box-shadow:none!important}.csc-session-missing .csc-dock{display:none!important}.csc-session-active .csc-dock{display:grid!important}.csc-pressed{transform:translateY(2px) scale(.98)!important;filter:brightness(1.08)!important;background:#236581!important;color:#fff!important;box-shadow:inset 0 3px 8px rgba(0,0,0,.35)!important}';
  (document.head||document.documentElement).appendChild(style);
}

function boot(){
  buildAppbar();
  markAuthControls();
  buildCentralWelcome();
  syncSessionClass();
  installTouchFeedback();
  installFinalSkin();
  sessionTimer=setInterval(syncSessionClass,700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',function(){syncSessionClass();installFinalSkin()});
window.addEventListener('pagehide',function(){if(sessionTimer)clearInterval(sessionTimer)},{once:true});
}());
