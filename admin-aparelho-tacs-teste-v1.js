(function(){
  'use strict';
  if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
  if(!/\/painel-oficial-recados-campanhas\.html$/.test(String(location.pathname||'')))return;
  if(window.PortalTacsAparelhoTesteAdminV1)return;
  window.PortalTacsAparelhoTesteAdminV1=true;

  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var TOKEN_KEY='portalTacsAdminTokenV1',TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1',DEVICE_KEY='portalTacsDispositivoV1';
  var MODE_KEY='portalTacsAparelhoTesteModoV2:',BOX_ID='aparelhoTacsTesteV1Box',STYLE_ID='aparelhoTacsTesteV1Style';
  var operando=false;
  function txt(v){return String(v==null?'':v).trim()}
  function areaAtual(){var s=document.getElementById('areaEnvio'),a=txt(s&&s.value)||new URLSearchParams(location.search||'').get('area')||'JAPARANDUBA';return String(a).toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA'}
  function device(){var d=txt(localStorage.getItem(DEVICE_KEY));if(!d){d='iphone-'+Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem(DEVICE_KEY,d)}return d}
  function sessao(){var s={dispositivo:device(),areaId:areaAtual()},t=sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'',a=sessionStorage.getItem(TOKEN_KEY)||'';if(t)s.territorioToken=t;else if(a)s.token=a;return s}
  function temSessao(){var s=sessao();return Boolean(s.territorioToken||s.token)}
  function chave(){return MODE_KEY+areaAtual()+':'+device()}
  function ativo(){try{return localStorage.getItem(chave())==='1'}catch(e){return false}}
  function salvar(v){try{if(v)localStorage.setItem(chave(),'1');else localStorage.removeItem(chave())}catch(e){}}
  function estilo(){if(document.getElementById(STYLE_ID))return;var s=document.createElement('style');s.id=STYLE_ID;s.textContent='#'+BOX_ID+'{margin:12px 0;padding:15px;border:2px solid #69c7e7;border-radius:17px;background:#eaf7fc;color:#073a55}#'+BOX_ID+' strong{display:block;font-size:1.08rem}#'+BOX_ID+' .apt-status{margin:7px 0 10px;font-weight:850;line-height:1.45}#'+BOX_ID+' .apt-help{margin:9px 0 0;color:#526d7b;font-size:.9rem;font-weight:750;line-height:1.45}#'+BOX_ID+' button{width:100%;min-height:54px;border:0;border-radius:15px;padding:12px 15px;background:#073a55;color:#fff;font-weight:950}#'+BOX_ID+' button[data-active="1"]{background:#607985}#'+BOX_ID+' button:disabled{opacity:.5;cursor:not-allowed}';document.head.appendChild(s)}
  function box(){var b=document.getElementById(BOX_ID);if(b)return b;var sec=document.getElementById('saudeNotificacoes');if(!sec)return null;estilo();b=document.createElement('div');b.id=BOX_ID;b.innerHTML='<strong>🛠 Este aparelho</strong><div class="apt-status" aria-live="polite"></div><button type="button"></button><p class="apt-help">O modo TACS / teste libera a busca técnica por número de cadastro familiar nesta área. O Push continua sendo tratado separadamente pelas notificações.</p>';var a=sec.querySelector('.saude-acoes');if(a&&a.parentNode)a.insertAdjacentElement('afterend',b);else sec.appendChild(b);b.querySelector('button').addEventListener('click',alternar);return b}
  function render(msg){var b=box();if(!b)return;var st=b.querySelector('.apt-status'),bt=b.querySelector('button'),on=ativo();if(!temSessao()){st.textContent='Entre no painel para configurar este aparelho.';bt.disabled=true;bt.textContent='Entre no painel';return}st.textContent=msg||(on?'Modo TACS / teste ativo neste aparelho. A busca por número de cadastro familiar está liberada.':'Este aparelho pode ser usado no modo TACS / teste sem depender da inscrição Push.');bt.disabled=operando;bt.dataset.active=on?'1':'0';bt.textContent=on?'Voltar este aparelho ao modo morador':'🛠 Ativar modo TACS / teste'}
  function alternar(){if(operando||!temSessao())return;var on=ativo(),pergunta=on?'Voltar este aparelho ao modo morador?':'Ativar o modo TACS / teste neste aparelho? Isso libera a consulta técnica por número de cadastro familiar somente para a área da sessão.';if(!confirm(pergunta))return;operando=true;render(on?'Desativando modo TACS / teste…':'Ativando modo TACS / teste…');salvar(!on);operando=false;render(!on?'Modo TACS / teste ativo. Agora abra o Portal TACS neste mesmo aparelho e pesquise pelo número do cadastro familiar.':'Modo TACS / teste desativado.')}
  function instalar(){box();render();var a=document.getElementById('areaEnvio');if(a)a.addEventListener('change',function(){setTimeout(render,100)});var sec=document.getElementById('saudeNotificacoes');if(sec&&typeof MutationObserver!=='undefined')new MutationObserver(function(){if(!sec.classList.contains('oculto'))setTimeout(render,80)}).observe(sec,{attributes:true,attributeFilter:['class']})}
  window.PortalTacsAparelhoTesteV2={ativo:function(area){var atual=areaAtual(),alvo=String(area||atual).toUpperCase().replace(/[^A-Z0-9_-]/g,'');if(alvo!==atual)return false;return ativo()},deviceId:device};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});else instalar();
}());
