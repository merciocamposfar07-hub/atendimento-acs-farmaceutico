const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {JSDOM} = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');

function testBackendStabilityFallback() {
  const backend = read('apps-script/ZZZZ_21_PerformanceCacheV101.gs');
  assert.ok(backend.includes("ATIVO: false"), 'Cache global do Apps Script deve permanecer desativado após o gate live');
  assert.ok(backend.includes('cache-global-desativado-por-gate-live'), 'Motivo da desativação deve ficar documentado');
  assert.ok(!/\bdoGet\s*=\s*function/.test(backend), 'Módulo de desempenho não pode envolver doGet');
  assert.ok(!/\bdoPost\s*=\s*function/.test(backend), 'Módulo de desempenho não pode envolver doPost');
  assert.ok(!backend.includes('CacheService.getScriptCache'), 'Fallback estável não deve executar CacheService global');
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
  window.localStorage.setItem('portalTacsDentalAgendaV103FullWeek:JAPARANDUBA', JSON.stringify({
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
  assert.ok(!auto.includes("'portalTacsDentalAgendaV103FullWeek'"), 'Atualizar não deve apagar snapshot odontológico completo');
  assert.ok(auto.includes('if(!pageSeen)'), 'Primeira leitura de versão não deve forçar recarga');
  assert.ok(auto.includes('if(pageSeen!==remote)'), 'Recarga automática deve ocorrer somente quando a versão mudar');

  const warm = read('admin-warmup.js');
  assert.ok(warm.includes('var TIMEOUT_MS=6000;'));
  assert.ok(warm.includes('var WARM_MS=3*60*1000;'));

  const agenda = read('painel-oficial-agendas-vagas.html');
  assert.ok(agenda.includes("DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV102:'+areaId"));
  assert.ok(agenda.includes('Aguarde a confirmação dos dados atuais antes de salvar.'), 'Snapshot não pode habilitar escrita antes de revalidação');
  assert.ok(agenda.includes('aplicarDados(r,true);salvarSnapshot(r);'));

  const index = read('index.html');
  assert.ok(index.includes('portal-auto-update.js?v=20260812-v101'));
  assert.ok(/portal-odontologia-segunda-sexta\.js\?v=[A-Za-z0-9._-]+/.test(index), 'Odontologia deve carregar com revisão explícita para invalidar cache');
  assert.ok(index.includes('if(!window.PortalTacsOdontologiaV98)loadDental()'), 'Rotina odontológica antiga só pode atuar como fallback');

  const release = read('scripts/build_apps_script_release.js');
  assert.ok(release.includes("marker: 'TACS_PERFORMANCE_CACHE_V101'"), 'Arquivo neutro deve substituir a versão instável no Apps Script real');

  const dental = read('portal-odontologia-segunda-sexta.js');
  assert.ok(dental.includes("var REGULAR = 'Solicitar atendimento odontológico (dentista)'"));
  assert.ok(dental.includes("var EMERGENCY = 'Solicitar atendimento odontológico de emergência (dentista)'"));
  assert.ok(dental.includes("add('action', 'reservar')"), 'Reserva real deve permanecer via backend');
  assert.ok(dental.includes("add('areaId', AREA_ID)"), 'Reserva deve permanecer vinculada à área do Portal');
  assert.ok(dental.includes('optimisticRemaining: Math.max(0, Number(available) - 1)'), 'Redução imediata da vaga deve permanecer');
  assert.ok(dental.includes('validDocument(el(\'cpf\') && el(\'cpf\').value)'), 'CPF/CNS deve permanecer aceito');
}

(async () => {
  testBackendStabilityFallback();
  await testDentalCacheFirst();
  testStaticSafety();
  console.log('PERFORMANCE_V101_TESTS_OK');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
