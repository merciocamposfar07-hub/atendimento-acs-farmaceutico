(function(){
'use strict';
if(window.ConectaModuleCoreV1)return;

var CONTEXT_KEY='portalConectaModuleCoreV1';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var DEVICE_KEY='portalTacsDispositivoV1';
var AREA_KEY='portalTacsCentralAreaV1';

function text(v){return String(v==null?'':v).trim()}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function readJson(key){
  try{var raw=sessionStorage.getItem(key)||'';return raw?JSON.parse(raw):null}catch(e){return null}
}
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

window.ConectaModuleCoreV1={
  context:context,
  state:state,
  session:session,
  mode:mode,
  areaId:areaId,
  identity:identity,
  permissions:permissions,
  can:can,
  ready:ready
};
try{document.documentElement.dataset.conectaModuleCore='1'}catch(e){}
}());
