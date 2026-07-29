(function(){
  'use strict';

  function clean(){
    var statusButton=document.getElementById('sendStatusCard');
    if(statusButton&&statusButton.parentNode)statusButton.remove();

    var privacy=document.querySelector('.privacy');
    if(privacy){
      privacy.textContent='Nome, data de nascimento, idade, CPF/CNS, endereço e solicitação serão enviados ao TACS em um card pelo WhatsApp. Esses dados não ficam armazenados nesta página.';
    }

    var send=document.getElementById('send');
    if(send){
      send.innerHTML='Enviar solicitação pelo WhatsApp<small>O card completo será preparado para encaminhamento ao TACS.</small>';
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean);else clean();
  setTimeout(clean,300);
}());