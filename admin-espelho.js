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

  function addDirectPublishButtons(){
    var publishAll=document.getElementById('publishNotices');
    if(!publishAll)return;

    publishAll.textContent='Publicar atendimento médico e comunicado no portal';

    if(!document.getElementById('publishMedicalDirect')){
      var medical=document.getElementById('medicalStatus');
      var medicalCard=medical&&medical.closest('.subcard');
      var medicalActions=medicalCard&&medicalCard.querySelector('.actions');
      if(medicalActions){
        var medicalButton=document.createElement('button');
        medicalButton.id='publishMedicalDirect';
        medicalButton.type='button';
        medicalButton.className='btn primary direct-publish';
        medicalButton.textContent='Publicar atendimento médico no portal';
        medicalButton.addEventListener('click',function(){
          publishAll.click();
          var noticeStatus=document.getElementById('noticeStatus');
          if(noticeStatus)setTimeout(function(){noticeStatus.scrollIntoView({behavior:'smooth',block:'center'})},100);
        });
        medicalActions.insertBefore(medicalButton,medicalActions.firstChild);
      }
    }

    if(!document.getElementById('publishNoticeDirect')){
      var notice=document.getElementById('noticeTitle');
      var noticeCard=notice&&notice.closest('.subcard');
      var noticeActions=noticeCard&&noticeCard.querySelector('.actions');
      if(noticeActions){
        var noticeButton=document.createElement('button');
        noticeButton.id='publishNoticeDirect';
        noticeButton.type='button';
        noticeButton.className='btn primary direct-publish';
        noticeButton.textContent='Publicar comunicado geral no portal';
        noticeButton.addEventListener('click',function(){
          publishAll.click();
          var noticeStatus=document.getElementById('noticeStatus');
          if(noticeStatus)setTimeout(function(){noticeStatus.scrollIntoView({behavior:'smooth',block:'center'})},100);
        });
        noticeActions.insertBefore(noticeButton,noticeActions.firstChild);
      }
    }

    if(!document.getElementById('direct-publish-style')){
      var style=document.createElement('style');
      style.id='direct-publish-style';
      style.textContent='.direct-publish{flex:1 1 100%;min-height:62px;font-size:18px;box-shadow:0 12px 24px rgba(7,148,71,.2)}';
      document.head.appendChild(style);
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

  addDirectPublishButtons();

  window.addEventListener('pageshow',function(event){
    if(event.persisted)refreshMirror('Espelho atualizado após retornar ao painel.');
  });
}());