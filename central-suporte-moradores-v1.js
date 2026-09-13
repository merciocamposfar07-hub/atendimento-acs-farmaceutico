(function(){
'use strict';
if(window.PortalTacsCentralSuporteMoradoresV1)return;
window.PortalTacsCentralSuporteMoradoresV1=true;

var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var AREA_KEY='portalTacsCentralAreaV1';
var RETURN_KEY='portalTacsCentralReturnUrlV1';
var RETURN_FLAG_KEY='portalTacsRetornoCentralV1';
var PAINT_STYLE_ID='portalTacsCentralIosPaintGuardV3';
var SAFE_NAV_FLAG='portalTacsSafeNavigationV1';
var REVISION='20260913-app4-paleta-oficial-v1';

function text(v){return String(v==null?'':v).trim()}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function areaId(){
  var select=document.getElementById('adminArea'),a=normArea(select&&select.value);
  if(a)return a;
  try{a=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}
  return a||'JAPARANDUBA';
}
function hasTerritorySession(){
  try{return Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||''))}catch(e){return false}
}
function hasAnySession(){
  try{return Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'')||text(sessionStorage.getItem(ADMIN_TOKEN_KEY)||''))}catch(e){return false}
}

/* Evita mostrar novamente o formulário de login ao retornar de um painel. */
function installReturnGuard(){
  var returning=false;
  try{returning=sessionStorage.getItem(RETURN_FLAG_KEY)==='1'}catch(e){}
  if(!returning)return;
  if(hasAnySession()){
    var login=document.getElementById('loginPanel');
    if(login)login.hidden=true;
  }
  try{sessionStorage.removeItem(RETURN_FLAG_KEY)}catch(e){}
}

/*
 * CENTRAL_IOS_PAINT_GUARD_V3
 *
 * A Central deixa de usar o viewer/iframe para abrir módulos administrativos.
 * Mantemos apenas proteções leves de layout e desativamos qualquer viewer legado.
 */
function installPaintGuard(){
  /* TAREFA_10_SHELL_PERSISTENTE_V1: a correção antiga de Safari que escondia o
     viewer não pode desativar o shell canônico. Ela permanece apenas como fallback legado. */
  if(window.ConectaCentralShellV1&&typeof window.ConectaCentralShellV1.abrir==='function'){
    var antigo=document.getElementById(PAINT_STYLE_ID);if(antigo&&antigo.parentNode)antigo.remove();
    return;
  }
  if(!document.getElementById(PAINT_STYLE_ID)){
    var style=document.createElement('style');
    style.id=PAINT_STYLE_ID;
    style.textContent='\
html,body,main,#modulesPanel,#moduleGrid,.panel,.module{\
  -webkit-backface-visibility:visible!important;\
  backface-visibility:visible!important;\
  will-change:auto!important;\
  contain:none!important;\
}\
main,#modulesPanel,#moduleGrid{\
  height:auto!important;\
  max-height:none!important;\
  overflow:visible!important;\
}\
#viewer,#portalTacsCentralRefreshV1,#portalTacsAtualizarPaginaV1,#portalTacsAdminRefreshV1{display:none!important}\
body.viewer-open{overflow:auto!important}\
body>iframe{\
  position:absolute!important;\
  left:0!important;top:0!important;\
  width:1px!important;height:1px!important;\
  border:0!important;opacity:0!important;\
  visibility:hidden!important;pointer-events:none!important;\
  z-index:-1!important;\
}';
    document.head.appendChild(style);
  }
  var viewer=document.getElementById('viewer');
  if(viewer){viewer.hidden=true;viewer.setAttribute('aria-hidden','true')}
  var frame=document.getElementById('viewerFrame');
  if(frame){try{frame.src='about:blank'}catch(e){}}
  document.body.classList.remove('viewer-open');
  var refresh=document.getElementById('portalTacsCentralRefreshV1');
  if(refresh&&refresh.parentNode)refresh.remove();
}

function moduleUrl(name){
  var area=encodeURIComponent(areaId());
  var access=hasTerritorySession()?'&acesso=tacs':'';
  var from='&from=central';
  if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+access+from+'&v='+REVISION;
  if(name==='suporte')return '/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html?area='+area+access+from+'&v='+REVISION;
  if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+from+'&v='+REVISION;
  if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+from+'&v='+REVISION;
  if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+access+from+'&v='+REVISION;
  if(name==='territorio')return '/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html?from=central&v='+REVISION;
  if(name==='municipios')return '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html?from=central&v='+REVISION;
  if(name==='portal')return '/atendimento-acs-farmaceutico/?area='+area+'&from=central&v='+REVISION;
  return '';
}

