(function(){
  'use strict';
  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var currentResident=null;
  var oneSignal=null;
  var pendingRepairId='';
  var currentRequest=null;
  var lastFingerprint='';
  var counter=0;

  function text(v){return String(v==null?'':v).trim()}
  function digits(v){return text(v).replace(/\D/g,'')}
  function validDocument(v){var d=digits(v);return /^\d{11}$/.test(d)||/^\d{15}$/.test(d)}
  function areaId(){
    var a='';
    try{if(window.PortalTacsArea&&typeof window.PortalTacsArea.id==='function')a=window.PortalTacsArea.id()}catch(e){}
    if(!a)a=window.TACS_AREA_ID||'';
    if(!a&&currentResident)a=currentResident.areaId||'';
    return text(a||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA';
  }
  function documentValue(){var e=document.getElementById('cpf');return e?digits(e.value):''}
  function state(){
    var push=oneSignal&&oneSignal.User&&oneSignal.User.PushSubscription;
    var tags={};
    try{tags=oneSignal&&oneSignal.User&&typeof oneSignal.User.getTags==='function'?(oneSignal.User.getTags()||{}):{}}catch(e){}
    return {
      permission:Boolean(oneSignal&&oneSignal.Notifications&&oneSignal.Notifications.permission===true),
      optedIn:Boolean(push&&push.optedIn===true),
      subscriptionId:text(push&&push.id).toLowerCase(),
      token:text(push&&push.token),
      areaConfirmed:text(tags.area_tacs).toUpperCase()===areaId()
    };
  }
  function uuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text(v).toLowerCase())}
  function deviceInfo(){
    var ua=navigator.userAgent||'',platform=navigator.platform||'';
    var os=/Android/i.test(ua)?'Android':/iPhone|iPad|iPod/i.test(ua)?'iOS/iPadOS':/Windows/i.test(ua)?'Windows':/Mac/i.test(platform)?'macOS':'Outro sistema';
    var browser=/SamsungBrowser/i.test(ua)?'Samsung Internet':/Edg\//i.test(ua)?'Edge':/Firefox\//i.test(ua)?'Firefox':/CriOS|Chrome\//i.test(ua)?'Chrome':/Safari\//i.test(ua)?'Safari':'Navegador';
    var device=/Android/i.test(ua)?'Android':/iPhone/i.test(ua)?'iPhone':/iPad/i.test(ua)?'iPad':'Aparelho';
    return {device:device,browser:browser,os:os};
  }
  function requestId(){counter++;return 'notif_check_'+Date.now()+'_'+counter+'_'+Math.random().toString(36).slice(2,10)}
  function cleanupRequest(req){
    if(!req)return;clearTimeout(req.pollTimer);clearTimeout(req.timeout);window.removeEventListener('message',req.onMessage);
    if(req.form&&req.form.parentNode)req.form.remove();
    if(req.frame&&req.frame.parentNode)setTimeout(function(){if(req.frame.parentNode)req.frame.remove()},100);
    currentRequest=null;
  }
  function postCheckin(payload){
    return new Promise(function(resolve,reject){
      if(currentRequest){reject(new Error('Checagem anterior ainda em andamento.'));return;}
      var req={id:requestId(),frame:null,form:null,pollTimer:null,timeout:null,onMessage:null,done:false};
      currentRequest=req;
      var frame=document.createElement('iframe'),form=document.createElement('form'),name='notifHealth'+Date.now()+Math.floor(Math.random()*10000);
      req.frame=frame;req.form=form;frame.name=name;frame.setAttribute('name',name);frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;border:0;opacity:.01;pointer-events:none';frame.src='about:blank';
      form.method='POST';form.action=API+'?_='+Date.now();form.target=name;form.style.display='none';
      function add(k,v){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=v;form.appendChild(i)}
      add('action','publico_notificacao_checkin');add('requestId',req.id);Object.keys(payload).forEach(function(k){add(k,payload[k])});
      function finish(error,result){if(req.done)return;req.done=true;cleanupRequest(req);error?reject(error):resolve(result)}
      function accept(result){if(result&&result.ok===true){finish(null,result);return}finish(new Error(text(result&&result.message)||'Não foi possível registrar a situação das notificações.'))}
      req.onMessage=function(event){if(event.source!==frame.contentWindow)return;var data=event.data;if(typeof data==='string'){try{data=JSON.parse(data)}catch(e){return}}if(!data||data.source!=='notificacao-saude-tacs-v1'||data.requestId!==req.id)return;accept(data.result)};
      window.addEventListener('message',req.onMessage);
      function poll(){if(req.done)return;var cb='__notifHealth_'+Date.now()+'_'+Math.floor(Math.random()*100000),s=document.createElement('script'),settled=false,t=setTimeout(function(){settle(null)},4500);function settle(data){if(settled)return;settled=true;clearTimeout(t);try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.remove();if(data&&data.ok===true&&data.pendente===false&&data.result){accept(data.result);return}if(!req.done)req.pollTimer=setTimeout(poll,1000)}window[cb]=settle;s.onerror=function(){settle(null)};s.src=API+'?action=publico_notificacao_checkin_result&requestId='+encodeURIComponent(req.id)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s)}
      document.body.appendChild(frame);document.body.appendChild(form);var sent=false;function submit(){if(sent||req.done)return;sent=true;try{form.submit()}catch(e){finish(new Error('Não foi possível iniciar a checagem das notificações.'));return}req.pollTimer=setTimeout(poll,700)}frame.addEventListener('load',submit,{once:true});setTimeout(submit,130);req.timeout=setTimeout(function(){finish(new Error('A checagem das notificações demorou demais.'))},22000);
    });
  }
  function showPendingRepair(result){
    pendingRepairId=text(result&&result.reparoId);
    if(!pendingRepairId)return;
    var box=document.getElementById('notificationOffer'),repair=document.getElementById('notificationRepairButton'),help=document.getElementById('notificationHelp');
    if(box)box.setAttribute('data-reparo-area','pendente');
    if(repair){repair.hidden=false;repair.disabled=false;repair.textContent='🔧 Reparar agora'}
    if(help)help.textContent='O TACS solicitou uma atualização dos avisos deste aparelho. Toque em Reparar agora para restabelecer a conexão.';
  }
  function clearPendingRepair(){
    pendingRepairId='';var box=document.getElementById('notificationOffer');if(box)box.removeAttribute('data-reparo-area');
  }
  function checkin(options){
    options=options||{};
    if(!currentResident||!oneSignal)return Promise.resolve(null);
    var doc=documentValue(),st=state();if(!validDocument(doc)||!uuid(st.subscriptionId))return Promise.resolve(null);
    var info=deviceInfo(),payload={documento:doc,subscriptionId:st.subscriptionId,areaId:areaId(),permission:st.permission?'true':'false',optedIn:st.optedIn?'true':'false',tokenAtivo:st.token?'true':'false',areaConfirmada:st.areaConfirmed?'true':'false',tipoAparelho:info.device,navegador:info.browser,sistema:info.os,reparoAplicado:text(options.reparoAplicado||'')};
    var fp=[payload.subscriptionId,payload.areaId,payload.permission,payload.optedIn,payload.tokenAtivo,payload.areaConfirmada,payload.reparoAplicado].join('|');
    if(!options.force&&fp===lastFingerprint)return Promise.resolve(null);
    lastFingerprint=fp;
    return postCheckin(payload).then(function(result){if(result&&result.reparoPendente)showPendingRepair(result);else if(result&&payload.reparoAplicado)clearPendingRepair();return result}).catch(function(){lastFingerprint='';return null});
  }
  function scheduleCheckin(force){setTimeout(function(){checkin({force:Boolean(force)})},350)}

  document.addEventListener('tacs:morador',function(event){currentResident=event&&event.detail||null;scheduleCheckin(true)});
  document.addEventListener('tacs:notificacao-reparo-concluido',function(){if(!pendingRepairId){scheduleCheckin(true);return}var id=pendingRepairId;setTimeout(function(){checkin({force:true,reparoAplicado:id}).then(function(r){if(r&&r.ok===true&&!r.reparoPendente)clearPendingRepair()})},500)});

  window.OneSignalDeferred=window.OneSignalDeferred||[];
  window.OneSignalDeferred.push(async function(OneSignal){
    oneSignal=OneSignal;
    var push=OneSignal.User&&OneSignal.User.PushSubscription;
    if(push&&typeof push.addEventListener==='function')push.addEventListener('change',function(){scheduleCheckin(true)});
    if(window.TACS_MORADOR_ATUAL)currentResident=window.TACS_MORADOR_ATUAL;
    scheduleCheckin(true);
  });

  window.PortalTacsSaudeNotificacoes={checkin:function(){return checkin({force:true})}};
}());
