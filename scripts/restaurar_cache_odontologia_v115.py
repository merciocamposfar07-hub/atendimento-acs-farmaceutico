from pathlib import Path

js_path=Path('portal-odontologia-segunda-sexta.js')
s=js_path.read_text(encoding='utf-8')

old_vars="""  var verifyTimer = null;
  var expiryTimer = null; // PORTAL_TACS_ODONTO_EXPIRACAO_HORARIO_V1
"""
new_vars="""  var verifyTimer = null;
  var expiryTimer = null; // PORTAL_TACS_ODONTO_EXPIRACAO_HORARIO_V1
  var CACHE_PREFIX = 'portalTacsDentalAgendaV103FullWeek:';
  var CACHE_FRESH_MS = 90 * 1000;
  var CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  var cacheVisible = false;
  var cacheFresh = false;
"""
if s.count(old_vars)!=1: raise SystemExit('Bloco de variáveis odontológicas não localizado exatamente uma vez.')
s=s.replace(old_vars,new_vars,1)

anchor="""  function pruneExpiredSlots() {
"""
cache_funcs="""  function currentAreaId() {
    var value = clean(window.TACS_AREA_ID || '');
    if (!value) {
      try { value = clean(new URLSearchParams(window.location.search || '').get('areaId') || new URLSearchParams(window.location.search || '').get('area')); } catch (ignore) {}
    }
    if (!value) {
      try { value = clean(localStorage.getItem('portalTacsAreaIdV1')); } catch (ignoreStorage) {}
    }
    value = value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 64);
    return value || 'JAPARANDUBA';
  }

  function dentalCacheKey() { return CACHE_PREFIX + currentAreaId(); }

  function normalizedAgenda(data) {
    var normalized = [];
    (Array.isArray(data && data.dias) ? data.dias : []).forEach(function (row, index) {
      var slot = normalizeSlot(row, index);
      if (slot) normalized.push(slot);
    });
    normalized.sort(function (a, b) { return dateStamp(a.date) - dateStamp(b.date); });
    return normalized;
  }

  function readAgendaCache() {
    try {
      var raw = localStorage.getItem(dentalCacheKey());
      if (!raw) return false;
      var saved = JSON.parse(raw);
      var age = Date.now() - Number(saved && saved.savedAt || 0);
      if (!saved || !saved.data || !Number.isFinite(age) || age < 0 || age > CACHE_MAX_AGE_MS) return false;
      slots = normalizedAgenda(saved.data);
      cacheVisible = true;
      cacheFresh = age <= CACHE_FRESH_MS;
      startExpiryWatch();
      return true;
    } catch (error) { return false; }
  }

  function writeAgendaCache(data) {
    try {
      localStorage.setItem(dentalCacheKey(), JSON.stringify({savedAt:Date.now(),data:data}));
    } catch (error) {}
  }

  function writeSlotsCache() {
    writeAgendaCache({
      ok:true,
      dias:slots.map(function (slot) {
        return {
          id:slot.id,dia:slot.day,data:slot.date,
          vagasComuns:slot.common,vagasEmergenciais:slot.emergency,
          expiraAs:slot.expiresAt,ativo:true
        };
      })
    });
  }

"""
if s.count(anchor)!=1: raise SystemExit('Âncora pruneExpiredSlots não localizada.')
s=s.replace(anchor,cache_funcs+anchor,1)

old_prune="""    if (slots.length === before) return;
    if (selection && !slots.some(function (slot) { return slot.id === selection.id; })) selection = null;
    renderAgenda();
    refreshSend();
"""
new_prune="""    if (slots.length === before) return;
    if (selection && !slots.some(function (slot) { return slot.id === selection.id; })) selection = null;
    writeSlotsCache();
    renderAgenda();
    refreshSend();
"""
if s.count(old_prune)!=1: raise SystemExit('Bloco prune não localizado.')
s=s.replace(old_prune,new_prune,1)

old_status="""  function statusText() {
    if (loading) return 'Atualizando a agenda odontológica pela planilha...';
    if (!slots.length) return 'Nenhum dia está publicado na planilha odontológica.';
"""
new_status="""  function statusText() {
    if (loading && slots.length && cacheVisible) return cacheFresh
      ? 'Confirmando a agenda atual em segundo plano...'
      : 'Última agenda disponível. Atualizando em segundo plano...';
    if (loading) return 'Atualizando a agenda odontológica pela planilha...';
    if (!slots.length) return 'Nenhum dia está publicado na planilha odontológica.';
    if (cacheVisible) return cacheFresh
      ? 'Última agenda disponível. A confirmação online continuará em segundo plano.'
      : 'Última agenda disponível. Aguarde a atualização para escolher uma vaga.';
"""
if s.count(old_status)!=1: raise SystemExit('statusText não localizado.')
s=s.replace(old_status,new_status,1)

