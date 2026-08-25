(function(){
'use strict';
if(window.PortalTacsCentralBackButtonV1)return;
window.PortalTacsCentralBackButtonV1=true;

var path=String(location.pathname||'');
var isAdminPanel=(/\/teste-v1\/painel-moradores-v2\.html$/i.test(path)||/\/painel-suporte-moradores-v2\.html$/i.test(path)||/\/painel-oficial-(?:recados-campanhas|agendas-vagas|profissionais-servicos|tacs-areas|organizacoes-municipios)\.html$/i.test(path));
var params;
try{params=new URLSearchParams(location.search||'')}catch(e){params=null}
var fromCentral=params&&String(params.get('from')||'').toLowerCase()==='central';
var returnFlag=false;
try{returnFlag=sessionStorage.getItem('portalTacsRetornoCentralV1')==='1'}catch(e){}
/* Nos painéis administrativos o retorno deve existir sempre. No Portal público, somente quando aberto pela Central. */
if(!isAdminPanel&&!fromCentral&&!returnFlag)return;

function centralUrl(){
  var saved='';
  try{saved=sessionStorage.getItem('portalTacsCentralReturnUrlV1')||''}catch(e){}
  if(saved){
    try{
      var u=new URL(saved,location.href);
      if(u.origin===location.origin&&/\/central-administrativa-tacs\.html$/i.test(u.pathname))return u.href;
    }catch(e){}
  }
  var tacs=false;
  try{tacs=!!sessionStorage.getItem('portalTacsTerritorioTokenV1')}catch(e){}
  return '/atendimento-acs-farmaceutico/central-administrativa-tacs.html'+(tacs?'?acesso=tacs':'');
}

function install(){
  if(document.getElementById('portalTacsBackCentralV1'))return;
  var bar=document.createElement('div');
  bar.id='portalTacsBackCentralV1';
  bar.setAttribute('role','navigation');
  bar.setAttribute('aria-label','Retorno à Central Administrativa');
  bar.style.cssText='position:relative;z-index:2147483000;background:#073a55;border-bottom:3px solid #69c7e7;padding:calc(10px + env(safe-area-inset-top)) 14px 10px;box-sizing:border-box;width:100%;display:block;';
  var btn=document.createElement('button');
  btn.type='button';
  btn.textContent='← Voltar à Central';
  btn.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:48px;border:2px solid #69c7e7;border-radius:16px;padding:9px 16px;background:#fff;color:#073a55;font:inherit;font-weight:900;line-height:1.15;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
  btn.addEventListener('click',function(){
    btn.disabled=true;
    try{sessionStorage.setItem('portalTacsRetornoCentralV1','1')}catch(e){}
    /*
     * Quando o painel foi aberto pela Central, voltar pelo histórico restaura a
     * própria Central já autenticada e no segundo estágio, em vez de recriá-la
     * na tela de login. Se não houver histórico confiável, usamos a URL salva.
     */
    if(fromCentral&&history.length>1){
      history.back();
      return;
    }
    location.assign(centralUrl());
  });
  bar.appendChild(btn);
  document.body.insertBefore(bar,document.body.firstChild);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
}());
