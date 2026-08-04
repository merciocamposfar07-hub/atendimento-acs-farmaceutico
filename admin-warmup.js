(function(){
  'use strict';
  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var nome='__portalTacsWarmup_'+Date.now()+'_'+Math.random().toString(36).slice(2);
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

  window[nome]=function(){limpar()};
  script.async=true;
  script.src=API+'?action=admin_result&requestId='+encodeURIComponent('warmup_'+Date.now())+'&callback='+encodeURIComponent(nome)+'&_='+Date.now();
  script.onerror=limpar;
  document.head.appendChild(script);
  timer=setTimeout(limpar,8000);
}());