old_disabled="""        button.disabled = Boolean(selection && !same) || (!same && (value === null || value <= 0));
"""
new_disabled="""        var staleCacheBlocked = cacheVisible && !cacheFresh && !same;
        button.disabled = staleCacheBlocked || Boolean(selection && !same) || (!same && (value === null || value <= 0));
"""
if s.count(old_disabled)!=1: raise SystemExit('Regra disabled odontológica não localizada.')
s=s.replace(old_disabled,new_disabled,1)

old_fetch_src="""      script.src = API + (API.indexOf('?') === -1 ? '?' : '&') + 'action=agenda&callback=' + encodeURIComponent(callbackName) + '&v=' + Date.now();
"""
new_fetch_src="""      script.src = API + (API.indexOf('?') === -1 ? '?' : '&') + 'action=agenda&areaId=' + encodeURIComponent(currentAreaId()) + '&callback=' + encodeURIComponent(callbackName) + '&v=' + Date.now();
"""
if s.count(old_fetch_src)!=1: raise SystemExit('URL de leitura odontológica não localizada.')
s=s.replace(old_fetch_src,new_fetch_src,1)

start=s.index('  function loadAgenda(preserveSelection) {')
end=s.index('\n  function validCpf(value) {',start)
old_load=s[start:end]
new_load="""  function loadAgenda(preserveSelection) {
    if (!isDental() || loading) return;
    if (!preserveSelection && !selection && !slots.length) readAgendaCache();
    var hadCachedSlots = cacheVisible && slots.length > 0;
    loading = true;
    if (!preserveSelection) selection = null;
    renderAgenda();
    fetchAgenda().then(function (data) {
      slots = normalizedAgenda(data);
      writeAgendaCache(data);
      cacheVisible = false;
      cacheFresh = true;
      startExpiryWatch();
      loading = false;
      pruneExpiredSlots();
      renderAgenda();
      refreshSend();
    }).catch(function (error) {
      loading = false;
      if (!hadCachedSlots && !preserveSelection) slots = [];
      renderAgenda();
      var status = el('dentalStatus');
      if (status && !selection && !hadCachedSlots) {
        status.textContent = error.message || 'Não foi possível consultar a planilha odontológica.';
        status.className = 'dental-status error';
      }
      refreshSend();
    });
  }
"""
s=s[:start]+new_load+s[end:]

old_area="""      params.set('areaId', window.TACS_AREA_ID || 'JAPARANDUBA');
"""
new_area="""      params.set('areaId', currentAreaId());
"""
if s.count(old_area)!=1: raise SystemExit('Área da reserva não localizada.')
s=s.replace(old_area,new_area,1)

old_apply="""    if (item.type === 'emergencial') slot.emergency = Math.max(0, Number(remaining));
    else slot.common = Math.max(0, Number(remaining));
    item.optimisticRemaining = Math.max(0, Number(remaining));
"""
new_apply="""    if (item.type === 'emergencial') slot.emergency = Math.max(0, Number(remaining));
    else slot.common = Math.max(0, Number(remaining));
    item.optimisticRemaining = Math.max(0, Number(remaining));
    writeSlotsCache();
"""
if s.count(old_apply)!=1: raise SystemExit('applyServerRemaining não localizado.')
s=s.replace(old_apply,new_apply,1)

old_select="""    if (type === 'emergencial') slot.emergency = item.optimisticRemaining;
    else slot.common = item.optimisticRemaining;

    var category = el('category');
"""
new_select="""    if (type === 'emergencial') slot.emergency = item.optimisticRemaining;
    else slot.common = item.optimisticRemaining;
    writeSlotsCache();

    var category = el('category');
"""
if s.count(old_select)!=1: raise SystemExit('Abatimento otimista não localizado.')
s=s.replace(old_select,new_select,1)

# Gates funcionais
for marker in [
    "CACHE_PREFIX = 'portalTacsDentalAgendaV103FullWeek:'",
    'CACHE_FRESH_MS = 90 * 1000',
    'function readAgendaCache()',
    'function writeSlotsCache()',
    "action=agenda&areaId=' + encodeURIComponent(currentAreaId())",
    "params.set('areaId', currentAreaId());",
    'staleCacheBlocked',
    'expiredByConfiguredTime(slot.date, slot.expiresAt)',
    'persistInBackground(item);'
]:
    if marker not in s: raise SystemExit('Gate ausente no módulo odontológico: '+marker)
js_path.write_text(s,encoding='utf-8')

# Cache bust do módulo público.
idx=Path('index.html')
h=idx.read_text(encoding='utf-8')
old='portal-odontologia-segunda-sexta.js?v=20260818-odontologia-unica-v114'
new='portal-odontologia-segunda-sexta.js?v=20260818-cache-territorial-v115'
if h.count(old)!=1: raise SystemExit(f'Esperava uma referência v114 no index; encontrei {h.count(old)}.')
h=h.replace(old,new,1)
idx.write_text(h,encoding='utf-8')

print('Cache odontológico territorial v115 restaurado: visual imediato, 90s para escolha e revalidação em segundo plano.')
