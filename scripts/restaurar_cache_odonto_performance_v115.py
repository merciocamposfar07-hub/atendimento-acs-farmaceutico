from pathlib import Path
import re

DENTAL = Path('portal-odontologia-segunda-sexta.js')
INDEX = Path('index.html')
PERF = Path('scripts/test_performance_v101.js')
QUALITY = Path('scripts/test_quality_gate_v101.js')

s = DENTAL.read_text(encoding='utf-8')

if 'PORTAL_TACS_ODONTO_CACHE_FIRST_V115' not in s:
    anchor = "  var ALLOWED_DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];\n"
    insert = anchor + "  var AREA_ID = String(window.TACS_AREA_ID || 'JAPARANDUBA').trim() || 'JAPARANDUBA';\n  var CACHE_KEY = 'portalTacsDentalAgendaV103FullWeek:' + AREA_ID;\n  var CACHE_FRESH_MS = 90000;\n  var cacheVisible = false;\n  var cacheFresh = false;\n  var serverConfirmed = false;\n  // PORTAL_TACS_ODONTO_CACHE_FIRST_V115\n"
    if s.count(anchor) != 1:
        raise SystemExit('Âncora de configuração odontológica não encontrada exatamente uma vez.')
    s = s.replace(anchor, insert, 1)

    helper_anchor = "  }\n\n  function pruneExpiredSlots() {"
    helpers = """  }

  function normalizeAgendaData(data) {
    var normalized = [];
    (Array.isArray(data && data.dias) ? data.dias : []).forEach(function (row, index) {
      var slot = normalizeSlot(row, index);
      if (slot) normalized.push(slot);
    });
    normalized.sort(function (a, b) { return dateStamp(a.date) - dateStamp(b.date); });
    return normalized;
  }

  function snapshotDataFromSlots() {
    return {
      ok: true,
      dias: slots.map(function (slot) {
        return {
          id: slot.id,
          dia: slot.day,
          data: slot.date,
          expiraAs: slot.expiresAt || '',
          vagasComuns: slot.common,
          vagasEmergenciais: slot.emergency
        };
      })
    };
  }

  function saveSlotsCache() {
    try {
      if (!window.localStorage) return;
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({savedAt: Date.now(), data: snapshotDataFromSlots()}));
    } catch (error) {}
  }

  function readAgendaCache() {
    try {
      if (!window.localStorage) return false;
      var raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      var cached = JSON.parse(raw);
      if (!cached || !cached.data || !Array.isArray(cached.data.dias)) return false;
      var normalized = normalizeAgendaData(cached.data);
      if (!normalized.length) return false;
      slots = normalized;
      cacheVisible = true;
      cacheFresh = Number.isFinite(Number(cached.savedAt)) && Math.max(0, Date.now() - Number(cached.savedAt)) <= CACHE_FRESH_MS;
      serverConfirmed = false;
      startExpiryWatch();
      return true;
    } catch (error) {
      return false;
    }
  }

  function pruneExpiredSlots() {"""
    if s.count(helper_anchor) != 1:
        raise SystemExit('Âncora para helpers de cache não encontrada exatamente uma vez.')
    s = s.replace(helper_anchor, helpers, 1)

    old_status = "    if (loading) return 'Atualizando a agenda odontológica pela planilha...';"
    new_status = "    if (loading && cacheVisible) return cacheFresh ? 'Última agenda carregada. Confirmando dados atuais…' : 'Última agenda exibida para consulta. Confirmando dados atuais antes de liberar reserva…';\n    if (loading) return 'Atualizando a agenda odontológica pela planilha...';"
    if old_status not in s:
        raise SystemExit('Status de carregamento odontológico não localizado.')
    s = s.replace(old_status, new_status, 1)

    old_disabled = "        button.disabled = Boolean(selection && !same) || (!same && (value === null || value <= 0));"
    new_disabled = "        var staleCacheBlocked = cacheVisible && !serverConfirmed && !cacheFresh;\n        button.disabled = staleCacheBlocked || Boolean(selection && !same) || (!same && (value === null || value <= 0));"
    if old_disabled not in s:
        raise SystemExit('Regra de habilitação da vaga não localizada.')
    s = s.replace(old_disabled, new_disabled, 1)

    old_fetch = "      script.src = API + (API.indexOf('?') === -1 ? '?' : '&') + 'action=agenda&callback=' + encodeURIComponent(callbackName) + '&v=' + Date.now();"
    new_fetch = "      script.src = API + (API.indexOf('?') === -1 ? '?' : '&') + 'action=agenda&areaId=' + encodeURIComponent(AREA_ID) + '&callback=' + encodeURIComponent(callbackName) + '&v=' + Date.now();"
    if old_fetch not in s:
        raise SystemExit('URL de leitura da agenda não localizada.')
    s = s.replace(old_fetch, new_fetch, 1)

    load_pattern = re.compile(r"  function loadAgenda\(preserveSelection\) \{.*?\n  \}\n\n  function validCpf", re.S)
    load_replacement = """  function loadAgenda(preserveSelection) {
    if (!isDental()) return Promise.resolve(null);
    if (loading) return Promise.resolve(null);
    var hadVisibleSlots = slots.length > 0;
    if (!preserveSelection) selection = null;
    var loadedCache = false;
    if (!serverConfirmed) loadedCache = readAgendaCache();
    loading = true;
    renderAgenda();
    return fetchAgenda().then(function (data) {
      var normalized = normalizeAgendaData(data);
      if (selection) {
        var pending = normalized.find(function (slot) { return slot.id === selection.id || slot.date === selection.date; });
        if (pending) {
          if (selection.type === 'emergencial' && pending.emergency !== null) pending.emergency = Math.min(pending.emergency, selection.optimisticRemaining);
          if (selection.type === 'comum' && pending.common !== null) pending.common = Math.min(pending.common, selection.optimisticRemaining);
        }
      }
      slots = normalized;
      serverConfirmed = true;
      cacheVisible = false;
      cacheFresh = true;
      saveSlotsCache();
      startExpiryWatch();
      loading = false;
      pruneExpiredSlots();
      renderAgenda();
      refreshSend();
      return data;
    }).catch(function (error) {
      loading = false;
      if (!loadedCache && !hadVisibleSlots && !preserveSelection) slots = [];
      renderAgenda();
      var status = el('dentalStatus');
      if (status && !selection) {
        if (cacheVisible) {
          status.textContent = cacheFresh
            ? 'Última agenda disponível. Não foi possível confirmar com o servidor agora.'
            : 'Última agenda disponível para consulta. Aguarde a confirmação do servidor para reservar.';
          status.className = 'dental-status';
        } else {
          status.textContent = error.message || 'Não foi possível consultar a planilha odontológica.';
          status.className = 'dental-status error';
        }
      }
      refreshSend();
      return null;
    });
  }

  function validCpf"""
    s, count = load_pattern.subn(load_replacement, s, count=1)
    if count != 1:
        raise SystemExit(f'Função loadAgenda não substituída exatamente uma vez: {count}.')

    old_area = "      params.set('areaId', window.TACS_AREA_ID || 'JAPARANDUBA');"
    if old_area not in s:
        raise SystemExit('Área da reserva GET não localizada.')
    s = s.replace(old_area, "      params.set('areaId', AREA_ID);", 1)

    old_apply = "    item.optimisticRemaining = Math.max(0, Number(remaining));\n  }\n\n  function verifyReservation"
    new_apply = "    item.optimisticRemaining = Math.max(0, Number(remaining));\n    saveSlotsCache();\n  }\n\n  function verifyReservation"
    if old_apply not in s:
        raise SystemExit('applyServerRemaining não localizado para persistência do snapshot.')
    s = s.replace(old_apply, new_apply, 1)

    old_restore = "    if (slot) {\n      if (item.type === 'emergencial') slot.emergency = item.originalCount;\n      else slot.common = item.originalCount;\n    }\n    item.explicitFailure = true;"
    new_restore = "    if (slot) {\n      if (item.type === 'emergencial') slot.emergency = item.originalCount;\n      else slot.common = item.originalCount;\n      saveSlotsCache();\n    }\n    item.explicitFailure = true;"
    if old_restore not in s:
        raise SystemExit('Restauração de vaga não localizada.')
    s = s.replace(old_restore, new_restore, 1)

    old_optimistic = "    if (type === 'emergencial') slot.emergency = item.optimisticRemaining;\n    else slot.common = item.optimisticRemaining;\n\n    var category = el('category');"
    new_optimistic = "    if (type === 'emergencial') slot.emergency = item.optimisticRemaining;\n    else slot.common = item.optimisticRemaining;\n    saveSlotsCache();\n\n    var category = el('category');"
    if old_optimistic not in s:
        raise SystemExit('Abatimento otimista não localizado.')
    s = s.replace(old_optimistic, new_optimistic, 1)

    api_anchor = "\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);"
    api_block = """
  window.PortalTacsOdontologiaV98 = {
    versao: '1.15.0',
    cacheKey: CACHE_KEY,
    atualizar: function () { return loadAgenda(true); },
    selecao: function () {
      if (!selection) return null;
      var copy = {};
      Object.keys(selection).forEach(function (key) { copy[key] = selection[key]; });
      return copy;
    },
    formularioValido: function () { return formReady(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);"""
    if s.count(api_anchor) != 1:
        raise SystemExit('Âncora para API odontológica não encontrada exatamente uma vez.')
    s = s.replace(api_anchor, '\n' + api_block, 1)

