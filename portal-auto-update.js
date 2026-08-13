(function(){
  'use strict';

  var VERSION_URL='/atendimento-acs-farmaceutico/portal-version.json';
  var GLOBAL_VERSION_KEY='portalTacsAutoVersionV1';
  var PAGE_VERSION_KEY='portalTacsAutoPageVersionV1:'+window.location.pathname;
  var CHECK_KEY='portalTacsAutoVersionCheckAtV1';
  var BUTTON_ID='portalTacsAtualizarPaginaV1';
  var STYLE_ID='portalTacsAtualizarPaginaStyleV1';
  var CHECK_INTERVAL=15000;
  var checking=false;

  function readStorage(storage,key){try{return storage.getItem(key)||''}catch(e){return ''}}
  function writeStorage(storage,key,value){try{storage.setItem(key,String(value))}catch(e){}}
  function removeStorage(storage,key){try{storage.removeItem(key)}catch(e){}}

  function clearTransientConnectionState(){
    [
      'portalTacsAdminStatusV5',
      'portalTacsAppsScriptWarmAtV1',
      'portalTacsPublicDataV3',
      'portalTacsPublicDataV2',
      'portalTacsPublicDataV1'
    ].forEach(function(key){removeStorage(localStorage,key)});
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

  function installUI(){
    if(!document.body){setTimeout(installUI,40);return}
    ensureStyle();
    var button=document.getElementById(BUTTON_ID);
    if(button)return;
    button=document.createElement('button');
    button.id=BUTTON_ID;
    button.type='button';
    button.setAttribute('aria-label','Atualizar esta página e refazer a conexão');
    button.title='Atualizar esta página e refazer a conexão';
    button.textContent='↻ Atualizar página';
    button.addEventListener('click',function(){reloadFresh(Date.now())});
    document.body.appendChild(button);
  }

  function wakeConnection(){
    try{
      var warm=window.PortalTacsAdminWarmup;
      if(warm&&typeof warm.iniciar==='function')warm.iniciar(true);
    }catch(e){}
  }

  function fetchVersion(force){
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
        var currentUrl=new URL(window.location.href).searchParams.get('ptv')||'';
        writeStorage(localStorage,GLOBAL_VERSION_KEY,remote);
        if(pageSeen!==remote||currentUrl!==remote){
          writeStorage(localStorage,PAGE_VERSION_KEY,remote);
          if(currentUrl!==remote){reloadFresh(remote);return remote}
        }
        return remote;
      })
      .catch(function(){return null})
      .finally(function(){checking=false});
  }

  function onVisible(){
    if(document.visibilityState==='visible'){
      installUI();
      fetchVersion(false);
    }
  }

  window.PortalTacsAtualizacao={
    instalarUI:installUI,
    verificar:function(force){return fetchVersion(!!force)},
    atualizar:function(){reloadFresh(Date.now())},
    reconectar:wakeConnection,
    limparTemporarios:clearTransientConnectionState
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI,{once:true});
  else installUI();
  fetchVersion(true);
  window.addEventListener('pageshow',function(){installUI();fetchVersion(false)});
  window.addEventListener('online',function(){clearTransientConnectionState();wakeConnection();fetchVersion(true)});
  document.addEventListener('visibilitychange',onVisible);
}());
