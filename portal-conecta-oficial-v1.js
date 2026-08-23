(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined')return;
if(window.PortalTacsConectaOficialV1)return;
window.PortalTacsConectaOficialV1={version:'1.0.1'};

var SELECTOR='.portal-footer-brand';
var ATTR='data-conecta-oficial';
var observer=null;
var retryTimer=null;
var retryCount=0;
var MAX_RETRIES=120;
var RETRY_MS=100;

function simbolo(){
  return '<svg '+ATTR+'="1" viewBox="0 0 72 72" role="img" aria-label="Símbolo oficial Conecta Saúde Comunitária" xmlns="http://www.w3.org/2000/svg">'+
    '<defs><linearGradient id="conectaOficialCor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#58d06f"/><stop offset=".55" stop-color="#22b985"/><stop offset="1" stop-color="#43c5c5"/></linearGradient></defs>'+
    '<path d="M36 27C31.3 21.6 21.3 23.5 21.3 32.1c0 9.4 14.7 18.9 14.7 18.9s14.7-9.5 14.7-18.9C50.7 23.5 40.7 21.6 36 27z" fill="url(#conectaOficialCor)"/>'+
    '<path d="M36 31.8v13.1M29.45 38.35h13.1" fill="none" stroke="#0b4c67" stroke-width="4.3" stroke-linecap="round"/>'+
    '<circle cx="36" cy="7.5" r="5.3" fill="#fff"/>'+
    '<path d="M22.1 20.8c5.2-4.7 10.7-7.1 16.5-6.9 7.7.2 14.1 4.4 18.1 11.4" fill="none" stroke="#fff" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<circle cx="8.4" cy="35.8" r="4.9" fill="#54ce70"/>'+
    '<path d="M20.7 18.4c-4.9 5.2-7.3 11.2-7.1 18 .1 6.1 2.2 11.8 6.9 17" fill="none" stroke="#54ce70" stroke-width="6.1" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<circle cx="63.7" cy="35.9" r="4.9" fill="#53c8bd"/>'+
    '<path d="M51.7 18.5c4.6 5.2 6.9 11.2 6.8 17.8-.1 6.6-2.4 12.4-6.9 17.2" fill="none" stroke="#53c8bd" stroke-width="6.1" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<circle cx="35.8" cy="64.3" r="5.3" fill="#fff"/>'+
    '<path d="M17.9 51.2c4.8 5.4 10.9 8.2 18.1 8.3 7.3.1 13.6-2.7 18.4-8" fill="none" stroke="#fff" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>'+
  '</svg>';
}

function aplicar(){
  var brand=document.querySelector(SELECTOR);
  if(!brand)return false;
  if(brand.querySelector('['+ATTR+'="1"]'))return true;
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
