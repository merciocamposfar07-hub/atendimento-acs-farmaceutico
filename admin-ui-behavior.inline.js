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
  if(/\/painel-suporte-moradores-v2\.html$/i.test(PATH)){try{if(String(new URLSearchParams(location.search||'').get('view')||'').toLowerCase()==='pending')return 'Pendências da área'}catch(e){}return 'Suporte aos moradores'};
  if(/\/teste-v1\/painel-moradores-v2\.html$/i.test(PATH)){try{if(String(new URLSearchParams(location.search||'').get('view')||'').toLowerCase()==='prontuarios')return 'Prontuários'}catch(e){}}
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
    if(!input||input.id==='tacsPin')return;
    input.classList.add('csc-auth-control','csc-admin-only-auth');
    if(input.labels){Array.prototype.forEach.call(input.labels,function(label){label.classList.add('csc-auth-control','csc-admin-only-auth')})}
    var wrap=input.closest('#adminLogin,#tacsLogin');
    if(wrap)wrap.classList.add('csc-auth-control','csc-admin-only-auth');
  });
  ['accessActions','pinHelp','loginAdminTab','loginTacsTab','adminLogin','tacsLogin'].forEach(function(id){var n=document.getElementById(id);if(n)n.classList.add('csc-auth-control','csc-admin-only-auth')});
  ['login','entrar','adminLoginButton','tacsLoginButton','sair','logout','logoutButton','loginTacs'].forEach(function(id){var n=document.getElementById(id);if(!n)return;if(CENTRAL&&id==='logout'){n.classList.remove('csc-admin-only-auth','csc-auth-control');return}n.classList.add('csc-admin-only-auth')});
  var accessTitle=document.getElementById('accessTitle');if(accessTitle)accessTitle.classList.add('csc-admin-only-auth');

  /* No painel de moradores, o perfil já foi definido pelo PIN da Central.
     O segundo bloco "Acesso individual do TACS" é apenas legado e fica fora da interface. */
  var residentTacsPin=document.getElementById('tacsPinAccess');
  if(residentTacsPin){
    residentTacsPin.classList.add('csc-auth-control','csc-admin-only-auth');
    if(residentTacsPin.labels){Array.prototype.forEach.call(residentTacsPin.labels,function(label){label.classList.add('csc-auth-control','csc-admin-only-auth')})}
    var residentTacsBox=residentTacsPin.closest('.area-control');
    if(residentTacsBox)residentTacsBox.classList.add('csc-auth-control','csc-admin-only-auth','csc-resident-redundant-tacs-access');
    var residentGate=residentTacsPin.closest('section');
    if(residentGate){
      residentGate.classList.add('csc-resident-entry-panel');
      var heading=residentGate.querySelector('h2');if(heading)heading.classList.add('csc-auth-control','csc-admin-only-auth');
      var muted=residentGate.querySelector('.muted');if(muted)muted.classList.add('csc-auth-control','csc-admin-only-auth');
      var status=residentGate.querySelector('#loginStatus');if(status)status.classList.add('csc-auth-control','csc-admin-only-auth');
      var logout=residentGate.querySelector('#logout');if(logout)logout.classList.add('csc-auth-control','csc-admin-only-auth');
    }
  }

  /* PIN do cadastro/edição do próprio TACS é dado funcional, não login. */
  var editorPin=document.getElementById('tacsPin');
  if(editorPin){
    editorPin.classList.remove('csc-auth-control','csc-admin-only-auth');
    if(editorPin.labels){Array.prototype.forEach.call(editorPin.labels,function(label){label.classList.remove('csc-auth-control','csc-admin-only-auth')})}
  }
}

function enhanceSessionUi(){
  if(!document.body)return;
  /* A sessão global apenas controla a visibilidade dos controles legados.
     Não cria segundo fluxo de autenticação dentro dos módulos. */
}

