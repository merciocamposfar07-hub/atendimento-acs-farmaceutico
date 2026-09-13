(function(){
'use strict';
/* TAREFA_16_AGENDAS_NATIVAS_V1 — transporte compartilhado do módulo nativo.
   O iframe abaixo é somente ponte POST invisível; não hospeda nem renderiza o painel. */
var API='https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
function text(v){return String(v==null?'':v)}
function requestId(prefix){
  var bytes=new Uint8Array(24);
  if(window.crypto&&crypto.getRandomValues){
    crypto.getRandomValues(bytes);
    return prefix+'_'+Array.prototype.map.call(bytes,function(b){return('0'+b.toString(16)).slice(-2)}).join('');
  }
  return prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
}
function create(options){
  options=options||{};
  var requests=options.requests||null,active=null,counter=0,messageHandler=null;
  function ensureBridge(){
    var frame=document.getElementById('cscAgendaNativeBridgeV1');
    if(frame)return frame;
    frame=document.createElement('iframe');
    frame.id='cscAgendaNativeBridgeV1';
    frame.name='cscAgendaNativeBridgeV1';
    frame.src='about:blank';
    frame.hidden=true;
    frame.setAttribute('aria-hidden','true');
    document.body.appendChild(frame);
    return frame;
  }
  function jsonp(action,params,cb){
    counter++;
    var name='__csc_ag_native_'+Date.now()+'_'+counter,s=document.createElement('script'),done=false;
    var timer=setTimeout(function(){finish({ok:false,temporario:true,message:'Consulta temporariamente indisponível.'})},12000);
    function clean(){clearTimeout(timer);if(s.parentNode)s.remove();try{delete window[name]}catch(e){window[name]=undefined}}
    function finish(r){if(done)return;done=true;clean();cb(r)}
    window[name]=finish;
    var q=['action='+encodeURIComponent(action),'callback='+encodeURIComponent(name),'_='+Date.now()];
    Object.keys(params||{}).forEach(function(k){q.push(encodeURIComponent(k)+'='+encodeURIComponent(text(params[k])))});
    s.src=API+'?'+q.join('&');
    s.onerror=function(){finish({ok:false,temporario:true,message:'Falha de rede ao consultar o servidor.'})};
    document.head.appendChild(s);
  }
  function invalidatePublic(){
    try{
      localStorage.removeItem('portalTacsPublicDataV3');
      localStorage.removeItem('portalTacsPublicDataV2');
      localStorage.setItem('portalTacsPublicInvalidateAtV1',String(Date.now()));
    }catch(e){}
  }
  function finishActive(result){
    if(!active)return;
    var action=active.action,cb=active.cb;
    clearTimeout(active.timeout);clearTimeout(active.pollTimer);
    active=null;
    if(result&&result.ok===true&&/^admin_(salvar|remover|restaurar|criar)_/.test(action))invalidatePublic();
    cb(result||{ok:false,message:'Resposta vazia do servidor.'});
  }
  function poll(){
    if(!active)return;
    jsonp('admin_result',{requestId:active.id},function(r){
      if(!active)return;
      if(r&&r.ok===true&&r.pendente===false){finishActive(r.result);return}
      if(Date.now()>=active.deadline){
        finishActive({ok:false,temporario:true,message:'A conexão demorou mais que o esperado. A sessão foi preservada.'});
        return;
      }
      active.wait=Math.min(2200,Number(active.wait||700)+200);
      active.pollTimer=setTimeout(poll,active.wait);
    });
  }
  messageHandler=function(event){
    var frame=document.getElementById('cscAgendaNativeBridgeV1');
    if(!active||!frame||event.source!==frame.contentWindow)return;
    var d=event.data;
    if(typeof d==='string'){try{d=JSON.parse(d)}catch(e){return}}
    if(!d||typeof d!=='object')return;
    var rid=text(d.requestId||(d.result&&d.result.requestId));
    if(rid&&rid!==active.id)return;
    var result=Object.prototype.hasOwnProperty.call(d,'result')?d.result:
      (Object.prototype.hasOwnProperty.call(d,'payload')?d.payload:
      (Object.prototype.hasOwnProperty.call(d,'ok')?d:null));
    if(result)finishActive(result);
  };
  window.addEventListener('message',messageHandler);
  function post(action,payload,cb){
    if(requests&&typeof requests.noteAction==='function')requests.noteAction(action);
    if(active){cb({ok:false,temporario:true,message:'Aguarde a operação anterior terminar.'});return}
    var id=requestId(action),fields={};
    Object.keys(payload||{}).forEach(function(k){fields[k]=payload[k]});
    fields.action=action;fields.requestId=id;
    var duration=action==='admin_dados'?30000:60000;
    active={
      id:id,action:action,cb:cb,deadline:Date.now()+duration,wait:450,pollTimer:null,
      timeout:setTimeout(function(){finishActive({ok:false,temporario:true,message:'O servidor ainda não confirmou a operação. A sessão foi preservada.'})},duration+500)
    };
    var frame=ensureBridge(),form=document.createElement('form');
    form.method='POST';form.action=API+'?_='+Date.now();form.target=frame.name;form.hidden=true;
    Object.keys(fields).forEach(function(k){
      var input=document.createElement('input');input.type='hidden';input.name=k;input.value=text(fields[k]);form.appendChild(input);
    });
    document.body.appendChild(form);
    try{form.submit()}catch(e){form.remove();finishActive({ok:false,temporario:true,message:'O navegador não conseguiu iniciar a comunicação com o servidor.'});return}
    setTimeout(function(){if(form.parentNode)form.remove()},4000);
    active.pollTimer=setTimeout(poll,450);
  }
  function read(action,payload,cb){
    if(requests&&typeof requests.read==='function'){
      requests.read(action,payload,function(done){post(action,payload,done)},function(result,meta){cb(result,meta)})
        .catch(function(e){cb({ok:false,temporario:true,message:text(e&&e.message)||'Falha na leitura compartilhada.'},{shared:false,source:'broker-error'})});
      return;
    }
    post(action,payload,function(result){cb(result,{shared:false,source:'direct'})});
  }
  function publicAgenda(areaId,cb){jsonp('agenda',{areaId:areaId},cb)}
  function destroy(){
    if(active){clearTimeout(active.timeout);clearTimeout(active.pollTimer);active=null}
    if(messageHandler)window.removeEventListener('message',messageHandler);
    var frame=document.getElementById('cscAgendaNativeBridgeV1');if(frame)frame.remove();
  }
  return{post:post,read:read,publicAgenda:publicAgenda,invalidatePublic:invalidatePublic,destroy:destroy,isBusy:function(){return Boolean(active)}};
}
window.ConectaAgendasTransportV1={create:create,marker:'TAREFA_16_AGENDAS_NATIVAS_V1'};
}());
