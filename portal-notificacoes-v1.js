(function(){
'use strict';

var config=window.PORTAL_TACS_NOTIFICACOES_V1||{};
var sdkPromise=null;
var instance=null;
var UI_ID='portalTacsPushV1';

function text(value){return String(value==null?'':value).trim()}
function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function isAndroid(){return /android/i.test(navigator.userAgent)}
function isStandalone(){return window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
function permission(){return typeof Notification==='undefined'?'unsupported':Notification.permission}
function supported(){return 'Notification' in window&&'serviceWorker' in navigator&&Boolean(config.appId)}

function ensureStyles(){
  if(document.getElementById('portalTacsPushV1Style'))return;
  var style=document.createElement('style');
  style.id='portalTacsPushV1Style';
  style.textContent=[
    '.portal-push-v1{margin:0 0 22px;padding:18px;border:2px solid #75a6bb;border-radius:18px;background:#f4fbff;color:#102d40}',
    '.portal-push-v1 h2{margin:0 0 7px;font-size:clamp(22px,4vw,29px);color:#062c46}',
    '.portal-push-v1 p{margin:7px 0;font-size:16px;line-height:1.48}',
    '.portal-push-v1 button{width:100%;min-height:56px;margin-top:10px;border:0;border-radius:14px;background:#0b5878;color:#fff;padding:12px 16px;font-size:18px;font-weight:900}',
    '.portal-push-v1 button:disabled{opacity:.6;cursor:not-allowed}',
    '.portal-push-v1 .push-status{font-weight:850}',
    '.portal-push-v1 .push-help{color:#486270;font-size:14px}',
    '.portal-push-v1 .push-ok{color:#08723a}',
    '.portal-push-v1 .push-warn{color:#805300}'
  ].join('');
  document.head.appendChild(style);
}

function ensureUi(){
  var existing=document.getElementById(UI_ID);if(existing)return existing;
  var anchor=document.getElementById('noticeArea')||document.querySelector('.purpose')||document.querySelector('.content');
  if(!anchor||!anchor.parentNode)return null;
  var box=document.createElement('section');
  box.id=UI_ID;box.className='portal-push-v1';
  box.setAttribute('aria-labelledby','portalTacsPushV1Title');
  box.innerHTML='<h2 id="portalTacsPushV1Title">Avisos da Unidade no celular</h2>'+ 
    '<p>Ative para receber novos recados e campanhas publicados pela Unidade de Saúde.</p>'+ 
    '<p id="portalTacsPushV1Status" class="push-status" role="status"></p>'+ 
    '<button id="portalTacsPushV1Button" type="button">Ativar notificações</button>'+ 
    '<p id="portalTacsPushV1Help" class="push-help"></p>';
  if(anchor.id==='noticeArea')anchor.insertAdjacentElement('afterend',box);else anchor.parentNode.insertBefore(box,anchor);
  document.getElementById('portalTacsPushV1Button').addEventListener('click',activate);
  return box;
}

function setUi(status,help,buttonText,disabled,kind){
  var s=document.getElementById('portalTacsPushV1Status'),h=document.getElementById('portalTacsPushV1Help'),b=document.getElementById('portalTacsPushV1Button');
  if(!s||!h||!b)return;
  s.textContent=status||'';h.textContent=help||'';b.textContent=buttonText||'Ativar notificações';b.disabled=Boolean(disabled);
  s.className='push-status'+(kind==='ok'?' push-ok':kind==='warn'?' push-warn':'');
}

function renderBrowserState(){
  if(!supported()){
    setUi('Este navegador não oferece notificações web neste modo.','O Portal continua funcionando normalmente.','Notificações indisponíveis',true,'warn');return;
  }
  if(isIos()&&!isStandalone()){
    setUi('No iPhone, os avisos são ativados pelo Portal instalado na Tela de Início.','Safari → Compartilhar → Adicionar à Tela de Início. Depois abra pelo ícone criado.','Instale o Portal para ativar',true,'warn');return;
  }
  var p=permission();
  if(p==='denied'){
    setUi('As notificações estão bloqueadas neste aparelho.','Reative nas configurações de notificações do aparelho para o Portal TACS.','Notificações bloqueadas',true,'warn');return;
  }
  if(p==='granted'){
    setUi('Permissão concedida neste aparelho.','A inscrição será conferida sem interferir no restante do Portal.','Confirmar inscrição',false,'ok');return;
  }
  setUi('Os avisos ainda não estão ativados neste aparelho.',isAndroid()?'O Android abrirá a janela oficial de permissão.':'Toque para abrir a autorização oficial do sistema.','Ativar notificações',false,'');
}

function loadSdk(){
  if(sdkPromise)return sdkPromise;
  sdkPromise=new Promise(function(resolve,reject){
    if(!supported()){reject(new Error('Notificações web indisponíveis.'));return}
    window.OneSignalDeferred=window.OneSignalDeferred||[];
    window.OneSignalDeferred.push(async function(OneSignal){
      try{
        if(!instance){
          await OneSignal.init({
            appId:config.appId,
            safari_web_id:config.safariWebId,
            serviceWorkerPath:config.serviceWorkerPath,
            serviceWorkerParam:config.serviceWorkerParam,
            notifyButton:{enable:false},
            autoResubscribe:true,
            allowLocalhostAsSecureOrigin:false
          });
          instance=OneSignal;
        }
        resolve(OneSignal);
      }catch(error){reject(error)}
    });
    if(document.querySelector('script[data-portal-tacs-onesignal-v1]'))return;
    var script=document.createElement('script');
    script.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer=true;script.dataset.portalTacsOnesignalV1='1';
    script.onerror=function(){reject(new Error('Não foi possível carregar o serviço de notificações.'))};
    document.head.appendChild(script);
  });
  return sdkPromise;
}

async function syncSubscription(requestPermission){
  var OneSignal=await loadSdk();
  if(requestPermission&&permission()!=='granted')await OneSignal.Notifications.requestPermission();
  if(permission()!=='granted')return {ok:false,permission:permission()};
  if(OneSignal.User&&OneSignal.User.PushSubscription){
    var push=OneSignal.User.PushSubscription;
    if(!push.optedIn&&typeof push.optIn==='function')await push.optIn();
    return {ok:Boolean(push.optedIn),permission:'granted'};
  }
  return {ok:true,permission:'granted'};
}

async function activate(){
  var button=document.getElementById('portalTacsPushV1Button');if(button)button.disabled=true;
  setUi('Conectando o serviço de avisos…','Aguarde alguns segundos.','Conectando…',true,'');
  try{
    var result=await syncSubscription(true);
    if(result.ok){
      setUi('✓ Notificações ativadas neste aparelho.','Novos recados e campanhas poderão chegar como notificação do sistema.','Notificações ativadas',true,'ok');
    }else if(result.permission==='denied'){
      setUi('A autorização foi bloqueada ou recusada.','Reative nas configurações do aparelho para o Portal TACS.','Notificações bloqueadas',true,'warn');
    }else{
      setUi('A autorização não foi concluída.','Você pode tentar novamente quando desejar.','Tentar novamente',false,'warn');
    }
  }catch(error){
    console.error('Portal TACS Push V1:',error);
    setUi('Não foi possível conectar os avisos agora.','O restante do Portal continua funcionando normalmente. Tente novamente mais tarde.','Tentar novamente',false,'warn');
  }
}

function syncExistingLater(){
  if(!supported()||permission()!=='granted'||isIos()&&!isStandalone())return;
  var run=function(){syncSubscription(false).then(function(result){if(result.ok)setUi('✓ Notificações ativadas neste aparelho.','Novos recados e campanhas poderão chegar como notificação do sistema.','Notificações ativadas',true,'ok')}).catch(function(){})};
  if('requestIdleCallback' in window)window.requestIdleCallback(run,{timeout:5000});else setTimeout(run,3500);
}

function install(){ensureStyles();ensureUi();renderBrowserState();syncExistingLater()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}());
