(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
var PROFILE_KEY='portalTacsAcessoRapidoV1';
var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var loginBtn=document.getElementById('loginTacs');
var cnsInput=document.getElementById('tacsCns');
var pinInput=document.getElementById('tacsPin');
var tacsLogin=document.getElementById('tacsLogin');
var status=document.getElementById('loginStatus');
if(!loginBtn||!cnsInput||!pinInput||!tacsLogin)return;

var busy=false;
function text(v){return String(v==null?'':v).trim()}
function digits(v){return text(v).replace(/\D/g,'')}
function setStatus(msg,type){if(!status)return;status.textContent=msg;status.className='status'+(type?' '+type:'')}
function getDevice(){var d='';try{d=localStorage.getItem(DEVICE_KEY)||''}catch(e){}return d}
function getProfile(){
  try{
    var raw=localStorage.getItem(PROFILE_KEY)||'';
    if(!raw)return null;
    var p=JSON.parse(raw);
    if(!p||!/^qt1\.[A-Z0-9_-]{1,64}\.[a-f0-9]{64}$/.test(String(p.quickKey||'')))return null;
    return p;
  }catch(e){return null}
}
function saveProfile(r){
  if(!r||!r.quickKey)return;
  var p={quickKey:String(r.quickKey),tacsId:text(r.tacsId),nome:text(r.nome),areaId:text(r.areaId),areaNome:text(r.areaNome)};
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify(p))}catch(e){}
}
function clearProfile(){try{localStorage.removeItem(PROFILE_KEY)}catch(e){}}

var cnsLabel=document.querySelector('label[for="tacsCns"]');
var remembered=document.createElement('div');
remembered.id='tacsQuickLoginBox';
remembered.className='status ok';
remembered.style.marginBottom='12px';
remembered.hidden=true;
var pinLabel=document.querySelector('label[for="tacsPin"]');
if(pinLabel&&pinLabel.parentNode===tacsLogin)tacsLogin.insertBefore(remembered,pinLabel);
else tacsLogin.insertBefore(remembered,tacsLogin.firstChild);

function renderLogin(){
  var p=getProfile();
  if(p){
    if(cnsLabel)cnsLabel.hidden=true;
    cnsInput.hidden=true;
    remembered.hidden=false;
    remembered.innerHTML='<strong>Acesso rápido neste aparelho</strong><br>'+
      (p.nome?'<span>'+escapeHtml(p.nome)+'</span><br>':'')+
      (p.areaNome||p.areaId?'<span>'+escapeHtml(p.areaNome||p.areaId)+'</span><br>':'')+
      '<button id="tacsQuickForget" type="button" style="margin-top:10px;border:0;border-radius:12px;padding:9px 12px;background:#607985;color:#fff;font-weight:850">Usar outro TACS neste aparelho</button>';
    var forget=document.getElementById('tacsQuickForget');
    if(forget)forget.addEventListener('click',function(){
      clearProfile();
      cnsInput.value='';
      renderLogin();
      setStatus('Identifique este aparelho com o CNS profissional e o PIN. Depois, os próximos acessos serão somente com o PIN.','');
    });
  }else{
    if(cnsLabel)cnsLabel.hidden=false;
    cnsInput.hidden=false;
    remembered.hidden=true;
    remembered.innerHTML='';
  }
}
function escapeHtml(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function requestId(action){return 'quick_'+action+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,10)}
function jsonp(action,params,cb){
  var name='__quick_'+Date.now()+'_'+Math.floor(Math.random()*99999),s=document.createElement('script'),done=false;
  var timer=setTimeout(function(){finish({ok:false,message:'Consulta indisponível no momento.'})},15000);
  function finish(r){if(done)return;done=true;clearTimeout(timer);try{delete window[name]}catch(e){window[name]=undefined}if(s.parentNode)s.remove();cb(r)}
  window[name]=finish;s.onerror=function(){finish({ok:false,message:'Falha de rede.'})};
  var q=['action='+encodeURIComponent(action),'callback='+encodeURIComponent(name),'_='+Date.now()];
  Object.keys(params||{}).forEach(function(k){q.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]))});
  s.src=API+'?'+q.join('&');document.head.appendChild(s);
}
function post(action,payload,cb){
  if(busy){cb({ok:false,message:'Aguarde a operação anterior.'});return}
  busy=true;
  var rid=requestId(action),frame=document.createElement('iframe'),form=document.createElement('form');
  var frameName='quickFrame'+Date.now()+Math.floor(Math.random()*1000),finished=false,pollTimer=null;
  frame.name=frameName;frame.src='about:blank';frame.style.cssText='position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;border:0;opacity:.01';
  form.method='POST';form.action=API+'?_='+Date.now();form.target=frameName;form.style.display='none';
  var fields={};Object.keys(payload||{}).forEach(function(k){fields[k]=payload[k]});fields.action=action;fields.requestId=rid;
  Object.keys(fields).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=String(fields[k]==null?'':fields[k]);form.appendChild(i)});
  function cleanup(){window.removeEventListener('message',onMessage);clearTimeout(timeout);clearTimeout(pollTimer);if(form.parentNode)form.remove();if(frame.parentNode)setTimeout(function(){if(frame.parentNode)frame.remove()},120)}
  function finish(r){if(finished)return;finished=true;busy=false;cleanup();cb(r||{ok:false,message:'Resposta vazia.'})}
  function onMessage(event){
    if(event.source!==frame.contentWindow)return;
    var d=event.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(e){return}}
    if(!d||typeof d!=='object')return;
    var responseId=text(d.requestId||(d.result&&d.result.requestId));if(responseId&&responseId!==rid)return;
    var r=Object.prototype.hasOwnProperty.call(d,'result')?d.result:(Object.prototype.hasOwnProperty.call(d,'payload')?d.payload:(Object.prototype.hasOwnProperty.call(d,'ok')?d:null));
    if(r)finish(r);
  }
  function poll(){
    if(finished)return;
    jsonp('admin_territorio_result',{requestId:rid},function(r){
      if(finished)return;
      if(r&&r.ok===true&&r.pendente===false){finish(r.result);return}
      pollTimer=setTimeout(poll,900);
    });
  }
  window.addEventListener('message',onMessage);
  var timeout=setTimeout(function(){finish({ok:false,message:'O servidor demorou para confirmar o acesso.'})},45000);
  document.body.appendChild(frame);document.body.appendChild(form);
  var sent=false;function send(){if(sent||finished)return;sent=true;try{form.submit()}catch(e){finish({ok:false,message:'Não foi possível iniciar a comunicação.'});return}pollTimer=setTimeout(poll,650)}
  frame.addEventListener('load',send,{once:true});setTimeout(send,120);
}

