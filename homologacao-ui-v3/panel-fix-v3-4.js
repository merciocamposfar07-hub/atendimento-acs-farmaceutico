(function(){
'use strict';
if(window.PortalTacsPanelFixV34)return;
window.PortalTacsPanelFixV34=true;

var ADMIN='portalTacsAdminTokenV1';
var TERR='portalTacsTerritorioTokenV1';
var CACHE_PREFIX='portalTacsMoradoresResumoV34:';
function text(v){return String(v==null?'':v).trim()}
function hasSession(){try{return !!(text(sessionStorage.getItem(ADMIN)||'')||text(sessionStorage.getItem(TERR)||''))}catch(e){return false}}
function area(){try{return text(new URLSearchParams(location.search||'').get('area')||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)||'JAPARANDUBA'}catch(e){return'JAPARANDUBA'}}
function isMoradores(doc){return !!(doc&&doc.getElementById&&doc.getElementById('content')&&doc.getElementById('pin')&&doc.getElementById('countResidents'))}
function hide(n){if(n)n.style.setProperty('display','none','important')}
function show(n){if(n)n.style.removeProperty('display')}

function hideLegacyBack(doc){
  doc=doc||document;
  hide(doc.getElementById('portalTacsBackCentralV1'));
  Array.prototype.forEach.call(doc.querySelectorAll('[id*="BackCentral"],[class*="back-central"],[class*="voltar-central"]'),function(n){if(n.id!=='v3BackCentral')hide(n)});
}
function installBackArrow(doc){
  doc=doc||document;
  var b=doc.getElementById('v3BackCentral');
  if(!b)return;
  if(b.dataset.v34Back==='1')return;
  var clone=b.cloneNode(true);clone.dataset.v34Back='1';clone.textContent='‹';clone.setAttribute('aria-label','Voltar à tela anterior');
  b.parentNode.replaceChild(clone,b);
  clone.addEventListener('click',function(){
    try{
      if(window.top&&window.top!==window){window.top.history.back();return}
      if(history.length>1){history.back();return}
    }catch(e){}
    location.href='/atendimento-acs-farmaceutico/homologacao-ui-v3/central-administrativa.html?v=20260909-4';
  });
}
function cacheMoradores(doc){
  if(!isMoradores(doc)||!hasSession())return;
  var ids=['countResidents','schema','write','consolidation','situation'];
  var data={},ready=true;
  ids.forEach(function(id){var n=doc.getElementById(id),v=text(n&&n.textContent);data[id]=v;if(!v||v==='—'||v==='…'||/aguarde|verificando|conferindo/i.test(v))ready=false});
  if(ready){try{sessionStorage.setItem(CACHE_PREFIX+area(),JSON.stringify({at:Date.now(),data:data}))}catch(e){}}
}
function primeMoradores(doc){
  if(!isMoradores(doc)||!hasSession())return false;
  var raw='';try{raw=sessionStorage.getItem(CACHE_PREFIX+area())||''}catch(e){}
  if(!raw)return false;
  var parsed=null;try{parsed=JSON.parse(raw)}catch(e){return false}
  var data=parsed&&parsed.data;if(!data)return false;
  Object.keys(data).forEach(function(id){var n=doc.getElementById(id);if(n&&data[id])n.textContent=data[id]});
  var summary=doc.getElementById('summary');if(summary)summary.classList.remove('hidden');
  return true;
}
function fixMoradores(doc){
  if(!isMoradores(doc)||!hasSession())return;
  doc.documentElement.classList.add('v34-moradores','v3-session-reused');
  var pin=doc.getElementById('pin'),auth=pin&&pin.closest('.panel');
  if(auth){
    var h2=auth.querySelector('h2');if(h2&&/acesso/i.test(text(h2.textContent)))hide(h2);
    hide(auth.querySelector('label[for="pin"]'));hide(pin);hide(doc.getElementById('login'));
    var loginAction=doc.getElementById('login');if(loginAction)hide(loginAction.closest('.actions'));
    var tpin=doc.getElementById('tacsPinAccess');if(tpin){var tbox=tpin.closest('.area-control');hide(tbox)}
    var logout=doc.getElementById('logout');if(logout)hide(logout.closest('.actions'));
    Array.prototype.forEach.call(auth.querySelectorAll('p.muted'),function(p){if(/pin|tacs autenticado|sessão/i.test(text(p.textContent)))hide(p)});
    hide(doc.getElementById('loginStatus'));
    hide(doc.getElementById('areaControl'));
    var summary=doc.getElementById('summary');
    var cached=primeMoradores(doc);
    if(summary&&!cached){
      var values=Array.prototype.map.call(summary.querySelectorAll('strong'),function(n){return text(n.textContent)}).join(' ');
      if(/aguarde|…|—|verificando|conferindo/i.test(values))summary.classList.add('v34-summary-pending');
      else summary.classList.remove('v34-summary-pending');
    }
  }
  var note=doc.querySelector('main > .note');hide(note);
  var content=doc.getElementById('content');if(content){content.classList.remove('hidden');show(content)}
  var op=doc.getElementById('operationStatus');if(op){var s=text(op.textContent);if(/aguarde|conferindo|verificando|painel disponível|carregando/i.test(s)&&!/erro|falha|indispon|expirad/i.test(s))hide(op);else show(op)}
  var search=doc.getElementById('search');if(search&&/conferindo|aguarde/i.test(text(search.textContent)))search.textContent='Buscar na base real';
  cacheMoradores(doc);
  var summary2=doc.getElementById('summary');if(summary2){var vals=Array.prototype.map.call(summary2.querySelectorAll('strong'),function(n){return text(n.textContent)}).join(' ');if(!/aguarde|…|—|verificando|conferindo/i.test(vals))summary2.classList.remove('v34-summary-pending')}
}
function sweep(doc){doc=doc||document;hideLegacyBack(doc);installBackArrow(doc);fixMoradores(doc)}
function watch(doc){
  if(!doc||!doc.documentElement||doc.documentElement.dataset.v34Observed==='1')return;doc.documentElement.dataset.v34Observed='1';
  var obs=new MutationObserver(function(){sweep(doc)});obs.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class','style']});
}
function themeFrames(){Array.prototype.forEach.call(document.querySelectorAll('iframe'),function(fr){try{var d=fr.contentDocument;if(d&&d.location&&d.location.origin===location.origin){sweep(d);watch(d)}}catch(e){}})}
function boot(){sweep(document);watch(document);themeFrames();var ticks=0,t=setInterval(function(){ticks++;sweep(document);themeFrames();if(ticks>=40)clearInterval(t)},200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',function(){sweep(document);themeFrames()});
}());
