(function(){
  'use strict';

  var VERSION_URL='/atendimento-acs-farmaceutico/portal-version.json';
  var GLOBAL_VERSION_KEY='portalTacsAutoVersionV1';
  var PAGE_VERSION_KEY='portalTacsAutoPageVersionV1:'+window.location.pathname;
  var CHECK_KEY='portalTacsAutoVersionCheckAtV1';
  var BUTTON_ID='portalTacsAtualizarPaginaV1';
  var STYLE_ID='portalTacsAtualizarPaginaStyleV1';
  var CHECK_INTERVAL=60000;
  var checking=false;
  var territorialObserver=null;
  var territorialLastStatus=null;

  function readStorage(storage,key){try{return storage.getItem(key)||''}catch(e){return ''}}
  function writeStorage(storage,key,value){try{storage.setItem(key,String(value))}catch(e){}}
  function removeStorage(storage,key){try{storage.removeItem(key)}catch(e){}}
  function onlyDigits(value){return String(value||'').replace(/\D/g,'')}

  function clearTransientConnectionState(){
    [
      'portalTacsAdminStatusV5',
      'portalTacsAppsScriptWarmAtV1'
    ].forEach(function(key){removeStorage(localStorage,key)});
  }

  function isLegacyIdentityStatus(text){
    var value=String(text||'').trim();
    return value==='CPF conferido ✓'||
      value==='Confira os números do CPF.'||
      value==='Digite o CPF para identificação na Unidade de Saúde Posto Matias.';
  }

  function normalizeTerritorialStatus(text){
    var value=String(text||'').trim();
    if(value==='Cadastro não encontrado. Confira o documento.'){
      return 'Cadastro não encontrado nesta área. Confira o CPF ou CNS.';
    }
    return value;
  }

  function rememberTerritorialStatus(status){
    if(!status)return;
    var current=normalizeTerritorialStatus(status.textContent);
    if(!current||isLegacyIdentityStatus(current))return;
    if(current!==String(status.textContent||'').trim())status.textContent=current;
    territorialLastStatus={text:current,className:status.className||'help id-cns-note'};
  }

  function restoreTerritorialStatus(input,status){
    if(!input||!status)return;
    var doc=onlyDigits(input.value);
    if(!doc){
      status.textContent='Informe o CPF ou o Cartão Nacional de Saúde (CNS).';
      status.className='help id-cns-note';
      territorialLastStatus={text:status.textContent,className:status.className};
      return;
    }
    if(territorialLastStatus&&territorialLastStatus.text){
      status.textContent=territorialLastStatus.text;
      status.className=territorialLastStatus.className||'help id-cns-note';
      return;
    }
    status.textContent='Conferindo se o cadastro pertence a esta área...';
    status.className='help id-cns-note';
    territorialLastStatus={text:status.textContent,className:status.className};
  }

  function installTerritorialIdentityGuard(){
    if(!document.body){setTimeout(installTerritorialIdentityGuard,40);return}
    var input=document.getElementById('cpf');
    var status=document.getElementById('cpfStatus');
    if(!input||!status)return;
    if(status.dataset.territorialIdentityGuard==='1')return;
    status.dataset.territorialIdentityGuard='1';
    rememberTerritorialStatus(status);

    territorialObserver=new MutationObserver(function(){
      var current=String(status.textContent||'').trim();
      var normalized=normalizeTerritorialStatus(current);
      if(normalized!==current){
        status.textContent=normalized;
        if(status.className.indexOf('invalid')===-1)status.className='help id-cns-note invalid';
        territorialLastStatus={text:normalized,className:status.className};
        return;
      }
      if(isLegacyIdentityStatus(current)){
        restoreTerritorialStatus(input,status);
        return;
      }
      rememberTerritorialStatus(status);
    });
    territorialObserver.observe(status,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});

    input.addEventListener('input',function(){
      setTimeout(function(){
        var current=String(status.textContent||'').trim();
        if(isLegacyIdentityStatus(current))restoreTerritorialStatus(input,status);
        else rememberTerritorialStatus(status);
      },0);
    });

    document.addEventListener('tacs:morador',function(){setTimeout(function(){rememberTerritorialStatus(status)},0)});
  }

  function freshUrl(version){
    var url=new URL(window.location.href);
    url.searchParams.set('ptv',String(version||Date.now()));
    url.searchParams.set('ptrefresh','1');
    return url.toString();
  }

  function reloadFresh(version){
    clearTransientConnectionState();
    window.location.replace(freshUrl(version||Date.now()));
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    var style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent='#'+BUTTON_ID+'{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483000;min-height:46px;border:2px solid rgba(255,255,255,.9);border-radius:999px;padding:10px 15px;background:#073a55;color:#fff;font:900 15px/1.15 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.28);cursor:pointer;-webkit-tap-highlight-color:transparent}#'+BUTTON_ID+':active{transform:translateY(1px)}@media(max-width:430px){#'+BUTTON_ID+'{right:10px;bottom:calc(10px + env(safe-area-inset-bottom));min-height:44px;padding:9px 13px;font-size:14px}}';
    (document.head||document.documentElement).appendChild(style);
  }

  function isAdminPage(){
    return /(?:^|\/)(?:painel-oficial-|teste-v1\/painel-|admin)/.test(window.location.pathname||'');
  }

  function smartRefresh(button){
    if(button){button.disabled=true;button.textContent='↻ Atualizando…'}
    reloadFresh(Date.now());
  }

  function installUI(){
    if(!document.body){setTimeout(installUI,40);return}
    ensureStyle();
    installTerritorialIdentityGuard();
    var button=document.getElementById(BUTTON_ID);
    if(button)return;
    button=document.createElement('button');
    button.id=BUTTON_ID;
    button.type='button';
    button.setAttribute('aria-label','Atualizar esta página e refazer a conexão');
    button.title='Atualizar esta página e refazer a conexão';
    button.textContent='↻ Atualizar página';
    button.addEventListener('click',function(){smartRefresh(button)});
    document.body.appendChild(button);
  }

  function wakeConnection(){
    try{
      var warm=window.PortalTacsAdminWarmup;
      if(warm&&typeof warm.iniciar==='function')warm.iniciar(true);
    }catch(e){}
  }

  function fetchVersion(force){
    if(typeof fetch!=='function')return Promise.resolve(null);
    var now=Date.now();
    var last=Number(readStorage(sessionStorage,CHECK_KEY)||0);
    if(!force&&now-last<CHECK_INTERVAL)return Promise.resolve(null);
    if(checking)return Promise.resolve(null);
    checking=true;
    writeStorage(sessionStorage,CHECK_KEY,now);
    return fetch(VERSION_URL+'?t='+now,{cache:'no-store',credentials:'same-origin'})
      .then(function(response){if(!response.ok)throw new Error('version');return response.json()})
      .then(function(data){
        var remote=String(data&&data.version||'').trim();
        if(!remote)return null;
        var pageSeen=readStorage(localStorage,PAGE_VERSION_KEY);
        writeStorage(localStorage,GLOBAL_VERSION_KEY,remote);

        // Primeira leitura: apenas registra a versão que esta página recebeu.
        // Nas próximas aberturas, a ausência de ?ptv na start_url do iOS não deve
        // causar uma recarga extra. Só recarrega quando a versão publicada mudou.
        if(!pageSeen){
          writeStorage(localStorage,PAGE_VERSION_KEY,remote);
          return remote;
        }
        if(pageSeen!==remote){
          writeStorage(localStorage,PAGE_VERSION_KEY,remote);
          reloadFresh(remote);
        }
        return remote;
      })
      .catch(function(){return null})
      .finally(function(){checking=false});
  }

  function onVisible(){
    if(document.visibilityState==='visible'){
      installUI();
      installTerritorialIdentityGuard();
      fetchVersion(false);
    }
  }

  window.PortalTacsAtualizacao={
    instalarUI:installUI,
    verificar:function(force){return fetchVersion(!!force)},
    atualizar:function(){reloadFresh(Date.now())},
    reconectar:wakeConnection,
    limparTemporarios:clearTransientConnectionState,
    protegerIdentidadeTerritorial:installTerritorialIdentityGuard
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI,{once:true});
  else installUI();
  installTerritorialIdentityGuard();
  fetchVersion(true);
  window.addEventListener('pageshow',function(){installUI();installTerritorialIdentityGuard();fetchVersion(false)});
  window.addEventListener('online',function(){wakeConnection();fetchVersion(true)});
  document.addEventListener('visibilitychange',onVisible);
}());
