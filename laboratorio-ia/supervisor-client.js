(function(){
'use strict';
if(window.ConectaSupervisorIA)return;

var VERSION='lab-2026-09-14';
var QUEUE_KEY='conectaSupervisorIA:incidentes:v1';
var API_KEY='conectaSupervisorIA:endpoint:v1';
var busy=false;
var lastIncidentAt=0;
var MAX_QUEUE=40;

function text(v){return String(v==null?'':v).trim()}
function now(){return Date.now()}
function redact(v){
  var s=typeof v==='string'?v:JSON.stringify(v==null?{}:v);
  s=s.replace(/\b\d{11}\b/g,'[CPF_REMOVIDO]');
  s=s.replace(/\b\d{15}\b/g,'[CNS_REMOVIDO]');
  s=s.replace(/\b\d{4}\b/g,'[PIN_OU_NUMERO_4D_REMOVIDO]');
  s=s.replace(/(bearer\s+)[A-Za-z0-9._~+\/-]+=*/ig,'$1[TOKEN_REMOVIDO]');
  s=s.replace(/("(?:token|accessToken|refreshToken|authorization|pin|cpf|cns)"\s*:\s*")[^"]+"/ig,'$1[REMOVIDO]"');
  return s.slice(0,12000);
}
function endpoint(){
  try{
    var p=new URLSearchParams(location.search||''),q=text(p.get('supervisorApi'));
    if(q&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(q)){
      sessionStorage.setItem(API_KEY,q);return q;
    }
    return text(sessionStorage.getItem(API_KEY));
  }catch(e){return ''}
}
function currentFileFromStack(stack){
  var s=text(stack),m=s.match(/https?:\/\/[^\s)]+\/([^\s/?#)]+\.js)(?:[?#][^\s)]*)?:(\d+):(\d+)/);
  return m?{arquivo:m[1],linha:Number(m[2]),coluna:Number(m[3])}:{arquivo:'',linha:0,coluna:0};
}
function queueRead(){try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]')}catch(e){return []}}
function queueWrite(q){try{localStorage.setItem(QUEUE_KEY,JSON.stringify(q.slice(-MAX_QUEUE)))}catch(e){}}
function emit(name,detail){try{window.dispatchEvent(new CustomEvent(name,{detail:detail}))}catch(e){}}
function incident(kind,data){
  data=data||{};
  var stack=text(data.stack||new Error().stack),loc=currentFileFromStack(stack);
  var item={
    id:'INC-'+now()+'-'+Math.random().toString(36).slice(2,8).toUpperCase(),
    criadoEm:new Date().toISOString(),
    tipo:text(kind||'ANOMALIA').slice(0,80),
    modulo:text(data.modulo||document.body&&document.body.dataset&&document.body.dataset.module||location.pathname).slice(0,180),
    arquivo:text(data.arquivo||loc.arquivo).slice(0,220),
    funcao:text(data.funcao||'').slice(0,160),
    linha:Number(data.linha||loc.linha||0),
    coluna:Number(data.coluna||loc.coluna||0),
    mensagem:redact(text(data.mensagem||data.message||'')),
    stack:redact(stack),
    etapa:text(data.etapa||'runtime').slice(0,120),
    duracaoMs:Number(data.duracaoMs||0),
    urlPath:location.pathname,
    online:navigator.onLine!==false,
    supervisorVersion:VERSION,
    estado:'DIAGNOSTICO_EM_ANDAMENTO'
  };
  var q=queueRead();q.push(item);queueWrite(q);emit('conecta-supervisor-incidente',item);flush();
  return item.id;
}
function postForm(url,payload){
  return new Promise(function(resolve,reject){
    var body=new URLSearchParams();
    Object.keys(payload).forEach(function(k){body.set(k,typeof payload[k]==='string'?payload[k]:JSON.stringify(payload[k]))});
    fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'})
      .then(function(r){return r.text()})
      .then(function(t){try{resolve(JSON.parse(t))}catch(e){reject(new Error('Resposta do Supervisor não é JSON.'))}})
      .catch(reject);
  });
}
function localRecover(item){
  try{
    if(item.tipo==='UNHANDLED_REJECTION'||item.tipo==='JS_ERROR'){
      emit('conecta-supervisor-recuperacao-local',{incidente:item.id,acao:'ISOLAR_ERRO_RUNTIME'});
      return {ok:true,acao:'ISOLAR_ERRO_RUNTIME'};
    }
    if(item.tipo==='REDE_OFFLINE')return {ok:false,aguardarRede:true};
  }catch(e){}
  return {ok:false};
}
function applyRuntimeAction(item,decision){
  var a=text(decision&&decision.acao).toUpperCase();
  if(!a||a==='OBSERVAR')return Promise.resolve({ok:true,acao:'OBSERVAR'});
  if(a==='RECARREGAR_MODULO'){
    emit('conecta-supervisor-recarregar-modulo',{incidente:item.id,modulo:item.modulo});
    return Promise.resolve({ok:true,acao:a});
  }
  if(a==='INVALIDAR_CACHE_MODULO'){
    emit('conecta-supervisor-invalidar-cache',{incidente:item.id,modulo:item.modulo});
    return Promise.resolve({ok:true,acao:a});
  }
  if(a==='USAR_ULTIMO_ESTADO_VALIDO'){
    emit('conecta-supervisor-usar-snapshot',{incidente:item.id,modulo:item.modulo});
    return Promise.resolve({ok:true,acao:a});
  }
  if(a==='REVALIDAR_SESSAO'){
    emit('conecta-supervisor-revalidar-sessao',{incidente:item.id});
    return Promise.resolve({ok:true,acao:a});
  }
  return Promise.resolve({ok:false,acao:a,naoSuportada:true});
}
function validate(item,decision,actionResult){
  var result={
    incidente:item.id,
    decisao:decision,
    acao:actionResult,
    validado:false,
    estado:'REPARO_APLICADO_AGUARDANDO_VALIDACAO'
  };
  emit('conecta-supervisor-validar',result);
  return result;
}
function flush(){
  if(busy||navigator.onLine===false)return;
  var url=endpoint();if(!url)return;
  var q=queueRead(),item=q.find(function(x){return !x.enviadoEm});
  if(!item)return;
  busy=true;
  var local=localRecover(item);
  postForm(url,{action:'supervisor_ia_diagnosticar',incidente:JSON.stringify(item),recuperacaoLocal:JSON.stringify(local)})
    .then(function(r){
      if(!r||r.ok!==true)throw new Error(text(r&&r.message)||'Supervisor remoto recusou o incidente.');
      return applyRuntimeAction(item,r.decisao||{}).then(function(ar){return {r:r,ar:ar}});
    })
    .then(function(x){
      var validation=validate(item,x.r.decisao||{},x.ar);
      var all=queueRead(),found=all.find(function(z){return z.id===item.id});
      if(found){found.enviadoEm=new Date().toISOString();found.decisao=x.r.decisao||{};found.validacao=validation}
      queueWrite(all);emit('conecta-supervisor-diagnostico',{incidente:item.id,resposta:x.r});
    })
    .catch(function(e){
      var all=queueRead(),found=all.find(function(z){return z.id===item.id});
      if(found){found.ultimaFalhaSupervisor=redact(e&&e.message||e);found.estado=navigator.onLine===false?'PENDENTE_REDE':'DIAGNOSTICO_EM_ANDAMENTO'}
      queueWrite(all);
    })
    .finally(function(){busy=false;setTimeout(flush,1200)});
}
window.addEventListener('error',function(e){
  if(now()-lastIncidentAt<300)return;lastIncidentAt=now();
  incident('JS_ERROR',{mensagem:e.message,stack:e.error&&e.error.stack,arquivo:e.filename,linha:e.lineno,coluna:e.colno,etapa:'javascript'});
});
window.addEventListener('unhandledrejection',function(e){
  if(now()-lastIncidentAt<300)return;lastIncidentAt=now();
  var reason=e.reason||{};
  incident('UNHANDLED_REJECTION',{mensagem:reason.message||reason,stack:reason.stack,etapa:'promise'});
});
window.addEventListener('offline',function(){incident('REDE_OFFLINE',{mensagem:'Conexão com a internet indisponível.',etapa:'rede'})});
window.addEventListener('online',function(){emit('conecta-supervisor-rede-restaurada',{});flush()});
try{
  if(window.PerformanceObserver){
    var po=new PerformanceObserver(function(list){
      list.getEntries().forEach(function(e){if(e.duration>=2500)incident('BLOQUEIO_MAIN_THREAD',{mensagem:'Tarefa longa detectada na interface.',duracaoMs:e.duration,etapa:'renderizacao'})});
    });
    try{po.observe({entryTypes:['longtask']})}catch(ignore){}
  }
}catch(e){}

window.ConectaSupervisorIA={
  version:VERSION,
  incidente:incident,
  flush:flush,
  endpoint:endpoint,
  pendentes:function(){return queueRead().filter(function(x){return !x.enviadoEm})}
};
setTimeout(flush,800);
}());