loginBtn.addEventListener('click',function(event){
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  if(busy){setStatus('Aguarde a validação em andamento.','warn');return}
  var pin=digits(pinInput.value),device=getDevice(),profile=getProfile();
  if(!/^\d{4,8}$/.test(pin)){setStatus('Informe o PIN individual de 4 a 8 números.','err');return}
  if(!device){setStatus('Este aparelho ainda não foi identificado. Atualize a página e tente novamente.','err');return}
  var action,payload;
  if(profile){
    action='admin_territorio_login_pin';
    payload={quickKey:profile.quickKey,pin:pin,dispositivo:device};
    setStatus('Validando seu PIN…','warn');
  }else{
    var cns=digits(cnsInput.value);
    if(!/^\d{15}$/.test(cns)){setStatus('No primeiro acesso deste aparelho, informe os 15 números do CNS profissional.','err');return}
    action='admin_territorio_login_tacs';
    payload={cns:cns,pin:pin,dispositivo:device};
    setStatus('Identificando este aparelho e validando o acesso…','warn');
  }
  post(action,payload,function(r){
    pinInput.value='';
    if(!r||r.ok!==true||!r.token){setStatus(text(r&&r.message)||'Acesso recusado.','err');return}
    if(r.quickKey)saveProfile(r);
    try{sessionStorage.removeItem(ADMIN_TOKEN_KEY);sessionStorage.setItem(TERRITORY_TOKEN_KEY,r.token)}catch(e){}
    setStatus('Acesso validado. Abrindo sua área…','ok');
    setTimeout(function(){location.reload()},80);
  });
},true);

renderLogin();
var tabTacs=document.getElementById('tabTacs');
if(tabTacs)tabTacs.addEventListener('click',function(){setTimeout(function(){
  var p=getProfile();
  if(p)setStatus('Digite apenas o seu PIN para entrar na área '+(p.areaNome||p.areaId||'cadastrada')+'.','');
  else setStatus('No primeiro acesso deste aparelho, use CNS + PIN. Depois, somente o PIN será necessário.','');
},0)});
})();