/*
 * Ao voltar pelo histórico, o Safari restaura o DOM exatamente como estava.
 * A revisão anterior colocava pointer-events:none no cartão tocado antes da navegação;
 * esse estado podia voltar do BFCache e deixar cartões sem resposta tátil.
 * Nunca mais deixamos estado de bloqueio inline nos módulos.
 */
function restoreModuleTouchState(){
  document.querySelectorAll('.module[data-module]').forEach(function(button){
    button.style.removeProperty('pointer-events');
    button.removeAttribute('aria-busy');
  });
}

function installSafeNavigation(){
  /* O shell canônico assume os cliques; não instalar captura concorrente/location.assign. */
  if(window.ConectaCentralShellV1&&typeof window.ConectaCentralShellV1.abrir==='function')return;
  if(document.documentElement.dataset[SAFE_NAV_FLAG]==='1')return;
  document.documentElement.dataset[SAFE_NAV_FLAG]='1';

  document.addEventListener('click',function(event){
    var target=event.target;
    var button=target&&target.closest?target.closest('.module[data-module]'):null;
    if(!button||button.hidden||button.disabled)return;

    var url=moduleUrl(button.dataset.module||'');
    if(!url)return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    try{
      sessionStorage.setItem(RETURN_KEY,location.href);
      sessionStorage.setItem(RETURN_FLAG_KEY,'1');
    }catch(e){}

    /* Não desabilitar nem retirar pointer-events: o BFCache do iPhone preserva isso ao voltar. */
    button.removeAttribute('aria-busy');
    button.style.removeProperty('pointer-events');

    try{
      location.assign(url);
    }catch(e){
      /* Se a navegação falhar por qualquer motivo, o cartão continua utilizável. */
      button.removeAttribute('aria-busy');
      button.style.removeProperty('pointer-events');
    }
  },true);
}

