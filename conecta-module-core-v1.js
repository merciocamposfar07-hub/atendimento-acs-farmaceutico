(function(){
'use strict';
if(window.ConectaModuleCoreV1)return;

var CONTEXT_KEY='portalConectaModuleCoreV1';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var AREA_KEY='portalTacsCentralAreaV1';
var AUTH_ISSUE_KEY='portalConectaModuleAuthIssueV1';
var CENTRAL_URL='/atendimento-acs-farmaceutico/central-administrativa-tacs.html';
var LEGACY_AUTH_IDS=[
  'pin','pinLabel','pinHelp','accessTitle','accessActions','entrar','sair',
  'login','loginTacs','loginAdmin','loginAdminTab','loginTacsTab',
  'adminLogin','tacsLogin','adminLoginButton','tacsLoginButton','logout','logoutButton'
];

function text(v){return String(v==null?'':v).trim()}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function readJson(key){
  try{var raw=sessionStorage.getItem(key)||'';return raw?JSON.parse(raw):null}catch(e){return null}
}
function isCentralPage(){return /(?:^|\/)central-administrativa-tacs\.html$/i.test(String(location.pathname||''))}
function isModulePage(){return !isCentralPage()}
function context(){
  var ctx=readJson(CONTEXT_KEY);
  return ctx&&ctx.schemaVersion===1?ctx:null;
}
function canonicalSession(){
  var admin='',territory='',device='';
  try{
    admin=text(sessionStorage.getItem(ADMIN_TOKEN_KEY)||'');
    territory=text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'');
    device=text(localStorage.getItem(DEVICE_KEY)||'');
  }catch(e){}
  return {adminToken:admin,territoryToken:territory,device:device};
}
function mode(){
  var ctx=context(),s=canonicalSession();
  if(s.territoryToken)return'tacs';
  if(s.adminToken)return'admin';
  return text(ctx&&ctx.mode).toLowerCase();
}
function areaId(){
  var ctx=context(),a=normArea(ctx&&ctx.area&&ctx.area.areaId);
  if(a)return a;
  try{a=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}
  if(a)return a;
  try{a=normArea(new URLSearchParams(location.search||'').get('area')||'')}catch(e){}
  return a||'JAPARANDUBA';
}
function session(extra){
  var s=canonicalSession(),out={dispositivo:s.device,areaId:areaId()};
  if(mode()==='tacs'&&s.territoryToken)out.territorioToken=s.territoryToken;
  else if(s.adminToken)out.token=s.adminToken;
  Object.keys(extra||{}).forEach(function(k){out[k]=extra[k]});
  return out;
}
function permissions(){
  var ctx=context(),p=ctx&&Array.isArray(ctx.permissions)?ctx.permissions.slice():[];
  return p;
}
function can(name){
  if(mode()==='admin')return true;
  var p=permissions();return p.indexOf('*')!==-1||p.indexOf(text(name))!==-1;
}
function identity(){
  var ctx=context(),id=ctx&&ctx.identity&&typeof ctx.identity==='object'?ctx.identity:{};
  return {
    nome:text(id.nome),
    perfil:text(id.perfil),
    funcao:text(id.funcao),
    unidadeId:text(id.unidadeId||ctx&&ctx.area&&ctx.area.unidadeId),
    areaId:areaId()
  };
}
function ready(){
  var s=canonicalSession();
  return Boolean(s.adminToken||s.territoryToken);
}
function state(){
  var ctx=context()||{};
  return {
    schemaVersion:1,
    source:'ConectaCore',
    mode:mode(),
    authenticated:ready(),
    area:ctx.area||{areaId:areaId()},
    identity:identity(),
    permissions:permissions(),
    cache:ctx.cache||{},
    savedAt:Number(ctx.savedAt||0)
  };
}
function reportAuthIssue(message){
  if(!isModulePage())return;
  try{sessionStorage.setItem(AUTH_ISSUE_KEY,JSON.stringify({message:text(message),areaId:areaId(),at:Date.now()}))}catch(e){}
}
function centralUrl(){
  var area=encodeURIComponent(areaId());
  return CENTRAL_URL+'?from=module&area='+area;
}
function legacyAuthTarget(target){
  if(!target)return false;
  var node=target.closest?target.closest('[id]'):target;
  return Boolean(node&&LEGACY_AUTH_IDS.indexOf(String(node.id||''))!==-1);
}
function ensureTask9Style(){
  if(!isModulePage()||document.getElementById('conectaTask9ModuleAuthStyle'))return;
  var style=document.createElement('style');style.id='conectaTask9ModuleAuthStyle';
  style.textContent='.csc-task9-auth-legacy{display:none!important}.csc-task9-gate{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:#071827;color:#f7fcff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}.csc-task9-gate-card{width:min(520px,100%);padding:22px;border:1px solid #2b5a76;border-radius:24px;background:#102d46;box-shadow:0 18px 48px rgba(0,0,0,.35)}.csc-task9-gate-card h2{margin:0 0 10px}.csc-task9-gate-card p{color:#adc4d2}.csc-task9-gate-card a{display:block;margin-top:16px;padding:14px 16px;border-radius:16px;background:#176c94;color:#fff;text-align:center;text-decoration:none;font-weight:850}';
  document.head.appendChild(style);
}
function hideLegacyAuthUi(){
  if(!isModulePage())return;
  ensureTask9Style();
  LEGACY_AUTH_IDS.forEach(function(id){var n=document.getElementById(id);if(n)n.classList.add('csc-task9-auth-legacy')});
  Array.prototype.forEach.call(document.querySelectorAll('.csc-auth-control,.csc-admin-only-auth'),function(n){n.classList.add('csc-task9-auth-legacy')});
}
function showCentralGate(){
  if(!isModulePage()||ready()||document.getElementById('conectaTask9AuthGate'))return;
  ensureTask9Style();
  var gate=document.createElement('div');gate.id='conectaTask9AuthGate';gate.className='csc-task9-gate';
  gate.innerHTML='<div class="csc-task9-gate-card"><h2>Acesso pelo Conecta Saúde</h2><p>Este módulo não possui login próprio. Entre pelo PIN na tela inicial do Conecta Saúde Comunitária e abra o painel pela Central.</p><a href="'+centralUrl()+'">Voltar à Central</a></div>';
  document.body.appendChild(gate);
}
function protectGlobalSession(){
  if(!isModulePage()||!window.Storage||Storage.prototype.__conectaTask9Protected)return;
  var setItem=Storage.prototype.setItem,removeItem=Storage.prototype.removeItem,clear=Storage.prototype.clear;
  Object.defineProperty(Storage.prototype,'__conectaTask9Protected',{value:true,configurable:false,enumerable:false,writable:false});
  Storage.prototype.setItem=function(key,value){
    key=String(key||'');
    if(this===window.sessionStorage&&(key===ADMIN_TOKEN_KEY||key===TERRITORY_TOKEN_KEY)){
      reportAuthIssue('Módulo tentou substituir a sessão global; operação bloqueada pelo núcleo.');
      return;
    }
    return setItem.call(this,key,value);
  };
  Storage.prototype.removeItem=function(key){
    key=String(key||'');
    if(this===window.sessionStorage&&(key===ADMIN_TOKEN_KEY||key===TERRITORY_TOKEN_KEY)){
      reportAuthIssue('Módulo tentou encerrar a sessão global; operação bloqueada pelo núcleo.');
      return;
    }
    return removeItem.call(this,key);
  };
  Storage.prototype.clear=function(){
    if(this===window.sessionStorage){
      reportAuthIssue('Módulo tentou limpar a sessão global; operação bloqueada pelo núcleo.');
      return;
    }
    return clear.call(this);
  };
}
function blockLegacyAuthActions(){
  if(!isModulePage())return;
  document.addEventListener('click',function(event){
    if(!legacyAuthTarget(event.target))return;
    event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    if(!ready())showCentralGate();
  },true);
  document.addEventListener('submit',function(event){
    var form=event.target;if(!form||!form.querySelector)return;
    if(form.querySelector('#pin,#login,#loginTacs,#loginAdmin')){
      event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
      if(!ready())showCentralGate();
    }
  },true);
}
function installTask9ModuleGate(){
  if(!isModulePage())return;
  protectGlobalSession();blockLegacyAuthActions();
  function apply(){hideLegacyAuthUi();if(!ready())showCentralGate();else{var g=document.getElementById('conectaTask9AuthGate');if(g)g.remove()}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  var observer=new MutationObserver(function(){hideLegacyAuthUi()});
  if(document.documentElement)observer.observe(document.documentElement,{subtree:true,childList:true});
}


/* TAREFA_11_DESEMPENHO_MODULOS_V1:
   cache de leitura somente da sessão atual, separado por modo/área/módulo.
   Não substitui autenticação nem confirma escrita. */
/* TAREFA_12_FRESCOR_CACHE_V1:
   todo snapshot do core passa a carregar referência explícita de versão/frescor.
   Cache nunca é autoridade atual: ao ser exibido, exige consulta remota obrigatória.
   Dados críticos só voltam ao estado confirmado depois de resposta do servidor. */
var PERFORMANCE_PREFIX='portalConectaModulePerfV1:';
var PERFORMANCE_SCHEMA_VERSION=2;
var PERFORMANCE_STALE_MS=60000;
var PERFORMANCE_VERSION_KEYS=['serverVersion','remoteVersion','version','versao','revision','updatedAt','atualizadoEm','ultimaAtualizacao','lastUpdated','timestamp'];
var PERFORMANCE_SECRET_KEYS={
  token:1,admintoken:1,territoriotoken:1,sessiontoken:1,bearer:1,authorization:1,
  accesstoken:1,refreshtoken:1,quickkey:1,chaveconfianca:1,pin:1,pinhash:1,pinsalt:1
};
function performanceModuleName(name){
  return text(name).toLowerCase().replace(/[^a-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
}
function performanceKey(name){
  var moduleName=performanceModuleName(name);
  if(!moduleName)return'';
  return PERFORMANCE_PREFIX+(mode()||'anon')+':'+areaId()+':'+moduleName;
}
function performanceSanitize(value){
  if(value==null||typeof value==='string'||typeof value==='number'||typeof value==='boolean')return value;
  if(Array.isArray(value))return value.map(performanceSanitize);
  if(typeof value!=='object')return null;
  var out={};
  Object.keys(value).forEach(function(k){
    var normalized=String(k||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(PERFORMANCE_SECRET_KEYS[normalized])return;
    out[k]=performanceSanitize(value[k]);
  });
  return out;
}
function performanceStable(value){
  if(value==null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(performanceStable).join(',')+']';
  return '{'+Object.keys(value).sort().map(function(k){return JSON.stringify(k)+':'+performanceStable(value[k])}).join(',')+'}';
}
function performanceFingerprint(value){
  var s=performanceStable(value),a=2166136261,b=2246822519;
  for(var i=0;i<s.length;i++){var code=s.charCodeAt(i);a=Math.imul(a^code,16777619);b=Math.imul(b^code,3266489917)}
  return (a>>>0).toString(16)+(b>>>0).toString(16);
}
function performanceExplicitVersion(value){
  if(!value||typeof value!=='object')return'';
  for(var i=0;i<PERFORMANCE_VERSION_KEYS.length;i++){
    var k=PERFORMANCE_VERSION_KEYS[i],v=value[k];
    if(v!=null&&typeof v!=='object'&&text(v))return k+':'+text(v);
  }
  var containers=['meta','metadata','controle','contexto'];
  for(var j=0;j<containers.length;j++){
    var nested=value[containers[j]];
    if(!nested||typeof nested!=='object')continue;
    for(var x=0;x<PERFORMANCE_VERSION_KEYS.length;x++){
      var nk=PERFORMANCE_VERSION_KEYS[x],nv=nested[nk];
      if(nv!=null&&typeof nv!=='object'&&text(nv))return containers[j]+'.'+nk+':'+text(nv);
    }
  }
  return'';
}
function performanceVersionReference(safe,fingerprint){
  return performanceExplicitVersion(safe)||('fp:'+fingerprint);
}
function performanceFreshnessMeta(item){
  var confirmedAt=Number(item&&item.confirmedAt||0),age=confirmedAt?Math.max(0,Date.now()-confirmedAt):Number.POSITIVE_INFINITY;
  return {
    cached:true,
    authoritative:false,
    requiresRemote:true,
    stale:!confirmedAt||age>PERFORMANCE_STALE_MS||Boolean(item&&item.legacyUnversioned),
    legacyUnversioned:Boolean(item&&item.legacyUnversioned),
    ageMs:age,
    confirmedAt:confirmedAt,
    checkedAt:Number(item&&item.checkedAt||0),
    fingerprint:item&&item.fingerprint||'',
    cacheVersionReference:item&&item.cacheVersionReference||''
  };
}
function performanceRead(name){
  var key=performanceKey(name);if(!key)return null;
  try{
    var item=JSON.parse(sessionStorage.getItem(key)||'null');
    if(!item||!item.data||item.areaId!==areaId()||item.mode!==mode())return null;
    if(item.schemaVersion===1){
      item.legacyUnversioned=true;
      item.cacheVersionReference='';
      item.requiresRemote=true;
      return item;
    }
    if(item.schemaVersion!==PERFORMANCE_SCHEMA_VERSION||!item.cacheVersionReference)return null;
    item.requiresRemote=true;
    return item;
  }catch(e){return null}
}
function performancePrime(name,apply){
  var item=performanceRead(name);
  if(item&&typeof apply==='function')apply(item.data,performanceFreshnessMeta(item));
  return item;
}
function performanceCommit(name,data,apply){
  var key=performanceKey(name),safe=performanceSanitize(data);
  if(!key||!safe||typeof safe!=='object')return {changed:true,item:null,authoritative:false};
  var previous=performanceRead(name),fingerprint=performanceFingerprint(safe),cacheVersionReference=performanceVersionReference(safe,fingerprint),now=Date.now();
  var changed=!previous||previous.fingerprint!==fingerprint||previous.cacheVersionReference!==cacheVersionReference||Boolean(previous.legacyUnversioned);
  var item={
    schemaVersion:PERFORMANCE_SCHEMA_VERSION,
    module:performanceModuleName(name),
    mode:mode(),
    areaId:areaId(),
    confirmedAt:now,
    checkedAt:now,
    cacheVersionReference:cacheVersionReference,
    fingerprint:fingerprint,
    data:safe
  };
  try{sessionStorage.setItem(key,JSON.stringify(item))}catch(e){}
  var meta={cached:false,authoritative:true,requiresRemote:false,stale:false,changed:changed,confirmedAt:now,checkedAt:now,cacheVersionReference:cacheVersionReference,fingerprint:fingerprint};
  if(changed&&typeof apply==='function')apply(safe,meta);
  return {changed:changed,item:item,previous:previous,authoritative:true,cacheVersionReference:cacheVersionReference};
}
function performanceForget(name){var key=performanceKey(name);if(key)try{sessionStorage.removeItem(key)}catch(e){}}
function performanceSame(name,data){
  var previous=performanceRead(name);if(!previous||previous.legacyUnversioned)return false;
  var safe=performanceSanitize(data),fingerprint=performanceFingerprint(safe);
  return previous.fingerprint===fingerprint&&previous.cacheVersionReference===performanceVersionReference(safe,fingerprint);
}
function performanceFreshness(name){
  var item=performanceRead(name);
  return item?performanceFreshnessMeta(item):{cached:false,authoritative:false,requiresRemote:true,stale:true,legacyUnversioned:false,ageMs:Number.POSITIVE_INFINITY,confirmedAt:0,checkedAt:0,fingerprint:'',cacheVersionReference:''};
}
var performanceApi={
  read:performanceRead,
  prime:performancePrime,
  commit:performanceCommit,
  forget:performanceForget,
  same:performanceSame,
  freshness:performanceFreshness,
  schemaVersion:PERFORMANCE_SCHEMA_VERSION,
  staleAfterMs:PERFORMANCE_STALE_MS,
  fingerprint:function(data){return performanceFingerprint(performanceSanitize(data))}
};

/* TAREFA_13_DEDUP_REQUISICOES_V1:
   leituras idênticas da mesma sessão/área usam um único voo remoto e o resultado
   confirmado pode ser distribuído aos módulos por uma janela curta.
   Escritas nunca são deduplicadas e invalidam imediatamente a janela compartilhada. */
var REQUEST_REUSE_MS=5000;
var REQUEST_READ_ACTIONS={
  admin_dados:1,
  admin_moradores_status:1,
  admin_publicacoes_dados:1,
  admin_suporte_chamados_listar:1,
  admin_territorio_dados:1,
  admin_multimunicipio_dados:1,
  admin_moradores_areas:1,
  admin_portal_manutencao_status:1
};
var REQUEST_SECRET_KEYS={
  token:1,territoriotoken:1,dispositivo:1,requestid:1,callback:1,pin:1,
  quickkey:1,chaveconfianca:1,authorization:1,bearer:1,
  /* metadado somente do cliente; não altera a leitura remota */
  escopo:1
};
function requestRoot(){
  try{if(window.top&&window.top.location&&window.top.location.origin===location.origin)return window.top}catch(e){}
  return window;
}
function requestRegistry(){
  var root=requestRoot();
  if(!root.__conectaRequestBrokerV1){
    root.__conectaRequestBrokerV1={inFlight:{},recent:{},generation:0};
  }
  return root.__conectaRequestBrokerV1;
}
function requestHash(value){
  var s=text(value),h=2166136261;
  for(var i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
  return (h>>>0).toString(16);
}
function requestScope(){
  var s=canonicalSession(),credential=s.territoryToken||s.adminToken||'';
  return (mode()||'anon')+'|'+areaId()+'|'+requestHash(credential+'|'+s.device);
}
function requestPayloadSafe(payload){
  var out={};
  Object.keys(payload||{}).sort().forEach(function(k){
    var normalized=String(k||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(REQUEST_SECRET_KEYS[normalized])return;
    var v=payload[k];
    if(v==null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')out[k]=v;
    else out[k]=performanceSanitize(v);
  });
  return out;
}
function requestIsRead(action){return REQUEST_READ_ACTIONS[text(action).toLowerCase()]===1}
function requestKey(action,payload){
  var safe=requestPayloadSafe(payload),fingerprint=performanceFingerprint(safe);
  return text(action).toLowerCase()+'|'+requestScope()+'|'+fingerprint;
}
function requestInvalidate(){
  var registry=requestRegistry();
  registry.generation=Number(registry.generation||0)+1;
  registry.recent={};
}
function requestNoteAction(action){
  if(!requestIsRead(action))requestInvalidate();
}
/* TAREFA_14_TIMEOUT_SESSAO_V1:
   falha temporária nunca invalida sessão nem transforma o módulo em tela de PIN.
   somente uma recusa explícita de autenticação pode autorizar invalidação. */
var SESSION_AUTH_REFUSAL_RE=/(sess[aã]o|token|autentica[cç][aã]o|acesso).*(inv[aá]lid|expir|recus|revog|desativ|n[aã]o autoriz)|n[aã]o autorizado|unauthor|forbidden|pertence a outro aparelho/i;
function sessionFailureClassify(result){
  var r=result&&typeof result==='object'?result:{ok:false,message:'Resposta vazia.'};
  if(r.ok===true)return{ok:true,explicitAuthRefusal:false,temporary:false,preserveSession:true,message:text(r.message)};
  var message=text(r.message),explicit=Boolean(r.temporario!==true&&SESSION_AUTH_REFUSAL_RE.test(message));
  return{ok:false,explicitAuthRefusal:explicit,temporary:!explicit,preserveSession:!explicit,message:message};
}
function sessionFailureNormalize(result){
  var base=result&&typeof result==='object'?result:{ok:false,message:'Resposta vazia.'},classification=sessionFailureClassify(base);
  if(classification.ok)return base;
  var out={};Object.keys(base).forEach(function(k){out[k]=base[k]});
  if(classification.explicitAuthRefusal){
    out.authRecusada=true;out.preservarSessao=false;
  }else{
    out.temporario=true;out.preservarSessao=true;
  }
  return out;
}
function sessionShouldInvalidate(result){return sessionFailureClassify(result).explicitAuthRefusal===true}
var sessionPolicyApi={
  classify:sessionFailureClassify,
  normalize:sessionFailureNormalize,
  shouldInvalidate:sessionShouldInvalidate,
  authRefusalPattern:SESSION_AUTH_REFUSAL_RE
};

function requestExecute(executor){
  return new Promise(function(resolve){
    var done=false;
    function finish(result){if(done)return;done=true;resolve(sessionFailureNormalize(result))}
    try{
      var returned=executor(finish);
      if(returned&&typeof returned.then==='function')returned.then(finish).catch(function(e){finish({ok:false,message:text(e&&e.message)||'Falha na leitura.'})});
    }catch(e){finish({ok:false,message:text(e&&e.message)||'Falha na leitura.'})}
  });
}
function dedupRequestPromise(action,payload,executor,options){
  action=text(action).toLowerCase();options=options||{};
  if(!requestIsRead(action))return requestExecute(executor).then(function(result){return{result:result,meta:{shared:false,source:'direct-write-safe',action:action}}});
  var registry=requestRegistry(),key=requestKey(action,payload),now=Date.now(),generation=Number(registry.generation||0);
  var active=registry.inFlight[key];
  if(active&&active.promise){
    return active.promise.then(function(packet){
      return{result:packet.result,meta:{shared:true,source:'in-flight',action:action,key:key,startedAt:active.startedAt}};
    });
  }
  var recent=registry.recent[key],reuseMs=Math.max(0,Number(options.reuseMs==null?REQUEST_REUSE_MS:options.reuseMs));
  if(recent&&recent.result&&recent.generation===generation&&now-Number(recent.confirmedAt||0)<=reuseMs){
    return Promise.resolve({result:recent.result,meta:{shared:true,source:'recent-core',action:action,key:key,confirmedAt:recent.confirmedAt}});
  }
  var startedAt=now;
  var promise=requestExecute(executor).then(function(result){
    delete registry.inFlight[key];
    var confirmedAt=Date.now();
    if(result&&result.ok===true&&Number(registry.generation||0)===generation){
      registry.recent[key]={result:result,confirmedAt:confirmedAt,generation:generation};
    }
    return{result:result,meta:{shared:false,source:'remote',action:action,key:key,startedAt:startedAt,confirmedAt:confirmedAt}};
  });
  registry.inFlight[key]={promise:promise,startedAt:startedAt,generation:generation};
  return promise;
}
function requestRead(action,payload,executor,callback,options){
  return dedupRequestPromise(action,payload,executor,options).then(function(packet){
    if(typeof callback==='function')callback(packet.result,packet.meta);
    return packet;
  });
}
var requestApi={
  read:requestRead,
  dedupRequestPromise:dedupRequestPromise,
  noteAction:requestNoteAction,
  invalidate:requestInvalidate,
  isRead:requestIsRead,
  reuseMs:REQUEST_REUSE_MS
};

window.ConectaModuleCoreV1={
  context:context,
  state:state,
  session:session,
  mode:mode,
  areaId:areaId,
  identity:identity,
  permissions:permissions,
  can:can,
  ready:ready,
  reportAuthIssue:reportAuthIssue,
  centralUrl:centralUrl,
  performance:performanceApi,
  requests:requestApi,
  sessionPolicy:sessionPolicyApi,
  task9ModuleGate:installTask9ModuleGate
};
try{document.documentElement.dataset.conectaModuleCore='1'}catch(e){}
installTask9ModuleGate();
}());
