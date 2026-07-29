(function(){
  'use strict';

  var mirror=document.getElementById('portalMirror');
  var status=document.getElementById('mirrorStatus');
  var refreshButton=document.getElementById('refreshMirror');
  var PUBLIC_URL='portal-atualizado.html?notificacoes=1';
  var refreshTimer=null;

  function refreshMirror(message){
    if(!mirror)return;
    var separator=PUBLIC_URL.indexOf('?')>=0?'&':'?';
    mirror.src=PUBLIC_URL+separator+'espelho='+Date.now();
    if(status)status.textContent=message||'Atualizando o espelho com os dados publicados...';
  }

  function activateEditor(tabName){
    var tab=document.querySelector('.tab[data-tab="'+tabName+'"]');
    var section=document.getElementById(tabName);
    if(tab)tab.click();
    if(section){
      setTimeout(function(){section.scrollIntoView({behavior:'smooth',block:'start'})},80);
    }
  }

  document.querySelectorAll('[data-edit-tab]').forEach(function(button){
    button.addEventListener('click',function(){activateEditor(button.getAttribute('data-edit-tab'))});
  });

  if(refreshButton){
    refreshButton.addEventListener('click',function(){refreshMirror('Espelho atualizado manualmente.')});
  }

  if(mirror){
    mirror.addEventListener('load',function(){
      if(status)status.textContent='Espelho sincronizado com o Portal do Morador.';
    });
  }

  ['nurseStatus','noticeStatus','dentalStatus'].forEach(function(id){
    var box=document.getElementById(id);
    if(!box)return;
    new MutationObserver(function(){
      var text=String(box.textContent||'').toLowerCase();
      var confirmed=text.indexOf('publicada e confirmada')>=0||
        text.indexOf('agenda odontológica publicada')>=0||
        text.indexOf('avisos atuais carregados')>=0||
        text.indexOf('publicação enviada')>=0;
      if(!confirmed)return;
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(function(){refreshMirror('Alteração publicada. Espelho atualizado.')},1500);
    }).observe(box,{childList:true,subtree:true,characterData:true});
  });

  window.addEventListener('pageshow',function(event){
    if(event.persisted)refreshMirror('Espelho atualizado após retornar ao painel.');
  });
}());
