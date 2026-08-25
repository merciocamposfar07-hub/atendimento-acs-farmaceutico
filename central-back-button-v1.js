(function(){
'use strict';

var path=String(location.pathname||'');

/*
 * SAFARI / iPHONE — modo de renderização leve do painel Recados e campanhas.
 *
 * As capturas reais mostram perda de pintura mesmo com o painel aberto como página
 * completa. Para reduzir pressão de composição do WebKit, este modo remove apenas
 * efeitos gráficos caros e camadas de composição do painel. Regras funcionais,
 * dados, Push, OneSignal, botões e formulários permanecem ativos.
 */
function installRecadosRenderSafe(){
  if(!/\/painel-oficial-recados-campanhas\.html$/i.test(path))return;
  if(document.getElementById('portalTacsRecadosRenderSafeV2'))return;
  var style=document.createElement('style');
  style.id='portalTacsRecadosRenderSafeV2';
  style.textContent=[
    'html{height:auto!important;min-height:100%!important;overflow-x:hidden!important;scroll-behavior:auto!important;}',
    'body{height:auto!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:visible!important;-webkit-overflow-scrolling:auto!important;background:#eaf2f6!important;}',
    'main{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;contain:none!important;content-visibility:visible!important;}',
    'header,footer,main,.card,.item,.numero,.areaEnvio,.manutencao,.saude-notificacoes,.saude-resumo,.saude-lista,.saude-aparelho,.saude-vazio,.saude-numero,.botao,.aba,.status,.validadeCampo{contain:none!important;content-visibility:visible!important;will-change:auto!important;transform:none!important;filter:none!important;-webkit-filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;}',
    'header{background:#073a55!important;}',
    'footer{background:#073a55!important;}',
    '.card{background:#fff!important;}',
    'body.tema-petroleo .numero,body.tema-petroleo .areaEnvio,body.tema-petroleo .item{background:#073a55!important;background-image:none!important;box-shadow:none!important;}',
    '.numero,.areaEnvio,.item,.manutencao,.saude-aparelho,.saude-vazio,.status{background-image:none!important;}',
    '.botao,.aba.ativa{background:#073a55!important;background-image:none!important;box-shadow:none!important;}',
    '.botao.vermelho,.manutencaoBotao{background:#a52d2d!important;}',
    '.manutencao.ativa .manutencaoBotao{background:#148a46!important;}',
    '.barra{position:static!important;bottom:auto!important;z-index:auto!important;transform:none!important;will-change:auto!important;}',
    '.ponte{display:none!important;position:absolute!important;left:-9999px!important;top:-9999px!important;width:0!important;height:0!important;min-width:0!important;min-height:0!important;border:0!important;opacity:0!important;pointer-events:none!important;}',
    '.validadeCampo{contain:none!important;overflow:hidden!important;}',
    '.saude-resumo button.saude-numero,.saude-resumo button.saude-numero[aria-pressed="true"]{transform:none!important;will-change:auto!important;box-shadow:none!important;background-image:none!important;}',
    '.saude-resumo button.saude-numero[data-saude-filtro="ATIVO"]{background:#087064!important;}',
    '.saude-resumo button.saude-numero[data-saude-filtro="INATIVO"]{background:#962f35!important;}',
    '.saude-resumo button.saude-numero[data-saude-filtro="REPARO"]{background:#aa7f00!important;}',
    '.saude-resumo button.saude-numero[data-saude-filtro="SEM_CONFIRMACAO"]{background:#c45100!important;}',
    '.card,.item,.saude-notificacoes,.saude-resumo,.saude-lista,.saude-aparelho{backface-visibility:visible!important;-webkit-backface-visibility:visible!important;perspective:none!important;-webkit-perspective:none!important;}',
    '*,*::before,*::after{animation:none!important;transition:none!important;}',
    '.oculto{display:none!important;}'
  ].join('\n');
  (document.head||document.documentElement).appendChild(style);
}
installRecadosRenderSafe();

/*
 * Alguns painéis oficiais carregam outro HTML com document.open()/document.write().
 * Nesses casos o objeto window sobrevive, mas o DOM inteiro é substituído.
 * Portanto NÃO podemos bloquear a segunda execução apenas por uma flag global:
 * só bloqueamos quando o botão realmente existe no DOM atual.
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
  if(!document.body){setTimeout(install,0);return;}
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
