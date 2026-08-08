(function(window,document){
'use strict';

var existente=window.PortalTacsAdminClient;
if(existente&&existente.version)return;

var API=String(window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec').trim();
var TOKEN_KEY='portalTacsAdminTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var PUBLIC_KEYS=['portalTacsPublicDataV3','portalTacsPublicDataV2'];
var active=null;
var counter=0;

function text(v){return String(v==null?'':v).trim()}
function device(){
  var value='';
  try{value=text(localStorage.getItem(DEVICE_KEY))}catch(e){}
  if(!value){
    value='device-'+Date.now()+'-'+Math.random().toString(36).slice(2);
    try{localStorage.setItem(DEVICE_KEY,value)}catch(e){}
  }
  return value;
}
function token(){try{return text(sessionStorage.getItem(TOKEN_KEY))}catch(e){return''}}
function setToken(value){value=text(value);try{if(value)sessionStorage.setItem(TOKEN_KEY,value);else sessionStorage.removeItem(TOKEN_KEY)}catch(e){}return value}
function clearSession(){setToken('')}
function session(){return{token:token(),dispositivo:device()}}
function hasSession(){return!!token()}
function messageOf(result){return text(result&&result.message)}
function normalize(v){var s=text(v).toLowerCase();if(s.normalize)s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s}
function isAuthError(result){
  var s=normalize(messageOf(result));
  return /sessao/.test(s)&&(/invalida|expirad|ausente|entre novamente/.test(s));
}
function isTemporary(result){
  if(result&&result.temporario===true)return true;
  var s=normalize(messageOf(result));
  return /temporari|rede|conexao|processamento|demor|timeout|indisponivel/.test(s);
}
function invalidatePublic(){
  try{
    PUBLIC_KEYS.forEach(function(key){localStorage.removeItem(key)});
    localStorage.setItem('portalTacsPublicInvalidateAtV1',String(Date.now()));
  }catch(e){}
}
function requestId(prefix){
  var base=text(prefix).replace(/[^A-Za-z0-9_-]/g,'_')||'admin';
  if(window.crypto&&window.crypto.getRandomValues){
    var bytes=new Uint8Array(18);window.crypto.getRandomValues(bytes);
    return base+'_'+Array.prototype.map.call(bytes,function(b){return('0'+b.toString(16)).slice(-2)}).join('');
  }
  return base+'_'+Date.now()+'_'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
}
function jsonp(action,params,timeoutMs){
  params=params||{};timeoutMs=Math.max(3000,Number(timeoutMs)||12000);
  return new Promise(function(resolve){
    counter++;
    var callback='__tacsAdminClient_'+Date.now()+'_'+counter;
    var script=document.createElement('script');
    var ended=false;
    var timer;
    function cleanup(){clearTimeout(timer);if(script.parentNode)script.parentNode.removeChild(script);try{delete window[callback]}catch(e){window[callback]=undefined}}
    function finish(result){if(ended)return;ended=true;cleanup();resolve(result||{ok:false,temporario:true,message:'Resposta vazia do servidor.'})}
    window[callback]=finish;
    var query=['action='+encodeURIComponent(action),'callback='+encodeURIComponent(callback),'_='+Date.now()];
    Object.keys(params).forEach(function(key){query.push(encodeURIComponent(key)+'='+encodeURIComponent(text(params[key])))});
    script.async=true;
    script.src=API+(API.indexOf('?')<0?'?':'&')+query.join('&');
    script.onerror=function(){finish({ok:false,temporario:true,message:'Falha temporária de rede.'})};
    document.head.appendChild(script);
    timer=setTimeout(function(){finish({ok:false,temporario:true,message:'A consulta demorou além do esperado.'})},timeoutMs);
  });
}
function operationTimeout(action){return /^admin_(salvar|remover|criar)_/.test(action)?50000:30000}
function pollResult(id,deadline,resolveDone){
  var wait=900;
  function next(){
    if(!active||active.id!==id)return;
    if(Date.now()>=deadline){resolveDone({ok:false,temporario:true,message:'A confirmação demorou além do esperado. A operação não foi reenviada.'});return}
    jsonp('admin_result',{requestId:id},9000).then(function(result){
      if(!active||active.id!==id)return;
      if(result&&result.ok===true&&result.pendente===false){resolveDone(result.result||{ok:false,message:'Resposta administrativa vazia.'});return}
      wait=Math.min(4000,wait+600);
      active.pollTimer=setTimeout(next,wait);
    });
  }
  active.pollTimer=setTimeout(next,wait);
}
function post(action,payload){
  action=text(action);
  if(active)return Promise.resolve({ok:false,temporario:true,message:'Aguarde a operação anterior terminar.'});
  payload=payload||{};
  return new Promise(function(resolve){
    var id=requestId(action);
    var timeoutMs=operationTimeout(action);
    var deadline=Date.now()+timeoutMs;
    var frame=document.createElement('iframe');
    var form=document.createElement('form');
    var frameName='tacsAdminBridge_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    var ended=false;
    var timeout;
    function cleanup(){
      clearTimeout(timeout);
      if(active&&active.id===id){clearTimeout(active.pollTimer);active=null}
      window.removeEventListener('message',onMessage);
      if(form.parentNode)form.parentNode.removeChild(form);
      setTimeout(function(){if(frame.parentNode)frame.parentNode.removeChild(frame)},50);
    }
    function finish(result){
      if(ended)return;ended=true;cleanup();
      result=result||{ok:false,temporario:true,message:'Resposta administrativa vazia.'};
      if(isAuthError(result))clearSession();
      if(result.ok===true&&/^admin_(salvar|remover|criar)_/.test(action))invalidatePublic();
      resolve(result);
    }
    function onMessage(event){
      if(event.source!==frame.contentWindow)return;
      var data=event.data;
      if(typeof data==='string'){try{data=JSON.parse(data)}catch(e){return}}
      if(!data||typeof data!=='object')return;
      var receivedId=text(data.requestId||(data.result&&data.result.requestId));
      if(receivedId&&receivedId!==id)return;
      if(data.source&&data.source!=='admin-painel-tacs-v1')return;
      if(Object.prototype.hasOwnProperty.call(data,'result'))finish(data.result);
    }
    active={id:id,action:action,pollTimer:null};
    frame.name=frameName;frame.hidden=true;frame.setAttribute('aria-hidden','true');frame.style.display='none';
    form.method='POST';form.action=API+(API.indexOf('?')<0?'?':'&')+'_='+Date.now();form.target=frameName;form.hidden=true;
    var fields={action:action,requestId:id};
    Object.keys(payload).forEach(function(key){fields[key]=payload[key]});
    Object.keys(fields).forEach(function(key){var input=document.createElement('input');input.type='hidden';input.name=key;input.value=text(fields[key]);form.appendChild(input)});
    window.addEventListener('message',onMessage);
    document.body.appendChild(frame);document.body.appendChild(form);
    timeout=setTimeout(function(){finish({ok:false,temporario:true,message:'A resposta do servidor demorou além do esperado. A operação não foi reenviada e sua sessão foi preservada.'})},timeoutMs);
    try{form.submit()}catch(error){finish({ok:false,temporario:true,message:'Não foi possível iniciar a conexão com o servidor.'});return}
    pollResult(id,deadline,finish);
  });
}
function status(){return jsonp('admin_status',{prewarm:'1'},15000)}
function login(pin){
  pin=text(pin).replace(/\D/g,'');
  if(!/^\d{4,8}$/.test(pin))return Promise.resolve({ok:false,message:'Digite um PIN numérico de 4 a 8 dígitos.'});
  return post('admin_login',{pin:pin,dispositivo:device()}).then(function(result){if(result&&result.ok===true&&result.token)setToken(result.token);return result});
}
function data(){
  if(!hasSession())return Promise.resolve({ok:false,message:'Sessão administrativa ausente. Entre novamente com o PIN.'});
  return post('admin_dados',session()).then(function(result){if(isAuthError(result))clearSession();return result});
}
function mutate(action,payload){
  if(!hasSession())return Promise.resolve({ok:false,message:'Sessão administrativa ausente. Entre novamente com o PIN.'});
  var merged=session();Object.keys(payload||{}).forEach(function(key){merged[key]=payload[key]});
  return post(action,merged);
}
function logout(){
  if(!hasSession()){clearSession();return Promise.resolve({ok:true})}
  return post('admin_logout',session()).then(function(result){clearSession();return result});
}
function warm(){
  var w=window.PortalTacsAdminWarmup;
  if(w&&typeof w.iniciar==='function')return w.iniciar();
  return status();
}

window.PortalTacsAdminClient=Object.freeze({
  version:'1.0.0',api:API,status:status,warm:warm,login:login,logout:logout,data:data,mutate:mutate,
  hasSession:hasSession,session:session,clearSession:clearSession,isAuthError:isAuthError,isTemporary:isTemporary,
  invalidatePublic:invalidatePublic
});

setTimeout(function(){try{warm()}catch(e){}},0);
})(window,document);
