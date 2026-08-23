(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined')return;
if(window.PortalTacsConectaOficialV1)return;
window.PortalTacsConectaOficialV1={version:'1.1.1'};

var SELECTOR='.portal-footer-brand';
var ATTR='data-conecta-oficial';
var SRC='/atendimento-acs-farmaceutico/assets/conecta-saude-comunitaria-oficial-footer.png?v=20260822-oficial-exato-v2';
var observer=null;
var retryTimer=null;
var retryCount=0;
var MAX_RETRIES=120;
var RETRY_MS=100;

function criarImagem(){
  var img=document.createElement('img');
  img.setAttribute(ATTR,'1');
  img.src=SRC;
  img.alt='Conecta Saúde Comunitária';
  img.setAttribute('aria-label','Símbolo oficial Conecta Saúde Comunitária');
  img.width=48;
  img.height=48;
  img.decoding='async';
  img.loading='eager';
  img.style.width='48px';
  img.style.height='48px';
  img.style.objectFit='cover';
  img.style.borderRadius='12px';
  img.style.flex='0 0 auto';
  img.style.display='block';
  return img;
}

function aplicar(){
  var brand=document.querySelector(SELECTOR);
  if(!brand)return false;
  var atual=brand.querySelector('['+ATTR+'="1"]');
  if(atual&&String(atual.tagName||'').toLowerCase()==='img'&&String(atual.getAttribute('src')||'').indexOf('conecta-saude-comunitaria-oficial-footer.png')!==-1)return true;
  var antigo=brand.querySelector('svg,img');
  var novo=criarImagem();
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
