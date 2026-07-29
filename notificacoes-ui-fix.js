(function(){
  'use strict';

  function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
  function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
  function byId(id){return document.getElementById(id)}

  function apply(){
    var box=byId('notificationOffer');
    var button=byId('notificationButton');
    var status=byId('notificationStatus');
    var help=byId('notificationHelp');
    if(!box||!button||!status||!help)return;

    box.hidden=false;

    if(isIos()&&!isStandalone()){
      status.textContent='Para receber avisos no iPhone, instale primeiro o Portal TACS na Tela de Início.';
      help.textContent='Siga o passo a passo abaixo. Depois, abra o portal pelo novo ícone e toque em “Ativar e permitir notificações”.';
      button.textContent='Instale o Portal na Tela de Início primeiro';
      button.disabled=true;
      return;
    }

    button.disabled=false;
    button.textContent='Ativar e permitir notificações';
    help.textContent='As notificações só serão enviadas após sua autorização.';
  }

  function observe(){
    apply();
    var observer=new MutationObserver(function(){apply()});
    observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled']});
    window.addEventListener('pageshow',apply);
    setTimeout(apply,500);
    setTimeout(apply,1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe);else observe();
}());