(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined')return;
if(window.PortalTacsConectaOficialV1)return;
window.PortalTacsConectaOficialV1={version:'1.5.0'};

var SELECTOR='.portal-footer-brand';
var ATTR='data-conecta-oficial';
var SRC='/atendimento-acs-farmaceutico/conecta-saude-homologacao/v15/assets/conecta-saude-central-canonico-2026-09-09.png?v=20260909-3';
var retryTimer=null,retryCount=0,MAX_RETRIES=40,RETRY_MS=250;

function criarImagem(){
  var img=document.createElement('img');
  img.setAttribute(ATTR,'1');
  img.src=SRC;
  img.alt='Conecta Saúde Comunitária';
  img.setAttribute('aria-label','Símbolo oficial Conecta Saúde Comunitária');
  img.width=56;img.height=56;
  img.decoding='sync';
  img.loading='eager';
  img.style.cssText='width:56px;height:56px;object-fit:contain;border-radius:12px;flex:0 0 auto;display:block;background:#073a55;';
  return img;
}
function aplicar(){
  var brand=document.querySelector(SELECTOR);
  if(!brand)return false;
  var atual=brand.querySelector('['+ATTR+'="1"]');
  if(atual&&String(atual.tagName||'').toLowerCase()==='img'&&String(atual.getAttribute('src')||'')===SRC)return true;
  var antigo=brand.querySelector('svg,img');
  var novo=criarImagem();
  if(antigo)antigo.replaceWith(novo);else brand.insertBefore(novo,brand.firstChild);
  return true;
}
function tentar(){
  if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}
  if(aplicar())return;
  if(retryCount++>=MAX_RETRIES)return;
  retryTimer=setTimeout(tentar,RETRY_MS);
}
function iniciar(){retryCount=0;tentar();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
window.addEventListener('pageshow',function(){
  if(!document.querySelector(SELECTOR+' ['+ATTR+'="1"]'))iniciar();
});
}());
