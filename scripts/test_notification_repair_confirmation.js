
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs', 'utf8');
new vm.Script(source, {filename: 'ZZZZ_19_NotificacoesSegmentadasV1.gs'});
const cache = new Map();
const fetched = [];
const context = vm.createContext({
  console, JSON, Date, Math, Object, Array, String, Number, RegExp,
  doGet() { return {legacy: 'get'}; },
  doPost() { return {legacy: 'post'}; },
  PropertiesService: {getScriptProperties() {return {getProperty(key) {
    if (key === 'TACS_ONESIGNAL_API_KEY') return 'secret-test-key';
    if (key === 'TACS_ONESIGNAL_APP_ID') return 'e2294b98-c72b-4f8c-a055-de28979676dc';
    return null;
  }};}},
  CacheService: {getScriptCache() {return {get(key) {return cache.has(key) ? cache.get(key) : null;}, put(key, value) {cache.set(key, String(value));}};}},
  UrlFetchApp: {fetch(url, options) {fetched.push({url, options}); return {getResponseCode() {return 200;}, getContentText() {return JSON.stringify({id: 'confirmacao-001', recipients: 1});}};}},
  moradoresAdminV1NormalizarAreaId_(value) {return String(value || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '');},
  moradoresAdminV1EncontrarAreaConfigurada_(areaId) {return areaId === 'JAPARANDUBA' ? {areaId: 'JAPARANDUBA', areaNome: 'Sítio Japaranduba', publica: true} : null;},
  moradoresAdminV1Hash_(value) {return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);},
  HtmlService: {XFrameOptionsMode: {ALLOWALL: 'ALLOWALL'}, createHtmlOutput(content) {return {content, setXFrameOptionsMode() {return this;}};}},
  ContentService: {MimeType: {JSON: 'JSON', JAVASCRIPT: 'JAVASCRIPT'}, createTextOutput(content) {return {content, setMimeType() {return this;}};}}
});
vm.runInContext(source, context);
const subscriptionId = '12345678-1234-4abc-8def-1234567890ab';
const requestId = 'reparo_test_001';
const response = context.doPost({parameter: {action: 'publico_confirmar_reparo_notificacao', requestId, subscriptionId, areaId: 'JAPARANDUBA'}});
assert.match(response.content, /notificacoes-area-tacs-v1/);
assert.match(response.content, /confirmacao-001/);
assert.equal(fetched.length, 1);
const payload = JSON.parse(fetched[0].options.payload);
assert.deepEqual(Array.from(payload.include_subscription_ids), [subscriptionId]);
assert.equal(Object.prototype.hasOwnProperty.call(payload, 'filters'), false);
assert.equal(payload.headings.pt, 'Portal TACS — avisos restabelecidos');
assert.match(payload.contents.pt, /Este aparelho está pronto para receber novos recados e avisos/);
assert.equal(payload.data.areaId, 'JAPARANDUBA');
context.doPost({parameter: {action: 'publico_confirmar_reparo_notificacao', requestId: 'reparo_test_002', subscriptionId, areaId: 'JAPARANDUBA'}});
assert.equal(fetched.length, 1);
const invalid = context.doPost({parameter: {action: 'publico_confirmar_reparo_notificacao', requestId: 'reparo_test_003', subscriptionId: 'nao-e-uuid', areaId: 'JAPARANDUBA'}});
assert.match(invalid.content, /não pôde ser validada/);
assert.equal(fetched.length, 1);
const result = context.doGet({parameter: {action: 'publico_notificacao_reparo_result', requestId, callback: 'cbTeste'}});
assert.match(result.content, /^cbTeste\(/);
assert.match(result.content, /confirmacao-001/);
console.log('Confirmação individual de reparo: alvo único, texto fixo, limite e resultado público validados.');