DENTAL.write_text(s, encoding='utf-8')

idx = INDEX.read_text(encoding='utf-8')
idx, count = re.subn(
    r'portal-odontologia-segunda-sexta\.js\?v=[A-Za-z0-9._-]+',
    'portal-odontologia-segunda-sexta.js?v=20260818-cache-first-v115',
    idx,
    count=1
)
if count != 1:
    raise SystemExit(f'Include odontológico do index não atualizado exatamente uma vez: {count}.')
INDEX.write_text(idx, encoding='utf-8')

perf = PERF.read_text(encoding='utf-8')
perf = perf.replace(
    "assert.ok(index.includes('if(!window.PortalTacsOdontologiaV98)loadDental()'), 'Rotina odontológica antiga só pode atuar como fallback');",
    "assert.ok(index.includes('if(!window.__PORTAL_TACS_ODONTOLOGIA_V98__)loadDental()'), 'Rotina odontológica antiga só pode atuar como fallback');"
)
perf = perf.replace(
    "assert.ok(dental.includes(\"add('action', 'reservar')\"), 'Reserva real deve permanecer via backend');",
    "assert.ok(dental.includes(\"params.set('action', 'reservar_get')\"), 'Reserva real deve permanecer via backend');"
)
perf = perf.replace(
    "assert.ok(dental.includes(\"add('areaId', AREA_ID)\"), 'Reserva deve permanecer vinculada à área do Portal');",
    "assert.ok(dental.includes(\"params.set('areaId', AREA_ID)\"), 'Reserva deve permanecer vinculada à área do Portal');"
)
PERF.write_text(perf, encoding='utf-8')

