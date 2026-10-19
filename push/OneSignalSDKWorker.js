importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
/* CSC_UBS_BADGE_V4: o SDK continua exibindo a notificação; este bloco só atualiza a numeração. */
function cscUbsAdditionalData(payload){
  var custom=payload&&payload.custom;if(typeof custom==='string'){try{custom=JSON.parse(custom)}catch(ignore){custom=null}}
  return payload&&payload.additionalData||custom&&custom.a||payload&&payload.data||{};
}
function cscUbsBadgeStore(area,count){
  return new Promise(function(resolve){
    var open=indexedDB.open('csc-ubs-badges-v1',1);
    open.onupgradeneeded=function(){open.result.createObjectStore('areas')};open.onerror=function(){resolve(count)};
    open.onsuccess=function(){var db=open.result,tx=db.transaction('areas','readwrite'),store=tx.objectStore('areas');store.put({count:count,updatedAt:Date.now()},area);var total=0,read=store.openCursor();read.onsuccess=function(){var cursor=read.result;if(cursor){total+=Math.max(0,Number(cursor.value&&typeof cursor.value==='object'?cursor.value.count:cursor.value)||0);cursor.continue()}};tx.oncomplete=function(){db.close();resolve(total)};tx.onerror=function(){db.close();resolve(count)}};
  });
}
function cscUbsSetBadge(area,count){
  return cscUbsBadgeStore(area,Math.max(0,Number(count)||0)).then(function(total){
    if(total&&self.navigator.setAppBadge)return self.navigator.setAppBadge(total);
    if(!total&&self.navigator.clearAppBadge)return self.navigator.clearAppBadge();
  }).catch(function(){});
}
self.addEventListener('push',function(event){
  var payload;try{payload=event.data&&event.data.json()}catch(ignore){return}
  var data=cscUbsAdditionalData(payload);if(data.tipo!=='SOLICITACAO_UBS')return;
  var area=String(data.areaId||''),count=Number(data.naoVistas);
  event.waitUntil(Promise.all([
    Number.isFinite(count)?cscUbsSetBadge(area,count):Promise.resolve(),
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(clients){clients.forEach(function(client){client.postMessage({type:'CSC_UBS_PUSH_RECEIVED',areaId:area,count:Number.isFinite(count)?count:null})})})
  ]));
});
self.addEventListener('message',function(event){
  var data=event.data||{},source=event.source;
  if(data.type!=='CSC_UBS_BADGE_SET'||!source||!source.url)return;
  try{var url=new URL(source.url);if(url.origin!==self.location.origin||!/\/central-administrativa-tacs\.html$/.test(url.pathname))return}catch(ignore){return}
  event.waitUntil(cscUbsSetBadge(String(data.areaId||''),data.count));
});
