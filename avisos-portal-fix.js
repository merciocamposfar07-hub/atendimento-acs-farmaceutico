(function(){
  'use strict';

  function normalizar(texto){
    return String(texto||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  }

  function chaveDoCard(card){
    var texto=normalizar(card.textContent);
    if(texto.indexOf('atendimento medico')!==-1)return'atendimento-medico';
    if(texto.indexOf('nutricionista')!==-1)return'nutricionista';
    var titulo=card.querySelector('h2,h3,h4,strong');
    return normalizar(titulo?titulo.textContent:texto.slice(0,80));
  }

  function cancelado(card){
    var texto=normalizar(card.textContent);
    return texto.indexOf('situacao: cancelado')!==-1||texto.indexOf('situacao cancelado')!==-1||texto.indexOf('cancelado')!==-1;
  }

  function clean(){
    var area=document.getElementById('noticeArea');
    if(!area)return;
    var cards=Array.prototype.slice.call(area.querySelectorAll('.notice-card'));
    var vistos={};

    cards.forEach(function(card){
      var chave=chaveDoCard(card);
      if(!chave)return;
      if(cancelado(card)){
        card.remove();
        return;
      }
      if(vistos[chave]){
        card.remove();
        return;
      }
      vistos[chave]=true;
    });

    var list=area.querySelector('.notice-list');
    if((list&&!list.querySelector('.notice-card'))||!area.querySelector('.notice-card')){
      area.innerHTML='';
      area.hidden=true;
    }
  }

  function install(){
    var area=document.getElementById('noticeArea');
    if(!area)return;
    new MutationObserver(function(){window.requestAnimationFrame(clean)}).observe(area,{childList:true,subtree:true});
    clean();
    setInterval(clean,5000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
}());