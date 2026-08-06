(function(){
  'use strict';

  var existente=window.PortalTacsAdminWarmup;
  if(existente&&typeof existente.iniciar==='function'){
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible')existente.iniciar();
    });
    window.addEventListener('pageshow',function(){existente.iniciar()});
    existente.iniciar();
    return;
  }

  var API=String(window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec').trim();
  var emCurso=null;
  var ultimaConclusao=0;
  var estado={
    api:API,
    situacao:'aguardando',
    resultado:null,
    ready:null,
    iniciar:iniciar
  };

  window.PortalTacsAdminWarmup=estado;

  function avisar(){
    try{
      window.dispatchEvent(new CustomEvent('portal-tacs-admin-warmup',{detail:estado.resultado}));
    }catch(e){}
  }

  function consultar(tentativa,concluir){
    var nome='__portalTacsAdminStatus_'+Date.now()+'_'+tentativa+'_'+Math.random().toString(36).slice(2);
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
      if(resposta&&resposta.ok===true){
        concluir({ok:true,resposta:resposta,tentativas:tentativa});
        return;
      }
      if(tentativa<2){
        setTimeout(function(){consultar(tentativa+1,concluir)},700);
        return;
      }
      concluir({ok:false,tentativas:tentativa});
    }

    window[nome]=finalizar;
    script.async=true;
    script.src=API+(API.indexOf('?')<0?'?':'&')+'action=admin_status&callback='+encodeURIComponent(nome)+'&_='+Date.now();
    script.onerror=function(){finalizar(null)};
    document.head.appendChild(script);
    timer=setTimeout(function(){finalizar(null)},8000);
  }

  function iniciar(){
    if(emCurso)return emCurso;
    if(estado.resultado&&estado.resultado.ok===true&&Date.now()-ultimaConclusao<30000){
      return Promise.resolve(estado.resultado);
    }
    estado.situacao='preparando';
    estado.resultado=null;
    emCurso=new Promise(function(resolve){
      consultar(1,function(resultado){
        estado.resultado=resultado;
        estado.situacao=resultado.ok?'pronta':'nao-confirmada';
        ultimaConclusao=Date.now();
        emCurso=null;
        avisar();
        resolve(resultado);
      });
    });
    estado.ready=emCurso;
    return emCurso;
  }

  function reaquecerAoVoltar(){
    if(document.visibilityState==='visible'&&Date.now()-ultimaConclusao>=60000)iniciar();
  }

  document.addEventListener('visibilitychange',reaquecerAoVoltar);
  window.addEventListener('pageshow',reaquecerAoVoltar);
  iniciar();
}());

