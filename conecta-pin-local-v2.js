(function(){
'use strict';
if(window.ConectaPinLocalV2)return;

var PREFIX='conectaPinLocalV2:';
var STORAGE_VERSION=2;
var MAX_AGE=7*24*60*60*1000;
var ITERATIONS=180000;
function text(v){return String(v==null?'':v).trim()}
function digits(v){return text(v).replace(/\D/g,'')}
function keyName(scope){return PREFIX+text(scope).toLowerCase()}
function b64(bytes){
  var s='',i;for(i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);
  return btoa(s);
}
function bytes(value){
  var s=atob(String(value||'')),out=new Uint8Array(s.length),i;
  for(i=0;i<s.length;i++)out[i]=s.charCodeAt(i);
  return out;
}
async function derive(pin,salt){
  var raw=await crypto.subtle.importKey(
    'raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {name:'PBKDF2',salt:salt,iterations:ITERATIONS,hash:'SHA-256'},
    raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt']
  );
}
async function guardar(scope,pin,payload){
  scope=text(scope).toLowerCase();pin=digits(pin);
  if(!scope||!/^\d{4,8}$/.test(pin)||!payload||typeof payload!=='object')return false;
  if(!window.crypto||!crypto.subtle)return false;
  var salt=crypto.getRandomValues(new Uint8Array(16));
  var iv=crypto.getRandomValues(new Uint8Array(12));
  var key=await derive(pin,salt);
  var now=Date.now();
  /* A credencial pode existir somente dentro deste corpo cifrado AES-GCM; nunca é gravada em texto aberto. */
  var body=Object.assign({},payload,{scope:scope,salvoEm:now,expiraLocalEm:now+MAX_AGE});
  var plain=new TextEncoder().encode(JSON.stringify(body));
  var cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,plain);
  var record={v:STORAGE_VERSION,s:b64(salt),i:b64(iv),c:b64(new Uint8Array(cipher)),salvoEm:now};
  try{localStorage.setItem(keyName(scope),JSON.stringify(record));return true}catch(e){return false}
}
async function abrir(scope,pin){
  scope=text(scope).toLowerCase();pin=digits(pin);
  if(!scope||!/^\d{4,8}$/.test(pin)||!window.crypto||!crypto.subtle)return null;
  var raw='';try{raw=localStorage.getItem(keyName(scope))||''}catch(e){return null}
  if(!raw)return null;
  try{
    var record=JSON.parse(raw);
    if(!record||record.v!==STORAGE_VERSION||!record.s||!record.i||!record.c)return null;
    var key=await derive(pin,bytes(record.s));
    var plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(record.i)},key,bytes(record.c));
    var body=JSON.parse(new TextDecoder().decode(plain));
    if(!body||body.scope!==scope)return null;
    if(!body.expiraLocalEm||Date.now()>Number(body.expiraLocalEm)){remover(scope);return null}
    return body;
  }catch(e){return null}
}
function remover(scope){try{localStorage.removeItem(keyName(scope))}catch(e){}}
function existe(scope){try{return !!localStorage.getItem(keyName(scope))}catch(e){return false}}

window.ConectaPinLocalV2={
  guardar:guardar,
  abrir:abrir,
  remover:remover,
  existe:existe,
  validadeLocalMs:MAX_AGE
};
}());
