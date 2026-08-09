(function(){
'use strict';

var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var TOKEN_KEY='portalTacsAdminTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var token=sessionStorage.getItem(TOKEN_KEY)||'';
var device=localStorage.getItem(DEVICE_KEY)||'';
var active=null;

if(!device){
  device='iphone-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  localStorage.setItem(DEVICE_KEY,device);
}

function el(id){return document.getElementById(id)}
function text(v){return String(v==null?'':v).trim()}
function setStatus(id,msg,type){
  var node=el(id);
  if(!node)return;
  node.textContent=msg;
  node.className='status'+(type?' '+type:'');
}
function requestId(action){
  return 'morv2_'+String(action||'op').replace(/[^a-z0-9]/gi,'')+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
}
function session(){return{token:token,dispositivo:device}}

function jsonp(action,extra,cb){
  var name='mrV2Cb'+Date.now()+Math.floor(Math.random()*100000);
  var script=document.createElement('script');
  var done=false;
  var timer=setTimeout(function(){finish({ok:false,message:'O servidor demorou para responder à consulta.'})},18000);
  function finish(result){
    if(done)return;
    done=true;
    clearTimeout(timer);
    try{delete window[name]}catch(ignore){}
    if(script.parentNode)script.remove();
    cb(result);
  }
  window[name]=finish;
  script.onerror=function(){finish({ok:false,message:'Falha ao consultar o servidor.'})};
  var q='action='+encodeURIComponent(action)+'&callback='+encodeURIComponent(name)+'&v='+Date.now();
  Object.keys(extra||{}).forEach(function(k){q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(extra[k])});
  script.src=API+'?'+q;
  document.head.appendChild(script);
}

function finish(result){
  if(!active)return;
  clearTimeout(active.timeout);
  clearTimeout(active.pollTimer);
  var cb=active.callback;
  if(active.form&&active.form.parentNode)active.form.remove();
  var frame=active.frame;
  active=null;
  if(frame&&frame.parentNode){setTimeout(function(){if(frame.parentNode)frame.remove()},250)}
  var login=el('login');
  var logout=el('logout');
  if(login)login.disabled=false;
  if(logout)logout.disabled=!token;
  cb(result||{ok:false,message:'Resposta vazia do servidor.'});
}

function messageResult(data){
  if(!active||!data||typeof data!=='object')return null;
  var rid=text(data.requestId||(data.result&&data.result.requestId));
  if(rid&&rid!==active.id)return null;
  if(Object.prototype.hasOwnProperty.call(data,'result'))return data.result;
  if(Object.prototype.hasOwnProperty.call(data,'payload'))return data.payload;
  return Object.prototype.hasOwnProperty.call(data,'ok')?data:null;
}

window.addEventListener('message',function(event){
  if(!active||!active.frame||event.source!==active.frame.contentWindow)return;
  var data=event.data;
  if(typeof data==='string'){
    try{data=JSON.parse(data)}catch(ignore){return}
  }
  var result=messageResult(data);
  if(result)finish(result);
});

function schedulePoll(){
  if(!active)return;
  clearTimeout(active.pollTimer);
  active.pollTimer=setTimeout(pollResult,active.nextWait);
}

function pollResult(){
  if(!active)return;
  var current=active;
  jsonp(current.resultAction,{requestId:current.id},function(r){
    if(!active||active.id!==current.id)return;
    if(r&&r.ok===true&&r.pendente===false){finish(r.result);return}
    if(Date.now()>=current.limit){
      finish({ok:false,message:'A confirmação do servidor ainda está em processamento. A operação não foi reenviada.'});
      return;
    }
    current.nextWait=Math.min(8000,current.nextWait+1000);
    schedulePoll();
  });
}

function post(action,payload,resultAction,cb){
  if(active){cb({ok:false,message:'Aguarde a operação anterior terminar.'});return}
  var rid=requestId(action);
  var fields={};
  Object.keys(payload||{}).forEach(function(k){fields[k]=payload[k]});
  fields.action=action;
  fields.requestId=rid;

  var frame=document.createElement('iframe');
  var form=document.createElement('form');
  frame.name='mrV2Frame'+Date.now()+Math.floor(Math.random()*1000);
  frame.className='bridge';
  frame.setAttribute('aria-hidden','true');
  frame.src='about:blank';
  form.method='POST';
  form.action=API+'?_='+Date.now();
  form.target=frame.name;
  form.className='bridge';

  Object.keys(fields).forEach(function(k){
    var input=document.createElement('input');
    input.type='hidden';
    input.name=k;
    input.value=String(fields[k]==null?'':fields[k]);
    form.appendChild(input);
  });

  active={
    id:rid,
    action:action,
    resultAction:resultAction,
    callback:cb,
    frame:frame,
    form:form,
    pollTimer:null,
    nextWait:2500,
    limit:Date.now()+74000,
    timeout:setTimeout(function(){finish({ok:false,message:'A confirmação do servidor ainda está em processamento. A operação não foi reenviada.'})},75000)
  };

  var login=el('login');
  var logout=el('logout');
  if(login)login.disabled=true;
  if(logout)logout.disabled=true;
  document.body.appendChild(frame);
  document.body.appendChild(form);
  form.submit();
  schedulePoll();
}

function renderBase(r,message){
  if(!r||r.ok!==true){setStatus('loginStatus',text(r&&r.message||'Não foi possível carregar a base.'),'err');return false}
  if(el('countResidents'))el('countResidents').textContent=String(r.totalRegistros);
  if(el('schema'))el('schema').textContent=r.schemaValido?'20/20':'ERRO';
  if(el('write'))el('write').textContent=r.escritaHabilitada?'LIBERADO':'BLOQ.';
  if(el('situation'))el('situation').textContent=r.situacaoHabilitada?'LIBERADA':'BLOQ.';
  if(el('summary'))el('summary').classList.remove('hidden');
  if(el('content'))el('content').classList.remove('hidden');
  if(el('logout'))el('logout').disabled=false;
  setStatus('loginStatus',message||'Sessão validada e base conferida.','ok');
  return true;
}

function loadBase(message){
  post('admin_moradores_status',session(),'admin_moradores_result',function(r){renderBase(r,message)});
}

function loginWithPin(pin){
  setStatus('loginStatus','Validando PIN com o servidor…','warn');
  post('admin_login',{pin:pin,dispositivo:device},'admin_result',function(r){
    if(el('pin'))el('pin').value='';
    if(!r||r.ok!==true||!r.token){
      token='';
      sessionStorage.removeItem(TOKEN_KEY);
      setStatus('loginStatus',text(r&&r.message||'Login recusado pelo servidor.'),'err');
      return;
    }
    token=r.token;
    sessionStorage.setItem(TOKEN_KEY,token);
    setStatus('loginStatus','PIN validado. Conferindo a base de moradores…','warn');
    loadBase('PIN validado e base de moradores conferida.');
  });
}

function onLoginCapture(event){
  var button=event.target&&event.target.closest?event.target.closest('#login'):null;
  if(!button)return;
  event.preventDefault();
  event.stopPropagation();
  if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  var pin=text(el('pin')&&el('pin').value).replace(/\D/g,'');
  token=sessionStorage.getItem(TOKEN_KEY)||token||'';
  if(token&&!pin){loadBase('Sessão existente validada e base conferida.');return}
  if(!/^\d{4,8}$/.test(pin)){setStatus('loginStatus','Digite um PIN numérico de 4 a 8 dígitos.','err');return}
  loginWithPin(pin);
}

document.addEventListener('click',onLoginCapture,true);

/* Pré-aquece a implantação sem autenticar nem escrever nada. */
jsonp('admin_result',{requestId:'warmup_moradores_v2_'+Date.now()},function(){});

if(token){
  setTimeout(function(){
    if(!active)loadBase('Sessão administrativa existente validada e base conferida.');
  },350);
}

window.PortalTacsMoradoresTransportV2={
  post:post,
  loadBase:loadBase,
  version:'2.0.0'
};
}());
