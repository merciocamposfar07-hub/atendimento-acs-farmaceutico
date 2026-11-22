/* CSC_PUBLIC_BOOT_V1 — busca pública antecipada durante a apresentação de abertura.
   Sem PIN, CPF, cadastro nem notificação privada. A leitura é separada por área. */
(function(){
 'use strict';
 if(window.CscPublicBootV1)return;
 function area(v){
  var s=String(v||'').trim().toUpperCase();
  if(s.normalize)s=s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
  s=s.replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
  return /^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(s)?s:'';
 }
 var params=new URLSearchParams(location.search||'');
 var selected=area(params.get('areaId')||params.get('area')||params.get('territorio'))||'JAPARANDUBA';
 var api=window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
 var callback='__csc_public_boot_'+Date.now()+'_'+Math.random().toString(36).slice(2);
 var script=document.createElement('script'),timer,ended=false;
 var promise=new Promise(function(resolve,reject){
  function done(error,data){
   if(ended)return;ended=true;clearTimeout(timer);
   if(script.parentNode)script.parentNode.removeChild(script);
   try{delete window[callback]}catch(ignore){window[callback]=undefined}
   if(error){reject(error);return}
   try{
    // Persistir somente o conteúdo já público; a tela usará o último snapshot enquanto atualiza.
    var key='portalTacsPublicDataV4:'+selected;
    localStorage.setItem(key,JSON.stringify({salvoEm:Date.now(),data:data}));
   }catch(ignoreStorage){}
   try{window.dispatchEvent(new CustomEvent('portal-tacs-public-data',{detail:data}))}catch(ignoreEvent){}
   resolve(data);
  }
  window[callback]=function(data){
   var returned=area(data&&data.areaId)||'JAPARANDUBA';
   if(!data||data.ok!==true||returned!==selected){done(new Error('Resposta pública inválida ou de outra área.'));return}
   done(null,data);
  };
  script.onerror=function(){done(new Error('Informações públicas indisponíveis.'))};
  timer=setTimeout(function(){done(new Error('Consulta pública sem resposta.'))},16000);
 });
 window.CscPublicBootV1={areaId:selected,promise:promise,used:false};
 // Evita rejeição sem tratamento se nenhum consumidor consultar o resultado.
 promise.catch(function(){});
 script.src=api+(api.indexOf('?')<0?'?':'&')+
  'action=painel_publico&areaId='+encodeURIComponent(selected)+
  '&callback='+encodeURIComponent(callback)+'&_='+Date.now();
 document.head.appendChild(script);
})();
