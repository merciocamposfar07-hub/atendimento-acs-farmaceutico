from pathlib import Path

portal = Path('portal-odontologia-segunda-sexta.js')
index = Path('index.html')

js = portal.read_text(encoding='utf-8')
marker = 'PORTAL_TACS_ODONTO_EXPIRACAO_HORARIO_V1'

if marker not in js:
    old_vars = "  var verifyTimer = null;\n"
    new_vars = "  var verifyTimer = null;\n  var expiryTimer = null; // PORTAL_TACS_ODONTO_EXPIRACAO_HORARIO_V1\n"
    if old_vars not in js:
        raise SystemExit('Ponto de inserção do timer não encontrado')
    js = js.replace(old_vars, new_vars, 1)

    old_current = """  function currentDate(value) {\n    var stamp = dateStamp(value);\n    return Number.isFinite(stamp) && stamp >= dateStamp(recifeToday());\n  }\n"""
    new_current = """  function currentDate(value) {\n    var stamp = dateStamp(value);\n    return Number.isFinite(stamp) && stamp >= dateStamp(recifeToday());\n  }\n\n  function booleanValue(value) {\n    if (value === true || value === 1) return true;\n    var text = normalize(value);\n    return text === 'true' || text === '1' || text === 'sim' || text === 'yes' || text === 'ativo' || text === 'ativa';\n  }\n\n  function normalizeClock(value) {\n    var match = clean(value).match(/^([01]\\d|2[0-3]):([0-5]\\d)/);\n    return match ? match[1] + ':' + match[2] : '';\n  }\n\n  function recifeNowParts() {\n    var parts = new Intl.DateTimeFormat('en-CA', {\n      timeZone: 'America/Recife',\n      year: 'numeric', month: '2-digit', day: '2-digit',\n      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'\n    }).formatToParts(new Date());\n    var result = {};\n    parts.forEach(function (part) { result[part.type] = part.value; });\n    return {\n      date: result.year + '-' + result.month + '-' + result.day,\n      time: result.hour + ':' + result.minute\n    };\n  }\n\n  function configuredExpiry(raw) {\n    if (!raw) return '';\n    return normalizeClock(raw.expiraAs || raw.encerraHorario || raw.encerra_horario || raw.expireAt || '');\n  }\n\n  function expiredByConfiguredTime(date, expiresAt) {\n    var limit = normalizeClock(expiresAt);\n    if (!limit) return false;\n    var now = recifeNowParts();\n    if (date < now.date) return true;\n    if (date > now.date) return false;\n    return now.time >= limit;\n  }\n\n  function closedOrExpiredSlot(raw, date) {\n    if (!raw) return true;\n    if (booleanValue(raw.encerrada) || booleanValue(raw.expirada) || booleanValue(raw.closed)) return true;\n    if (raw.ativo !== undefined && raw.ativo !== null && raw.ativo !== '' && !booleanValue(raw.ativo)) return true;\n    return expiredByConfiguredTime(date, configuredExpiry(raw));\n  }\n"""
    if old_current not in js:
        raise SystemExit('Função currentDate não encontrada')
    js = js.replace(old_current, new_current, 1)

    old_normalize = """  function normalizeSlot(raw, index) {\n    var day = clean(raw && (raw.dia || raw.day));\n    var date = normalizeDate(raw && (raw.data || raw.date));\n    if (ALLOWED_DAYS.indexOf(day) === -1 || !date || !currentDate(date)) return null;\n    return {\n      id: clean(raw.id || raw.codigo || raw.row || '') || day + '-' + date + '-' + index,\n      day: day,\n      date: date,\n      common: numberValue(raw, 'comum'),\n      emergency: numberValue(raw, 'emergencial')\n    };\n  }\n"""
    new_normalize = """  function normalizeSlot(raw, index) {\n    var day = clean(raw && (raw.dia || raw.day));\n    var date = normalizeDate(raw && (raw.data || raw.date));\n    if (ALLOWED_DAYS.indexOf(day) === -1 || !date || !currentDate(date) || closedOrExpiredSlot(raw, date)) return null;\n    return {\n      id: clean(raw.id || raw.codigo || raw.row || '') || day + '-' + date + '-' + index,\n      day: day,\n      date: date,\n      expiresAt: configuredExpiry(raw),\n      common: numberValue(raw, 'comum'),\n      emergency: numberValue(raw, 'emergencial')\n    };\n  }\n\n  function pruneExpiredSlots() {\n    if (!isDental() || loading || !slots.length) return;\n    var before = slots.length;\n    slots = slots.filter(function (slot) {\n      return currentDate(slot.date) && !expiredByConfiguredTime(slot.date, slot.expiresAt);\n    });\n    if (slots.length === before) return;\n    if (selection && !slots.some(function (slot) { return slot.id === selection.id; })) selection = null;\n    renderAgenda();\n    refreshSend();\n  }\n\n  function startExpiryWatch() {\n    if (expiryTimer) return;\n    expiryTimer = setInterval(pruneExpiredSlots, 10000);\n  }\n"""
    if old_normalize not in js:
        raise SystemExit('Função normalizeSlot atual não encontrada')
    js = js.replace(old_normalize, new_normalize, 1)

    old_assign = """      slots = normalized;\n      loading = false;\n      renderAgenda();\n"""
    new_assign = """      slots = normalized;\n      startExpiryWatch();\n      loading = false;\n      pruneExpiredSlots();\n      renderAgenda();\n"""
    if old_assign not in js:
        raise SystemExit('Ponto de atualização de slots não encontrado')
    js = js.replace(old_assign, new_assign, 1)

portal.write_text(js, encoding='utf-8')

idx = index.read_text(encoding='utf-8')
old_src = 'portal-odontologia-segunda-sexta.js?v=20260817-reserva-get-v111'
new_src = 'portal-odontologia-segunda-sexta.js?v=20260818-expiracao-horario-v112'
if old_src in idx:
    idx = idx.replace(old_src, new_src, 1)
elif new_src not in idx:
    raise SystemExit('Referência atual da odontologia não encontrada no index')
index.write_text(idx, encoding='utf-8')

final_js = portal.read_text(encoding='utf-8')
required = [
    marker,
    'closedOrExpiredSlot(raw, date)',
    'raw.encerrada',
    'raw.expiraAs',
    'expiredByConfiguredTime',
    'setInterval(pruneExpiredSlots, 10000)',
    'expiresAt: configuredExpiry(raw)',
]
for token in required:
    if token not in final_js:
        raise SystemExit('Validação falhou: ' + token)

if new_src not in index.read_text(encoding='utf-8'):
    raise SystemExit('Cache-bust da odontologia não aplicado')