function app4PresentationCss(){
  return [
    '/* APP4_PALETA_OFICIAL_SEM_AZUL_CLARO_2026_09_13_V1 — somente apresentação */',
    ':root{--tacs-app-bg:#071827!important;--tacs-app-top:#071827!important;--tacs-app-card:#102d46!important;--tacs-app-card2:#153b58!important;--tacs-app-line:#2b5a76!important;--tacs-app-text:#f7fcff!important;--tacs-app-muted:#adc4d2!important;--tacs-app-accent:#83efa9!important;--tacs-app-accent2:#2b5a76!important;--tacs-app-primary:#135272!important;--tacs-app-nav:#071827!important;}',
    'html,body,main,body>main,body>footer,footer,.footer,.csc-dock{background:#071827!important;background-image:none!important;}',
    '#portalTacsCentralRefreshV1,#portalTacsAtualizarPaginaV1,#portalTacsAdminRefreshV1,.portal-tacs-refresh-floating,.agendaAtualizarPaginaFlutuanteV2{display:none!important;visibility:hidden!important;pointer-events:none!important;}',
    '.csc-appbar,.viewer .viewer-bar,#cscInstitutionalAppbar{position:static!important;top:auto!important;inset:auto!important;background:#071827!important;background-image:none!important;border:0!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;}',
    'body.viewer-open{overflow:hidden!important}.viewer.csc-native-viewer:not([hidden]){display:block!important;overflow-x:hidden!important;overflow-y:auto!important;background:#071827!important}.viewer.csc-native-viewer>.csc-native-module-host{overflow:visible!important;background:#071827!important;border:0!important}.viewer.csc-native-viewer>.viewer-platform-footer{display:flex!important;background:#071827!important;border:0!important;box-shadow:none!important;}',
    '.module,.health-card,.quick-card,.numero,.number,.stat,.metric,.panel .card,.painel .card,.card .card,#results>.card,#results .card,#listaRecados .item,#listaCampanhas .item,.item,.cartao,.ticket,.grupoProfissional,.area-row,.maprow,.saude-aparelho,.msg-familia-acao,.msg-ind-form-action,.msg-rel-box,.msg-rel-status,.msg-rel-event,.msg-rel-message,.msg-rel-device,.msg-rel-grid div{background:linear-gradient(145deg,#153b58,#102d46)!important;color:#f7fcff!important;border:0!important;box-shadow:none!important;}',
    '.module .icon,.module-icon{background:#102d46!important;background-image:none!important;border:0!important;box-shadow:none!important;color:#fff!important;}',
    '.module::before{background:#102d46!important;color:#83efa9!important;border:0!important;box-shadow:none!important;}',
    'button,.btn,.botao,.grupoAcao,.publicacao-card-whatsapp,.csc-ag-share-day,.csc-ag-share-group,.msg-ind-card-button,.msg-ind-form-button,.msg-familia-acao button,.msg-rel-button,.msg-rel-family{background:#135272!important;background-image:none!important;color:#fff!important;border:0!important;box-shadow:none!important;}',
    'button:active:not(:disabled),.btn:active:not(:disabled),.botao:active:not(:disabled),.module:active:not(:disabled),.csc-pressed{background:#0f3f5a!important;color:#fff!important;transform:translateY(2px) scale(.98)!important;filter:brightness(1.06)!important;box-shadow:inset 0 3px 8px rgba(0,0,0,.35)!important;}',
    '.tab,.aba,.chip,.tag,.pill,.signal,.sinal,.badge,.seal,.selo,.status-badge{background:#0b263d!important;color:#dcebf3!important;border:0!important;box-shadow:none!important;}',
    '.tab.active,.aba.ativa,.tabs button.active,[role="tab"][aria-selected="true"],.csc-navitem.active{background:#135272!important;color:#fff!important;border:0!important;box-shadow:none!important;}',
    '.status,.status.ok,.status.warn,.status.aviso,.status.err,.status.erro,.nota,.note,.protect,.manutencao,.areaEnvio{background:#102d46!important;background-image:none!important;color:#dcebf3!important;border:0!important;box-shadow:none!important;}',
    'input:not([type="checkbox"]):not([type="radio"]),select,textarea,.field,.campo,.validadeCampo,.validadeControle{background:#071827!important;color:#f7fcff!important;border:1px solid #2b5a76!important;box-shadow:none!important;}',
    '.csc-dock{border:0!important;box-shadow:none!important}.csc-navitem{background:transparent!important;color:#adc4d2!important;border:0!important;box-shadow:none!important;}',
    '.csc-platform-footer,.viewer-platform-footer{background:#071827!important;background-image:none!important;border:0!important;box-shadow:none!important;color:#adc4d2!important;}',
    'footer,footer p,.footer,.csc-platform-footer strong,.viewer-platform-footer strong{color:#f7fcff!important}.csc-platform-footer small,.viewer-platform-footer small{color:#adc4d2!important;}',
    'svg,img{max-width:100%;height:auto}',
    '.publicacao-card-whatsapp{min-height:56px!important;font-weight:900!important}',
    '.csc-appbar-icon,.viewer-official-icon{filter:none!important;object-fit:contain!important;}'
  ].join('\n');
}

function injectPresentationStyle(doc){
  try{
    if(!doc||!doc.documentElement||!doc.head)return;
    var style=doc.getElementById('cscApp4PaletaOficialSemAzulClaroV1');
    if(!style){
      style=doc.createElement('style');
      style.id='cscApp4PaletaOficialSemAzulClaroV1';
      style.textContent=app4PresentationCss();
      doc.head.appendChild(style);
    }
    ['portalTacsCentralRefreshV1','portalTacsAtualizarPaginaV1','portalTacsAdminRefreshV1'].forEach(function(id){var n=doc.getElementById(id);if(n&&n.parentNode)n.parentNode.removeChild(n)});
  }catch(e){}
}

function installApp4PresentationGuard(){
  injectPresentationStyle(document);
  var frame=document.getElementById('viewerFrame');
  function applyToFrame(){try{if(frame&&frame.contentDocument)injectPresentationStyle(frame.contentDocument)}catch(e){}}
  if(frame&&frame.dataset.app4PaletteGuard!=='1'){
    frame.dataset.app4PaletteGuard='1';
    frame.addEventListener('load',function(){applyToFrame();setTimeout(applyToFrame,120);setTimeout(applyToFrame,650)});
  }
  applyToFrame();
  if(document.documentElement.dataset.app4PaletteGuardV1!=='1'){
    document.documentElement.dataset.app4PaletteGuardV1='1';
    new MutationObserver(function(){injectPresentationStyle(document);applyToFrame()}).observe(document.documentElement,{childList:true,subtree:true});
  }
}

function boot(){
  installReturnGuard();
  installPaintGuard();
  installApp4PresentationGuard();
  restoreModuleTouchState();
  installSafeNavigation();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
window.addEventListener('pageshow',function(){
  restoreModuleTouchState();
  installPaintGuard();
  installApp4PresentationGuard();
});
}());
