const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const {JSDOM} = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');

function response(text) {
  return {getContent: () => text};
}

function makeContentService() {
  return {
    MimeType: {JAVASCRIPT: 'application/javascript', JSON: 'application/json'},
    createTextOutput(text) {
      return {
        _text: text,
        setMimeType() { return this; },
        getContent() { return this._text; }
      };
    }
  };
}

function parseJsonp(text, callback) {
  const prefix = callback + '(';
  assert.ok(text.startsWith(prefix), `Resposta deveria iniciar com ${prefix}`);
  assert.ok(text.endsWith(');'), 'JSONP deveria terminar com );');
  return JSON.parse(text.slice(prefix.length, -2));
}

function testBackendCache() {
  const code = read('apps-script/ZZZZ_21_PerformanceCacheV101.gs');
  const store = new Map();
  const calls = {get: 0, post: 0};
  let sequence = 0;

  const cache = {
    get(key) { return store.has(key) ? store.get(key) : null; },
    put(key, value) { store.set(key, value); }
  };

  const context = {
    console,
    Date,
    JSON,
    Object,
    String,
    Number,
    RegExp,
    CacheService: {getScriptCache: () => cache},
    ContentService: makeContentService(),
    HtmlService: {createHtmlOutput: (text) => response(text)},
    doGet(e) {
      calls.get += 1;
      sequence += 1;
      const p = (e && e.parameter) || {};
      if (p.action === 'falha_teste') return response(JSON.stringify({ok: false, sequence}));
      return response(JSON.stringify({
        ok: true,
        action: p.action,
        areaId: p.areaId || 'JAPARANDUBA',
        sequence
      }));
    },
    doPost(e) {
      calls.post += 1;
      return response(JSON.stringify({ok: true, action: e && e.parameter && e.parameter.action}));
    }
  };
  vm.createContext(context);
  vm.runInContext(code, context, {filename: 'ZZZZ_21_PerformanceCacheV101.gs'});

  let out = context.doGet({parameter: {action: 'agenda', areaId: 'JAPARANDUBA', callback: 'cbA'}}).getContent();
  let a = parseJsonp(out, 'cbA');
  assert.equal(a.sequence, 1);
  assert.equal(calls.get, 1, 'Primeira agenda deve consultar backend anterior');

  out = context.doGet({parameter: {action: 'agenda', areaId: 'JAPARANDUBA', callback: 'cbB'}}).getContent();
  let b = parseJsonp(out, 'cbB');
  assert.equal(b.sequence, 1, 'Segunda agenda deve vir do cache');
  assert.equal(b.cachePerformanceV101, true, 'Resposta em cache deve ser identificável internamente');
  assert.equal(calls.get, 1, 'Callback diferente não deve causar nova leitura');

  out = context.doGet({parameter: {action: 'agenda', areaId: 'AREA_2', callback: 'cbC'}}).getContent();
  let c = parseJsonp(out, 'cbC');
  assert.equal(c.sequence, 2, 'Área diferente precisa de cache separado');
  assert.equal(calls.get, 2);

  context.doPost({parameter: {action: 'admin_dados'}});
  context.doGet({parameter: {action: 'agenda', areaId: 'JAPARANDUBA', callback: 'cbD'}});
  assert.equal(calls.get, 2, 'Leitura administrativa não deve invalidar cache público');

  context.doPost({parameter: {action: 'reservar'}});
  out = context.doGet({parameter: {action: 'agenda', areaId: 'JAPARANDUBA', callback: 'cbE'}}).getContent();
  let e = parseJsonp(out, 'cbE');
  assert.equal(e.sequence, 3, 'Reserva deve invalidar cache antes da próxima leitura');
  assert.equal(calls.get, 3);

  context.doPost({parameter: {action: 'admin_salvar_agenda'}});
  context.doGet({parameter: {action: 'painel_publico', areaId: 'JAPARANDUBA', callback: 'cbF'}});
  assert.equal(calls.get, 4, 'Salvamento administrativo deve criar nova geração de cache');

  const status1 = parseJsonp(context.doGet({parameter: {action: 'admin_status', callback: 's1'}}).getContent(), 's1');
  const status2 = parseJsonp(context.doGet({parameter: {action: 'admin_status', callback: 's2'}}).getContent(), 's2');
  assert.equal(status1.sequence, status2.sequence, 'admin_status deve aproveitar cache curto');

  const beforeUnknown = calls.get;
  context.doGet({parameter: {action: 'acao_nao_cacheada', callback: 'x1'}});
  context.doGet({parameter: {action: 'acao_nao_cacheada', callback: 'x2'}});
  assert.equal(calls.get, beforeUnknown + 2, 'Ação não autorizada para cache deve passar direto');
}

