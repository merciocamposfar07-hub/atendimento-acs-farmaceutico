(function(){
'use strict';
if(window.PortalTacsCentralPerformanceV1)return;
window.PortalTacsCentralPerformanceV1=true;

var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var AREA_KEY='portalTacsCentralAreaV1';
var PROFILE_KEY='portalTacsAcessoRapidoV1';
var REVISION='20260823-admin-performance-v1';
var DIRTY_MESSAGE='Há alterações que podem não ter sido salvas. Deseja voltar à Central mesmo assim?';
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
  var s=getSession(),select=document.getElementById('adminArea'),a=normArea(select&&select.value);
  if(a)return a;
  if(s.tacs){
    try{var profile=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');a=normArea(profile&&profile.areaId);if(a)return a}catch(e){}
  }
  try{a=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}
  return a||'JAPARANDUBA';
}
function sessionKey(){var s=getSession();return (s.tacs?'tacs':'admin')+'|'+areaId()}
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
function hideRedundantAccessCopy(doc){
  if(!doc)return;
  doc.querySelectorAll('h2,h3').forEach(function(node){
    var value=text(node.textContent).toLowerCase();
    if(value==='acesso administrativo'||value==='acesso às publicações'||value==='acesso as publicações'||value==='acesso territorial'||value==='entrar')hideNode(node);
  });
  doc.querySelectorAll('p.muted').forEach(function(node){
    var value=text(node.textContent);
    if(/\bPIN\b/i.test(value)&&/(salvo|administrador|TACS|autenticad|acesso)/i.test(value))hideNode(node);
  });
}
function markPanelDirty(doc){
  if(!doc||!doc.documentElement||doc.documentElement.dataset.tacsDirtyTracking==='1')return;
  doc.documentElement.dataset.tacsDirtyTracking='1';
  setTimeout(function(){
    ['input','change'].forEach(function(type){doc.addEventListener(type,function(event){
      var target=event.target;
      if(!event.isTrusted||!target||target.disabled||target.readOnly)return;
      var tag=String(target.tagName||'').toLowerCase();
      if(tag==='input'||tag==='textarea'||tag==='select')doc.documentElement.dataset.tacsDirty='1';
    },true)});
  },900);
}
function removePanelRefresh(doc){
  if(!doc)return;
  var button=doc.getElementById('portalTacsAdminRefreshV1');
  if(button)button.remove();
}
function preparePanelDocument(frame){
  var doc;
  try{doc=frame.contentDocument}catch(e){return}
  if(!doc||!doc.documentElement||!doc.body)return;
  if(!getSession().ok)return;
  doc.documentElement.dataset.portalTacsCentralSession='1';
  markPanelDirty(doc);
  removePanelRefresh(doc);

  ['pin','adminPin','tacsPin','tacsPinAccess','tacsPinPublicacoes','tacsPinLogin','login','entrar','loginTacs','entrarTacs','adminLoginButton','tacsLoginButton','logout','sair','logoutButton','accessActions','pinHelp','adminLogin','tacsLogin','loginAdminTab','loginTacsTab'].forEach(function(id){hideNode(doc.getElementById(id))});
  ['pin','adminPin','tacsPin','tacsPinAccess','tacsPinPublicacoes','tacsPinLogin'].forEach(function(id){
    try{doc.querySelectorAll('label[for="'+id+'"]').forEach(hideNode)}catch(e){}
  });

  var loginTabs=doc.querySelector('.login-tabs');
  if(loginTabs)hideNode(loginTabs);
  ['loginAdminTab','loginTacsTab'].forEach(function(id){
    var tab=doc.getElementById(id),parent=tab&&tab.parentElement;
    if(parent&&parent.classList.contains('abas'))hideNode(parent);
  });
  if(doc.getElementById('dashboard')&&doc.getElementById('loginPanel'))hideNode(doc.getElementById('loginPanel'));
  hideRedundantAccessCopy(doc);

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

  if(!doc.documentElement.dataset.centralUiObserver&&frame.contentWindow&&frame.contentWindow.MutationObserver){
    doc.documentElement.dataset.centralUiObserver='1';
    new frame.contentWindow.MutationObserver(function(){hideRedundantAccessCopy(doc)}).observe(doc.body,{childList:true,subtree:true});
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
  if(name==='territorio'){
    var dashboard=doc.getElementById('dashboard');
    return Boolean(dashboard&&!dashboard.classList.contains('hidden'));
  }
  if(name==='municipios'){
    var summaryPanel=doc.getElementById('summaryPanel'),contentPanel=doc.getElementById('contentPanel');
    return Boolean(summaryPanel&&!summaryPanel.hidden&&contentPanel&&!contentPanel.hidden);
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
  frame.dataset.tacsKey=sessionKey();
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
  if(frame&&frame.dataset.tacsKey===sessionKey()&&frame.parentNode)return frame;
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
  var currentKey=sessionKey();
  if(preloadStartedFor===currentKey)return;
  preloadStartedFor=currentKey;
  var order=['moradores','agendas','recados','profissionais','suporte','territorio','municipios'];
  var allowed=allowedModules();
  order=order.filter(function(name){return allowed.indexOf(name)!==-1});
  var delays={moradores:0,agendas:260,recados:850,profissionais:2400,suporte:3200,territorio:3900,municipios:4600};
  order.forEach(function(name){
    setTimeout(function(){if(getSession().ok&&sessionKey()===currentKey)ensureFrame(name)},Number(delays[name]||0));
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
function activePanelIsDirty(){
  if(!activeName||!frames[activeName])return false;
  try{
    var doc=frames[activeName].contentDocument;
    return Boolean(doc&&doc.documentElement&&doc.documentElement.dataset.tacsDirty==='1');
  }catch(e){return false}
}
function closeViewerFast(options){
  options=options||{};
  if(!options.force&&activePanelIsDirty()){
    if(typeof window.confirm!=='function'||!window.confirm(DIRTY_MESSAGE))return false;
  }
  var viewer=document.getElementById('viewer');
  if(activeName&&frames[activeName]){frameHiddenStyle(frames[activeName]);ensurePool().appendChild(frames[activeName])}
  activeName='';
  if(viewer)viewer.hidden=true;
  document.body.classList.remove('viewer-open');
  return true;
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
    var s=getSession(),now=(s.tacs?'tacs:':'admin:')+(s.territorio||s.admin);
    if(s.ok&&now!==last){last=now;setTimeout(beginPreload,80)}
    if(!s.ok&&last){last='';resetFrames()}
  }
  tick();
  setInterval(tick,250);
  if(watcher)watcher.disconnect();
  watcher=new MutationObserver(function(){beginPreload()});
  watcher.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled']});
}
function install(){
  document.documentElement.dataset.portalTacsPerformanceInstalled='1';
  ensurePool();
  installCaptureNavigation();
  installAreaWatcher();
  installSessionWatcher();
  beginPreload();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.addEventListener('pageshow',beginPreload);
window.PortalTacsCentralPerformance={
  version:'1.1.0',
  beginPreload:beginPreload,
  resetFrames:resetFrames,
  showFrame:showFrame,
  closeViewer:closeViewerFast,
  ready:function(name){return Boolean(frames[name]&&frames[name].dataset.tacsReady==='1')}
};
}());
