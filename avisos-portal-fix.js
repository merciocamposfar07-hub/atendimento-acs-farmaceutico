(function(){
  'use strict';

  function clean(){
    var area=document.getElementById('noticeArea');
    if(!area)return;

    var cards=area.querySelectorAll('.notice-card');
    cards.forEach(function(card){
      var text=String(card.textContent||'').toLowerCase();
      var isMedical=text.indexOf('atendimento médico')!==-1;
      var isCancelled=text.indexOf('situação: cancelado')!==-1||text.indexOf('situacao: cancelado')!==-1;
      if(isMedical&&isCancelled)card.remove();
    });

    var list=area.querySelector('.notice-list');
    if(list&&!list.querySelector('.notice-card')){
      area.innerHTML='';
      area.hidden=true;
    }
  }

  function install(){
    var area=document.getElementById('noticeArea');
    if(!area)return;
    new MutationObserver(function(){window.requestAnimationFrame(clean)}).observe(area,{childList:true,subtree:true});
    clean();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
}());