function dentalHtml() {
  return `<!doctype html><html><body>
    <select id="category"><option selected>Solicitar atendimento odontológico (dentista)</option></select>
    <div id="dentalSlots"></div><div id="dentalTitle"></div><div id="dentalHelp"></div><div id="dentalStatus"></div>
    <textarea id="subject"></textarea><button id="send" disabled>Enviar</button>
    <input id="name" value="Pessoa Teste"><input id="locality" value="Japaranduba">
    <input id="cpf" value="529.982.247-25"><input id="birth" value="01/01/1990">
    <div id="dentalEmergency" hidden></div>
  </body></html>`;
}

async function buildDentalDom(ageMs) {
  const dom = new JSDOM(dentalHtml(), {
    url: 'https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const {window} = dom;
  window.DENTAL_AGENDA_API_URL = 'https://script.google.com/macros/s/test/exec';
  window.localStorage.setItem('portalTacsDentalAgendaV101', JSON.stringify({
    savedAt: Date.now() - ageMs,
    data: {
      ok: true,
      dias: [{
        id: 'DENTISTA-TESTE', dia: 'Quinta-feira', data: '2099-08-13',
        vagasComuns: 2, vagasEmergenciais: 1
      }]
    }
  }));
  window.eval(read('portal-odontologia-segunda-sexta.js'));
  await new Promise((resolve) => setTimeout(resolve, 20));
  return dom;
}

async function testDentalCacheFirst() {
  let dom = await buildDentalDom(5 * 1000);
  let {document} = dom.window;
  assert.equal(document.querySelectorAll('.sheet-dental-card').length, 1, 'Agenda em cache deve aparecer sem esperar Apps Script');
  const freshCommon = document.querySelector('.sheet-dental-choice.common');
  assert.ok(freshCommon, 'Vaga comum em cache deve ser renderizada');
  assert.equal(freshCommon.disabled, false, 'Cache muito recente pode iniciar reserva, que continuará validada no servidor');
  assert.ok(/Confirmando|Última agenda/.test(document.getElementById('dentalStatus').textContent), 'Status deve explicar revalidação em segundo plano');
  assert.ok(dom.window.PortalTacsOdontologiaV98 && typeof dom.window.PortalTacsOdontologiaV98.atualizar === 'function', 'Odontologia deve expor atualização sem reload total');
  dom.window.close();

  dom = await buildDentalDom(2 * 60 * 1000);
  document = dom.window.document;
  assert.equal(document.querySelectorAll('.sheet-dental-card').length, 1, 'Cache antigo, porém válido para visualização, deve evitar tela vazia');
  const staleCommon = document.querySelector('.sheet-dental-choice.common');
  assert.equal(staleCommon.disabled, true, 'Cache acima de 90s não pode permitir reserva até confirmação atual');
  dom.window.close();
}

function testStaticSafety() {
  const auto = read('portal-auto-update.js');
  assert.ok(auto.includes('var CHECK_INTERVAL=60000;'));
  assert.ok(auto.includes('smartRefresh(button)'));
  assert.ok(!auto.includes("'portalTacsPublicDataV4'"), 'Atualizar não deve apagar cache público V4');
  assert.ok(!auto.includes("'portalTacsDentalAgendaV101'"), 'Atualizar não deve apagar snapshot odontológico');

  const warm = read('admin-warmup.js');
  assert.ok(warm.includes('var TIMEOUT_MS=6000;'));
  assert.ok(warm.includes('var WARM_MS=3*60*1000;'));

  const agenda = read('painel-oficial-agendas-vagas.html');
  assert.ok(agenda.includes("DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV101'"));
  assert.ok(agenda.includes('Aguarde a confirmação dos dados atuais antes de salvar.'), 'Snapshot não pode habilitar escrita antes de revalidação');
  assert.ok(agenda.includes('aplicarDados(r,true);salvarSnapshot(r);'));

  const index = read('index.html');
  assert.ok(index.includes('portal-auto-update.js?v=20260812-v101'));
  assert.ok(index.includes('portal-odontologia-segunda-sexta.js?v=20260812-desempenho-v101'));

  const release = read('scripts/build_apps_script_release.js');
  assert.ok(release.includes("marker: 'TACS_PERFORMANCE_CACHE_V101'"));

  const dental = read('portal-odontologia-segunda-sexta.js');
  assert.ok(dental.includes("var REGULAR = 'Solicitar atendimento odontológico (dentista)'"));
  assert.ok(dental.includes("var EMERGENCY = 'Solicitar atendimento odontológico de emergência (dentista)'"));
  assert.ok(dental.includes("add('action', 'reservar')"), 'Reserva real deve permanecer via backend');
  assert.ok(dental.includes('optimisticRemaining: Math.max(0, Number(available) - 1)'), 'Redução imediata da vaga deve permanecer');
  assert.ok(dental.includes('validDocument(el(\'cpf\') && el(\'cpf\').value)'), 'CPF/CNS deve permanecer aceito');
}

(async () => {
  testBackendCache();
  await testDentalCacheFirst();
  testStaticSafety();
  console.log('PERFORMANCE_V101_TESTS_OK');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
