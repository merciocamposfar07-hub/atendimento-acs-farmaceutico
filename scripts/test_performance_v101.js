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

async function buildDentalDom(ageMs, areaId='JAPARANDUBA') {
  const dom = new JSDOM(dentalHtml(), {
    url: `https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/?area=${areaId}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const {window} = dom;
  window.TACS_AREA_ID = areaId;
  window.DENTAL_AGENDA_API_URL = 'https://script.google.com/macros/s/test/exec';
  window.localStorage.setItem(`portalTacsDentalAgendaV103FullWeek:${areaId}`, JSON.stringify({
    savedAt: Date.now() - ageMs,
    data: {
      ok: true,
      dias: [{
        id: 'DENTISTA-TESTE', dia: 'Quinta-feira', data: '2099-08-13',
        vagasComuns: 2, vagasEmergenciais: 1, ativo:true
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
  assert.equal(freshCommon.disabled, false, 'Cache de até 90s pode iniciar reserva, ainda validada no servidor');
  assert.ok(/Confirmando|Última agenda/.test(document.getElementById('dentalStatus').textContent), 'Status deve explicar revalidação em segundo plano');
  assert.equal(dom.window.__PORTAL_TACS_ODONTOLOGIA_V98__, true, 'Controlador odontológico atual deve estar carregado');
  dom.window.close();

  dom = await buildDentalDom(2 * 60 * 1000);
  document = dom.window.document;
  assert.equal(document.querySelectorAll('.sheet-dental-card').length, 1, 'Cache antigo, porém válido para visualização, deve evitar tela vazia');
  const staleCommon = document.querySelector('.sheet-dental-choice.common');
  assert.ok(staleCommon, 'Cache antigo ainda deve mostrar a agenda');
  assert.equal(staleCommon.disabled, true, 'Cache acima de 90s não pode permitir reserva até confirmação atual');
  assert.match(document.getElementById('dentalStatus').textContent,/Última agenda|Atualizando/);
  dom.window.close();

  dom = await buildDentalDom(5 * 1000, 'SITIO_MATIAS');
  assert.equal(dom.window.document.querySelectorAll('.sheet-dental-card').length, 1, 'Cache deve funcionar isoladamente em outra área');
  assert.ok(dom.window.localStorage.getItem('portalTacsDentalAgendaV103FullWeek:SITIO_MATIAS'), 'Cache deve ser territorial');
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
  assert.ok(agenda.includes('Aguarde a confirmação dos dados atuais antes de salvar.'), 'Snapshot administrativo não pode habilitar escrita antes de revalidação');
  assert.ok(agenda.includes('aplicarDados(r,true);salvarSnapshot(r);'));

  const index = read('index.html');
  assert.ok(/portal-auto-update\.js\?v=[A-Za-z0-9._-]+/.test(index), 'Atualização pública deve usar revisão explícita');
  assert.ok(index.includes('portal-odontologia-segunda-sexta.js?v=20260818-cache-territorial-v115'), 'Odontologia deve invalidar cache do JavaScript ao ativar v115');
  assert.ok(index.includes('if(!window.__PORTAL_TACS_ODONTOLOGIA_V98__)loadDental()'), 'Fallback antigo só pode atuar se o controlador externo não carregar');

  const release = read('scripts/build_apps_script_release.js');
  assert.ok(release.includes("marker: 'TACS_PERFORMANCE_CACHE_V101'"), 'Arquivo neutro deve substituir a versão instável no Apps Script real');

  const dental = read('portal-odontologia-segunda-sexta.js');
  assert.ok(dental.includes("CACHE_PREFIX = 'portalTacsDentalAgendaV103FullWeek:'"), 'Snapshot odontológico deve continuar disponível');
  assert.ok(dental.includes('CACHE_FRESH_MS = 90 * 1000'), 'Snapshot acima de 90s deve exigir revalidação antes da escolha');
  assert.ok(dental.includes('CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000'), 'Snapshot visual deve ter validade limitada');
  assert.ok(dental.includes("var REGULAR = 'Solicitar atendimento odontológico (dentista)'"));
  assert.ok(dental.includes("params.set('action', 'reservar_get')"), 'Reserva real deve permanecer via backend JSONP atual');
  assert.ok(dental.includes("params.set('areaId', currentAreaId())"), 'Reserva deve permanecer vinculada à área do Portal');
  assert.ok(dental.includes("action=agenda&areaId=' + encodeURIComponent(currentAreaId())"), 'Leitura da agenda também deve ser territorial');
  assert.ok(dental.includes('optimisticRemaining: Math.max(0, Number(available) - 1)'), 'Redução imediata da vaga deve permanecer');
  assert.ok(dental.includes("expiredByConfiguredTime(slot.date, slot.expiresAt)"), 'Expiração por hora de Recife deve continuar filtrando o snapshot');
  assert.ok(dental.includes("validDocument(el('cpf') && el('cpf').value)"), 'CPF/CNS deve permanecer aceito');
}

(async () => {
  testBackendStabilityFallback();
  await testDentalCacheFirst();
  testStaticSafety();
  console.log('PERFORMANCE_V115_TESTS_OK');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
