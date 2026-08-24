'use strict';

const fs=require('node:fs');
const assert=require('node:assert/strict');

const read=p=>fs.readFileSync(p,'utf8');
const index=read('index.html');
const agenda=read('agenda-enfermeira.js');
const rootWorker=read('service-worker.js');
const pushWorker=read('push/OneSignalSDKWorker.js');
const autoUpdate=read('portal-auto-update.js');

const activeRuntime=[
  'index.html',
  'agenda-config.js',
  'portal-area-resolver.js',
  'portal-public-data.js',
  'portal-manutencao.js',
  'agenda-enfermeira.js',
  'portal-notification-health.js',
  'portal-notification-repair-v9.js',
  'moradores-autofill.js',
  'portal-auto-update.js',
  'portal-controle-integral.js',
  'portal-ajustes-finais.js',
  'portal-odontologia-segunda-sexta.js',
  'portal-orientacao-morador.js',
  'portal-servicos-coloridos-anexos-v1.js',
  'portal-identificacao-familia-v1.js',
  'portal-institucional-suporte-v1.js',
  'portal-conecta-oficial-v1.js'
];

activeRuntime.forEach(file=>{
  assert.ok(fs.existsSync(file),'Runtime ativo ausente do gate do Bloco 14: '+file);
  const source=read(file);
  const rootRegistration=/serviceWorker\s*\.\s*register\s*\(\s*['"`]\/?(?:atendimento-acs-farmaceutico\/)?service-worker\.js/i;
  assert.ok(!rootRegistration.test(source),'Runtime ativo não pode registrar o service-worker legado de raiz: '+file);
});

assert.ok(index.includes('agenda-enfermeira.js'),'Portal deve continuar carregando o controlador atual de agendas/OneSignal');
assert.ok(index.includes('portal-notification-health.js'),'Saúde de notificações atual deve permanecer no runtime');
assert.ok(index.includes('portal-notification-repair-v9.js'),'Reparo V9 atual deve permanecer no runtime');

assert.equal((agenda.match(/OneSignal\.init\(\{/g)||[]).length,1,'Deve existir exatamente um inicializador OneSignal no runtime atual');
assert.equal((agenda.match(/data-onesignal-sdk/g)||[]).length,1,'SDK OneSignal deve manter um único gate de carregamento');
assert.ok(agenda.includes("serviceWorkerPath:\n            '/atendimento-acs-farmaceutico/push/OneSignalSDKWorker.js'"),'Worker OneSignal deve permanecer no caminho segregado /push/');
assert.ok(agenda.includes("scope: '/atendimento-acs-farmaceutico/push/'"),'Scope OneSignal deve permanecer limitado a /push/');
assert.ok(!agenda.includes("scope: '/atendimento-acs-farmaceutico/'"),'OneSignal não pode assumir o escopo raiz do Portal');

const iosGuard=agenda.indexOf('if (isIos() && !isStandalone())');
const deferred=agenda.indexOf('window.OneSignalDeferred = window.OneSignalDeferred || []',iosGuard);
const permission=agenda.indexOf('OneSignal.Notifications.requestPermission()',deferred);
assert.ok(iosGuard>=0&&deferred>iosGuard&&permission>deferred,'No iPhone/Safari o guard de Home Screen deve continuar antes da inicialização/pedido de permissão');
assert.ok(agenda.slice(iosGuard,deferred).includes('return;'),'Safari fora do modo instalado deve sair antes da inicialização Push');

assert.equal(pushWorker.trim(),"importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');",'Worker OneSignal deve permanecer exatamente no bootstrap oficial atual');
assert.ok(rootWorker.includes("const CACHE_NAME = 'tacs-disabled-20260727'"),'Service worker legado de raiz deve continuar explicitamente desativado');
assert.ok(rootWorker.includes('self.registration.unregister()'),'Worker legado deve continuar se desregistrando');
assert.ok(!/importScripts\([^)]*OneSignal/i.test(rootWorker),'Worker legado de raiz não pode incorporar OneSignal');

assert.ok(autoUpdate.includes("scopePath==='/atendimento-acs-farmaceutico/'&&scopePath.indexOf('/push/')===-1"),'Limpeza de versão antiga só pode desregistrar o escopo raiz legado, nunca /push/');
assert.ok(autoUpdate.includes("value.indexOf('onesignal')===-1"),'Limpeza de caches deve preservar qualquer cache OneSignal');
assert.ok(autoUpdate.includes("purgarEntregaLegada:purgeLegacyDeliveryState"),'Rotina auditável de limpeza legada deve continuar exposta sem mudar o runtime Push');
const purgeStart=autoUpdate.indexOf('function purgeLegacyDeliveryState()');
const purgeEnd=autoUpdate.indexOf('function isLegacyIdentityStatus',purgeStart);
const purgeBody=autoUpdate.slice(purgeStart,purgeEnd);
assert.ok(purgeStart>=0&&purgeEnd>purgeStart,'Rotina de limpeza legada deve permanecer delimitada');
assert.ok(!/location\.(?:replace|reload|href)/.test(purgeBody),'Limpeza de worker/cache não pode navegar ou recarregar a página por conta própria');

console.log('ONESIGNAL_SW_ISOLATION_V1_OK: runtime ativo sem worker raiz; OneSignal único em /push/; limpeza legada preserva worker/cache Push e não navega sozinha.');
