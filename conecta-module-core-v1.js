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
   Não substitui autenticação, não confirma escrita e não implementa versionamento remoto
   (isso permanece reservado à Tarefa 12). */
var PERFORMANCE_PREFIX='portalConectaModulePerfV1:';
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
function performanceRead(name){
  var key=performanceKey(name);if(!key)return null;
  try{
    var item=JSON.parse(sessionStorage.getItem(key)||'null');
    if(!item||item.schemaVersion!==1||!item.data||item.areaId!==areaId()||item.mode!==mode())return null;
    return item;
  }catch(e){return null}
}
function performancePrime(name,apply){
  var item=performanceRead(name);
  if(item&&typeof apply==='function')apply(item.data,{cached:true,changed:false,confirmedAt:Number(item.confirmedAt||0),fingerprint:item.fingerprint||''});
  return item;
}
function performanceCommit(name,data,apply){
  var key=performanceKey(name),safe=performanceSanitize(data);
  if(!key||!safe||typeof safe!=='object')return {changed:true,item:null};
  var previous=performanceRead(name),fingerprint=performanceFingerprint(safe),changed=!previous||previous.fingerprint!==fingerprint;
  var item={schemaVersion:1,module:performanceModuleName(name),mode:mode(),areaId:areaId(),confirmedAt:Date.now(),fingerprint:fingerprint,data:safe};
  try{sessionStorage.setItem(key,JSON.stringify(item))}catch(e){}
  if(changed&&typeof apply==='function')apply(safe,{cached:false,changed:true,confirmedAt:item.confirmedAt,fingerprint:fingerprint});
  return {changed:changed,item:item,previous:previous};
}
function performanceForget(name){var key=performanceKey(name);if(key)try{sessionStorage.removeItem(key)}catch(e){}}
function performanceSame(name,data){
  var previous=performanceRead(name);if(!previous)return false;
  return previous.fingerprint===performanceFingerprint(performanceSanitize(data));
}
var performanceApi={
  read:performanceRead,
  prime:performancePrime,
  commit:performanceCommit,
  forget:performanceForget,
  same:performanceSame,
  fingerprint:function(data){return performanceFingerprint(performanceSanitize(data))}
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
  task9ModuleGate:installTask9ModuleGate
};
try{document.documentElement.dataset.conectaModuleCore='1'}catch(e){}
installTask9ModuleGate();
}());
