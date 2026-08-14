(function(){
  'use strict';
  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var currentResident=null,oneSignal=null,pendingRepairId='',activeRequest='',lastFingerprint='',counter=0,openCounter=0;
  var autoRepairTried={},repairCompleted={},repairMode='',repairStateCounter=0;
  function text(v){return String(v==null?'':v).trim()}
  function digits(v){return text(v).replace(/\D/g,'')}
  function validDocument(v){var d=digits(v);return /^\d{11}$/.test(d)||/^\d{15}$/.test(d)}
  function uuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text(v).toLowerCase())}
  function areaId(){var a='';try{if(window.PortalTacsArea&&typeof window.PortalTacsArea.id==='function')a=window.PortalTacsArea.id()}catch(e){}if(!a)a=window.TACS_AREA_ID||'';if(!a&&currentResident)a=currentResident.areaId||'';return text(a||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA'}
  function documentValue(){var e=document.getElementById('cpf'),d=e?digits(e.value):'';if(validDocument(d))return d;if(currentResident){d=digits(currentResident.documento||currentResident.cpf||currentResident.cns||'');if(validDocument(d))return d}return ''}
  function state(){var push=oneSignal&&oneSignal.User&&oneSignal.User.PushSubscription,tags={};try{tags=oneSignal&&oneSignal.User&&typeof oneSignal.User.getTags==='function'?(oneSignal.User.getTags()||{}):{}}catch(e){}return {permission:Boolean(oneSignal&&oneSignal.Notifications&&oneSignal.Notifications.permission===true),optedIn:Boolean(push&&push.optedIn===true),subscriptionId:text(push&&push.id).toLowerCase(),token:text(push&&push.token),areaConfirmed:text(tags.area_tacs).toUpperCase()===areaId()}}
  function deviceInfo(){var ua=navigator.userAgent||'',platform=navigator.platform||'';return {device:/Android/i.test(ua)?'Android':/iPhone/i.test(ua)?'iPhone':/iPad/i.test(ua)?'iPad':'Aparelho',browser:/SamsungBrowser/i.test(ua)?'Samsung Internet':/Edg\//i.test(ua)?'Edge':/Firefox\//i.test(ua)?'Firefox':/CriOS|Chrome\//i.test(ua)?'Chrome':/Safari\//i.test(ua)?'Safari':'Navegador',os:/Android/i.test(ua)?'Android':/iPhone|iPad|iPod/i.test(ua)?'iOS/iPadOS':/Windows/i.test(ua)?'Windows':/Mac/i.test(platform)?'macOS':'Outro sistema'}}
  function requestId(){counter++;return 'notif_check_'+Date.now()+'_'+counter+'_'+Math.random().toString(36).slice(2,10)}
  function openRequestId(){openCounter++;return 'notif_open_'+Date.now()+'_'+openCounter+'_'+Math.random().toString(36).slice(2,10)}
  function repairStateRequestId(){repairStateCounter++;return 'notif_repair_state_'+Date.now()+'_'+repairStateCounter+'_'+Math.random().toString(36).slice(2,10)}
  function pollResult(id,resolve,reject,started){var cb='__notifHealth_'+Date.now()+'_'+Math.floor(Math.random()*100000),s=document.createElement('script'),done=false,t=setTimeout(function(){finish(null)},4500);function finish(data){if(done)return;done=true;clearTimeout(t);try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.remove();if(data&&data.ok===true&&data.pendente===false&&data.result){activeRequest='';if(data.result.ok===true)resolve(data.result);else reject(new Error(text(data.result.message)||'Não foi possível registrar a situação das notificações.'));return}if(Date.now()-started>22000){activeRequest='';reject(new Error('A checagem das notificações demorou demais.'));return}setTimeout(function(){pollResult(id,resolve,reject,started)},1000)}window[cb]=finish;s.onerror=function(){finish(null)};s.src=API+'?action=publico_notificacao_checkin_result&requestId='+encodeURIComponent(id)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s)}
  function postCheckin(payload){return new Promise(function(resolve,reject){if(activeRequest){reject(new Error('Checagem anterior ainda em andamento.'));return}var id=requestId(),body=new URLSearchParams();activeRequest=id;body.set('action','publico_notificacao_checkin');body.set('requestId',id);Object.keys(payload).forEach(function(k){body.set(k,payload[k])});fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function(){setTimeout(function(){pollResult(id,resolve,reject,Date.now())},700)})})}
  function postRepairState(estado,detalhe){
    try{
      var st=state();if(!uuid(st.subscriptionId)||!pendingRepairId)return;
      var body=new URLSearchParams();
      body.set('action','publico_notificacao_reparo_estado');body.set('requestId',repairStateRequestId());
      body.set('subscriptionId',st.subscriptionId);body.set('areaId',areaId());body.set('estado',estado);
      if(detalhe)body.set('detalhe',text(detalhe).slice(0,220));
      fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){});
    }catch(e){}
  }
  function notificationData(event){var n=event&&event.notification?event.notification:(event&&event.detail&&event.detail.notification?event.detail.notification:{});return n.additionalData||n.data||(event&&event.additionalData)||{};}
  function registerNotificationOpen(event){
    try{
      if(!oneSignal)return;
      var st=state();if(!uuid(st.subscriptionId))return;
      var data=notificationData(event),evento=text(data.evento),tipo=text(data.tipo).toUpperCase(),referencia=text(data.referenciaId),area=text(data.areaId||areaId()).toUpperCase().replace(/[^A-Z0-9_-]/g,'');
      if(!/^[A-Za-z0-9_-]{8,160}$/.test(evento)||['RECADO','CAMPANHA'].indexOf(tipo)===-1||!referencia||!area)return;
      var body=new URLSearchParams();
      body.set('action','publico_notificacao_aberta');body.set('requestId',openRequestId());body.set('evento',evento);body.set('subscriptionId',st.subscriptionId);body.set('areaId',area);body.set('tipo',tipo);body.set('id',referencia);
      fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){});
    }catch(e){}
  }
  function attemptAutomaticRepair(){
    if(!pendingRepairId||autoRepairTried[pendingRepairId]||!oneSignal)return;
    var id=pendingRepairId,st=state(),repair=document.getElementById('notificationRepairButton');
    autoRepairTried[id]=true;
    if(!st.permission){
      repairMode='';
      postRepairState('ACAO_MORADOR_NECESSARIA','A permissão de notificações não está ativa; o navegador exige ação do morador.');
      return;
    }
    if(!repair||repair.disabled){
      repairMode='';
      postRepairState('AUTO_FALHOU','O botão de reparo não ficou disponível para iniciar a tentativa automática.');
      return;
    }
    repairMode='AUTO';
    postRepairState('AUTO_INICIADO','O Portal iniciou o reparo automaticamente após detectar a pendência.');
    setTimeout(function(){
      if(pendingRepairId!==id||repairCompleted[id])return;
      try{repair.click();}catch(e){repairMode='';postRepairState('AUTO_FALHOU','A tentativa automática não conseguiu acionar o reparo local.');return}
      setTimeout(function(){
        if(pendingRepairId===id&&!repairCompleted[id]){
          repairMode='';
          postRepairState('AUTO_FALHOU','A tentativa automática não foi confirmada; o botão manual permanece disponível.');
        }
      },35000);
    },220);
  }
  function showPendingRepair(result){
    pendingRepairId=text(result&&result.reparoId);if(!pendingRepairId)return;
    var box=document.getElementById('notificationOffer'),repair=document.getElementById('notificationRepairButton'),help=document.getElementById('notificationHelp');
    if(box)box.setAttribute('data-reparo-area','pendente');
    if(repair){repair.hidden=false;repair.disabled=false;repair.textContent='🔧 Reparar agora'}
    if(help)help.textContent='O TACS identificou que os avisos deste aparelho precisam ser atualizados. O Portal tentará reparar automaticamente; se não conseguir, toque em Reparar agora.';
    setTimeout(attemptAutomaticRepair,120);
  }
  function clearPendingRepair(){pendingRepairId='';repairMode='';var box=document.getElementById('notificationOffer');if(box)box.removeAttribute('data-reparo-area')}
  function checkin(options){options=options||{};if(!oneSignal)return Promise.resolve(null);var st=state();if(!uuid(st.subscriptionId))return Promise.resolve(null);var info=deviceInfo(),doc=documentValue(),payload={subscriptionId:st.subscriptionId,areaId:areaId(),permission:st.permission?'true':'false',optedIn:st.optedIn?'true':'false',tokenAtivo:st.token?'true':'false',areaConfirmada:st.areaConfirmed?'true':'false',tipoAparelho:info.device,navegador:info.browser,sistema:info.os,reparoAplicado:text(options.reparoAplicado||'')};if(validDocument(doc))payload.documento=doc;var fp=[payload.subscriptionId,payload.areaId,payload.permission,payload.optedIn,payload.tokenAtivo,payload.areaConfirmada,payload.reparoAplicado,payload.documento||''].join('|');if(!options.force&&fp===lastFingerprint)return Promise.resolve(null);lastFingerprint=fp;return postCheckin(payload).then(function(result){if(result&&result.reparoPendente)showPendingRepair(result);else if(result&&payload.reparoAplicado)clearPendingRepair();return result}).catch(function(){lastFingerprint='';activeRequest='';return null})}
  function scheduleCheckin(force){setTimeout(function(){checkin({force:Boolean(force)})},350)}
  document.addEventListener('click',function(event){
    var alvo=event&&event.target;if(!alvo||alvo.id!=='notificationRepairButton'||event.isTrusted!==true||!pendingRepairId)return;
    repairMode='MANUAL';postRepairState('MANUAL_INICIADO','O morador tocou no botão Reparar agora.');
  },true);
  document.addEventListener('tacs:morador',function(event){currentResident=event&&event.detail||null;scheduleCheckin(true)});
  document.addEventListener('tacs:notificacao-reparo-concluido',function(){
    if(!pendingRepairId){scheduleCheckin(true);return}
    var id=pendingRepairId,modo=repairMode==='AUTO'?'AUTO':'MANUAL';repairCompleted[id]=true;
    postRepairState(modo==='AUTO'?'CONCLUIDO_AUTO':'CONCLUIDO_MANUAL',modo==='AUTO'?'A renovação automática terminou no aparelho.':'O reparo manual terminou no aparelho.');
    setTimeout(function(){checkin({force:true,reparoAplicado:id}).then(function(r){if(r&&r.ok===true&&!r.reparoPendente)clearPendingRepair()})},500)
  });
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  window.OneSignalDeferred.push(async function(OneSignal){oneSignal=OneSignal;var push=OneSignal.User&&OneSignal.User.PushSubscription;if(push&&typeof push.addEventListener==='function')push.addEventListener('change',function(){scheduleCheckin(true)});if(OneSignal.Notifications&&typeof OneSignal.Notifications.addEventListener==='function')OneSignal.Notifications.addEventListener('click',registerNotificationOpen);if(window.TACS_MORADOR_ATUAL)currentResident=window.TACS_MORADOR_ATUAL;scheduleCheckin(true)});
  window.PortalTacsSaudeNotificacoes={checkin:function(){return checkin({force:true})}};
}());
