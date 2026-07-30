(function(){
'use strict';
if(window.__TACS_POST_CONFIRM_FIX__)return;
window.__TACS_POST_CONFIRM_FIX__=true;

var MAIN_ID='AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ';
var originalSubmit=HTMLFormElement.prototype.submit;

function field(form,name){
  var el=form.querySelector('[name="'+name+'"]');
  return el?String(el.value||''):'';
}

function parse(text,fallback){
  try{return JSON.parse(String(text||''))}catch(e){return fallback}
}

function jsonp(api,action,ok,fail){
  var cb='tacsPostConfirm'+Date.now()+Math.floor(Math.random()*100000);
  var script=document.createElement('script');
  var done=false;
  var timer=setTimeout(function(){finish(new Error('Tempo esgotado.'))},10000);
  function finish(err,data){
    if(done)return;
    done=true;
    clearTimeout(timer);
    try{delete window[cb]}catch(e){}
    if(script.parentNode)script.remove();
    err?fail(err):ok(data);
  }
  window[cb]=function(data){finish(null,data)};
  script.onerror=function(){finish(new Error('Falha de conexão.'))};
  script.src=api+(api.indexOf('?')<0?'?':'&')+'action='+encodeURIComponent(action)+'&callback='+encodeURIComponent(cb)+'&v='+Date.now();
  document.head.appendChild(script);
}

function bool(v){return v===true||String(v).toLowerCase()==='true'}
function num(v){return Number(v||0)}
function text(v){return String(v==null?'':v)}

function sameDay(a,b,module){
  if(!a||!b)return false;
  if(text(a.day)!==text(b.day))return false;
  if(bool(a.active)!==bool(b.active))return false;
  if(text(a.date)!==text(b.date))return false;
  if(text(a.time)!==text(b.time))return false;
  if(bool(a.closeAtNoon)!==bool(b.closeAtNoon))return false;
  if(module==='odontologia'){
    if(num(a.common)!==num(b.common))return false;
    if(num(a.emergency)!==num(b.emergency))return false;
    if(bool(a.extra)!==bool(b.extra))return false;
  }else if(module==='enfermeira'){
    if(text(a.service||a.message)!==text(b.service||b.message))return false;
  }else{
    if(text(a.status)!==text(b.status))return false;
    if(text(a.message)!==text(b.message))return false;
  }
  return true;
}

function verify(api,action,payload,ok,fail){
  jsonp(api,action==='salvar_agenda_enfermeira'?'agenda_enfermeira':'painel_publico',function(data){
    if(!data||data.ok===false){fail();return}

    if(action==='salvar_modulo'){
      var module=text(payload.module);
      var expected=Array.isArray(payload.days)?payload.days:[];
      var current=data.modules&&Array.isArray(data.modules[module])?data.modules[module]:[];
      if(expected.length===5&&current.length===5&&expected.every(function(x,i){return sameDay(current[i],x,module)})){ok();return}
    }

    if(action==='salvar_recado'){
      var notices=Array.isArray(data.recados)?data.recados:[];
      if(notices.some(function(x){return text(x.id)===text(payload.id)})){ok();return}
    }

    if(action==='cancelar_recados'){
      if(!data.recados||data.recados.length===0){ok();return}
    }

    if(action==='salvar_campanha'){
      var campaigns=Array.isArray(data.campanhas)?data.campanhas:[];
      if(campaigns.some(function(x){return text(x.id)===text(payload.id)})){ok();return}
    }

    if(action==='cancelar_campanhas'){
      if(!data.campanhas||data.campanhas.length===0){ok();return}
    }

    if(action==='salvar_agenda_enfermeira'){
      var expectedDays=Array.isArray(payload.dias)?payload.dias:[];
      var currentDays=Array.isArray(data.dias)?data.dias:[];
      if(expectedDays.length===5&&currentDays.length===5&&expectedDays.every(function(x,i){
        var y=currentDays[i]||{};
        return text(x.day)===text(y.day)&&text(x.service)===text(y.service)&&text(x.icon)===text(y.icon)&&bool(x.available)===bool(y.available);
      })){ok();return}
    }

    fail();
  },fail);
}

function confirm(form){
  var api=String(form.action||'');
  if(api.indexOf(MAIN_ID)<0)return;

  var action=field(form,'action');
  var nonce=field(form,'nonce');
  var adminKey=field(form,'adminKey');
  var payload=parse(field(form,'payload'),{});
  var supported=['salvar_modulo','salvar_recado','cancelar_recados','salvar_campanha','cancelar_campanhas','salvar_agenda_enfermeira'];
  if(supported.indexOf(action)<0)return;

  if(!adminKey){
    setTimeout(function(){
      window.dispatchEvent(new MessageEvent('message',{data:{nonce:nonce,result:{ok:false,message:'A chave administrativa não está salva neste aparelho.'}}}));
    },100);
    return;
  }

  var attempts=0;
  function poll(){
    attempts+=1;
    verify(api,action,payload,function(){
      window.dispatchEvent(new MessageEvent('message',{data:{source:'painel-tacs-integral',nonce:nonce,result:{ok:true,message:'Publicação confirmada no servidor.'}}}));
    },function(){
      if(attempts<6)setTimeout(poll,attempts<3?900:1600);
    });
  }
  setTimeout(poll,700);
}

HTMLFormElement.prototype.submit=function(){
  var form=this;
  var result=originalSubmit.call(form);
  try{confirm(form)}catch(e){}
  return result;
};
})();
