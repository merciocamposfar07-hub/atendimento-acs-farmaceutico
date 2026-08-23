(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined')return;
if(window.PortalTacsConectaOficialV1)return;
window.PortalTacsConectaOficialV1={version:'1.0.2'};

var SELECTOR='.portal-footer-brand';
var ATTR='data-conecta-oficial';
var observer=null;
var retryTimer=null;
var retryCount=0;
var MAX_RETRIES=120;
var RETRY_MS=100;

function simbolo(){
  return '<svg '+ATTR+'="1" viewBox="0 0 100 100" role="img" aria-label="Símbolo oficial Conecta Saúde Comunitária" xmlns="http://www.w3.org/2000/svg">'+
    '<defs>'+
      '<linearGradient id="cscVerde" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#75e65f"/><stop offset="1" stop-color="#35bf77"/></linearGradient>'+
      '<linearGradient id="cscTurquesa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#57e0d2"/><stop offset="1" stop-color="#19b8c8"/></linearGradient>'+
      '<linearGradient id="cscCoracao" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#48e0a4"/><stop offset=".52" stop-color="#16c5bd"/><stop offset="1" stop-color="#0875c5"/></linearGradient>'+
      '<filter id="cscSombra" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-color="#001b32" flood-opacity=".32"/></filter>'+
    '</defs>'+
    '<g filter="url(#cscSombra)">'+
      '<circle cx="50" cy="8.5" r="6.2" fill="#fff"/>'+
      '<path d="M25 30C32 22 40 18 49 17c13-1 25 5 31 17" fill="none" stroke="#fff" stroke-width="7.2" stroke-linecap="round"/>'+
      '<circle cx="13" cy="48" r="5.6" fill="#67d95d"/>'+
      '<path d="M29 25C22 33 19 42 20 52c.5 8 3.5 15 8.5 21" fill="none" stroke="url(#cscVerde)" stroke-width="7" stroke-linecap="round"/>'+
      '<circle cx="87" cy="49" r="5.6" fill="#58d2c8"/>'+
      '<path d="M72 27c6.5 7.5 9.5 16 9 25-.5 9-3.5 16-9.5 22" fill="none" stroke="url(#cscTurquesa)" stroke-width="7" stroke-linecap="round"/>'+
      '<circle cx="49" cy="91" r="6.2" fill="#fff"/>'+
      '<path d="M20 68c7 9 17 14 29 14 12.5 0 23-5 31-14" fill="none" stroke="#fff" stroke-width="7.2" stroke-linecap="round"/>'+
      '<path d="M50 39c-6.5-8-19-4.2-19 6 0 12 19 24 19 24s19-12 19-24c0-10.2-12.5-14-19-6z" fill="url(#cscCoracao)"/>'+
      '<path d="M50 44v17M41.5 52.5h17" fill="none" stroke="#075579" stroke-width="5.3" stroke-linecap="round"/>'+
    '</g>'+
  '</svg>';
}

function aplicar(){
  var brand=document.querySelector(SELECTOR);
  if(!brand)return false;
  var oficial=brand.querySelector('['+ATTR+'="1"]');
  if(oficial){
    var caixaAtual=document.createElement('span');
    caixaAtual.innerHTML=simbolo();
    var atualizado=caixaAtual.firstElementChild;
    if(atualizado)oficial.replaceWith(atualizado);
    return true;
  }
  var antigo=brand.querySelector('svg,img');
  var caixa=document.createElement('span');
  caixa.innerHTML=simbolo();
  var novo=caixa.firstElementChild;
  if(!novo)return false;
  if(antigo)antigo.replaceWith(novo);else brand.insertBefore(novo,brand.firstChild);
  return true;
}

function programarNovaTentativa(){
  if(retryTimer||retryCount>=MAX_RETRIES)return;
  retryTimer=setTimeout(function(){
    retryTimer=null;
    retryCount++;
    aplicar();
    programarNovaTentativa();
  },RETRY_MS);
}

function iniciar(){
  aplicar();
  if(document.documentElement&&!observer){
    observer=new MutationObserver(function(){aplicar()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(function(){
      if(observer){observer.disconnect();observer=null}
      if(retryTimer){clearTimeout(retryTimer);retryTimer=null}
      aplicar();
    },15000);
  }
  programarNovaTentativa();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
window.addEventListener('pageshow',function(){retryCount=0;iniciar()});
}());
