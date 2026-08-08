'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');

// Gate 0 concluído: auditoria real classificou backend servidor-servidor de push como AUSENTE.
const releaseGate=JSON.parse(read('PUSH_RELEASE_GATE_V1.json'));
assert.equal(releaseGate.appsScriptAudit,'COMPLETED');
assert.equal(releaseGate.existingPushClassification,'AUSENTE');
assert.equal(releaseGate.serverInstall,'NOT_STARTED');
assert.equal(releaseGate.serverRegression,'NOT_STARTED');
assert.equal(releaseGate.frontendMerge,'NOT_STARTED');
assert.equal(releaseGate.realDeviceTest,'NOT_STARTED');
assert.equal(releaseGate.releaseAllowed,false);
const activationDoc=read('PUSH_NOTIFICATIONS_V1.md');
assert.match(activationDoc,/Gate 0 concluído/);
assert.match(activationDoc,/Classificação: \*\*AUSENTE\*\*/);
assert.match(activationDoc,/releaseAllowed:false/);

// 1. O Portal do Morador só recebe os novos vínculos; fluxos atuais continuam referenciados.
const index=read('index.html');
assert.match(index,/rel="manifest" href="manifest\.webmanifest\?v=20260808-push-v1"/);
assert.match(index,/notificacoes-config-v1\.js\?v=20260808-push-v1/);
assert.match(index,/portal-notificacoes-v1\.js\?v=20260808-push-v1/);
assert.match(index,/agenda-config\.js\?v=20260805-agenda-sync-v1/);
assert.match(index,/portal-public-data\.js\?v=20260806-desempenho-v5/);
assert.match(index,/agenda-enfermeira\.js\?v=20260806-desempenho-v5/);
assert.match(index,/portal-controle-integral\.js\?v=20260806-desempenho-v5/);
assert.match(index,/portal-ajustes-finais\.js\?v=20260806-profissionais-dinamicos-v1/);
assert.match(index,/portal-odontologia-segunda-sexta\.js\?v=20260801-95/);
assert.match(index,/function reserveSlot\(\)/);
assert.match(index,/function sendMessage\(\)/);
assert.match(index,/WHATSAPP_NUMBER='5581989613130'/);

// 2. O PWA permanece standalone e o worker raiz continua desativado: push usa escopo próprio.
const manifest=JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.display,'standalone');
assert.equal(manifest.scope,'./');
assert.equal(manifest.start_url,'./index.html?v=20260808-push-v1');
const rootWorker=read('service-worker.js');
assert.match(rootWorker,/tacs-disabled-20260727/);
assert.match(rootWorker,/registration\.unregister\(\)/);
const pushWorker=read('push/OneSignalSDKWorker.js');
assert.match(pushWorker,/OneSignalSDK\.sw\.js/);

// 3. Configuração pública não contém segredo e usa o worker relativo correto.
const config=read('notificacoes-config-v1.js');
assert.match(config,/appId:'e2294b98-c72b-4f8c-a055-de28979676dc'/);
assert.match(config,/safariWebId:'web\.onesignal\.auto\.4bead971-106d-461b-853f-83aecbd62d40'/);
assert.match(config,/serviceWorkerPath:'push\/OneSignalSDKWorker\.js'/);
assert.match(config,/scope:'\/atendimento-acs-farmaceutico\/push\/'/);
assert.doesNotMatch(config,/API_KEY|REST_API_KEY|Authorization:/);

