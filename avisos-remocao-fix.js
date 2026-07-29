(function(){
  'use strict';

  function byId(id){return document.getElementById(id)}
  function setStatus(message,type){
    var box=byId('noticeStatus');
    if(!box)return;
    box.textContent=message;
    box.className='status'+(type?' '+type:'');
  }

  function install(){
    var oldButton=byId('clearMedical');
    if(!oldButton||oldButton.dataset.removeFix==='1')return;

    var button=oldButton.cloneNode(true);
    button.id='clearMedical';
    button.dataset.removeFix='1';
    button.textContent='Remover atendimento médico do portal';
    oldButton.parentNode.replaceChild(button,oldButton);

    button.addEventListener('click',function(){
      var status=byId('medicalStatus');
      var date=byId('medicalDate');
      var time=byId('medicalTime');
      var note=byId('medicalNote');
      var publish=byId('publishNotices');

      if(status)status.value='cancelado';
      if(date)date.value='';
      if(time)time.value='';
      if(note)note.value='';

      setStatus('Removendo o atendimento médico do portal...','warning');
      if(publish&&!publish.disabled)publish.click();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
}());
