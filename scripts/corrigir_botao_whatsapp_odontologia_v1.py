from pathlib import Path
import json


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Trecho não encontrado em {path}: {old[:160]!r}')
    p.write_text(text.replace(old, new, 1))


replace_once(
    'portal-odontologia-segunda-sexta.js',
    """    prontoParaEnvio: function () {
      return Boolean(selection && selection.confirmed && formReady());
    }
  });""",
    """    prontoParaEnvio: function () {
      return Boolean(selection && selection.confirmed && formReady());
    },
    formularioValido: function () {
      return Boolean(selection && formReady());
    }
  });"""
)

replace_once(
    'portal-ajustes-finais.js',
    """  function reserveDentalIfNeeded() {
    var dental = selectedDental();
    if (!dental || !DENTAL_API) return Promise.resolve();
    if (dental.reservedOnSelection) {
      reservedSelection = dental.key;
      return Promise.resolve();
    }
    if (reservedSelection === dental.key) return Promise.resolve();
    if (reservationPromise) return reservationPromise;
""",
    """  function waitForCurrentDentalReservation(requestId) {
    return new Promise(function (resolve, reject) {
      var deadline = Date.now() + 16000;
      function check() {
        var current = currentDentalSelection();
        if (!current || current.requestId !== requestId) {
          reject(new Error('A vaga selecionada não pôde ser confirmada. Escolha a vaga novamente.'));
          return;
        }
        if (current.confirmed) {
          reservedSelection = current.date + '|' + current.type;
          resolve(current);
          return;
        }
        if (Date.now() >= deadline) {
          reject(new Error('A confirmação da vaga está demorando. Aguarde alguns segundos e tente enviar novamente.'));
          return;
        }
        setTimeout(check, 250);
      }
      check();
    });
  }

  function reserveDentalIfNeeded() {
    var dental = selectedDental();
    if (!dental || !DENTAL_API) return Promise.resolve();
    var current = currentDentalSelection();
    if (current) {
      if (current.confirmed) {
        reservedSelection = dental.key;
        return Promise.resolve();
      }
      return waitForCurrentDentalReservation(current.requestId);
    }
    if (reservedSelection === dental.key) return Promise.resolve();
    if (reservationPromise) return reservationPromise;
"""
)

replace_once(
    'portal-ajustes-finais.js',
    """    if (category.indexOf('odontologico') !== -1) {
      var api = window.PortalTacsOdontologiaV98;
      if (api && typeof api.prontoParaEnvio === 'function') {
        return Boolean(api.prontoParaEnvio());
      }
    }
""",
    """    if (category.indexOf('odontologico') !== -1) {
      var api = window.PortalTacsOdontologiaV98;
      if (api && typeof api.formularioValido === 'function') {
        return Boolean(api.formularioValido());
      }
    }
"""
)

replace_once(
    'portal-orientacao-morador.js',
    "document.querySelectorAll('.slot.selected,.integral-day.selected,[aria-checked=\"true\"]')",
    "document.querySelectorAll('.slot.selected,.sheet-dental-choice.selected,.integral-day.selected,[aria-checked=\"true\"]')"
)
replace_once(
    'portal-orientacao-morador.js',
    "document.querySelectorAll('.slot,.integral-day')",
    "document.querySelectorAll('.slot,.sheet-dental-choice,.integral-day')"
)
replace_once(
    'portal-orientacao-morador.js',
    """      var send = el('send');
      if (!send || send.hidden) { updateFlowGuide(); return; }
      slowScrollTo(send, 1150, function () {""",
    """      var send = el('sendPetroleumCard') || el('send');
      if (!send || send.hidden || (window.getComputedStyle && window.getComputedStyle(send).display === 'none')) { updateFlowGuide(); return; }
      slowScrollTo(send, 1150, function () {"""
)
replace_once(
    'portal-orientacao-morador.js',
    """    var category = el('category');
    var send = el('send');
""",
    """    var category = el('category');
    var send = el('sendPetroleumCard') || el('send');
"""
)
replace_once(
    'portal-orientacao-morador.js',
    """    var send = el('send');
    if (send && !formObserver) {""",
    """    var send = el('sendPetroleumCard') || el('send');
    if (send && !formObserver) {"""
)
replace_once(
    'portal-orientacao-morador.js',
    "event.target.closest('.slot,.integral-day,#send')",
    "event.target.closest('.slot,.sheet-dental-choice,.integral-day,#send,#sendPetroleumCard')"
)
replace_once(
    'portal-orientacao-morador.js',
    """      if (target.id === 'send') {
        if (!target.disabled && !target.hidden) sendIntent = true;
        return;
      }""",
    """      if (target.id === 'send' || target.id === 'sendPetroleumCard') {
        if (!target.disabled && !target.hidden) sendIntent = true;
        return;
      }"""
)

replace_once(
    'index.html',
    'portal-ajustes-finais.js?v=20260817-dental-card-bridge-v1',
    'portal-ajustes-finais.js?v=20260817-dental-card-bridge-v2'
)
replace_once(
    'index.html',
    'portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v1',
    'portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v2'
)
replace_once(
    'index.html',
    'portal-orientacao-morador.js?v=20260816-fluxo-guiado-v2',
    'portal-orientacao-morador.js?v=20260817-fluxo-guiado-v3'
)

p = Path('scripts/test_dental_confirmation_gate_v103.js')
t = p.read_text()
t = t.replace(
    "assert.match(index,/portal-odontologia-segunda-sexta\\.js\\?v=20260817-dental-whatsapp-bridge-v1/);",
    "assert.match(index,/portal-odontologia-segunda-sexta\\.js\\?v=20260817-dental-whatsapp-bridge-v2/);"
)
t = t.replace(
    "assert.match(card,/api\\.prontoParaEnvio/);",
    "assert.match(card,/api\\.formularioValido/);"
)
t = t.replace(
    "assert.match(card,/dental\\.reservedOnSelection/);",
    "assert.doesNotMatch(card,/if \\(dental\\.reservedOnSelection\\)/);"
)
marker = "assert.match(dental,/prontoParaEnvio: function \\(\\)/);"
extra = """assert.match(dental,/formularioValido: function \\(\\)/);
assert.match(card,/function waitForCurrentDentalReservation\\(requestId\\)/);
assert.match(card,/api\\.formularioValido/);
"""
if extra.strip() not in t:
    if marker not in t:
        raise SystemExit('Marcador do gate odontológico não encontrado')
    t = t.replace(marker, marker + '\n' + extra, 1)
p.write_text(t)

Path('portal-version.json').write_text(json.dumps({
    'version': 'd17a1c0ff002',
    'releasedAt': '2026-08-17T14:42:00Z',
    'scope': 'Estabilização do envio odontológico e fluxo visual no iPhone'
}, ensure_ascii=False, indent=2) + '\n')
