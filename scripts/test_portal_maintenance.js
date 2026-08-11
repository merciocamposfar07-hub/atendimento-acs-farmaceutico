'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');

const ROOT = path.resolve(__dirname, '..');

function event(parameters) {
  return {parameter: Object.assign({}, parameters)};
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeSheet(name) {
  const rows = [];
  return {
    name,
    rows,
    getName() { return name; },
    getLastRow() { return rows.length; },
    setFrozenRows() {},
    appendRow(row) { rows.push(row.slice()); },
    getRange(row, column, rowCount, columnCount) {
      return {
        setValues(values) {
          for (let r = 0; r < values.length; r += 1) {
            rows[row - 1 + r] = values[r].slice();
          }
          return this;
        },
        getDisplayValues() {
          const out = [];
          for (let r = 0; r < rowCount; r += 1) {
            const source = rows[row - 1 + r] || [];
            out.push(source.slice(column - 1, column - 1 + columnCount).map(String));
          }
          return out;
        },
        setNumberFormat() { return this; }
      };
    }
  };
}

function appsScriptContext() {
  const properties = new Map();
  const cache = new Map();
  const sheets = new Map();
  let originalPosts = 0;

  const spreadsheet = {
    getSheetByName(name) { return sheets.get(name) || null; },
    insertSheet(name) {
      const sheet = makeSheet(name);
      sheets.set(name, sheet);
      return sheet;
    }
  };

  const context = vm.createContext({
    console,
    Date,
    JSON,
    Math,
    Object,
    Array,
    String,
    Number,
    RegExp,
    doGet() { return {original: 'get'}; },
    doPost() { originalPosts += 1; return {original: 'post'}; },
    tacsGetPublic_() { return {ok: true, recados: [], campanhas: []}; },
    profissionaisDinamicosV1ValidarSessao_(p) {
      if (p.token !== 'token' || p.dispositivo !== 'iphone') {
        throw new Error('Sessão inválida.');
      }
      return {areaId: 'JAPARANDUBA', operadorId: 'ADMIN_GERAL'};
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(key) { return properties.has(key) ? properties.get(key) : null; },
          setProperty(key, value) { properties.set(key, String(value)); return this; },
          deleteProperty(key) { properties.delete(key); return this; }
        };
      }
    },
    CacheService: {
      getScriptCache() {
        return {
          get(key) { return cache.has(key) ? cache.get(key) : null; },
          put(key, value) { cache.set(key, String(value)); },
          remove(key) { cache.delete(key); }
        };
      }
    },
    LockService: {
      getScriptLock() {
        return {tryLock() { return true; }, releaseLock() {}};
      }
    },
    SpreadsheetApp: {
      getActiveSpreadsheet() { return spreadsheet; }
    },
    Utilities: {
      getUuid() { return '12345678-1234-1234-1234-123456789abc'; }
    },
    HtmlService: {
      XFrameOptionsMode: {ALLOWALL: 'ALLOWALL'},
      createHtmlOutput(content) {
        return {
          content,
          setXFrameOptionsMode() { return this; }
        };
      }
    },
    ContentService: {
      MimeType: {JSON: 'JSON', JAVASCRIPT: 'JAVASCRIPT'},
      createTextOutput(content) {
        return {
          content,
          setMimeType() { return this; }
        };
      }
    }
  });

  context.__originalPosts = () => originalPosts;
  context.__sheets = sheets;
  return context;
}

function result(context, requestId) {
  const response = context.doGet(event({action: 'admin_result', requestId}));
  const envelope = JSON.parse(response.content);
  return envelope.result;
}

