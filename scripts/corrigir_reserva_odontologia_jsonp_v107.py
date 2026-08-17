from pathlib import Path
import json


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'Trecho não encontrado em {path}: {old[:180]!r}')
    p.write_text(text.replace(old, new, 1))


dental_path = Path('portal-odontologia-segunda-sexta.js')
dental = dental_path.read_text()

old_refresh = """  var shouldDisable = !formReady();
  if (send.hidden) send.hidden = false;
"""
new_refresh = """  // A vaga é reservada no clique. O envio só é liberado depois que o
  // Apps Script confirma a gravação; não existe nova conferência no botão Enviar.
  var shouldDisable = !formReady() || !selection.confirmed;
  if (send.hidden) send.hidden = false;
"""
if new_refresh not in dental:
    if old_refresh not in dental:
        raise SystemExit('refreshSend não encontrado')
    dental = dental.replace(old_refresh, new_refresh, 1)

marker = """  function queueDurableReservation(item) {
"""
jsonp_function = """  function reserveViaJsonp(item) {
    return new Promise(function (resolve, reject) {
      if (!API) { reject(new Error('A vaga não está conectada à planilha.')); return; }
      var callbackName = 'dentalV107Reserve' + Date.now() + Math.floor(Math.random() * 10000);
      var script = document.createElement('script');
      var finished = false;
      var timer = setTimeout(function () {
        var timeout = new Error('A reserva ainda não respondeu.');
        timeout.code = 'TIMEOUT';
        finish(timeout);
      }, 12000);

      function cleanup() {
        clearTimeout(timer);
        try { delete window[callbackName]; } catch (error) { window[callbackName] = undefined; }
        if (script.parentNode) script.remove();
      }
      function finish(error, data) {
        if (finished) return;
        finished = true;
        cleanup();
        error ? reject(error) : resolve(data || {});
      }

      window[callbackName] = function (data) {
        if (!data || data.ok === false) {
          var error = new Error(data && data.message ? data.message : 'Não foi possível reservar a vaga.');
          error.code = clean(data && data.code);
          finish(error);
          return;
        }
        finish(null, data);
      };
      script.onerror = function () {
        var error = new Error('Não foi possível confirmar a reserva.');
        error.code = 'TIMEOUT';
        finish(error);
      };
      script.src = API + (API.indexOf('?') === -1 ? '?' : '&') +
        'action=reservar_get&areaId=' + encodeURIComponent(AREA_ID) +
        '&requestId=' + encodeURIComponent(item.requestId) +
        '&date=' + encodeURIComponent(item.date) +
        '&type=' + encodeURIComponent(item.type) +
        '&callback=' + encodeURIComponent(callbackName) +
        '&v=' + Date.now();
      document.head.appendChild(script);
    });
  }

"""
if 'function reserveViaJsonp(item)' not in dental:
    if marker not in dental:
        raise SystemExit('Ponto de inserção JSONP não encontrado')
    dental = dental.replace(marker, jsonp_function + marker, 1)

# Todas as tentativas funcionais de gravação passam pelo mesmo canal JSONP que
# comprovadamente carrega a agenda no Safari. Os transportes fire-and-forget ficam
# fora do caminho crítico, pois não confirmam execução antes da navegação.
dental = dental.replace('  postReservation(item).then(function (result) {', '  reserveViaJsonp(item).then(function (result) {', 1)

old_persist_start = """  function persistInBackground(item) {
    postReservation(item).then(function (result) {
"""
new_persist_start = """  function persistInBackground(item) {
    reserveViaJsonp(item).then(function (result) {
"""
if new_persist_start not in dental:
    if old_persist_start not in dental:
        raise SystemExit('persistInBackground não encontrado')
    dental = dental.replace(old_persist_start, new_persist_start, 1)

# Não disparar fetch/sendBeacon não confirmados no clique. A gravação JSONP começa
# logo abaixo, ainda no clique da vaga, e retorna o remaining real do servidor.
dental = dental.replace("    queueDurableReservation(item);\n\n    var category", "    var category", 1)

# O pagehide não tenta uma segunda família de transportes. A reserva já foi iniciada
# no clique e usa requestId idempotente.
dental = dental.replace("""    window.addEventListener('pagehide', function () {
      if (selection && !selection.confirmed) queueDurableReservation(selection);
    });
""", """    window.addEventListener('pagehide', function () {
      // Não iniciar nova reserva ao sair da página; evita concorrência de transportes.
    });
""", 1)