function centralAreaId(){
  try{return text(localStorage.getItem('portalTacsCentralAreaV1')||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA'}catch(e){return'JAPARANDUBA'}
}
function centralContextFromCache(){
  try{
    var territorial=Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN)||''));
    var key='portalTacsCentralContextCacheV3:'+(territorial?'tacs':'admin');
    var raw=sessionStorage.getItem(key)||sessionStorage.getItem('portalTacsCentralContextCacheV2');
    if(!raw)return null;var saved=JSON.parse(raw);return saved&&saved.context?saved.context:null
  }catch(e){return null}
}
function showCentralHome(){
  var page=document.getElementById('cscProfilePage');if(page)page.hidden=true;
  ['identityPanel','healthPanel','modulesPanel'].forEach(function(id){var n=document.getElementById(id);if(n)n.hidden=false});
  window.scrollTo({top:0,behavior:'smooth'});
}
function openRecordsPage(){
  var area=encodeURIComponent(centralAreaId());
  location.assign('/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+'&view=prontuarios&all=1&from=central&v=20260910-prontuarios-todas-areas-v1');
}
function openPendingPage(){
  var area=encodeURIComponent(centralAreaId());
  location.assign('/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html?area='+area+'&view=pending&from=central&v=20260910-pendencias-v5');
}
function openProfilePage(){
  var main=document.querySelector('main');if(!main)return;
  ['identityPanel','healthPanel','modulesPanel'].forEach(function(id){var n=document.getElementById(id);if(n)n.hidden=true});
  var page=document.getElementById('cscProfilePage');
  if(!page){page=document.createElement('section');page.id='cscProfilePage';page.className='csc-profile-page';main.appendChild(page)}
  var ctx=centralContextFromCache()||{},areas=Array.isArray(ctx.areas)?ctx.areas:[],tacs=Array.isArray(ctx.tacs)?ctx.tacs:[],admins=Array.isArray(ctx.administradores)?ctx.administradores:[];
  function areaName(id){for(var i=0;i<areas.length;i++)if(text(areas[i].areaId)===text(id))return text(areas[i].areaNome||areas[i].areaId);return text(id)||'Área não vinculada'}
  var html='<h2>Administradores e TACS</h2><p class="csc-profile-intro">Acesso rápido aos perfis cadastrados e às áreas administradas.</p><h3>Administradores</h3><div class="csc-profile-list">'+
    '<button type="button" class="csc-profile-card csc-profile-admin-toggle" aria-expanded="false" aria-controls="cscProfileAdminNames"><strong>Administrador geral</strong><span>Toque para ver os administradores cadastrados</span></button></div>'+
    '<div id="cscProfileAdminNames" class="csc-profile-list csc-profile-admin-names" hidden>';
  if(!admins.length)html+='<div class="csc-profile-empty">Nenhum nome de administrador foi encontrado na base administrativa.</div>';
  admins.forEach(function(a){html+='<article class="csc-profile-card"><strong>'+escapeProfile(a.nomeCompleto||a.nome||'Administrador')+'</strong><span>'+escapeProfile(a.perfil||'ADMINISTRADOR GERAL')+(a.ativo===false?' • Inativo':' • Ativo')+'</span></article>'});
  html+='</div><h3>TACS cadastrados</h3><div class="csc-profile-list">';
  if(!tacs.length)html+='<div class="csc-profile-empty">Nenhum TACS cadastrado foi devolvido pelo servidor.</div>';
  tacs.forEach(function(t){html+='<button type="button" class="csc-profile-card csc-profile-area-jump" data-area="'+escapeProfile(t.areaId||'')+'"><strong>'+escapeProfile(t.nomeCompleto||t.nome||t.tacsId||'TACS')+'</strong><span>'+escapeProfile(areaName(t.areaId))+(t.ativo===false?' • Inativo':' • Ativo')+'</span></button>'});
  html+='</div><h3>Áreas</h3><div class="csc-profile-list">';
  if(!areas.length)html+='<div class="csc-profile-empty">Nenhuma área cadastrada foi devolvida pelo servidor.</div>';
  areas.forEach(function(a){html+='<button type="button" class="csc-profile-card csc-profile-area-jump" data-area="'+escapeProfile(a.areaId||'')+'"><strong>'+escapeProfile(a.areaNome||a.areaId||'Área')+'</strong><span>'+escapeProfile(a.unidadeNome||a.unidadeId||'Unidade não informada')+'</span></button>'});
  html+='</div>';
  page.innerHTML=html;page.hidden=false;
  var adminToggle=page.querySelector('.csc-profile-admin-toggle'),adminNames=page.querySelector('.csc-profile-admin-names');
  if(adminToggle&&adminNames)adminToggle.addEventListener('click',function(){var open=adminToggle.getAttribute('aria-expanded')==='true';adminToggle.setAttribute('aria-expanded',open?'false':'true');adminNames.hidden=open;adminToggle.querySelector('span').textContent=open?'Toque para ver os administradores cadastrados':'Toque para ocultar os administradores cadastrados'});
  page.querySelectorAll('.csc-profile-area-jump').forEach(function(btn){btn.addEventListener('click',function(){var area=text(btn.dataset.area);if(area){try{localStorage.setItem('portalTacsCentralAreaV1',area)}catch(e){}var select=document.getElementById('adminArea');if(select&&Array.prototype.some.call(select.options,function(o){return o.value===area})){select.value=area;select.dispatchEvent(new Event('change',{bubbles:true}))}}showCentralHome()})});
  window.scrollTo({top:0,behavior:'smooth'});
}
function escapeProfile(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function buildCentralWelcome(){
  if(!CENTRAL)return;
  var identity=document.getElementById('identityPanel');
  if(identity&&!document.getElementById('cscCentralWelcomeCopy')){
    var copy=document.createElement('div');
    copy.id='cscCentralWelcomeCopy';
    copy.className='csc-welcome-copy';
    copy.innerHTML='<small>Perfil autenticado</small><h1>Gestão da área</h1><p>Carregando sua identificação…</p>';
    identity.insertBefore(copy,identity.firstChild);
  }
  if(document.getElementById('cscInstitutionalDock'))return;
  var dock=document.createElement('nav');
  dock.id='cscInstitutionalDock';
  dock.className='csc-dock';
  dock.setAttribute('aria-label','Navegação da Central');
  var items=[
    ['⌂','Início',showCentralHome],
    ['▦','Prontuários',openRecordsPage],
    ['🔔','Pendências',openPendingPage],
    ['●','Perfil',openProfilePage]
  ];
  items.forEach(function(item,i){
    var b=document.createElement('button');b.type='button';b.className='csc-navitem'+(i===0?' active':'');
    if(item[1]==='Pendências'){
      b.id='cscPendingNav';b.style.position='relative';
      b.innerHTML='<i>'+item[0]+'</i><span>'+item[1]+'</span><em id="cscPendingBadge" hidden aria-label="Nenhuma pendência" style="position:absolute;top:4px;left:calc(50% + 7px);min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#d62f2f;color:#fff;font:900 11px/18px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;font-style:normal;text-align:center;box-shadow:0 0 0 2px #071827">0</em>';
    }else b.innerHTML='<i>'+item[0]+'</i><span>'+item[1]+'</span>';
    b.addEventListener('click',function(){vibrate();dock.querySelectorAll('.csc-navitem').forEach(function(x){x.classList.toggle('active',x===b)});item[2]()});
    dock.appendChild(b);
  });
  document.body.appendChild(dock);
}

function buildPlatformFooter(){
  if(document.getElementById('cscPlatformFooter'))return;
  var footer=document.createElement('footer');
  footer.id='cscPlatformFooter';
  footer.className='csc-platform-footer';
  footer.innerHTML='<strong>Conecta Saúde Comunitária — tecnologia para tornar o acesso à saúde comunitária mais simples, organizado e acessível.</strong><small>Plataforma institucional de saúde comunitária.</small>';
  var old=document.querySelector('body>footer:not(#cscPlatformFooter)');
  if(old)old.hidden=true;
  document.body.appendChild(footer);
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
  style.textContent=''
    +'html,body{background:#071827!important;background-image:none!important;color:#f7fcff!important}'
    +'body{background:#071827!important;background-image:none!important}'
    +'header,footer,.footer{border:0!important;box-shadow:none!important}'
    +'body.csc-brand-enhanced main>section.panel,body.csc-brand-enhanced main>section.painel,body.csc-brand-enhanced main>section.card,body.csc-brand-enhanced main>div.panel,body.csc-brand-enhanced main>div.painel,body.csc-brand-enhanced main>div.card,body.csc-brand-enhanced main>.box,body.csc-brand-enhanced main>.caixa,body.csc-brand-enhanced main>.newbox,#conteudo.card,#content.panel,#ticketsPane,#devicesPane,#secaoRecados,#secaoCampanhas,.lista,.list,#results{background:transparent!important;background-image:none!important;border:0!important;box-shadow:none!important}'
    +'.panel .card,.painel .card,.card .card,#results>.card,#results .card,#listaRecados .item,#listaCampanhas .item,.item,.cartao,.ticket,.grupoProfissional,.area-row,.maprow,.health-card,.saude-numero,.numero,.number,.stat,.metric,.quick-card,.saude-aparelho,.protect,.area-control,.csc-profile-card,.csc-profile-empty,.msg-familia-acao,.msg-ind-form-action,.msg-ind-box,.msg-ind-person,.msg-ind-preview,.msg-ind-status,.msg-ind-step,.msg-rel-box,.msg-rel-status,.msg-rel-event,.msg-rel-message,.msg-rel-device,.msg-rel-grid div{background:linear-gradient(145deg,#153b58,#102d46)!important;background-image:linear-gradient(145deg,#153b58,#102d46)!important;color:#f7fcff!important;border:0!important;box-shadow:none!important}'
    +'#results>.card>button:first-child,#results .card>button:first-child{background:transparent!important;background-image:none!important;color:#f7fcff!important;border:0!important;box-shadow:none!important;border-radius:0!important}'
    +'button,.btn,.botao,.grupoAcao,.msg-ind-card-button,.msg-ind-form-button,.msg-familia-acao button,.msg-ind-send,.msg-ind-refresh,.msg-rel-button,.msg-rel-family,.msg-rel-close{background:#135272!important;background-image:none!important;color:#fff!important;border:0!important;box-shadow:none!important}'
    +'.module{background:linear-gradient(145deg,#174765,#0c3049)!important;background-image:linear-gradient(145deg,#174765,#0c3049)!important;color:#fff!important;border:0!important;box-shadow:none!important}'
    +'.module .icon,.module-icon{background:linear-gradient(145deg,#176c94,#0b263d)!important;border:0!important;box-shadow:none!important}'
    +'.status,.status.ok,.status.warn,.status.aviso,.status.err,.status.erro,.nota,.note{background:#102d46!important;background-image:none!important;border:0!important;box-shadow:none!important}'
    +'.status.ok{color:#c7f7d6!important}.status.warn,.status.aviso{color:#f5e1b7!important}.status.err,.status.erro{color:#ffd0d5!important}'
    +'input:not([type=checkbox]):not([type=radio]),select,textarea,.campo,.field,.validadeCampo,.validadeControle{background:#071827!important;background-image:none!important;color:#fff!important;border:1px solid #2b5a76!important;box-shadow:none!important}'
    +'input::placeholder,textarea::placeholder{color:#aec4d1!important;opacity:1!important}'
    +'.msg-ind-preview-edit{background:#071827!important;color:#f7fcff!important;border:0!important}'
    +'.msg-ind-step small,.msg-rel-device small,.msg-familia-acao span,.msg-ind-form-action small,.protect p,.protect small,.protect .muted,.protect .sub{color:#adc4d2!important}'
    +'.csc-session-missing .csc-dock{display:none!important}.csc-session-active .csc-dock{display:grid!important}'
    +'button:active:not(:disabled),.btn:active:not(:disabled),.botao:active:not(:disabled),.module:active:not(:disabled),.csc-pressed{transform:translateY(2px) scale(.98)!important;filter:brightness(1.08)!important;background:#236581!important;color:#fff!important;border:0!important;box-shadow:inset 0 3px 8px rgba(0,0,0,.35)!important}';
  (document.head||document.documentElement).appendChild(style);
}
var finalSkinObserver=null;
function keepFinalSkinLast(){
  if(finalSkinObserver||!document.head)return;
  finalSkinObserver=new MutationObserver(function(records){
    var lateStyle=false;
    records.forEach(function(record){
      Array.prototype.forEach.call(record.addedNodes||[],function(node){
        if(node&&node.nodeType===1&&(node.tagName==='STYLE'||node.tagName==='LINK')&&node.id!=='cscApp4FinalSkinR6')lateStyle=true;
      });
    });
    if(lateStyle)setTimeout(installFinalSkin,0);
  });
  finalSkinObserver.observe(document.head,{childList:true});
}

function boot(){
  buildAppbar();
  markAuthControls();
  buildCentralWelcome();
  buildPlatformFooter();
  syncSessionClass();
  installTouchFeedback();
  installFinalSkin();
  keepFinalSkinLast();
  setTimeout(installFinalSkin,0);
  setTimeout(installFinalSkin,250);
  sessionTimer=setInterval(syncSessionClass,700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',function(){syncSessionClass();installFinalSkin()});
window.addEventListener('pagehide',function(){if(sessionTimer)clearInterval(sessionTimer)},{once:true});
}());