function testBackend() {
  const source = fs.readFileSync(
    path.join(ROOT, 'apps-script/ZZZZ_16_PortalManutencaoNotificacoesV1.gs'),
    'utf8'
  );
  new vm.Script(source, {filename: 'ZZZZ_16_PortalManutencaoNotificacoesV1.gs'});
  const context = appsScriptContext();
  vm.runInContext(source, context);

  let publicStatus = JSON.parse(
    context.doGet(event({action: 'portal_manutencao_status', callback: ''})).content
  );
  assert.equal(publicStatus.ativa, false);

  context.doPost(event({
    action: 'admin_portal_manutencao_ativar',
    requestId: 'ativar_12345678',
    token: 'token',
    dispositivo: 'iphone'
  }));
  const activated = result(context, 'ativar_12345678');
  assert.equal(activated.ok, true);
  assert.equal(activated.ativa, true);
  assert.equal(activated.alterada, true);

  const publicData = context.tacsGetPublic_();
  assert.equal(publicData.portalEmManutencao, true);
  assert.equal(publicData.manutencao.areaId, 'JAPARANDUBA');

  context.doPost(event({
    action: 'admin_publicar_notificacao',
    requestId: 'push_teste_12345',
    token: 'token',
    dispositivo: 'iphone',
    areaId: 'JAPARANDUBA',
    titulo: 'Teste',
    mensagem: 'Não enviar'
  }));
  const blocked = result(context, 'push_teste_12345');
  assert.equal(blocked.skipped, true);
  assert.equal(blocked.maintenance, true);
  assert.equal(context.__originalPosts(), 0);

  const bypass = context.doPost(event({
    action: 'admin_publicar_notificacao',
    requestId: 'push_manut_12345',
    token: 'token',
    dispositivo: 'iphone',
    areaId: 'JAPARANDUBA',
    comunicadoManutencao: 'true',
    titulo: context.TACS_PORTAL_MANUTENCAO_V1.TITULO_COMUNICADO,
    mensagem: context.TACS_PORTAL_MANUTENCAO_V1.MENSAGEM_COMUNICADO
  }));
  assert.equal(bypass.original, 'post');
  assert.equal(context.__originalPosts(), 1);

  context.doPost(event({
    action: 'admin_portal_manutencao_desativar',
    requestId: 'desativar_123456',
    token: 'token',
    dispositivo: 'iphone'
  }));
  const deactivated = result(context, 'desativar_123456');
  assert.equal(deactivated.ativa, false);

  const regular = context.doPost(event({
    action: 'admin_publicar_notificacao',
    requestId: 'push_normal_1234',
    token: 'token',
    dispositivo: 'iphone',
    areaId: 'JAPARANDUBA',
    titulo: 'Recado',
    mensagem: 'Enviar'
  }));
  assert.equal(regular.original, 'post');
  assert.equal(context.__originalPosts(), 2);

  const audit = context.__sheets.get('TACS_AUDIT_MANUTENCAO');
  assert.ok(audit);
  assert.equal(audit.rows.length, 3, 'A auditoria deve ter cabeçalho e duas mudanças.');
}

async function testPublicGuard() {
  const source = fs.readFileSync(path.join(ROOT, 'portal-manutencao.js'), 'utf8');
  let response = {ok: true, ativa: false, areaId: 'JAPARANDUBA'};
  const dom = new JSDOM('<!doctype html><html><head></head><body><button id="send">Enviar</button></body></html>', {
    url: 'https://portal.test/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const {window} = dom;
  const originalAppend = window.Element.prototype.appendChild;
  window.Element.prototype.appendChild = function append(node) {
    if (node && node.tagName === 'SCRIPT' && /portal_manutencao_status/.test(node.src)) {
      const appended = originalAppend.call(this, node);
      const callback = new URL(node.src).searchParams.get('callback');
      setTimeout(() => window[callback](response), 0);
      return appended;
    }
    return originalAppend.call(this, node);
  };

  window.eval(source);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await wait(20);
  assert.equal(window.PortalTacsManutencao.disponivel(), true);
  assert.equal(window.document.getElementById('portalManutencaoTela').hidden, true);

  response = {
    ok: true,
    ativa: true,
    areaId: 'JAPARANDUBA',
    mensagem: 'Portal em teste.'
  };
  await window.PortalTacsManutencao.atualizar();
  assert.equal(window.PortalTacsManutencao.disponivel(), false);
  assert.equal(window.document.getElementById('portalManutencaoTela').hidden, false);
  assert.equal(window.document.getElementById('portalManutencaoMensagem').textContent, 'Portal em teste.');
  window.close();
}

function testAdminRules() {
  const source = fs.readFileSync(
    path.join(ROOT, 'teste-v1/painel-recados-campanhas-v1.html'),
    'utf8'
  );
  assert.match(source, /ATIVAR PORTAL EM MANUTENÇÃO/);
  assert.match(source, /forcarRepublicacao:'true'/);
  assert.match(source, /deveNotificarPublicacao\(\{ativo:'true'\}\)===true/);
  assert.match(source, /Portal em manutenção: conteúdo salvo para teste, sem notificar/);
  assert.doesNotMatch(source, /Nenhuma notificação duplicada foi gerada/);
}

async function main() {
  testBackend();
  await testPublicGuard();
  testAdminRules();
  console.log('Manutenção: estado público, bloqueio duplo, comunicado único e republicação validados.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
