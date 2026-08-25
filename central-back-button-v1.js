(function(){
'use strict';

var path=String(location.pathname||'');
var isRecados=/\/painel-oficial-recados-campanhas\.html$/i.test(path);

/*
 * Safari/iPhone — estabilização específica de Recados e campanhas.
 * Mantém a rolagem no elemento raiz, evita camadas de composição desnecessárias
 * e restaura contraste explícito sem remover funcionalidades.
 */
function installRecadosRenderSafe(){
  if(!isRecados)return;
  if(document.getElementById('portalTacsRecadosRenderSafeV3'))return;
  var style=document.createElement('style');
  style.id='portalTacsRecadosRenderSafeV3';
  style.textContent=[
    'html{height:auto!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important;scroll-behavior:auto!important;}',
    'body{height:auto!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:visible!important;background:#eaf2f6!important;}',
    'main{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;contain:none!important;content-visibility:visible!important;}',
    'header,footer,main,.card,.item,.numero,.areaEnvio,.manutencao,.saude-notificacoes,.saude-resumo,.saude-lista,.saude-aparelho,.saude-vazio,.saude-numero,.botao,.aba,.status,.validadeCampo{contain:none!important;content-visibility:visible!important;will-change:auto!important;transform:none!important;filter:none!important;-webkit-filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;}',
    'header,footer{background:#073a55!important;background-image:none!important;}',
    '.card{background:#fff!important;background-image:none!important;}',
    '.numero,.areaEnvio,.item{background:#073a55!important;background-image:none!important;border-color:#69c7e7!important;color:#fff!important;}',
    '.numero strong,.numero span,.areaEnvio label,.areaEnvio p,.item h3,.item .sub{color:#eaf7fb!important;}',
    '.item .corpo{border-top-color:rgba(216,238,247,.35)!important;}',
    '.botao{background:#073a55!important;background-image:none!important;color:#fff!important;}',
    '.aba{background:#fff!important;color:#102d40!important;border-color:#a9c0ca!important;}',
    '.aba.ativa{background:#073a55!important;color:#fff!important;border-color:#073a55!important;}',
    '.botao.vermelho{background:#972f2f!important;color:#fff!important;}',
    '.manutencaoBotao{background:#a52d2d!important;color:#fff!important;}',
    '.manutencao.ativa .manutencaoBotao{background:#148a46!important;color:#fff!important;}',
    '.status{background:#f5f8fa!important;color:#102d40!important;}',
    '.status.ok{background:#e8f7ee!important;color:#08723a!important;}',
    '.status.aviso{background:#fff6dd!important;color:#805300!important;}',
    '.status.erro{background:#fff0f0!important;color:#a52d2d!important;}',
    '.barra{position:static!important;bottom:auto!important;z-index:auto!important;}',
    '.ponte{display:block!important;visibility:hidden!important;position:absolute!important;left:-4px!important;top:-4px!important;width:1px!important;height:1px!important;min-width:1px!important;min-height:1px!important;border:0!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;}',
    '.validadeCampo{contain:none!important;overflow:hidden!important;}',
    '.saude-resumo button.saude-numero,.saude-resumo button.saude-numero[aria-pressed="true"]{transform:none!important;will-change:auto!important;box-shadow:none!important;background-image:none!important;}',
    '.saude-resumo button.saude-numero[data-saude-filtro="ATIVO"]{background:#087064!important;color:#fff!important;}',
    '.saude-resumo button.saude-numero[data-saude-filtro="INATIVO"]{background:#962f35!important;color:#fff!important;}',
    '.saude-resumo button.saude-numero[data-saude-filtro="REPARO"]{background:#aa7f00!important;color:#fff!important;}',
    '.saude-resumo button.saude-numero[data-saude-filtro="SEM_CONFIRMACAO"]{background:#c45100!important;color:#fff!important;}',
    '.saude-resumo button.saude-numero[data-saude-filtro] strong,.saude-resumo button.saude-numero[data-saude-filtro] span{color:#fff!important;}',
    '.tacs-lista-mais{margin-top:12px;width:100%;min-height:54px;border:2px solid #69c7e7;border-radius:18px;background:#fff;color:#073a55;font:inherit;font-weight:900;touch-action:manipulation;}',
    '.card,.item,.saude-notificacoes,.saude-resumo,.saude-lista,.saude-aparelho{backface-visibility:visible!important;-webkit-backface-visibility:visible!important;perspective:none!important;-webkit-perspective:none!important;}',
    '*,*::before,*::after{animation:none!important;transition:none!important;}',
    '.oculto{display:none!important;}'
  ].join('\n');
  (document.head||document.documentElement).appendChild(style);
}
installRecadosRenderSafe();

/*
 * Reduz o DOM simultâneo das listas longas. O código original continua dono dos
 * dados e das ações; aqui apenas destacamos cartões excedentes e os devolvemos
 * em blocos quando o usuário pede. Isso evita dezenas de formulários completos
 * renderizados ao mesmo tempo no WebKit.
 */
function installRecadosDomWindow(){
  if(!isRecados)return;
  var PAGE=6;
  var states={};

  function labelFor(id,remaining){
    var nome=id==='listaCampanhas'?'campanhas':'recados';
    return 'Mostrar mais '+nome+' ('+remaining+')';
  }

  function makeControl(id,state){
    if(!state.rest.length)return null;
    var wrap=document.createElement('div');
    wrap.className='tacs-lista-controle';
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='tacs-lista-mais';
    btn.textContent=labelFor(id,state.rest.length);
    wrap.appendChild(btn);
    return wrap;
  }

  function reconnect(state){
    if(!state||!state.observer)return;
    state.observer.observe(state.list,{childList:true});
  }

  function compactFresh(id){
    var state=states[id],list=state&&state.list;
    if(!state||!list)return;
    state.observer.disconnect();
    var oldControl=list.querySelector('.tacs-lista-controle');
    if(oldControl)oldControl.remove();
    state.rest=[];
    var items=Array.prototype.slice.call(list.children).filter(function(el){return el.matches&&el.matches('details.item')});
    var section=list.closest('#secaoRecados,#secaoCampanhas');
    var initial=section&&section.classList.contains('oculto')?0:PAGE;
    items.slice(initial).forEach(function(el){state.rest.push(el);el.remove()});
    var control=makeControl(id,state);if(control)list.appendChild(control);
    reconnect(state);
  }

  function ensureFirstPage(id){
    var state=states[id],list=state&&state.list;
    if(!state||!list)return;
    var current=list.querySelectorAll('details.item').length;
    if(current>0||!state.rest.length)return;
    state.observer.disconnect();
    var control=list.querySelector('.tacs-lista-controle');
    var take=state.rest.splice(0,PAGE);
    take.forEach(function(el){list.insertBefore(el,control||null)});
    if(control){
      if(state.rest.length)control.querySelector('.tacs-lista-mais').textContent=labelFor(id,state.rest.length);
      else control.remove();
    }
    reconnect(state);
  }

  function showMore(id){
    var state=states[id],list=state&&state.list;
    if(!state||!list||!state.rest.length)return;
    state.observer.disconnect();
    var control=list.querySelector('.tacs-lista-controle');
    var take=state.rest.splice(0,PAGE);
    take.forEach(function(el){list.insertBefore(el,control||null)});
    if(control){
      if(state.rest.length)control.querySelector('.tacs-lista-mais').textContent=labelFor(id,state.rest.length);
      else control.remove();
    }
    reconnect(state);
  }

  ['listaRecados','listaCampanhas'].forEach(function(id){
    var list=document.getElementById(id);if(!list)return;
    var state={list:list,rest:[],observer:null};
    state.observer=new MutationObserver(function(){compactFresh(id)});
    states[id]=state;
    reconnect(state);
    list.addEventListener('click',function(e){if(e.target.closest('.tacs-lista-mais'))showMore(id)});
    compactFresh(id);
  });

  var recados=document.getElementById('abaRecados'),campanhas=document.getElementById('abaCampanhas');
  if(recados)recados.addEventListener('click',function(){setTimeout(function(){ensureFirstPage('listaRecados')},0)});
  if(campanhas)campanhas.addEventListener('click',function(){setTimeout(function(){ensureFirstPage('listaCampanhas')},0)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installRecadosDomWindow,{once:true});
else installRecadosDomWindow();

/*
 * Alguns painéis oficiais carregam outro HTML com document.open()/document.write().
 * Nesses casos o objeto window sobrevive, mas o DOM inteiro é substituído.
 * Portanto só bloqueamos a segunda execução quando o botão já existe no DOM atual.
 */
if(window.PortalTacsCentralBackButtonV1&&document.getElementById('portalTacsBackCentralV1'))return;
window.PortalTacsCentralBackButtonV1=true;

var isAdminPanel=(
  /\/teste-v1\/painel-moradores-v2\.html$/i.test(path)||
  /\/painel-suporte-moradores-v2\.html$/i.test(path)||
  /\/painel-oficial-(?:recados-campanhas|agendas-vagas|profissionais-servicos|tacs-areas|organizacoes-municipios)\.html$/i.test(path)||
  /\/teste-v1\/painel-(?:profissionais-servicos|tacs-areas)-v1\.html$/i.test(path)
);
var params;
try{params=new URLSearchParams(location.search||'')}catch(e){params=null}
var fromCentral=params&&String(params.get('from')||'').toLowerCase()==='central';
var returnFlag=false;
try{returnFlag=sessionStorage.getItem('portalTacsRetornoCentralV1')==='1'}catch(e){}
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
  if(!document.body){setTimeout(install,0);return;}
  var bar=document.createElement('div');
  bar.id='portalTacsBackCentralV1';
  bar.setAttribute('role','navigation');
  bar.setAttribute('aria-label','Retorno à Central Administrativa');
  bar.style.cssText='position:relative;z-index:10;background:#073a55;border-bottom:3px solid #69c7e7;padding:calc(10px + env(safe-area-inset-top)) 14px 10px;box-sizing:border-box;width:100%;display:block;';
  var btn=document.createElement('button');
  btn.type='button';
  btn.textContent='← Voltar à Central';
  btn.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:48px;border:2px solid #69c7e7;border-radius:16px;padding:9px 16px;background:#fff;color:#073a55;font:inherit;font-weight:900;line-height:1.15;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
  btn.addEventListener('click',function(){
    btn.disabled=true;
    try{sessionStorage.setItem('portalTacsRetornoCentralV1','1')}catch(e){}
    if(fromCentral&&history.length>1){history.back();return;}
    location.assign(centralUrl());
  });
  bar.appendChild(btn);
  document.body.insertBefore(bar,document.body.firstChild);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
}());
