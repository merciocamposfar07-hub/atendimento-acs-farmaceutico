(function(){
'use strict';
if(window.ConectaMoradorPinLocalV2)return;

var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var PROFILE_KEY='portalConectaMoradorQuickV1';
var TOKEN_KEY='portalConectaMoradorTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var AREA_KEY='portalTacsCentralAreaV1';
var BOOTSTRAP_KEY='portalConectaMoradorBootstrapV2';
var BG_REQUEST_KEY='portalConectaMoradorLoginRequestV2';

function text(v){return String(v==null?'':v).trim()}
function digits(v){return text(v).replace(/\D/g,'')}
function profile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch(e){return null}}
function device(){try{return text(localStorage.getItem(DEVICE_KEY)||'')}catch(e){return''}}
function vault(){var v=window.ConectaPinLocalV2;return v&&typeof v.abrir==='function'&&typeof v.guardar==='function'?v:null}
function bootstrap(snapshot){try{sessionStorage.setItem(BOOTSTRAP_KEY,JSON.stringify(snapshot||{}))}catch(e){}}
function openPortal(data){
  var area=encodeURIComponent(text(data&&data.areaId)||text(profile()&&profile().areaId)||'JAPARANDUBA');
  var onboarding=data&&data.notificacoesAtivas===true?'':'&onboarding=1';
  location.assign('/atendimento-acs-farmaceutico/?area='+area+'&conecta=1'+onboarding);
}
function backgroundLogin(p,pin){
  if(!p||!p.quickKey||!device())return '';
  var id='conecta_morador_bg_'+Date.now()+'_'+Math.random().toString(36).slice(2,10);
  var body=new URLSearchParams();
  body.set('action','conecta_morador_login_pin');body.set('requestId',id);
  body.set('quickKey',p.quickKey);body.set('pin',pin);body.set('dispositivo',device());
  try{sessionStorage.setItem(BG_REQUEST_KEY,id)}catch(e){}
  try{
    fetch(API+'?_='+Date.now(),{
      method:'POST',mode:'no-cors',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:body.toString(),cache:'no-store',keepalive:true
    }).catch(function(){});
  }catch(e){}
  return id;
}
function snapshotFrom(r){
  var p=profile()||{};
  return {
    perfil:'MORADOR',
    areaId:text(r&&r.areaId)||text(p.areaId),
    areaNome:text(r&&r.areaNome)||text(p.areaNome),
    nome:text(r&&r.nome)||text(p.nome),
    notificacoesAtivas:Boolean(r&&r.notificacoesAtivas===true),
    silencioso:Boolean(r&&r.silencioso===true),
    provisorio:Boolean(r&&r.provisorio===true),
    pendenciaId:text(r&&r.pendenciaId)
  };
}
function registrar(pin,r,snapshot){
  var v=vault(),p=profile()||{},snap=snapshot&&typeof snapshot==='object'?snapshot:snapshotFrom(r);
  if(!v||!r||!r.token)return Promise.resolve(false);
  bootstrap(snap);
  return Promise.resolve(v.guardar('morador',pin,{
    device:device(),token:r.token,quickKey:text(r.quickKey)||text(p.quickKey),
    areaId:text(r.areaId)||text(p.areaId),areaNome:text(r.areaNome)||text(p.areaNome),
    snapshot:snap,salvoRemotoEm:Date.now()
  })).catch(function(){return false});
}
function remover(){var v=vault();if(v&&typeof v.remover==='function')v.remover('morador')}

document.addEventListener('click',function(event){
  var target=event.target&&event.target.closest?event.target.closest('#cscResidentLogin'):null;
  if(!target)return;
  if(target.dataset.pinLocalBypass==='1'){delete target.dataset.pinLocalBypass;return}
  var input=document.getElementById('cscResidentPin'),pin=digits(input&&input.value),p=profile(),v=vault();
  if(!v||!p||!/^\d{4}$/.test(pin))return;
  event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  Promise.resolve(v.abrir('morador',pin)).then(function(saved){
    if(!saved||text(saved.device)!==device()||!saved.token||(saved.quickKey&&text(saved.quickKey)!==text(p.quickKey))){
      target.dataset.pinLocalBypass='1';target.click();return;
    }
    try{sessionStorage.setItem(TOKEN_KEY,saved.token);if(saved.areaId)localStorage.setItem(AREA_KEY,saved.areaId)}catch(e){}
    bootstrap(saved.snapshot||snapshotFrom(saved));
    backgroundLogin(p,pin);
    if(input)input.value='';
    openPortal(saved.snapshot||saved);
  }).catch(function(){
    target.dataset.pinLocalBypass='1';target.click();
  });
},true);

document.addEventListener('click',function(event){
  var other=event.target&&event.target.closest?event.target.closest('#cscResidentOther'):null;
  if(other)remover();
},true);

window.ConectaMoradorPinLocalV2={
  registrar:registrar,
  remover:remover,
  removerPerfil:function(role){if(String(role||'').toUpperCase()==='MORADOR')remover()},
  bootstrap:bootstrap
};
}());
