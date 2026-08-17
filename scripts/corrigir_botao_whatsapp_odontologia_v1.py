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


# V5 — restaura a redução automática da vaga sem voltar a bloquear o envio.
# A causa da regressão foi dupla: a redução otimista não era salva no cache local
# e a gravação principal usava um iframe que pode ser interrompido quando o Safari
# abre o compartilhamento. O backend é idempotente pelo requestId, então podemos
# enfileirar a mesma reserva de forma durável sem risco de descontar duas vagas.

dental_path = Path('portal-odontologia-segunda-sexta.js')
dental = dental_path.read_text()

if 'function queueDurableReservation(item)' not in dental:
    marker = "  function postReservation(item) {\n"
    if marker not in dental:
        raise SystemExit('Ponto de inserção da reserva durável não encontrado')
    durable = r"""  function reservationParams(item) {
    var params = new URLSearchParams();
    params.set('action', 'reservar');
    params.set('areaId', AREA_ID);
    params.set('requestId', item.requestId);
    params.set('date', item.date);
    params.set('type', item.type);
    params.set('nonce', 'durable-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
    return params;
  }

  function queueDurableReservation(item) {
    if (!API || !item || !item.requestId) return false;
    var params = reservationParams(item);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(API, params)) return true;
    } catch (error) {}
    try {
      if (window.fetch) {
        window.fetch(API, {
          method: 'POST',
          body: params,
          mode: 'no-cors',
          keepalive: true,
          credentials: 'omit'
        }).catch(function () {});
        return true;
      }
    } catch (error) {}
    return false;
  }

"""
    dental = dental.replace(marker, durable + marker, 1)

old_select = """    selection = item;
    if (type === 'emergencial') slot.emergency = item.optimisticRemaining;
    else slot.common = item.optimisticRemaining;

    var category = el('category');
"""
new_select = """    selection = item;
    if (type === 'emergencial') slot.emergency = item.optimisticRemaining;
    else slot.common = item.optimisticRemaining;
    // A redução precisa sobreviver ao compartilhamento/retorno do Safari.
    saveSlotsCache();
    queueDurableReservation(item);

    var category = el('category');
"""
if new_select not in dental:
    if old_select not in dental:
        raise SystemExit('Trecho de redução otimista não encontrado')
    dental = dental.replace(old_select, new_select, 1)

old_pages = """    window.addEventListener('pageshow', function () {
      if (isDental()) loadAgenda(false);
    });

    if (isDental()) {
"""
new_pages = """    window.addEventListener('pageshow', function () {
      if (isDental()) loadAgenda(false);
    });
    window.addEventListener('pagehide', function () {
      if (selection && !selection.confirmed) queueDurableReservation(selection);
    });

    if (isDental()) {
"""
if new_pages not in dental:
    if old_pages not in dental:
        raise SystemExit('Trecho pageshow/pagehide não encontrado')
    dental = dental.replace(old_pages, new_pages, 1)

dental_path.write_text(dental)

# Força o iPhone a buscar a nova rotina em vez de reutilizar a v4 em cache.
index = Path('index.html')
index_text = index.read_text()
if 'portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v5' not in index_text:
    old = 'portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v4'
    if old not in index_text:
        raise SystemExit('Cache-buster odontológico v4 não encontrado')
    index_text = index_text.replace(old, 'portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v5', 1)
index.write_text(index_text)

# Gate específico: 1 vaga -> 0 deve ser persistido imediatamente, a gravação precisa
# sobreviver à saída do Safari e o envio continua sem esperar a confirmação da planilha.
Path('scripts/test_dental_confirmation_gate_v103.js').write_text(r"""'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const dental=read('portal-odontologia-segunda-sexta.js'),config=read('agenda-config.js'),index=read('index.html'),backend=read('apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs'),card=read('portal-ajustes-finais.js');

// Redução visual e cache local acontecem no clique, antes de qualquer navegação.
assert.match(dental,/optimisticRemaining: Math\.max\(0, Number\(available\) - 1\)/);
assert.match(dental,/saveSlotsCache\(\);\s*queueDurableReservation\(item\);/);

// A reserva ganha transporte durável para sobreviver ao compartilhamento do iPhone.
assert.match(dental,/function queueDurableReservation\(item\)/);
assert.match(dental,/navigator\.sendBeacon\(API, params\)/);
assert.match(dental,/keepalive:\s*true/);
assert.match(dental,/pagehide[\s\S]*queueDurableReservation\(selection\)/);

// Continua existindo a confirmação normal por iframe e a idempotência do backend.
assert.match(dental,/function postReservation\(item\)/);
assert.match(dental,/add\('action', 'reservar'\)/);
assert.match(backend,/CODIGO_SOLICITACAO/);
assert.match(backend,/if\(existente\)/);
assert.match(backend,/var restantes=disponiveis-1;/);
assert.match(backend,/setValue\(restantes\)/);
assert.match(backend,/SpreadsheetApp\.flush\(\)/);

// Envio continua não bloqueante.
assert.match(dental,/var shouldDisable = !formReady\(\);/);
assert.doesNotMatch(dental,/var pending = !selection\.confirmed/);
assert.match(dental,/if \(!formReady\(\)\) \{ refreshSend\(\); return; \}[\s\S]*openWhatsApp\(\);/);
assert.doesNotMatch(config,/dentalReservationPending === '1'/);
assert.match(card,/reserveDentalIfNeeded\(\)\.catch/);
assert.doesNotMatch(card,/Confirmando os dados e a disponibilidade/);
assert.match(index,/portal-odontologia-segunda-sexta\.js\?v=20260817-dental-whatsapp-bridge-v5/);
console.log('DENTAL_VACANCY_PERSISTENCE_V105_OK');
""")

