(function(){
  'use strict';

  var API=String(window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec').trim();
  var CACHE_KEY='portalTacsAdminStatusV4';
  var WARM_KEY='portalTacsAppsScriptWarmAtV1';
  var CACHE_MS=5*60*1000;
  var TIMEOUT_MS=25000;
  var emCurso=null;
  var ultimaConclusao=0;
  var cacheInicial=lerCache();
  var estado={
    api:API,
    situacao:cacheInicial?'pronta':'aguardando',
    resultado:cacheInicial,
    ready:null,
    iniciar:iniciar
  };

  if(window.PortalTacsAdminWarmup&&typeof window.PortalTacsAdminWarmup.iniciar==='function'){
    window.PortalTacsAdminWarmup.iniciar();
    return;
  }

  window.PortalTacsAdminWarmup=estado;

  function lerJson(chave){
    try{return JSON.parse(localStorage.getItem(chave)||'null')}catch(e){return null}
  }

  function lerCache(){
    var item=lerJson(CACHE_KEY);
    if(!item||!item.resultado||item.resultado.ok!==true)return null;
    if(Date.now()-Number(item.salvoEm||0)>CACHE_MS)return null;
    return item.resultado;
  }

  function servidorAquecido(){
    try{
      var instante=Number(localStorage.getItem(WARM_KEY)||0);
      return instante>0&&Date.now()-instante<2*60*1000;
    }catch(e){return false}
  }

  function salvar(resultado){
    try{
      localStorage.setItem(CACHE_KEY,JSON.stringify({salvoEm:Date.now(),resultado:resultado}));
      localStorage.setItem(WARM_KEY,String(Date.now()));
    }catch(e){}
  }

  function avisar(){
    try{window.dispatchEvent(new CustomEvent('portal-tacs-admin-warmup',{detail:estado.resultado}))}catch(e){}
  }

  function consultar(concluir){
    var nome='__portalTacsAdminStatus_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    var script=document.createElement('script');
    var encerrado=false;
    var timer;

    function limpar(){
      clearTimeout(timer);
      if(script.parentNode)script.parentNode.removeChild(script);
      try{delete window[nome]}catch(e){window[nome]=undefined}
    }

    function finalizar(resposta){
      if(encerrado)return;
      encerrado=true;
      limpar();
      concluir(resposta&&resposta.ok===true?{ok:true,resposta:resposta,tentativas:1}:{ok:false,tentativas:1});
    }

    window[nome]=finalizar;
    script.async=true;
    script.src=API+(API.indexOf('?')<0?'?':'&')+'action=admin_status&callback='+encodeURIComponent(nome)+'&_='+Date.now();
    script.onerror=function(){finalizar(null)};
    document.head.appendChild(script);
    timer=setTimeout(function(){finalizar(null)},TIMEOUT_MS);
  }

  function iniciar(forcar){
    if(emCurso)return emCurso;
    var cache=lerCache();
    if(!forcar&&cache){
      estado.resultado=cache;
      estado.situacao='pronta';
      estado.ready=Promise.resolve(cache);
      return estado.ready;
    }
    if(!forcar&&servidorAquecido()){
      var aquecido={ok:true,aquecido:true,origem:'atividade-recente'};
      estado.resultado=aquecido;
      estado.situacao='pronta';
      estado.ready=Promise.resolve(aquecido);
      return estado.ready;
    }
    estado.situacao='preparando';
    emCurso=new Promise(function(resolve){
      consultar(function(resultado){
        estado.resultado=resultado;
        estado.situacao=resultado.ok?'pronta':'nao-confirmada';
        ultimaConclusao=Date.now();
        if(resultado.ok)salvar(resultado);
        emCurso=null;
        avisar();
        resolve(resultado);
      });
    });
    estado.ready=emCurso;
    return emCurso;
  }

  function reaquecerAoVoltar(){
    if(document.visibilityState==='visible'&&Date.now()-ultimaConclusao>=2*60*1000)iniciar();
  }

  document.addEventListener('visibilitychange',reaquecerAoVoltar);
  window.addEventListener('pageshow',reaquecerAoVoltar);
  estado.ready=cacheInicial?Promise.resolve(cacheInicial):iniciar();
}());
