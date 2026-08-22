(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined'||typeof location==='undefined')return;
if(!/\/painel-oficial-recados-campanhas\.html$/.test(String(location.pathname||'')))return;
if(window.PortalTacsOneSignalHealthRecoveryV1)return;

var RETRY_DELAYS=[1800,5000,12000];
var SUCCESS_PREFIX='portalTacsOneSignalHealthLastOkV1:';
var retryIndex=0,retryTimer=null,observer=null,writing=false,lastFailureAt=0,lastArea='';
var state={version:'1.0.0',retryIndex:0,lastSuccess:'',lastFailure:'',pending:false};
window.PortalTacsOneSignalHealthRecoveryV1=state;

function text(v){return String(v==null?'':v).trim()}
function statusEl(){return document.getElementById('saudeNotificacoesStatus')}
function updateButton(){return document.getElementById('atualizarSaudeNotificacoes')}
function healthSection(){return document.getElementById('saudeNotificacoes')}
function hasSession(){try{return Boolean(sessionStorage.getItem('portalTacsAdminTokenV1')||sessionStorage.getItem('portalTacsTerritorioTokenV1'))}catch(e){return false}}
function areaId(){var s=document.getElementById('areaEnvio'),q='';try{q=new URLSearchParams(location.search||'').get('area')||''}catch(e){}return text((s&&s.value)||q||'JAPARANDUBA').toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'JAPARANDUBA'}
function timeLabel(d){try{return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Recife',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d||new Date())}catch(e){return(d||new Date()).toLocaleTimeString('pt-BR')}}
function cacheKey(){return SUCCESS_PREFIX+areaId()}
function saveSuccess(at){try{localStorage.setItem(cacheKey(),String(at))}catch(e){}}
function readSuccess(){try{return Number(localStorage.getItem(cacheKey())||0)}catch(e){return 0}}
function setStatus(msg,type){var e=statusEl();if(!e)return;writing=true;e.textContent=msg;e.className='status'+(type?' '+type:'');writing=false}
function clearRetry(){if(retryTimer){clearTimeout(retryTimer);retryTimer=null}state.pending=false}
function resetRetries(){clearRetry();retryIndex=0;state.retryIndex=0;lastFailureAt=0}
function success(){var now=Date.now();resetRetries();state.lastSuccess=new Date(now).toISOString();saveSuccess(now);setStatus('Conferido agora às '+timeLabel(new Date(now))+' • consulta técnica ao OneSignal concluída.','ok')}
function scheduleRetry(){
  clearRetry();
  lastFailureAt=Date.now();state.lastFailure=new Date(lastFailureAt).toISOString();
  if(retryIndex>=RETRY_DELAYS.length){
    var previous=readSuccess(),tail=previous?' Última conferência válida: '+timeLabel(new Date(previous))+'.':'';
    setStatus('A conferência atual do OneSignal não foi concluída após '+(RETRY_DELAYS.length+1)+' tentativas. Os últimos dados foram preservados.'+tail+' O painel tentará novamente quando a conexão voltar ou esta tela for retomada.','erro');
    return;
  }
  var delay=RETRY_DELAYS[retryIndex],attempt=retryIndex+1;retryIndex++;state.retryIndex=retryIndex;state.pending=true;
  setStatus('Os últimos dados continuam visíveis. Nova conferência automática '+attempt+'/'+RETRY_DELAYS.length+' em '+Math.ceil(delay/1000)+' s…','aviso');
  retryTimer=setTimeout(function(){retryTimer=null;state.pending=false;triggerCheck('retry')},delay);
}
function triggerCheck(reason){
  if(!hasSession())return;
  var section=healthSection(),button=updateButton();
  if(!section||section.classList.contains('oculto')||!button||button.disabled)return;
  if(document.visibilityState==='hidden'&&reason!=='online')return;
  button.click();
}
function classify(){
  if(writing)return;
  var e=statusEl();if(!e)return;
  var msg=text(e.textContent).toLowerCase();
  if(!msg)return;
  if(msg.indexOf('situação atualizada com a consulta técnica ao onesignal')!==-1||msg.indexOf('conferido agora')!==-1){success();return}
  if(msg.indexOf('conferência do onesignal não terminou')!==-1||msg.indexOf('onesignal não pôde ser consultado agora')!==-1){scheduleRetry();return}
  if(msg.indexOf('carregando o último estado')!==-1||msg.indexOf('conferindo o estado atual no onesignal')!==-1){state.pending=true;return}
}
function install(){
  var e=statusEl();if(!e){setTimeout(install,200);return}
  if(observer)return;
  lastArea=areaId();observer=new MutationObserver(classify);observer.observe(e,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});classify();
  var area=document.getElementById('areaEnvio');if(area)area.addEventListener('change',function(){var a=areaId();if(a!==lastArea){lastArea=a;resetRetries()}});
  var manual=updateButton();if(manual)manual.addEventListener('click',function(ev){if(ev&&ev.isTrusted)resetRetries()},true);
}
function recover(reason){if(!hasSession())return;resetRetries();setTimeout(function(){triggerCheck(reason)},350)}
window.addEventListener('online',function(){recover('online')});
window.addEventListener('pageshow',function(){install();if(hasSession())recover('pageshow')});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&hasSession()&&Date.now()-lastFailureAt>1500)recover('visible')});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}());
