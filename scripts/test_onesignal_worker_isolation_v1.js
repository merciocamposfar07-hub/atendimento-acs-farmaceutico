'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const disabledWorker = read('service-worker.js');
const pushWorker = read('push/OneSignalSDKWorker.js');
const portal = read('index.html');
const autoUpdate = read('portal-auto-update.js');
const notifications = read('agenda-enfermeira.js');
const health = read('portal-notification-health.js');
const repair = read('portal-notification-repair-v9.js');

// O worker raiz é apenas um limpador de legado. Ele não pode controlar navegação/cache atual.
assert.match(disabledWorker, /caches\.keys\(\)/, 'Worker raiz precisa continuar removendo caches legados.');
assert.match(disabledWorker, /self\.registration\.unregister\(\)/, 'Worker raiz precisa continuar se desregistrando.');
assert.doesNotMatch(disabledWorker, /addEventListener\(['\"]fetch['\"]/, 'Worker raiz não pode interceptar fetch do Portal.');

// OneSignal fica isolado no próprio worker e escopo /push/.
assert.strictEqual(
  pushWorker.trim(),
  "importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');",
  'Worker OneSignal deve continuar sendo o SDK oficial v16 sem lógica paralela.'
);
assert.match(notifications, /serviceWorkerPath:\s*['\"]\/atendimento-acs-farmaceutico\/push\/OneSignalSDKWorker\.js['\"]/, 'OneSignal deve usar exclusivamente o worker /push/.');
assert.match(notifications, /scope:\s*['\"]\/atendimento-acs-farmaceutico\/push\/['\"]/, 'Escopo OneSignal deve permanecer restrito a /push/.');
assert.match(notifications, /https:\/\/cdn\.onesignal\.com\/sdks\/web\/v16\/OneSignalSDK\.page\.js/, 'SDK de página OneSignal deve permanecer v16.');
assert.match(notifications, /script\[data-onesignal-sdk\]/, 'Carregamento do SDK deve continuar deduplicado.');

// Uma única rotina é dona do init; health/repair apenas consomem OneSignalDeferred.
const initCount = (notifications.match(/OneSignal\.init\s*\(/g) || []).length;
assert.strictEqual(initCount, 1, 'Deve existir exatamente uma inicialização OneSignal no controlador oficial.');
assert.doesNotMatch(health, /OneSignal\.init\s*\(/, 'Health não pode criar uma segunda inicialização OneSignal.');
assert.doesNotMatch(repair, /OneSignal\.init\s*\(/, 'Repair não pode criar uma segunda inicialização OneSignal.');

// Arquivos efetivamente carregados pelo Portal não podem registrar o worker raiz desativado.
const loadedRuntime = [
  ['index.html', portal],
  ['portal-auto-update.js', autoUpdate],
  ['agenda-enfermeira.js', notifications],
  ['portal-notification-health.js', health],
  ['portal-notification-repair-v9.js', repair]
];
for (const [name, source] of loadedRuntime) {
  assert.doesNotMatch(source, /serviceWorker\.register\s*\([^)]*service-worker\.js/i, `${name} não pode registrar o worker raiz desativado.`);
  assert.doesNotMatch(source, /navigator\.serviceWorker\.register\s*\(\s*['\"]\/atendimento-acs-farmaceutico\/service-worker\.js/i, `${name} não pode reativar o worker legado.`);
}

// As rotinas de saúde/reparo não podem desregistrar workers: isso destruiria Push já funcional.
assert.doesNotMatch(health, /serviceWorker[^\n;]*unregister\s*\(/i, 'Health não pode desregistrar Service Worker.');
assert.doesNotMatch(repair, /serviceWorker[^\n;]*unregister\s*\(/i, 'Repair não pode desregistrar Service Worker.');

console.log('ONESIGNAL_WORKER_ISOLATION_V1_OK');
