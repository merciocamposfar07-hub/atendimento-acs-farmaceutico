'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const full=fs.readFileSync('central-administrativa-tacs.js','utf8');
const names=[
  'notificationCacheKey','notificationCount','normalizeConfirmedNotification',
  'readConfirmedNotification','saveConfirmedNotification','renderConfirmedNotification',
  'notificationVerifiedTime','notificationShowVerifiedAt','notificationCancelRecovery',
  'notificationScheduleRecovery','refreshNotificationHealth'
];
function fn(name){
  const i=full.indexOf('function '+name+'(');
  assert.ok(i>=0,'Função não encontrada: '+name);
  const j=full.indexOf('\nfunction ',i+1);
  return full.slice(i,j<0?undefined:j);
}
const store=new Map(),events={},queue=new Map(),cards=new Map();
let currentTime=Date.parse('2026-10-25T16:30:00Z'),clockId=0,launches=[],badge=null,health={};
class ClockDate extends Date {static now(){return currentTime}}
function createElement(tag){return {tagName:tag,style:{},textContent:'',setAttribute(k,v){this[k]=v}}}
const card={children:[],querySelector(sel){return sel==='[data-notification-verified-at]'?this.children.find(c=>Object.hasOwn(c,'data-notification-verified-at'))||null:null},appendChild(n){this.children.push(n)}};
cards.set('healthNotifications',card);
const c=vm.createContext({
  console,Date:ClockDate,Intl,Number,isFinite,NumberIsFinite:Number.isFinite,
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  setTimeout:(cb,delay)=>{const id=++clockId;queue.set(id,{cb,delay});return id},
  clearTimeout:id=>queue.delete(id),
  document:{hidden:false,createElement,addEventListener:(name,cb)=>{events[name]=cb}},
  window:{addEventListener:(name,cb)=>{events[name]=cb}},
  navigator:{onLine:true},
  el:id=>cards.get(id)||null,
  normArea:a=>String(a||'').trim().toUpperCase(),
  text:x=>String(x==null?'':x),
  markHealth:(id,label,state)=>{health[id]={label,state}},
  updatePendingBadge:r=>{badge=r},
  permission:()=>true,
  context:{},
  mode:'admin',
  selectedAreaId:'AREA1',
  NOTIFICATION_CONFIRMED_CACHE_PREFIX:'test:notify:',
  notificationRemoteSeq:0,
  notificationRemoteArea:'',
  notificationLatestStarted:{},
  notificationRecoveryTimer:null,
  notificationRecoveryArea:'',
  notificationRecoveryFailures:0,
});
let sequence=0;
c.notificationPostIsolated=(action,area,cb)=>{
  assert.equal(action,'admin_notificacoes_saude_remota');
  const seq=++sequence;
  c.notificationLatestStarted[area]=seq;
  launches.push({area,seq,cb});
};
vm.runInContext(names.map(fn).join('\n'),c);
const real=(ativos=28,inativos=9,reparo=0,areaId='AREA1')=>({
  ok:true,oneSignalConsultado:true,areaId,contagens:{ativos,inativos,reparo}
});
assert.equal(c.normalizeConfirmedNotification(real(null,9,0),'AREA1'),null,'Não transformar null em zero');
assert.equal(c.normalizeConfirmedNotification(real(28,9,0,'AREA2'),'AREA1'),null,'Não usar números de outra área');
assert.equal(c.normalizeConfirmedNotification({...real(),oneSignalConsultado:false},'AREA1'),null,'Não apresentar números locais como OneSignal real');

c.refreshNotificationHealth('AREA1',false);
assert.equal(launches.length,1);
assert.match(health.healthNotifications.label,/Consultando aparelhos/);
c.refreshNotificationHealth('AREA1',true);
assert.equal(launches.length,1,'Evitar consultas simultâneas após vários toques');
launches[0].cb({ok:false,message:'Serviço temporariamente indisponível'},launches[0].seq);
assert.doesNotMatch(health.healthNotifications.label,/Sem confirmação/i);
assert.match(health.healthNotifications.label,/temporariamente indisponível/i);
assert.equal(queue.size,1,'Reagendar sem exigir clique');
let job=[...queue][0],delay=job[1].delay;assert.equal(delay,2500);
queue.delete(job[0]);job[1].cb();
assert.equal(launches.length,2);
launches[1].cb(real(),launches[1].seq);
assert.match(health.healthNotifications.label,/28 aptos • 9 inativos • 0 reparo/);
assert.match(card.children[0].textContent,/Última verificação OneSignal:.*Brasília/);
assert.equal(queue.size,0);
assert.equal(badge.contagens.ativos,28);
const snapshot=JSON.parse(store.get('test:notify:AREA1'));
assert.equal(snapshot.contagens.ativos,28);
assert.equal(snapshot.confirmadoEm,currentTime);

c.refreshNotificationHealth('AREA1',true);
assert.equal(launches.length,3);
launches[2].cb({ok:false,message:'HTTP 503'},launches[2].seq);
assert.equal(health.healthNotifications.label,'28 aptos • 9 inativos • 0 reparo','Não apagar última contagem real');
assert.match(card.children[0].textContent,/Nova tentativa automática/);
assert.equal(queue.size,1);
const previousTime=card.children[0].textContent;
currentTime+=48*60*60*1000;
assert.equal(c.readConfirmedNotification('AREA1').contagens.ativos,28,'Manter última medição com data, mesmo após 24h');
assert.equal(c.notificationVerifiedTime(snapshot.confirmadoEm).includes('25/10/2026'),true,'Horário mostrado em Brasília');
assert.match(previousTime,/25\/10\/2026/);

let j=[...queue][0];queue.delete(j[0]);c.navigator.onLine=false;j[1].cb();
assert.equal(launches.length,3,'Sem consultas repetidas quando offline');
assert.equal(typeof events.online,'function');
c.navigator.onLine=true;events.online();
assert.equal(launches.length,4,'Retomar sozinho quando a rede voltar');
launches[3].cb(real(29,9,0),launches[3].seq);
assert.match(health.healthNotifications.label,/29 aptos/);
assert.equal(queue.size,0);
assert.ok(!full.includes("markHealth('healthNotifications','Sem confirmação'"));
assert.match(full,/waitMs=28000/);
console.log('CENTRAL_NOTIFICACOES_OK: dados reais, sem falsos zeros, contagem persistente, retry automatico, sem duplicar consultas.');
