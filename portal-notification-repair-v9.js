(function(){
  'use strict';
  var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var oneSignal=null,running=false,attempts={},timer=null,counter=0;
  function text(v){return String(v==null?'':v).trim()}
  function uuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text(v).toLowerCase())}
  function areaId(){var a='';try{if(window.PortalTacsArea&&typeof window.PortalTacsArea.id==='function')a=window.PortalTacsArea.id()}catch(e){}return text(a||window.TACS_AREA_ID||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA'}
  function state(){var push=oneSignal&&oneSignal.User&&oneSignal.User.PushSubscription,tags={};try{tags=oneSignal&&oneSignal.User&&typeof oneSignal.User.getTags==='function'?(oneSignal.User.getTags()||{}):{}}catch(e){}return {permission:Boolean(oneSignal&&oneSignal.Notifications&&oneSignal.Notifications.permission===true),optedIn:Boolean(push&&push.optedIn===true),subscriptionId:text(push&&push.id).toLowerCase(),token:text(push&&push.token),areaConfirmed:text(tags.area_tacs).toUpperCase()===areaId()}}
  function wait(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}
  function waitReady(limitMs){return new Promise(function(resolve){var start=Date.now();function test(){var st=state();if(st.permission&&st.optedIn&&uuid(st.subscriptionId)&&st.token){resolve(st);return}if(Date.now()-start>=Number(limitMs||9000)){resolve(st);return}setTimeout(test,250)}test()})}
  function repairRequestId(){counter++;return 'reparo_v9_'+Date.now()+'_'+counter+'_'+Math.random().toString(36).slice(2,9)}
  function postState(reparoId,subscriptionId,estado,detalhe){try{var body=new URLSearchParams();body.set('action','publico_notificacao_reparo_estado');body.set('requestId',repairRequestId());body.set('subscriptionId',subscriptionId);body.set('areaId',areaId());body.set('reparoId',reparoId);body.set('estado',estado);if(detalhe)body.set('detalhe',text(detalhe).slice(0,220));return fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){})}catch(e){return Promise.resolve()}}
  function showManual(message){var repair=document.getElementById('notificationRepairButton'),help=document.getElementById('notificationHelp'),box=document.getElementById('notificationOffer');if(box)box.setAttribute('data-reparo-area','pendente');if(repair){repair.hidden=false;repair.disabled=false;repair.textContent='🔧 Reparar agora'}if(help)help.textContent=message||'A atualização automática não conseguiu terminar. Toque em Reparar agora para concluir o reparo neste aparelho.'}
  function pollPush(id,resolve,reject,started){var cb='__notifRepairV9_'+Date.now()+'_'+Math.floor(Math.random()*100000),s=document.createElement('script'),done=false,t=setTimeout(function(){finish(null)},4000);function finish(data){if(done)return;done=true;clearTimeout(t);try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.remove();if(data&&data.ok===true&&data.pendente===false&&data.result){if(data.result.ok===true&&data.result.push===true){resolve(data.result);return}reject(new Error(text(data.result.message)||'A notificação técnica de teste não foi aceita.'));return}if(Date.now()-started>16000){reject(new Error('A confirmação técnica do reparo demorou demais.'));return}setTimeout(function(){pollPush(id,resolve,reject,started)},900)}window[cb]=finish;s.onerror=function(){finish(null)};s.src=API+'?action=publico_notificacao_reparo_result&requestId='+encodeURIComponent(id)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s)}
  function confirmTechnical(subscriptionId){return new Promise(function(resolve,reject){var sub=text(subscriptionId).toLowerCase();if(!uuid(sub)){reject(new Error('A inscrição Push não ficou disponível.'));return}var id=repairRequestId(),body=new URLSearchParams();body.set('action','publico_confirmar_reparo_notificacao');body.set('requestId',id);body.set('subscriptionId',sub);body.set('areaId',areaId());fetch(API+'?_='+Date.now(),{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'}).catch(function(){}).then(function(){setTimeout(function(){pollPush(id,resolve,reject,Date.now())},700)})})}
  async function executeRepair(result){
    var repairId=text(result&&result.reparoId);if(!repairId||!oneSignal)return false;
    var tried=Number(attempts[repairId]||0);if(tried>=2){showManual();return false}
    var initial=state();if(!initial.permission){await postState(repairId,initial.subscriptionId,'ACAO_MORADOR_NECESSARIA','A permissão de notificações não está ativa; o navegador exige ação do morador.');showManual('As notificações deste aparelho precisam de autorização. Toque em Reparar agora e confirme a permissão do navegador.');return false}
    attempts[repairId]=tried+1;
    await postState(repairId,initial.subscriptionId,'AUTO_INICIADO','V9 iniciou uma tentativa controlada de recuperação do Push.');
    try{
      var push=oneSignal.User&&oneSignal.User.PushSubscription;if(!push)throw new Error('A inscrição Push não está disponível neste navegador.');
      if(typeof push.optIn==='function')await push.optIn();
      var ready=await waitReady(9000);if(!ready.permission||!ready.optedIn||!uuid(ready.subscriptionId)||!ready.token)throw new Error('A inscrição Push não ficou pronta automaticamente.');
      if(oneSignal.User&&typeof oneSignal.User.addTag==='function')await oneSignal.User.addTag('area_tacs',areaId());
      ready=state();if(!ready.areaConfirmed)throw new Error('O vínculo da área não foi confirmado pelo OneSignal.');
      await confirmTechnical(ready.subscriptionId);
      document.dispatchEvent(new CustomEvent('tacs:notificacao-reparo-concluido',{detail:{areaId:areaId(),subscriptionId:ready.subscriptionId,automatico:true,v9:true}}));
      await wait(1400);
      var health=window.PortalTacsSaudeNotificacoes;if(health&&typeof health.checkin==='function'){
        var after=await health.checkin();
        if(after&&after.reparoPendente)throw new Error('O servidor ainda não confirmou a baixa do reparo.');
      }
      return true;
    }catch(error){
      await postState(repairId,state().subscriptionId||initial.subscriptionId,'AUTO_FALHOU',text(error&&error.message)||'A tentativa V9 não foi concluída.');
      if(Number(attempts[repairId]||0)<2){setTimeout(function(){executeRepair(result)},10000)}else showManual();
      return false;
    }
  }
  async function inspect(){
    if(running)return null;var health=window.PortalTacsSaudeNotificacoes;if(!health||typeof health.checkin!=='function'||!oneSignal)return null;
    running=true;try{var result=await health.checkin();if(result&&result.reparoPendente){showManual('O Portal está verificando automaticamente as notificações deste aparelho. Se a atualização não concluir, use “Reparar agora”.');await executeRepair(result)}return result}catch(e){return null}finally{running=false}
  }
  function schedule(ms){clearTimeout(timer);timer=setTimeout(function(){inspect()},Number(ms||25000))}
  function loadReadiness(){
    if(document.querySelector('script[data-notification-readiness-v1]'))return;
    var s=document.createElement('script');
    s.src='portal-notification-readiness-v1.js?v=20260826-readiness-v1';
    s.defer=true;
    s.dataset.notificationReadinessV1='1';
    document.head.appendChild(s);
  }
  document.addEventListener('tacs:morador',function(){schedule(25000)});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule(25000)});
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  window.OneSignalDeferred.push(function(OneSignal){oneSignal=OneSignal;var push=OneSignal.User&&OneSignal.User.PushSubscription;if(push&&typeof push.addEventListener==='function')push.addEventListener('change',function(){schedule(5000)});schedule(25000)});
  window.PortalTacsReparoV9={verificar:inspect,executarReparo:executeRepair,estado:state};
  loadReadiness();
}());
