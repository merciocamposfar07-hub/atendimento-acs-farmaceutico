(function(){
  'use strict';

  if(window.PortalTacsPublicData)return;

  function normalizeArea(value){
    var area=String(value==null?'':value).trim().toUpperCase();
    if(area.normalize)area=area.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    area=area.replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
    return /^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(area)?area:'';
  }

  var API=String(window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec').trim();
  var DEFAULT_AREA_ID=normalizeArea(window.TACS_DEFAULT_AREA_ID||'JAPARANDUBA')||'JAPARANDUBA';
  var AREA_ID=normalizeArea(window.TACS_AREA_ID)||DEFAULT_AREA_ID;
  var CACHE_KEY='portalTacsPublicDataV4:'+AREA_ID;
  var LEGACY_CACHE_KEY=AREA_ID===DEFAULT_AREA_ID?'portalTacsPublicDataV3':'';
  var INVALIDATE_KEY='portalTacsPublicInvalidateAtV1';
  var WARM_KEY='portalTacsAppsScriptWarmAtV1';
  var CACHE_MAX_MS=15*60*1000;
  var REFRESH_MIN_MS=30*1000;
  var TIMEOUT_MS=25000;
  var memoria=lerCache();
  var emCurso=null;
  var atualizacaoAgendada=false;
  var ultimaTentativa=0;

  function itemValido(item){
    if(!item||!item.data||item.data.ok===false)return false;
    return Date.now()-Number(item.salvoEm||0)<=CACHE_MAX_MS;
  }

  function lerItem(chave){
    if(!chave)return null;
    try{
      var raw=localStorage.getItem(chave);
      if(!raw)return null;
      var item=JSON.parse(raw);
      if(itemValido(item))return item;
      localStorage.removeItem(chave);
    }catch(e){}
    return null;
  }

  function lerCache(){
    var item=lerItem(CACHE_KEY);
    if(item)return item;
    var legado=lerItem(LEGACY_CACHE_KEY);
    if(legado){
      try{localStorage.setItem(CACHE_KEY,JSON.stringify(legado))}catch(e){}
      return legado;
    }
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
      if(LEGACY_CACHE_KEY)localStorage.removeItem(LEGACY_CACHE_KEY);
      localStorage.setItem(WARM_KEY,String(Date.now()));
    }catch(e){}
  }

  function emitir(data){
    try{window.dispatchEvent(new CustomEvent('portal-tacs-public-data',{detail:data}))}catch(e){}
  }

  function validarAreaResposta(data){
    var resposta=normalizeArea(data&&data.areaId);
    var efetiva=resposta||DEFAULT_AREA_ID;
    if(AREA_ID!==DEFAULT_AREA_ID&&!resposta){
      throw new Error('A resposta pública não confirmou a área solicitada.');
    }
    if(efetiva!==AREA_ID){
      throw new Error('A resposta pública pertence a outra área.');
    }
    return true;
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
        try{validarAreaResposta(data)}catch(error){finalizar(error);return}
        finalizar(null,data);
      };
      script.onerror=function(){finalizar(new Error('Falha ao consultar o servidor.'))};
      script.src=API+(API.indexOf('?')<0?'?':'&')+
        'action=painel_publico&areaId='+encodeURIComponent(AREA_ID)+
        '&callback='+encodeURIComponent(nome)+'&_='+Date.now();
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
      if(LEGACY_CACHE_KEY)localStorage.removeItem(LEGACY_CACHE_KEY);
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

  window.PortalTacsPublicData={
    get:get,
    refresh:refresh,
    cached:cached,
    invalidate:invalidate,
    api:API,
    areaId:AREA_ID,
    cacheKey:CACHE_KEY,
    timeout:TIMEOUT_MS
  };
}());

(function(){
  'use strict';
  if(typeof document==='undefined'||typeof document.createElement!=='function'||!document.head||typeof document.head.appendChild!=='function'||!window.location||!window.location.href)return;
  if(window.PortalTacsTerritoryBranding||(typeof document.getElementById==='function'&&document.getElementById('portal-territory-branding-script')))return;
  var script=document.createElement('script');
  script.id='portal-territory-branding-script';
  script.src=new URL('portal-territory-branding.js?v=20260815-territorial-v2',window.location.href).href;
  script.async=true;
  document.head.appendChild(script);
}());
