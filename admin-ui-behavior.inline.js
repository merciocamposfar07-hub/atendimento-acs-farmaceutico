/*
 * Conecta Saúde Comunitária — comportamento do shell App institucional
 * Contrato: CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10-R2
 * Regra: identidade institucional única, reação ao toque e reaproveitamento visual da sessão.
 * Este script NÃO autentica nem cria sessão: apenas reutiliza os tokens já validados pelos módulos.
 */
(function(){
'use strict';
if(window.PortalTacsAdminApp4ShellR2)return;
window.PortalTacsAdminApp4ShellR2=true;

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
}
function panelTitle(){
  if(CENTRAL)return 'Central Administrativa';
  var h=document.querySelector('header h1');
  if(h&&text(h.textContent))return text(h.textContent);
  var t=text(document.title).split('|')[0].split('•')[0];
  return t||'Painel administrativo';
}
function centralUrl(){return '/atendimento-acs-farmaceutico/central-administrativa-tacs.html'+(isTerritory()?'?acesso=tacs':'')}
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
  var passwords=document.querySelectorAll('input[type="password"]');
  passwords.forEach(function(input){
    input.classList.add('csc-auth-control');
    if(input.labels){Array.prototype.forEach.call(input.labels,function(label){label.classList.add('csc-auth-control')})}
    var wrap=input.closest('#adminLogin,#tacsLogin');
    if(wrap)wrap.classList.add('csc-auth-control');
    var section=input.closest('section');
    if(section){
      section.classList.add('csc-has-auth');
      var heading=section.querySelector('h2');
      if(heading)heading.classList.add('csc-auth-title');
    }
  });
  ['accessActions','pinHelp','loginAdminTab','loginTacsTab'].forEach(function(id){
    var n=document.getElementById(id);if(n)n.classList.add('csc-auth-control');
  });
  ['loginAdminTab','loginTacsTab'].forEach(function(id){
    var n=document.getElementById(id),parent=n&&n.parentElement;
    if(parent&&parent.querySelectorAll('#loginAdminTab,#loginTacsTab').length===2)parent.classList.add('csc-auth-control');
  });
  if(!CENTRAL){
    var sair=document.getElementById('sair');
    if(sair)sair.classList.add('csc-auth-control');
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
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest?e.target.closest('button,.botao,.btn,.module,[role="button"]'):null;
    if(b&&!b.disabled)vibrate();
  },{passive:true});
}

function installFinalSkin(){
  if(document.getElementById('cscApp4FinalSkinR2'))return;
  var style=document.createElement('style');
  style.id='cscApp4FinalSkinR2';
  style.textContent='\
/* A última camada vence estilos visuais legados adicionados por scripts antigos, sem tocar na lógica. */\
html,body{background:#071827!important;color:#f7fcff!important}\
body{background:linear-gradient(180deg,#0b263d 0,#071827 360px,#071827 100%)!important}\
header{background:transparent!important;background-image:none!important;border:0!important;box-shadow:none!important;filter:none!important}\
.panel,.painel,.card,.box,.caixa,.newbox{border-color:#2b5a76!important;box-shadow:0 12px 26px rgba(0,0,0,.20)!important}\
.module,.health-card,.numero,.number,.stat,.metric,.saude-numero,.item,.cartao,.ticket,.grupoProfissional,.area-row,.maprow{border-color:#2b5a76!important}\
button,.btn,.botao,.module,.tab,.aba{transition:transform .11s ease,filter .11s ease,background-color .11s ease,box-shadow .11s ease!important}\
button:active:not(:disabled),.btn:active:not(:disabled),.botao:active:not(:disabled),.module:active:not(:disabled),.tab:active:not(:disabled),.aba:active:not(:disabled){transform:scale(.965)!important;filter:brightness(1.08)!important}\
#portalTacsBackCentralV1{display:none!important}\
footer,.footer{border:0!important;box-shadow:none!important}\
';
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