quality = QUALITY.read_text(encoding='utf-8')
quality = quality.replace(
    "registrar('dados', 'Reserva odontológica real continua no backend', contem(dental, \"add('action', 'reservar')\"));",
    "registrar('dados', 'Reserva odontológica real continua no backend', contem(dental, \"params.set('action', 'reservar_get')\"));"
)
quality = quality.replace(
    "registrar('desempenho', 'Consulta odontológica duplicada antiga virou somente fallback', contem(index, 'if(!window.PortalTacsOdontologiaV98)loadDental()'));",
    "registrar('desempenho', 'Consulta odontológica duplicada antiga virou somente fallback', contem(index, 'if(!window.__PORTAL_TACS_ODONTOLOGIA_V98__)loadDental()'));"
)
QUALITY.write_text(quality, encoding='utf-8')

# Gates finais do patch.
final = DENTAL.read_text(encoding='utf-8')
required = [
    'PORTAL_TACS_ODONTO_CACHE_FIRST_V115',
    "portalTacsDentalAgendaV103FullWeek:' + AREA_ID",
    'CACHE_FRESH_MS = 90000',
    'function readAgendaCache()',
    'staleCacheBlocked',
    "params.set('action', 'reservar_get')",
    "params.set('areaId', AREA_ID)",
    'saveSlotsCache();',
    'window.PortalTacsOdontologiaV98 = {',
    "atualizar: function () { return loadAgenda(true); }",
    'formularioValido: function () { return formReady(); }'
]
missing = [item for item in required if item not in final]
if missing:
    raise SystemExit('Gates do cache odontológico ausentes: ' + ' | '.join(missing))
if 'portal-odontologia-segunda-sexta.js?v=20260818-cache-first-v115' not in INDEX.read_text(encoding='utf-8'):
    raise SystemExit('Cache-bust v115 não aplicado no index.')
print('Cache-first odontológico v115 integrado com revalidação e bloqueio de snapshot antigo.')