# Simulação DOM do caso real: existe somente 1 vaga de emergência; o clique precisa
# mostrar/persistir 0 imediatamente e a confirmação do servidor é atrasada em 5 s.
p = Path('scripts/test_dom_flows.js')
t = p.read_text()

if 'durableReservations: []' not in t:
    old = """      whatsAppMessages: [],
      shares: [],
      alerts: []
"""
    new = """      whatsAppMessages: [],
      shares: [],
      alerts: [],
      durableReservations: []
"""
    if old not in t:
        raise SystemExit('Bloco de registros do Harness não encontrado')
    t = t.replace(old, new, 1)

if 'harness.records.durableReservations.push' not in t:
    old = """        window.navigator.share = function (payload) {
          harness.records.shares.push(payload);
          return Promise.resolve();
        };
"""
    new = """        window.navigator.share = function (payload) {
          harness.records.shares.push(payload);
          return Promise.resolve();
        };
        Object.defineProperty(window.navigator, 'sendBeacon', {
          configurable: true,
          value: function (url, body) {
            const params = new window.URLSearchParams(String(body || ''));
            harness.records.durableReservations.push({
              url: String(url || ''),
              action: params.get('action') || '',
              areaId: params.get('areaId') || '',
              requestId: params.get('requestId') || '',
              date: params.get('date') || '',
              type: params.get('type') || ''
            });
            return true;
          }
        });
"""
    if old not in t:
        raise SystemExit('Ponto para mock do sendBeacon não encontrado')
    t = t.replace(old, new, 1)

# O teste não bloqueante passa a reproduzir exatamente 1 vaga emergencial -> 0.
t = t.replace(
    "category.value = 'Solicitar atendimento odontológico (dentista)';\n    dispatch(window, category, 'change');\n    await waitFor(\n      () => window.document.querySelector('#dentalSlots .sheet-dental-choice.common:not(:disabled)'),\n      'A vaga odontológica não apareceu para o teste não bloqueante'\n    );\n    const slot = window.document.querySelector('#dentalSlots .sheet-dental-choice.common:not(:disabled)');\n    slot.click();",
    "category.value = 'Solicitar atendimento odontológico de emergência (dentista)';\n    dispatch(window, category, 'change');\n    await waitFor(\n      () => window.document.querySelector('#dentalSlots .sheet-dental-choice.emergency:not(:disabled)'),\n      'A vaga emergencial única não apareceu para o teste não bloqueante'\n    );\n    const slot = window.document.querySelector('#dentalSlots .sheet-dental-choice.emergency:not(:disabled)');\n    slot.click();\n    await waitFor(\n      () => harness.records.durableReservations.length >= 1,\n      'A reserva durável não foi enfileirada no clique da vaga'\n    );\n    const durable = harness.records.durableReservations[0];\n    assert.equal(durable.action, 'reservar');\n    assert.equal(durable.type, 'emergencial');\n    assert.equal(durable.date, '2099-08-03');\n    assert.match(durable.requestId, /^MATIAS-/);\n    const cacheKey = window.PortalTacsOdontologiaV98.cacheKey;\n    const cached = JSON.parse(window.localStorage.getItem(cacheKey));\n    const monday = cached.data.dias.find(item => item.data === '2099-08-03');\n    assert.equal(monday.vagasEmergenciais, 0, 'A última vaga emergencial precisa permanecer 0 no cache local');\n    const renderedMonday = Array.from(window.document.querySelectorAll('#dentalSlots .sheet-dental-card')).find(card => /Segunda-feira/.test(card.textContent));\n    assert.match(renderedMonday.textContent, /Sem vaga de emergência/, 'A tela deve mostrar 0 imediatamente após o clique');\n    const durableBeforeHide = harness.records.durableReservations.length;\n    window.dispatchEvent(new window.Event('pagehide'));\n    assert.ok(harness.records.durableReservations.length > durableBeforeHide, 'Ao sair para o compartilhamento, a reserva pendente deve ser reenfileirada');"
)

if "A vaga emergencial única não apareceu para o teste não bloqueante" not in t:
    raise SystemExit('Não foi possível converter o teste não bloqueante para 1 vaga emergencial')

p.write_text(t)

Path('portal-version.json').write_text(json.dumps({
    'version': 'dental-vacancy-persistence-v105',
    'releasedAt': '2026-08-17T15:18:00Z',
    'scope': 'Redução automática 1→0 persistente no iPhone, reserva durável e envio sem espera'
}, ensure_ascii=False, indent=2) + '\n')
