(function(){
  'use strict';
  function ativarOferta(){
    try{localStorage.setItem('portalTacsNotificacoesPendente','1');}catch(e){}
    window.dispatchEvent(new Event('pageshow'));
    var tentativas=0;
    var timer=setInterval(function(){
      tentativas+=1;
      var box=document.getElementById('notificationOffer');
      if(box){
        box.hidden=false;
        box.removeAttribute('hidden');
        clearInterval(timer);
      }else if(tentativas>=30){
        clearInterval(timer);
      }
    },200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ativarOferta);
  else ativarOferta();
}());