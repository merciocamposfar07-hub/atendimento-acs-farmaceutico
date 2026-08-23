(function(){
'use strict';
if(window.PortalTacsCentralPerformanceV1)return;
window.PortalTacsCentralPerformanceV1=true;
window.PortalTacsCentralSuporteMoradoresV1=true;

var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var AREA_KEY='portalTacsCentralAreaV1';
var REVISION='20260823-admin-performance-v1';
var frames={};
var activeName='';
var preloadStartedFor='';
var pool=null;
var watcher=null;
var titles={
  moradores:'Moradores',
  suporte:'Suporte aos moradores',
  recados:'Recados e campanhas',
  agendas:'Agendas e vagas',
  profissionais:'Profissionais e serviços',
  territorio:'TACS e áreas',
  municipios:'Municípios e organizações'
};

function text(v){return String(v==null?'':v).trim()}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function getSession(){
  var territorio='',admin='';
  try{territorio=text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'');admin=text(sessionStorage.getItem(ADMIN_TOKEN_KEY)||'')}catch(e){}
  return {territorio:territorio,admin:admin,ok:Boolean(territorio||admin),tacs:Boolean(territorio)};
}
function areaId(){
  var select=document.getElementById('adminArea'),a=normArea(select&&select.value);
  if(a)return a;
  try{a=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}
  return a||'JAPARANDUBA';
}
function key(){var s=getSession();return (s.tacs?'tacs':'admin')+'|'+areaId()}
function moduleUrl(name){
  var s=getSession(),area=encodeURIComponent(areaId()),access=s.tacs?'&acesso=tacs':'';
  if(name==='moradores')return '/atendimento-acs-farmaceutico/teste-v1/painel-moradores-v2.html?area='+area+access+'&from=central&preload=1&v='+REVISION;
  if(name==='suporte')return '/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html?area='+area+access+'&from=central&preload=1&v='+REVISION;
  if(name==='recados')return '/atendimento-acs-farmaceutico/painel-oficial-recados-campanhas.html?area='+area+access+'&from=central&preload=1&v='+REVISION;
  if(name==='agendas')return '/atendimento-acs-farmaceutico/painel-oficial-agendas-vagas.html?area='+area+access+'&from=central&preload=1&v='+REVISION;
  if(name==='profissionais')return '/atendimento-acs-farmaceutico/painel-oficial-profissionais-servicos.html?area='+area+access+'&from=central&preload=1&v='+REVISION;
  if(name==='territorio')return '/atendimento-acs-farmaceutico/painel-oficial-tacs-areas.html?from=central&preload=1&v='+REVISION;
  if(name==='municipios')return '/atendimento-acs-farmaceutico/painel-oficial-organizacoes-municipios.html?from=central&preload=1&v='+REVISION;
  return '';
}
function ensurePool(){
  if(pool&&pool.parentNode)return pool;
  pool=document.createElement('div');
  pool.id='portalTacsAdminPreloadPoolV1';
  pool.setAttribute('aria-hidden','true');
  pool.style.cssText='position:fixed;left:-200vw;top:0;width:430px;height:820px;overflow:hidden;opacity:.01;pointer-events:none;z-index:-1';
  document.body.appendChild(pool);
  return pool;
}
function frameHiddenStyle(frame){
  frame.style.cssText='display:block;width:390px;height:780px;border:0;background:#dfeef3;opacity:.01;pointer-events:none';
  frame.setAttribute('aria-hidden','true');
}
function frameVisibleStyle(frame){
  frame.style.cssText='display:block;width:100%;min-width:0;min-height:0;height:auto;flex:1 1 auto;border:0;background:#dfeef3;opacity:1;pointer-events:auto';
  frame.removeAttribute('aria-hidden');
}
function hideNode(node){if(node){node.hidden=true;node.style.setProperty('display','none','important')}}
function isErrorMessage(value){return /(erro|falh|inválid|recus|expir|não foi possível|nao foi possivel|ausente)/i.test(text(value))}
function preparePanelDocument(frame){
  var doc;
  try{doc=frame.contentDocument}catch(e){return}
  if(!doc||!doc.documentElement||!doc.body)return;
  if(!getSession().ok)return;
  doc.documentElement.dataset.portalTacsCentralSession='1';

  var style=doc.getElementById('portalTacsCentralSessionStyleV1');
  if(!style){
    style=doc.createElement('style');
    style.id='portalTacsCentralSessionStyleV1';
    style.textContent='\
#portalTacsCentralRefreshV1,#portalTacsAdminRefreshV1,#atualizarPaginaAgendasFlutuante,[id*="atualizarPagina"][id*="Flutuante"]{display:none!important}\
html[data-portal-tacs-central-session="1"] #loginAdminTab,html[data-portal-tacs-central-session="1"] #loginTacsTab{display:none!important}\
';
    doc.head.appendChild(style);
  }

  ['pin','adminPin','tacsPin','tacsPinAccess','tacsPinPublicacoes','login','entrar','loginTacs','entrarTacs','logout','sair','accessActions','pinHelp','adminLogin','tacsLogin','loginAdminTab','loginTacsTab'].forEach(function(id){hideNode(doc.getElementById(id))});
  ['pin','adminPin','tacsPin','tacsPinAccess','tacsPinPublicacoes'].forEach(function(id){
    try{doc.querySelectorAll('label[for="'+id+'"]').forEach(hideNode)}catch(e){}
  });

  var loginTabs=doc.querySelector('.login-tabs');
  if(loginTabs)hideNode(loginTabs);
  ['loginAdminTab','loginTacsTab'].forEach(function(id){
    var tab=doc.getElementById(id),parent=tab&&tab.parentElement;
    if(parent&&parent.classList.contains('abas'))hideNode(parent);
  });

  var status=doc.getElementById('loginStatus');
  if(status){
    var updateStatusVisibility=function(){
      if(isErrorMessage(status.textContent)){status.hidden=false;status.style.removeProperty('display')}
      else hideNode(status);
    };
    updateStatusVisibility();
    if(!status.dataset.centralStatusObserver&&frame.contentWindow&&frame.contentWindow.MutationObserver){
      status.dataset.centralStatusObserver='1';
      new frame.contentWindow.MutationObserver(updateStatusVisibility).observe(status,{childList:true,subtree:true,characterData:true});
    }
  }

  doc.querySelectorAll('#portalTacsCentralRefreshV1,#portalTacsAdminRefreshV1,#atualizarPaginaAgendasFlutuante,[id*="atualizarPagina"][id*="Flutuante"]').forEach(hideNode);
  if(!doc.documentElement.dataset.centralUiObserver&&frame.contentWindow&&frame.contentWindow.MutationObserver){
    doc.documentElement.dataset.centralUiObserver='1';
    new frame.contentWindow.MutationObserver(function(){
      doc.querySelectorAll('#portalTacsCentralRefreshV1,#portalTacsAdminRefreshV1,#atualizarPaginaAgendasFlutuante,[id*="atualizarPagina"][id*="Flutuante"]').forEach(hideNode);
    }).observe(doc.body,{childList:true,subtree:true});
  }
}
function panelLooksReady(name,frame){
  var doc;
  try{doc=frame.contentDocument}catch(e){return false}
  if(!doc||!doc.body)return false;
  preparePanelDocument(frame);
  if(name==='moradores'){
    var c=doc.getElementById('content'),n=doc.getElementById('countResidents');
    return Boolean(c&&!c.classList.contains('hidden')&&n&&text(n.textContent)!=='…'&&text(n.textContent)!=='—');
  }
  if(name==='recados'){
    var conteudo=doc.getElementById('conteudo'),resumo=doc.getElementById('resumo');
    return Boolean(conteudo&&!conteudo.classList.contains('oculto')&&resumo&&!resumo.classList.contains('oculto'));
  }
  if(name==='agendas'){
    var agenda=doc.getElementById('conteudo'),summary=doc.getElementById('resumo');
    return Boolean(agenda&&!agenda.classList.contains('oculto')&&summary&&!summary.classList.contains('oculto'));
  }
  if(name==='profissionais'){
    return Boolean(doc.getElementById('listaProfissionais')||doc.getElementById('listaServicos')||doc.querySelector('[data-id].cartao'));
  }
  if(name==='suporte'){
    return Boolean(doc.querySelector('main')&&doc.querySelector('.panel,.card,.painel'));
  }
  return Boolean(doc.querySelector('main')&&(doc.querySelector('.lista,.list,.card,.painel,.panel')||doc.querySelector('section')));
}
function monitorReady(name,frame){
  var started=Date.now();
  function check(){
    if(!frame.parentNode)return;
    if(panelLooksReady(name,frame)){
      frame.dataset.tacsReady='1';
      frame.dataset.tacsReadyAt=String(Date.now());
      if(name==='agendas')setTimeout(function(){
        if(activeName!==name&&frames[name]===frame&&frame.parentNode){frame.remove();delete frames[name]}
      },5000);
      return;
    }
    if(Date.now()-started<30000)setTimeout(check,180);
  }
  check();
}
function createFrame(name){
  var url=moduleUrl(name);if(!url)return null;
  var frame=document.createElement('iframe');
  frame.title=titles[name]||'Painel administrativo';
  frame.dataset.module=name;
  frame.dataset.tacsKey=key();
  frame.loading='eager';
  frame.src=url;
  frameHiddenStyle(frame);
  ensurePool().appendChild(frame);
  frame.addEventListener('load',function(){
    preparePanelDocument(frame);
    monitorReady(name,frame);
  });
  frames[name]=frame;
  return frame;
}
function ensureFrame(name){
  var frame=frames[name];
  if(frame&&frame.dataset.tacsKey===key()&&frame.parentNode)return frame;
  if(frame&&frame.parentNode)frame.remove();
  delete frames[name];
  return createFrame(name);
}
function allowedModules(){
  var out=[];
  document.querySelectorAll('#moduleGrid .module[data-module]').forEach(function(btn){
    var name=text(btn.dataset.module);
    if(!name||name==='portal'||btn.hidden||btn.disabled)return;
    out.push(name);
  });
  return out;
}
function beginPreload(){
  if(!getSession().ok)return;
  var modulesPanel=document.getElementById('modulesPanel');
  if(!modulesPanel||modulesPanel.hidden)return;
  var currentKey=key();
  if(preloadStartedFor===currentKey)return;
  preloadStartedFor=currentKey;
  var order=['moradores','agendas','recados','profissionais','suporte','territorio','municipios'];
  var allowed=allowedModules();
  order=order.filter(function(name){return allowed.indexOf(name)!==-1});
  order.forEach(function(name,index){
    setTimeout(function(){if(getSession().ok&&key()===currentKey)ensureFrame(name)},index<4?index*220:900+(index-4)*350);
  });
}
function resetFrames(){
  Object.keys(frames).forEach(function(name){var f=frames[name];if(f&&f.parentNode)f.remove()});
  frames={};activeName='';preloadStartedFor='';
  var original=document.getElementById('viewerFrame');if(original){original.src='about:blank';original.hidden=false}
}
function showFrame(name,title){
  var viewer=document.getElementById('viewer'),viewerTitle=document.getElementById('viewerTitle');
  if(!viewer)return false;
  var frame=ensureFrame(name);if(!frame)return false;
  var original=document.getElementById('viewerFrame');if(original)original.hidden=true;
  if(activeName&&frames[activeName]&&frames[activeName]!==frame){frameHiddenStyle(frames[activeName]);ensurePool().appendChild(frames[activeName])}
  activeName=name;
  if(viewerTitle)viewerTitle.textContent=title||titles[name]||'Painel';
  frameVisibleStyle(frame);
  viewer.appendChild(frame);
  viewer.hidden=false;
  document.body.classList.add('viewer-open');
  preparePanelDocument(frame);
  try{frame.focus()}catch(e){}
  return true;
}
function closeViewerFast(){
  var viewer=document.getElementById('viewer');
  if(activeName&&frames[activeName]){frameHiddenStyle(frames[activeName]);ensurePool().appendChild(frames[activeName])}
  activeName='';
  if(viewer)viewer.hidden=true;
  document.body.classList.remove('viewer-open');
  return true;
}
function removeCentralRefresh(){
  var b=document.getElementById('portalTacsCentralRefreshV1');if(b)b.remove();
}
function installCaptureNavigation(){
  document.addEventListener('click',function(event){
    var back=event.target&&event.target.closest?event.target.closest('#viewerBack'):null;
    if(back){
      event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
      closeViewerFast();return;
    }
    var button=event.target&&event.target.closest?event.target.closest('#moduleGrid .module[data-module]'):null;
    if(!button||button.hidden||button.disabled)return;
    var name=text(button.dataset.module);
    if(name==='portal')return;
    if(!getSession().ok)return;
    event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    showFrame(name,text(button.querySelector('strong')&&button.querySelector('strong').textContent));
    try{button.blur()}catch(e){}
  },true);
}
function installAreaWatcher(){
  var select=document.getElementById('adminArea');
  if(select)select.addEventListener('change',function(){setTimeout(function(){resetFrames();beginPreload()},40)});
}
function installSessionWatcher(){
  var last='';
  function tick(){
    removeCentralRefresh();
    var s=getSession(),now=(s.tacs?'tacs:':'admin:')+(s.territorio||s.admin);
    if(s.ok&&now!==last){last=now;setTimeout(beginPreload,80)}
    if(!s.ok&&last){last='';resetFrames()}
  }
  tick();
  setInterval(tick,250);
  if(watcher)watcher.disconnect();
  watcher=new MutationObserver(function(){removeCentralRefresh();beginPreload()});
  watcher.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled']});
}
function install(){
  ensurePool();
  installCaptureNavigation();
  installAreaWatcher();
  installSessionWatcher();
  removeCentralRefresh();
  beginPreload();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.addEventListener('pageshow',function(){removeCentralRefresh();beginPreload()});
window.PortalTacsCentralPerformance={
  version:'1.0.0',
  beginPreload:beginPreload,
  resetFrames:resetFrames,
  showFrame:showFrame,
  closeViewer:closeViewerFast,
  ready:function(name){return Boolean(frames[name]&&frames[name].dataset.tacsReady==='1')}
};
}());
