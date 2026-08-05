(function(){
  'use strict';
  var API=String(window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/exec').trim();
  var tentativa=0;
  var maxTentativas=3;

  function executar(){
    tentativa+=1;
    var nome='__portalTacsWarmup_'+Date.now()+'_'+tentativa+'_'+Math.random().toString(36).slice(2);
    var script=document.createElement('script');
    var encerrado=false;
    var timer;

    function limpar(){
      if(encerrado)return;
      encerrado=true;
      clearTimeout(timer);
      if(script.parentNode)script.parentNode.removeChild(script);
      try{delete window[nome]}catch(e){window[nome]=undefined}
    }

    function falhar(){
      limpar();
      if(tentativa<maxTentativas)setTimeout(executar,350*tentativa);
    }

    window[nome]=function(){limpar()};
    script.async=true;
    script.src=API+(API.indexOf('?')<0?'?':'&')+'action=painel_publico&callback='+encodeURIComponent(nome)+'&_='+Date.now();
    script.onerror=falhar;
    document.head.appendChild(script);
    timer=setTimeout(falhar,6000);
  }

  executar();
}());
