(function(){
  'use strict';

  if(window.PortalTacsPublicData)return;

  var API=String(window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec').trim();
  var CACHE_KEY='portalTacsPublicDataV3';
  var LEGACY_CACHE_KEY='portalTacsPublicDataV2';
  var INVALIDATE_KEY='portalTacsPublicInvalidateAtV1';
  var WARM_KEY='portalTacsAppsScriptWarmAtV1';
  var CACHE_MAX_MS=15*60*1000;
  var REFRESH_MIN_MS=30*1000;
  var PERIODIC_REFRESH_MS=60*1000;
  var TIMEOUT_MS=25000;
  var memoria=lerCache();
  var emCurso=null;
  var atualizacaoAgendada=false;
  var ultimaTentativa=0;

  function itemValido(item){
    if(!item||!item.data||item.data.ok===false)return false;
    return Date.now()-Number(item.salvoEm||0)<=CACHE_MAX_MS;
  }

  function lerCache(){
    try{
      var item=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(itemValido(item))return item;
      if(item)localStorage.removeItem(CACHE_KEY);
    }catch(e){}
    return null;
  }

  function cacheAtual(){
    if(itemValido(memoria))return memoria;
    memoria=lerCache();
    return memoria;
  }

  function salvar(data){
    memoria={salvoEm:Date.now(),data:data};
    try{
      localStorage.setItem(CACHE_KEY,JSON.stringify(memoria));
      localStorage.removeItem(LEGACY_CACHE_KEY);
      localStorage.setItem(WARM_KEY,String(Date.now()));
    }catch(e){}
  }

  function emitir(data){
    try{window.dispatchEvent(new CustomEvent('portal-tacs-public-data',{detail:data}))}catch(e){}
  }

  function consultar(){
    if(emCurso)return emCurso;
    if(!API)return Promise.reject(new Error('Serviço público não configurado.'));
    ultimaTentativa=Date.now();
    emCurso=new Promise(function(resolve,reject){
      var nome='__portalTacsPublicData_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      var script=document.createElement('script');
      var encerrado=false;
      var timer;

      function limpar(){
        clearTimeout(timer);
        if(script.parentNode)script.parentNode.removeChild(script);
        try{delete window[nome]}catch(e){window[nome]=undefined}
      }

      function finalizar(erro,data){
        if(encerrado)return;
        encerrado=true;
        limpar();
        emCurso=null;
        if(erro){reject(erro);return}
        salvar(data);
        emitir(data);
        resolve(data);
      }

      window[nome]=function(data){
        if(!data||data.ok===false){
          finalizar(new Error(data&&data.message||'Leitura pública recusada.'));
          return;
        }
        finalizar(null,data);
      };
      script.onerror=function(){finalizar(new Error('Falha ao consultar o servidor.'))};
      script.src=API+(API.indexOf('?')<0?'?':'&')+'action=painel_publico&callback='+encodeURIComponent(nome)+'&_='+Date.now();
      document.head.appendChild(script);
      timer=setTimeout(function(){
        finalizar(new Error('O servidor demorou para responder.'));
      },TIMEOUT_MS);
    });
    return emCurso;
  }

  function agendarAtualizacao(forcar){
    if(atualizacaoAgendada||emCurso)return;
    if(!forcar&&Date.now()-ultimaTentativa<REFRESH_MIN_MS)return;
    atualizacaoAgendada=true;
    setTimeout(function(){
      atualizacaoAgendada=false;
      consultar().catch(function(){});
    },0);
  }

  function get(){
    var cache=cacheAtual();
    if(cache){
      agendarAtualizacao(false);
      return Promise.resolve(cache.data);
    }
    return consultar();
  }

  function refresh(){
    return consultar();
  }

  function cached(){
    var cache=cacheAtual();
    return cache&&cache.data||null;
  }

  function invalidate(atualizarAgora){
    memoria=null;
    try{
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(LEGACY_CACHE_KEY);
      localStorage.setItem(INVALIDATE_KEY,String(Date.now()));
    }catch(e){}
    return atualizarAgora?consultar():Promise.resolve(null);
  }

  function receberStorage(event){
    if(!event)return;
    if(event.key===CACHE_KEY&&event.newValue){
      try{
        var item=JSON.parse(event.newValue);
        if(itemValido(item)){
          memoria=item;
          emitir(item.data);
          return;
        }
      }catch(e){}
    }
    if(event.key===CACHE_KEY||event.key===LEGACY_CACHE_KEY||event.key===INVALIDATE_KEY){
      memoria=null;
      agendarAtualizacao(true);
    }
  }

  window.addEventListener('storage',receberStorage);
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden)agendarAtualizacao(false);
  });
  window.addEventListener('pageshow',function(){agendarAtualizacao(false)});
  if(typeof window.setInterval==='function'){
    window.setInterval(function(){
      if(!document.hidden)agendarAtualizacao(false);
    },PERIODIC_REFRESH_MS);
  }

  window.PortalTacsPublicData={
    get:get,
    refresh:refresh,
    cached:cached,
    invalidate:invalidate,
    api:API,
    cacheKey:CACHE_KEY,
    timeout:TIMEOUT_MS,
    periodicRefresh:PERIODIC_REFRESH_MS
  };
}());