# Contrato público: só pode enviar depois da confirmação que ocorreu no clique.
dental = dental.replace("""    prontoParaEnvio: function () {
      return Boolean(selection && formReady());
    },
    formularioValido: function () {
      return Boolean(selection && formReady());
    }
""", """    prontoParaEnvio: function () {
      return Boolean(selection && selection.confirmed && formReady());
    },
    formularioValido: function () {
      return Boolean(selection && selection.confirmed && formReady());
    }
""", 1)

dental_path.write_text(dental)

# Cache-buster explícito para o Safari carregar o arquivo novo.
index_path = Path('index.html')
index = index_path.read_text()
index = index.replace('portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v6',
                      'portal-odontologia-segunda-sexta.js?v=20260817-dental-reserva-jsonp-v107', 1)
index_path.write_text(index)

# O simulador passa a executar a própria rota JSONP de gravação e a alterar o estado
# persistente do mock, de modo que uma releitura devolva 0 após reservar a última vaga.
test_dom_path = Path('scripts/test_dom_flows.js')
t = test_dom_path.read_text()
old_branch = """    } else if (parsed.pathname.includes(DENTAL_ID) && action === 'agenda') {
      payload = {ok: true, dias: clone(this.dental)};
    } else {
"""
new_branch = """    } else if (parsed.pathname.includes(DENTAL_ID) && action === 'agenda') {
      payload = {ok: true, dias: clone(this.dental)};
    } else if (parsed.pathname.includes(DENTAL_ID) && action === 'reservar_get') {
      const fields = {
        action,
        areaId: parsed.searchParams.get('areaId') || '',
        requestId: parsed.searchParams.get('requestId') || '',
        date: parsed.searchParams.get('date') || '',
        type: parsed.searchParams.get('type') || ''
      };
      const previous = this.records.dentalReservations.find(item => item.requestId === fields.requestId);
      const slot = this.dental.find(item => item.data === fields.date);
      assert.ok(slot, `Data odontológica não encontrada: ${fields.date}`);
      const key = fields.type === 'emergencial' ? 'vagasEmergenciais' : 'vagasComuns';
      if (!previous) {
        assert.ok(slot[key] > 0, 'Tentativa de reservar vaga indisponível');
        slot[key] -= 1;
        this.records.dentalReservations.push(clone(fields));
      }
      payload = {
        ok: true,
        remaining: slot[key],
        date: fields.date,
        type: fields.type,
        requestId: fields.requestId,
        alreadyReserved: Boolean(previous)
      };
    } else {
"""
if new_branch not in t:
    if old_branch not in t:
        raise SystemExit('apiResponse odontológica não encontrada')
    t = t.replace(old_branch, new_branch, 1)
test_dom_path.write_text(t)

# Gate estrutural: exige gravação JSONP confirmada antes de liberar envio.
gate_path = Path('scripts/test_dental_confirmation_gate_v103.js')
gate_path.write_text("""'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const dental=read('portal-odontologia-segunda-sexta.js'),config=read('agenda-config.js'),index=read('index.html'),backend=read('apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs'),card=read('portal-ajustes-finais.js');

assert.match(dental,/function reserveViaJsonp\\(item\\)/);
assert.match(dental,/action=reservar_get&areaId=/);
assert.match(dental,/&callback=' \\+ encodeURIComponent\\(callbackName\\)/);
assert.match(dental,/reserveViaJsonp\\(item\\)\\.then/);
assert.match(dental,/var shouldDisable = !formReady\\(\\) \\|\\| !selection\\.confirmed/);
assert.match(dental,/Boolean\\(selection && selection\\.confirmed && formReady\\(\\)\\)/);
assert.doesNotMatch(dental,/saveSlotsCache\\(\\);\\s*queueDurableReservation\\(item\\);/);
assert.match(backend,/action==='reservar_get'/);
assert.match(backend,/VERSAO:'2\\.2\\.0'/);
assert.match(backend,/var restantes=disponiveis-1;/);
assert.match(backend,/setValue\\(restantes\\)/);
assert.match(backend,/SpreadsheetApp\\.flush\\(\\)/);
assert.match(config,/DENTAL_AGENDA_API_URL/);
assert.match(card,/current\\.confirmed/);
assert.match(index,/portal-odontologia-segunda-sexta\\.js\\?v=20260817-dental-reserva-jsonp-v107/);
console.log('DENTAL_RESERVA_JSONP_V107_OK');
""")

Path('portal-version.json').write_text(json.dumps({
    'version': 'dental-reserva-jsonp-v107',
    'releasedAt': '2026-08-17T16:10:00Z',
    'scope': 'Reserva odontológica confirmada no clique via JSONP; envio liberado somente após persistência, sem conferência no botão'
}, ensure_ascii=False, indent=2) + '\n')
