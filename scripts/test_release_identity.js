'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'apps-script', 'PortalRouterV1.gs'), 'utf8');

assert.match(source, /RELEASE_ID:\s*'20260807-estavel-v1'/);
assert.match(source, /function tacsRouterV1ComRelease_/);
assert.match(source, /dados\.releaseId\s*=\s*TACS_PORTAL_ROUTER_V1\.RELEASE_ID/);
assert.match(source, /dados\s*=\s*tacsRouterV1ComRelease_\(dados\)/);
assert.match(source, /resultado\s*=\s*tacsRouterV1ComRelease_\(resultado\)/);

const context = {
  JSON,
  String,
  RegExp,
  Error,
  ContentService: {
    MimeType: {JSON: 'json', JAVASCRIPT: 'javascript'},
    createTextOutput(text) {
      return {text, mime:'', setMimeType(type) { this.mime = type; return this; }};
    }
  },
  HtmlService: {
    XFrameOptionsMode: {ALLOWALL:'allowall'},
    createHtmlOutput(text) {
      return {text, setXFrameOptionsMode() { return this; }};
    }
  }
};
vm.createContext(context);
vm.runInContext(source, context);

const publicResponse = context.tacsRouterV1Responder_({ok:true}, 'cbRelease');
assert.equal(publicResponse.mime, 'javascript');
assert.match(publicResponse.text, /"releaseId":"20260807-estavel-v1"/);

const adminResponse = context.tacsRouterV1ResponderPostAdmin_({ok:true}, 'req_12345678');
assert.match(adminResponse.text, /"releaseId":"20260807-estavel-v1"/);

console.log('OK: identidade única da release acompanha respostas públicas e administrativas.');
