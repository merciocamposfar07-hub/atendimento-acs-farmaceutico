(function(){
  'use strict';

  if(window.PortalTacsPublicData)return;

  var API=String(window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec').trim();
  var CACHE_KEY='portalTacsPublicDataV2';
  var WARM_KEY='portalTacsAppsScriptWarmAtV1';
  var CACHE_MAX_MS=15*60*1000;
  var TIMEOUT_MS=25000;
  var memoria=lerCache();
  var emCurso=null;
  var atualizacaoAgendada=false;

  function lerCache(){
    try{
      var item=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(!item||!item.data||item.data.ok===false)return null;
      if(Date.now()-Number(item.salvoEm||0)>CACHE_MAX_MS)return null;
      return item;
    }catch(e){return null}
  }

  function salvar(data){
    memoria={salvoEm:Date.now(),data:data};
    try{
      localStorage.setItem(CACHE_KEY,JSON.stringify(memoria));
      localStorage.setItem(WARM_KEY,String(Date.now()));
    }catch(e){}
  }

  function emitir(data){
    try{window.dispatchEvent(new CustomEvent('portal-tacs-public-data',{detail:data}))}catch(e){}
  }

  function consultar(){
    if(emCurso)return emCurso;
    emCurso=new Promise(function(resolve,reject){
      if(!API){reject(new Error('Serviço público não configurado.'));return}
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
        if(!data||data.ok===false){finalizar(new Error(data&&data.message||'Leitura pública recusada.'));return}
        finalizar(null,data);
      };
      script.onerror=function(){finalizar(new Error('Falha ao consultar o servidor.'))};
      script.src=API+(API.indexOf('?')<0?'?':'&')+'action=painel_publico&callback='+encodeURIComponent(nome)+'&_='+Date.now();
      document.head.appendChild(script);
      timer=setTimeout(function(){finalizar(new Error('O servidor demorou para responder.'))},TIMEOUT_MS);
    });
    return emCurso;
  }

  function get(){
    var cache=memoria||lerCache();
    if(cache){
      memoria=cache;
      if(!atualizacaoAgendada){
        atualizacaoAgendada=true;
        setTimeout(function(){consultar().catch(function(){})},0);
      }
      return Promise.resolve(cache.data);
    }
    return consultar();
  }

  function refresh(){return consultar()}
  function cached(){return memoria&&memoria.data||null}

  window.PortalTacsPublicData={
    get:get,
    refresh:refresh,
    cached:cached,
    api:API,
    timeout:TIMEOUT_MS
  };
}());
