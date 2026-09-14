(function(){
'use strict';
if(window.ConectaSupervisorIA)return;

var VERSION='lab-local-2026-09-14-r1';
// BLOCO LOCAL: limite remoto zero nesta etapa, inclusive com endpoint antigo salvo.
var REMOTE_ENABLED=false;
var MEMORY_KEY='conectaSupervisorIA:memoria:v1';
var volatileQueue=[],storageAvailable=true;
var QUEUE_KEY='conectaSupervisorIA:incidentes:v1';
var SESSION_KEY='conectaSupervisorIA:sessao:v1';
var NOTES_KEY='conectaSupervisorIA:notas:v1';
var API_KEY='conectaSupervisorIA:endpoint:v1';
var busy=false;
var lastIncidentAt=0;
var MAX_QUEUE=40;
var APP_BOOT_AT=(performance&&performance.timeOrigin)||Date.now();
var SUPERVISOR_SYNC_BUDGET_MS=4,supervisorCostWindowStart=now(),supervisorCostMs=0,lightMode=false;
var lastDomMutationAt=now(),inflightNetwork=0,lastNetworkChangeAt=0,incidentSignatures={},loadingCandidates=[];

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
  if(!REMOTE_ENABLED)return '';
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
function queueRead(){
  if(!storageAvailable)return volatileQueue;
  try{var q=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');if(Array.isArray(q))volatileQueue=q.filter(function(x){return x&&typeof x==='object'})}catch(e){storageAvailable=false}
  return volatileQueue;
}
function queueWrite(q){
  volatileQueue=q.slice(-MAX_QUEUE);
  try{localStorage.setItem(QUEUE_KEY,JSON.stringify(volatileQueue));storageAvailable=true}catch(e){storageAvailable=false}
}
function memoryRead(){try{var m=JSON.parse(localStorage.getItem(MEMORY_KEY)||'[]');return Array.isArray(m)?m:[]}catch(e){return []}}
function signature(item){
  // Valores variáveis de tempo não criam incidentes novos. Tipos/arquivos distintos permanecem distintos.
  return JSON.stringify([item.urlPath,item.modulo,item.tipo,item.arquivo,item.funcao,item.linha,
    item.mensagem.replace(/\b\d+(?:\.\d+)?\s*ms\b/gi,'<duracao>')]);
}
function recordLocal(item,data){
  var q=queueRead(),key=signature(item);
  var found=q.find(function(x){return x.estado!=='RESOLVIDO_VALIDADO'&&x.assinatura===key});
  // Agrupamento entre sintomas exige ID explícito da mesma operação, nunca apenas proximidade temporal.
  if(!found&&data.operacaoId)found=q.find(function(x){return x.estado!=='RESOLVIDO_VALIDADO'&&x.operacaoId===text(data.operacaoId)&&x.modulo===item.modulo&&x.urlPath===item.urlPath});
  if(found){
    found.ocorrencias=(Number(found.ocorrencias)||1)+1;
    found.ultimaOcorrenciaEm=item.criadoEm;
    found.sintomas=Array.from(new Set((found.sintomas||[found.tipo]).concat(item.tipo))).slice(-12);
    found.evidencias=(found.evidencias||[]).concat({tipo:item.tipo,mensagem:item.mensagem,duracaoMs:item.duracaoMs,em:item.criadoEm}).slice(-8);
    queueWrite(q);return {item:found,repetido:true};
  }
  item.assinatura=key;item.operacaoId=text(data.operacaoId).slice(0,180);
  item.ocorrencias=1;item.sintomas=[item.tipo];item.causaConfirmada=false;
  item.estado=item.online?'REGISTRADO_LOCAL_SEM_IA':'PENDENTE_REDE';
  item.ultimaOcorrenciaEm=item.criadoEm;
  var known=memoryRead().find(function(x){return x.assinatura===key});
  if(known)item.memoriaRelacionada={incidenteId:known.incidenteId,estado:'RECORRENCIA_A_INVESTIGAR'};
  q.push(item);queueWrite(q);return {item:item,repetido:false};
}
function registerValidation(id,evidence){
  evidence=evidence||{};
  var q=queueRead(),item=q.find(function(x){return x.id===id});
  if(!item)return {ok:false,motivo:'INCIDENTE_NAO_ENCONTRADO'};
  if(evidence.aprovado!==true||!text(evidence.teste)||!text(evidence.causa)||!text(evidence.correcao)||!text(evidence.versao)||! /^[a-f0-9]{40}$/i.test(text(evidence.commit)))return {ok:false,motivo:'EVIDENCIA_INCOMPLETA'};
  // Evidência declarada pelo teste/operador; este registro não executa nem certifica o teste.
  var record={incidenteId:id,assinatura:item.assinatura,causa:redact(evidence.causa),correcao:redact(evidence.correcao),teste:redact(evidence.teste),versao:text(evidence.versao).slice(0,100),commit:evidence.commit,em:new Date().toISOString(),origem:'VALIDACAO_INFORMADA'};
  var m=memoryRead().filter(function(x){return x.assinatura!==item.assinatura});m.push(record);
  try{localStorage.setItem(MEMORY_KEY,JSON.stringify(m.slice(-40)))}catch(e){return {ok:false,motivo:'MEMORIA_NAO_PERSISTIDA'}}
  item.estado='RESOLVIDO_VALIDADO';item.causaConfirmada=true;item.validacao=record;queueWrite(q);
  return {ok:true};
}
function localStatus(){return {modo:'LOCAL_SEM_IA',chamadasRemotasPermitidas:false,limiteGastoUSD:0,armazenamentoPersistente:storageAvailable,incidentes:queueRead().length,pendentes:queueRead().filter(function(x){return x.estado!=='RESOLVIDO_VALIDADO'}).length}}
function showLocalPanel(){
  var q=queueRead(),status=localStatus();
  panelShow('Monitoramento local ativo • IA remota desativada.',status.pendentes+' incidentes pendentes • '+q.reduce(function(n,x){return n+(Number(x.ocorrencias)||1)},0)+' ocorrências registradas.'+(storageAvailable?'':' Armazenamento indisponível: registros apenas nesta página.'),true);
  var box=ensurePanel(),list=box.querySelector('[data-sup-incidents]');
  if(!list){list=document.createElement('div');list.setAttribute('data-sup-incidents','');box.appendChild(list)}
  list.textContent=q.slice(-5).reverse().map(function(x){return x.tipo+' • '+x.ocorrencias+' ocorrência(s) • '+x.estado}).join(' | ');
}

function notesRead(){try{return JSON.parse(localStorage.getItem(NOTES_KEY)||'[]')}catch(e){return []}}
function notesWrite(v){try{localStorage.setItem(NOTES_KEY,JSON.stringify((v||[]).slice(-30)))}catch(e){}}
function addNote(note){
  var notes=notesRead(),id=text(note&&note.id)||('NOTA-'+now()+'-'+Math.random().toString(36).slice(2,7).toUpperCase());
  var normalized={
    id:id,criadaEm:new Date().toISOString(),incidenteId:text(note&&note.incidenteId),
    titulo:text(note&&note.titulo||'Melhoria técnica sugerida').slice(0,180),
    resumo:redact(note&&note.resumo||''),
    beneficioEsperado:redact(note&&note.beneficioEsperado||''),
    codigo:text(note&&note.codigo||'').slice(0,260),
    fontes:Array.isArray(note&&note.fontes)?note.fontes.slice(0,8):[],
    estado:text(note&&note.estado||'SUGERIDA_NAO_APLICADA')
  };
  notes.push(normalized);notesWrite(notes);renderNotes();return normalized;
}
function sessionRead(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{"eventos":[]}')}catch(e){return {eventos:[]}}}
function sessionEvent(tipo,detalhe){
  supervisorWork(function(){
    var s=sessionRead();if(!Array.isArray(s.eventos))s.eventos=[];
    s.eventos.push({t:new Date().toISOString(),tipo:text(tipo).slice(0,60),detalhe:redact(detalhe||{}),path:location.pathname});
    s.eventos=s.eventos.slice(-80);
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(s))}catch(e){}
  });
}

function emit(name,detail){try{window.dispatchEvent(new CustomEvent(name,{detail:detail}))}catch(e){}}
function supervisorWork(fn){
  var start=(performance&&performance.now)?performance.now():Date.now(),out;
  try{out=fn()}finally{
    var end=(performance&&performance.now)?performance.now():Date.now(),cost=Math.max(0,end-start);
    supervisorCostMs+=cost;
    if(now()-supervisorCostWindowStart>=5000){
      lightMode=supervisorCostMs>20;
      supervisorCostMs=0;supervisorCostWindowStart=now();
    }
  }
  return out;
}
function scheduleRemoteFlush(delay){
  if(!REMOTE_ENABLED)return;
  var run=function(){flush()};
  if(typeof window.requestIdleCallback==='function'){
    window.requestIdleCallback(run,{timeout:Math.max(250,Number(delay||500))});
  }else setTimeout(run,Math.max(30,Number(delay||120)));
}
function loadingLike(n){
  if(!n||n.nodeType!==1)return false;
  try{return n.matches('[aria-busy="true"],.loading,.loader,.spinner,[class*="loading"],[class*="spinner"]')}catch(e){return false}
}
function rememberLoadingCandidate(n){
  if(!loadingLike(n))return;
  if(loadingCandidates.indexOf(n)===-1){
    loadingCandidates.push(n);
    if(loadingCandidates.length>40)loadingCandidates.shift();
  }
}
function ensurePanel(){
  var box=document.getElementById('conectaSupervisorIaPanel');
  if(box)return box;
  box=document.createElement('aside');box.id='conectaSupervisorIaPanel';
  box.setAttribute('aria-live','polite');
  box.style.cssText='position:fixed;right:10px;bottom:10px;z-index:2147483646;width:min(92vw,390px);max-height:48vh;overflow:auto;background:#062c46;color:#fff;border:1px solid #69c7e7;border-radius:14px;box-shadow:0 12px 38px rgba(0,0,0,.28);padding:12px;font:12px/1.42 -apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;display:none';
  box.innerHTML='<button type="button" data-sup-close aria-label="Fechar Supervisor" style="float:right;background:transparent;color:white;border:0;font:inherit">Fechar</button><div style="font-weight:900;font-size:13px;margin-bottom:6px">Supervisor IA — laboratório</div><div data-sup-status>Monitorando o Conecta.</div><div data-sup-tech style="margin-top:7px;color:#d8eef7"></div><button type="button" data-sup-notes-btn style="margin-top:9px;border:1px solid #69c7e7;background:#0b5878;color:#fff;border-radius:9px;padding:7px 9px;font:inherit;font-weight:800">Melhorias técnicas <span data-sup-notes-count>0</span></button><div data-sup-notes hidden style="margin-top:8px;border-top:1px solid rgba(255,255,255,.18);padding-top:7px"></div>';
  document.body.appendChild(box);
  box.querySelector('[data-sup-close]').onclick=function(){box.style.display='none'};
  var btn=box.querySelector('[data-sup-notes-btn]');
  if(btn)btn.onclick=function(){var n=box.querySelector('[data-sup-notes]');if(n)n.hidden=!n.hidden;renderNotes()};
  renderNotes();return box;
}
function renderNotes(){
  var box=document.getElementById('conectaSupervisorIaPanel');if(!box)return;
  var notes=notesRead(),count=box.querySelector('[data-sup-notes-count]'),area=box.querySelector('[data-sup-notes]');
  if(count)count.textContent=String(notes.length);
  if(!area)return;
  if(!notes.length){area.textContent='Nenhuma melhoria técnica registrada.';return}
  area.innerHTML=notes.slice(-8).reverse().map(function(n){
    var sources=(n.fontes||[]).map(function(s){return text(s&&s.url||s).slice(0,160)}).filter(Boolean);
    return '<div style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.12)"><strong>'+escHtml(n.titulo)+'</strong><div>'+escHtml(n.resumo)+'</div>'+(n.codigo?'<div style="color:#b9e3f3">Código: '+escHtml(n.codigo)+'</div>':'')+(n.beneficioEsperado?'<div style="color:#c8f0d7">Benefício: '+escHtml(n.beneficioEsperado)+'</div>':'')+(sources.length?'<div style="color:#cfdce4">Fontes: '+sources.map(escHtml).join(' • ')+'</div>':'')+'<div style="opacity:.8">Estado: '+escHtml(n.estado)+'</div></div>';
  }).join('');
}
function escHtml(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function panelShow(status,tech,keep){
  var box=ensurePanel();box.style.display='block';
  var a=box.querySelector('[data-sup-status]'),b=box.querySelector('[data-sup-tech]');
  if(a)a.textContent=text(status);if(b)b.textContent=text(tech);
  if(!keep)setTimeout(function(){if(box&&box.parentNode)box.style.display='none'},6500);
}
function incident(kind,data){
  data=data||{};
  var stack=text(data.stack||''),loc=currentFileFromStack(stack);
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
    fronteira:text(data.fronteira||''),
    urlPath:location.pathname,
    online:navigator.onLine!==false,
    supervisorVersion:VERSION,
    estado:'DIAGNOSTICO_EM_ANDAMENTO',
    contextoSessao:(sessionRead().eventos||[]).slice(-12)
  };
  var recorded=recordLocal(item,data);
  if(!recorded.repetido){showLocalPanel();emit('conecta-supervisor-incidente',recorded.item)}
  scheduleRemoteFlush(350);return recorded.item.id;
}
function supervisorRequest(url,payload){
  if(!REMOTE_ENABLED)return Promise.reject(new Error('IA remota desativada no piloto local.'));
  return new Promise(function(resolve,reject){
    var rid='sup_'+now()+'_'+Math.random().toString(36).slice(2,10);
    var frame=document.createElement('iframe'),form=document.createElement('form');
    var frameName='conectaSupervisorFrame'+now()+'_'+Math.floor(Math.random()*10000),done=false,pollTimer=null,deadline=now()+18000;
    function cleanup(){clearTimeout(pollTimer);window.removeEventListener('message',onMessage);if(form.parentNode)form.remove();setTimeout(function(){if(frame.parentNode)frame.remove()},100)}
    function finish(err,result){if(done)return;done=true;cleanup();err?reject(err):resolve(result)}
    function onMessage(e){
      if(e.source!==frame.contentWindow)return;
      var d=e.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(ignore){return}}
      if(!d||d.source!=='conecta-supervisor-ia-lab'||text(d.requestId)!==rid)return;
      finish(null,d.result||{ok:false,message:'Resposta vazia do Supervisor.'});
    }
    function jsonpPoll(){
      if(done)return;
      var cb='__conectaSupervisor'+now()+Math.floor(Math.random()*10000),s=document.createElement('script'),settled=false;
      function clear(){try{delete window[cb]}catch(e){window[cb]=undefined}if(s.parentNode)s.remove()}
      window[cb]=function(r){
        if(settled)return;settled=true;clear();
        if(r&&r.ok===true&&r.pendente===false){finish(null,r.result);return}
        if(now()>=deadline){finish(new Error('Supervisor IA não respondeu dentro do limite operacional.'));return}
        pollTimer=setTimeout(jsonpPoll,1200);
      };
      s.onerror=function(){if(settled)return;settled=true;clear();if(now()>=deadline)finish(new Error('Falha de comunicação com o Supervisor IA.'));else pollTimer=setTimeout(jsonpPoll,1400)};
      s.src=url+'?action=supervisor_ia_result&requestId='+encodeURIComponent(rid)+'&callback='+encodeURIComponent(cb)+'&_='+now();
      document.head.appendChild(s);
    }
    frame.name=frameName;frame.hidden=true;frame.setAttribute('aria-hidden','true');
    form.method='POST';form.action=url+'?_='+now();form.target=frameName;form.hidden=true;
    var requestedAction=text(payload&&payload.__action)||'supervisor_ia_diagnosticar',cleanPayload=Object.assign({},payload);delete cleanPayload.__action;var fields=Object.assign({},cleanPayload,{action:requestedAction,requestId:rid});
    Object.keys(fields).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=typeof fields[k]==='string'?fields[k]:JSON.stringify(fields[k]);form.appendChild(i)});
    window.addEventListener('message',onMessage);
    document.body.append(frame,form);
    try{form.submit()}catch(e){finish(e);return}
    pollTimer=setTimeout(jsonpPoll,1500);
  });
}
function localRecover(item){
  try{
    if(item.tipo==='UNHANDLED_REJECTION'||item.tipo==='JS_ERROR'){
      emit('conecta-supervisor-recuperacao-local',{incidente:item.id,acao:'ISOLAR_ERRO_RUNTIME'});
      return {ok:false,solicitada:true,acao:'ISOLAR_ERRO_RUNTIME',motivo:'SEM_CONFIRMACAO_DE_EXECUCAO'};
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
function scheduleResearch(item,decision){
  if(!decision||decision.pesquisa_online_recomendada!==true||!text(decision.tema_pesquisa))return;
  var task=function(){
    if(navigator.onLine===false)return;
    var url=endpoint();if(!url)return;
    supervisorRequest(url,{
      __action:'supervisor_ia_pesquisar_melhoria',
      incidente:JSON.stringify(item),
      decisao:JSON.stringify(decision)
    }).then(function(r){
      if(!r||r.ok!==true||!r.pesquisa)return;
      var p=r.pesquisa;
      addNote({
        incidenteId:item.id,
        titulo:p.titulo||decision.tema_pesquisa,
        resumo:p.recomendacao||p.resumo||'',
        beneficioEsperado:p.beneficioEsperado||decision.beneficio_esperado||'',
        codigo:[decision.arquivo,decision.funcao,decision.linha?('linha '+decision.linha):''].filter(Boolean).join(' • '),
        fontes:p.fontes||[],
        estado:'SUGERIDA_NAO_APLICADA'
      });
      panelShow('Pesquisa técnica concluída em paralelo.','Uma melhoria fundamentada foi registrada no Bloco de Notas.',false);
    }).catch(function(){});
  };
  if(typeof requestIdleCallback==='function')requestIdleCallback(task,{timeout:4000});else setTimeout(task,1600);
}
function flush(){
  if(!REMOTE_ENABLED||busy||navigator.onLine===false)return;
  var url=endpoint();if(!url)return;
  var q=queueRead(),item=q.find(function(x){return !x.enviadoEm});
  if(!item)return;
  busy=true;
  var local=localRecover(item);
  supervisorRequest(url,{incidente:JSON.stringify(item),recuperacaoLocal:JSON.stringify(local)})
    .then(function(r){
      if(!r||r.ok!==true)throw new Error(text(r&&r.message)||'Supervisor remoto recusou o incidente.');
      return applyRuntimeAction(item,r.decisao||{}).then(function(ar){return {r:r,ar:ar}});
    })
    .then(function(x){
      var validation=validate(item,x.r.decisao||{},x.ar);
      var all=queueRead(),found=all.find(function(z){return z.id===item.id});
      if(found){found.enviadoEm=new Date().toISOString();found.decisao=x.r.decisao||{};found.validacao=validation}
      queueWrite(all);scheduleResearch(item,x.r.decisao||{});var d=x.r.decisao||{},origem=text(d.origem_gargalo||'INDETERMINADO').replace(/_/g,' '),codigo=(d.arquivo?d.arquivo:'módulo '+item.modulo)+(d.funcao?' • '+d.funcao:'')+(d.linha?' • linha '+d.linha:'');panelShow('Diagnóstico: '+origem+'. '+(d.evidencia_origem||'Evidência ainda em consolidação.'),codigo+(d.acao?' • ação '+d.acao:''),true);emit('conecta-supervisor-diagnostico',{incidente:item.id,resposta:x.r});
    })
    .catch(function(e){
      var all=queueRead(),found=all.find(function(z){return z.id===item.id});
      if(found){found.ultimaFalhaSupervisor=redact(e&&e.message||e);found.estado=navigator.onLine===false?'PENDENTE_REDE':'DIAGNOSTICO_EM_ANDAMENTO'} panelShow(navigator.onLine===false?'Sem internet. Reparo ficará pendente e retomará automaticamente.':'Supervisor ainda está isolando a causa.','Incidente '+item.id+' permanece aberto.',true)
      queueWrite(all);
    })
    .finally(function(){busy=false;scheduleRemoteFlush(lightMode?1800:700)});
}
function safeUrl(value){
  try{var u=new URL(String(value||''),location.href);return u.origin+u.pathname}catch(e){return text(value).split('?')[0].slice(0,300)}
}
function shouldIncident(signature,windowMs){
  var t=now(),last=Number(incidentSignatures[signature]||0);
  if(t-last<Number(windowMs||8000))return false;
  incidentSignatures[signature]=t;return true;
}
function startupPreflight(){
  var bootElapsed=Math.max(0,Math.round(((performance&&performance.now&&performance.now())||0)));
  emit('conecta-supervisor-ativo',{version:VERSION,aberturaMs:bootElapsed,path:location.pathname});
  try{
    var nav=performance&&performance.getEntriesByType?performance.getEntriesByType('navigation')[0]:null;
    if(nav){
      var dom=Math.round(nav.domInteractive||0),load=Math.round(nav.loadEventEnd||0);
      if(dom>=2500&&shouldIncident('startup-dom:'+location.pathname,30000)){
        incident('ABERTURA_LENTA',{mensagem:'DOM interativo em '+dom+' ms.',duracaoMs:dom,etapa:'abertura',funcao:'startupPreflight'});
      }
      if(load>=5000&&shouldIncident('startup-load:'+location.pathname,30000)){
        incident('CARREGAMENTO_INICIAL_LENTO',{mensagem:'Carregamento inicial concluído em '+load+' ms.',duracaoMs:load,etapa:'abertura',funcao:'startupPreflight'});
      }
    }
  }catch(e){}
  if(navigator.onLine===false&&shouldIncident('startup-offline:'+location.pathname,30000)){
    incident('REDE_OFFLINE',{mensagem:'Aplicativo aberto sem conexão disponível.',etapa:'abertura'});
  }
  panelShow('Monitoramento local ativo • IA remota desativada.','Abertura acompanhada • '+location.pathname+' • Sem chamadas de API.',false);
}
function monitorStartupUntilStable(){
  var checks=0,timer=setInterval(function(){
    checks++;
    var visible=document.visibilityState!=='hidden';
    var age=Math.round(((performance&&performance.now&&performance.now())||0));
    if(visible&&age>=8000){
      var persistent=document.querySelector('[aria-busy="true"],.loading,.loader,.spinner,[class*="loading"],[class*="spinner"]');
      if(persistent&&shouldIncident('startup-persistent-loading:'+location.pathname,30000)){
        incident('ABERTURA_NAO_ESTABILIZADA',{mensagem:'A interface ainda apresenta carregamento persistente após '+age+' ms.',duracaoMs:age,etapa:'abertura',funcao:'monitorStartupUntilStable'});
      }
      clearInterval(timer);return;
    }
    if(checks>=12)clearInterval(timer);
  },1000);
}
function installNavigationObserver(){
  var last=location.href;
  function record(kind){
    if(location.href===last&&kind!=='load')return;
    var previous=last;last=location.href;
    sessionEvent('NAVEGACAO',{tipo:kind,de:safeUrl(previous),para:safeUrl(location.href)});
    emit('conecta-supervisor-navegacao',{tipo:kind,de:safeUrl(previous),para:safeUrl(location.href)});
  }
  try{
    var push=history.pushState,replace=history.replaceState;
    history.pushState=function(){var r=push.apply(this,arguments);record('pushState');return r};
    history.replaceState=function(){var r=replace.apply(this,arguments);record('replaceState');return r};
  }catch(e){}
  window.addEventListener('popstate',function(){record('popstate')},{passive:true});
  window.addEventListener('hashchange',function(){record('hashchange')},{passive:true});
  document.addEventListener('visibilitychange',function(){sessionEvent('VISIBILIDADE',{estado:document.visibilityState})},{passive:true});
  record('load');
}
function installNetworkObserver(){
  if(typeof window.fetch==='function'&&!window.fetch.__conectaSupervisorWrapped){
    var nativeFetch=window.fetch;
    var wrapped=function(){
      var args=arguments,start=now(),url=safeUrl(args[0]&&args[0].url||args[0]);
      inflightNetwork++;lastNetworkChangeAt=now();
      return nativeFetch.apply(this,args).then(function(r){
        var elapsed=now()-start;inflightNetwork=Math.max(0,inflightNetwork-1);lastNetworkChangeAt=now();
        if(elapsed>=8000&&shouldIncident('fetch-slow:'+url,15000)){
          incident('REQUISICAO_LENTA',{mensagem:'Tempo total entre envio pelo Conecta e resposta: '+elapsed+' ms. Este valor sozinho não separa internet de processamento remoto.',duracaoMs:elapsed,etapa:'rede',funcao:'fetch',arquivo:'',modulo:location.pathname+' → '+url,fronteira:'CLIENTE_ATE_RESPOSTA_REMOTA'});
        }
        if(!r.ok&&shouldIncident('fetch-http:'+url+':'+r.status,12000)){
          incident('RESPOSTA_HTTP_INESPERADA',{mensagem:'Resposta HTTP '+r.status+' em '+url+'.',duracaoMs:elapsed,etapa:'rede',funcao:'fetch'});
        }
        return r;
      },function(err){
        var elapsed=now()-start;inflightNetwork=Math.max(0,inflightNetwork-1);lastNetworkChangeAt=now();
        if(shouldIncident('fetch-fail:'+url,8000))incident('REQUISICAO_FALHOU',{mensagem:(err&&err.message)||'Falha de rede em '+url,stack:err&&err.stack,duracaoMs:elapsed,etapa:'rede',funcao:'fetch'});
        throw err;
      });
    };
    wrapped.__conectaSupervisorWrapped=true;window.fetch=wrapped;
  }
  if(window.XMLHttpRequest&&!XMLHttpRequest.prototype.__conectaSupervisorWrapped){
    var nativeOpen=XMLHttpRequest.prototype.open,nativeSend=XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open=function(method,url){
      this.__supUrl=safeUrl(url);this.__supMethod=text(method||'GET');
      return nativeOpen.apply(this,arguments);
    };
    XMLHttpRequest.prototype.send=function(){
      var xhr=this,start=now(),url=xhr.__supUrl||'xhr';
      inflightNetwork++;lastNetworkChangeAt=now();
      function done(){
        xhr.removeEventListener('loadend',done);
        var elapsed=now()-start;inflightNetwork=Math.max(0,inflightNetwork-1);lastNetworkChangeAt=now();
        if(elapsed>=8000&&shouldIncident('xhr-slow:'+url,15000))incident('REQUISICAO_LENTA',{mensagem:'Tempo total XHR entre envio pelo Conecta e resposta: '+elapsed+' ms. A telemetria do navegador não deve inventar separação entre rede e servidor.',duracaoMs:elapsed,etapa:'rede',funcao:'XMLHttpRequest',fronteira:'CLIENTE_ATE_RESPOSTA_REMOTA'});
        if(xhr.status>=400&&shouldIncident('xhr-http:'+url+':'+xhr.status,12000))incident('RESPOSTA_HTTP_INESPERADA',{mensagem:'XHR retornou HTTP '+xhr.status+' em '+url+'.',duracaoMs:elapsed,etapa:'rede',funcao:'XMLHttpRequest'});
      }
      xhr.addEventListener('loadend',done);
      try{return nativeSend.apply(this,arguments)}catch(err){done();if(shouldIncident('xhr-fail:'+url,8000))incident('REQUISICAO_FALHOU',{mensagem:(err&&err.message)||'Falha XHR.',stack:err&&err.stack,etapa:'rede',funcao:'XMLHttpRequest'});throw err}
    };
    XMLHttpRequest.prototype.__conectaSupervisorWrapped=true;
  }
}
function installInteractionObserver(){
  try{
    var queued=false;
    var mo=new MutationObserver(function(records){
      if(queued)return;queued=true;
      var task=function(){
        supervisorWork(function(){
          lastDomMutationAt=now();
          for(var i=0;i<records.length&&i<20;i++){
            var rec=records[i];
            if(rec.target)rememberLoadingCandidate(rec.target);
            if(rec.addedNodes){
              for(var j=0;j<rec.addedNodes.length&&j<8;j++)rememberLoadingCandidate(rec.addedNodes[j]);
            }
          }
        });
        queued=false;
      };
      if(typeof requestAnimationFrame==='function')requestAnimationFrame(task);else setTimeout(task,16);
    });
    mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','aria-busy','style']});
  }catch(e){}
  document.addEventListener('click',function(e){
    supervisorWork(function(){
      var target=e.target&&e.target.closest?e.target.closest('button,[role="button"]'):null;
      if(!target||target.disabled||target.closest('#conectaSupervisorIaPanel')||target.id==='conectaSupervisorLocalAbrir')return;
      var beforeMutation=lastDomMutationAt,beforeNetwork=lastNetworkChangeAt,beforeHref=location.href,label=text(target.textContent||target.getAttribute('aria-label')||target.id).slice(0,120);sessionEvent('COMANDO_USUARIO',{rotulo:label});
      setTimeout(function(){
        if(location.href!==beforeHref)return;
        if(lastDomMutationAt>beforeMutation||lastNetworkChangeAt>beforeNetwork||inflightNetwork>0)return;
        if(shouldIncident('click-no-response:'+location.pathname+':'+label,15000)){
          incident('ACAO_SEM_RESPOSTA_VISIVEL',{mensagem:'O comando "'+label+'" não produziu navegação, alteração de interface ou comunicação detectável.',etapa:'interacao',funcao:'click'});
        }
      },4500);
    });
  },{capture:true,passive:true});
}
function installLoadingObserver(){
  supervisorWork(function(){
    try{
      document.querySelectorAll('[aria-busy="true"],.loading,.loader,.spinner,[class*="loading"],[class*="spinner"]').forEach(rememberLoadingCandidate);
    }catch(e){}
  });
  setInterval(function(){
    if(document.visibilityState==='hidden')return;
    supervisorWork(function(){
      var next=[];
      for(var i=0;i<loadingCandidates.length&&i<(lightMode?12:30);i++){
        var n=loadingCandidates[i];
        if(!n||!n.isConnected||!loadingLike(n))continue;
        next.push(n);
        var cs;try{cs=getComputedStyle(n)}catch(e){continue}
        if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)continue;
        var msg=text(n.textContent||n.getAttribute('aria-label')||'carregamento');
        var since=Number(n.dataset&&n.dataset.conectaSupervisorLoadingSince||0);
        if(!since){try{n.dataset.conectaSupervisorLoadingSince=String(now())}catch(e){};continue}
        var elapsed=now()-since;
        if(elapsed>=10000&&shouldIncident('loading:'+location.pathname+':'+msg.slice(0,80),20000)){
          incident('CARREGAMENTO_PERSISTENTE',{mensagem:'Indicador de carregamento permaneceu visível por '+elapsed+' ms: '+msg.slice(0,180),duracaoMs:elapsed,etapa:'renderizacao'});
        }
      }
      loadingCandidates=next.slice(-40);
    });
  },lightMode?6000:4000);
}
installNavigationObserver();
installNetworkObserver();
installInteractionObserver();
installLoadingObserver();
startupPreflight();
var launcher=document.createElement('button');
launcher.type='button';launcher.id='conectaSupervisorLocalAbrir';launcher.textContent='Supervisor local';
launcher.style.cssText='position:fixed;right:10px;bottom:10px;z-index:2147483645;background:#062c46;color:#fff;border:1px solid #69c7e7;border-radius:9px;padding:7px;font:12px sans-serif';
launcher.onclick=showLocalPanel;document.body.appendChild(launcher);
monitorStartupUntilStable();

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
window.addEventListener('online',function(){var q=queueRead();q.forEach(function(x){if(x.estado==='PENDENTE_REDE')x.estado='REGISTRADO_LOCAL_SEM_IA'});queueWrite(q);showLocalPanel();emit('conecta-supervisor-rede-restaurada',{});scheduleRemoteFlush(250)});
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
  pendentes:function(){return queueRead().filter(function(x){return x.estado!=='RESOLVIDO_VALIDADO'})},
  estado:localStatus,
  abrirPainel:showLocalPanel,
  registrarValidacao:registerValidation,
  memoria:memoryRead,
  notas:function(){return notesRead()}
};
scheduleRemoteFlush(800);
}());