// 4. Cliente é desacoplado do WhatsApp e carrega SDK sob demanda/idle.
const client=read('portal-notificacoes-v1.js');
assert.match(client,/OneSignalSDK\.page\.js/);
assert.match(client,/Notifications\.requestPermission\(\)/);
assert.match(client,/PushSubscription/);
assert.match(client,/autoResubscribe:true/);
assert.match(client,/requestIdleCallback/);
assert.doesNotMatch(client,/getElementById\(['"]send['"]\)/);
assert.doesNotMatch(client,/wa\.me|WHATSAPP_NUMBER/);

// 5. Painel só pede push após releitura confirmada; undo/remover não chama push.
const panel=read('teste-v1/painel-recados-campanhas-v1.html');
assert.match(panel,/function mudouPublicacao\(/);
assert.match(panel,/function enviarPushConfirmado\(/);
assert.match(panel,/admin_publicar_notificacao/);
assert.match(panel,/if\(!certo\)\{status\([^\n]+return\}enviarPushConfirmado/);
const removeFn=(panel.match(/function remover\([\s\S]*?\nfunction restaurarRegistro/)||[''])[0];
const undoFn=(panel.match(/function desfazerUltima\([\s\S]*?\nfunction finalizarUndo/)||[''])[0];
assert.doesNotMatch(removeFn,/admin_publicar_notificacao/);
assert.doesNotMatch(undoFn,/admin_publicar_notificacao/);
assert.match(panel,/pushIgual:[^\n]+===false/);
assert.match(panel,/pushInativo:[^\n]+===false/);

// 6. Servidor: segredo em Script Properties, endpoint oficial e sem configuração de som customizado.
const serverSource=read('apps-script/ZZZZ_14_NotificacoesPushPortalV1.gs');
assert.match(serverSource,/API_KEY_PROPERTY: 'ONESIGNAL_APP_API_KEY'/);
assert.match(serverSource,/getProperty\(TACS_PUSH_PORTAL_V1\.API_KEY_PROPERTY\)/);
assert.match(serverSource,/https:\/\/api\.onesignal\.com\/notifications/);
assert.match(serverSource,/included_segments:\['Subscribed Users'\]/);
assert.match(serverSource,/idempotency_key:idempotencyKey/);
assert.doesNotMatch(serverSource,/ios_sound|android_sound|silent\s*:/);

// 7. Simulação do Apps Script e da API OneSignal.
const cache=new Map();
const props=new Map();
let fetchQueue=[];
const fetchCalls=[];
let uuidCounter=0;
class Output{constructor(text){this.text=String(text)}setMimeType(){return this}setXFrameOptionsMode(){return this}getContent(){return this.text}}
const context={
  console,JSON,String,Number,Object,Array,RegExp,Error,Math,isFinite,
  CacheService:{getScriptCache(){return{get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,String(v)),remove:k=>cache.delete(k)}}},
  PropertiesService:{getScriptProperties(){return{getProperty:k=>props.get(k)||'',setProperty:(k,v)=>props.set(k,String(v))}}},
  Utilities:{
    DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},
    getUuid(){uuidCounter+=1;return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12,'0')}`},
    computeDigest(algorithm,value){assert.equal(algorithm,'SHA_256');return Array.from(crypto.createHash('sha256').update(String(value),'utf8').digest()).map(b=>b>127?b-256:b)},
    sleep(){}
  },
  UrlFetchApp:{fetch(url,options){fetchCalls.push({url,options,body:JSON.parse(options.payload)});const response=fetchQueue.shift()||{code:200,body:{id:'msg-default',recipients:1}};return{getResponseCode:()=>response.code,getContentText:()=>JSON.stringify(response.body)}}},
  ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:t=>new Output(t)},
  HtmlService:{XFrameOptionsMode:{ALLOWALL:'allowall'},createHtmlOutput:t=>new Output(t)},
  profissionaisDinamicosV1ValidarSessao_(){return{ok:true}}
};
vm.createContext(context);
vm.runInContext(serverSource,context,{filename:'ZZZZ_14_NotificacoesPushPortalV1.gs'});

const base={tipo:'recado',id:'r-1',titulo:'Vacinação',mensagem:'Vacinação disponível amanhã.',ativo:'true',meta:'prioridade=IMPORTANTE'};
let result=context.tacsPushV1Publicar_(base);
assert.equal(result.ok,false);
assert.equal(result.code,'PUSH_NOT_CONFIGURED');
assert.equal(fetchCalls.length,0,'Sem chave secreta não deve chamar a API.');

props.set('ONESIGNAL_APP_API_KEY','SECRET_TEST_ONLY');
result=context.tacsPushV1Publicar_({...base,ativo:'false'});
assert.equal(result.skipped,true);
assert.equal(result.reason,'inactive');
assert.equal(fetchCalls.length,0);

fetchQueue.push({code:200,body:{id:'msg-1',recipients:3}});
result=context.tacsPushV1Publicar_(base);
assert.equal(result.ok,true);
assert.equal(result.push,true);
assert.equal(result.recipients,3);
assert.equal(fetchCalls.length,1);
assert.equal(fetchCalls[0].url,'https://api.onesignal.com/notifications');
assert.equal(fetchCalls[0].options.headers.Authorization,'Key SECRET_TEST_ONLY');
assert.deepEqual(fetchCalls[0].body.included_segments,['Subscribed Users']);
assert.equal(fetchCalls[0].body.url,'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/');
assert.equal(fetchCalls[0].body.data.id,'r-1');
assert.ok(fetchCalls[0].body.idempotency_key);
assert.equal('silent' in fetchCalls[0].body,false);

result=context.tacsPushV1Publicar_(base);
assert.equal(result.skipped,true);
assert.equal(result.reason,'duplicate');
assert.equal(fetchCalls.length,1,'Deduplicação curta não deve reenviar a mesma publicação.');

const changed={...base,id:'r-2',mensagem:'Mensagem alterada.'};
fetchQueue.push({code:500,body:{errors:['temporário']}},{code:200,body:{id:'msg-2',recipients:2}});
const beforeRetry=fetchCalls.length;
result=context.tacsPushV1Publicar_(changed);
assert.equal(result.ok,true);
assert.equal(result.push,true);
const retryCalls=fetchCalls.slice(beforeRetry);
assert.equal(retryCalls.length,2);
assert.equal(retryCalls[0].body.idempotency_key,retryCalls[1].body.idempotency_key,'Retry deve reutilizar a mesma chave de idempotência.');

console.log('OK: Gate 0 concluído; Push V1 isolado, deduplicado, seguro e sem regressão estrutural do Portal.');
