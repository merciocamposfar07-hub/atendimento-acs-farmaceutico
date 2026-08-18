from pathlib import Path

js_path=Path('portal-odontologia-segunda-sexta.js')
index_path=Path('index.html')
test_path=Path('scripts/test_performance_v101.js')

s=js_path.read_text(encoding='utf-8')

# 1) Podar horário vencido de snapshot antigo não pode renovar artificialmente savedAt.
old="""    if (selection && !slots.some(function (slot) { return slot.id === selection.id; })) selection = null;
    writeSlotsCache();
    renderAgenda();
"""
new="""    if (selection && !slots.some(function (slot) { return slot.id === selection.id; })) selection = null;
    if (!cacheVisible) writeSlotsCache();
    renderAgenda();
"""
if new not in s:
    if s.count(old)!=1: raise SystemExit('Prune do cache não localizado exatamente uma vez.')
    s=s.replace(old,new,1)

# 2) Se o backend rejeitar a reserva, restaurar também o snapshot local otimista.
old="""    if (slot) {
      if (item.type === 'emergencial') slot.emergency = item.originalCount;
      else slot.common = item.originalCount;
    }
    item.explicitFailure = true;
"""
new="""    if (slot) {
      if (item.type === 'emergencial') slot.emergency = item.originalCount;
      else slot.common = item.originalCount;
    }
    writeSlotsCache();
    item.explicitFailure = true;
"""
if new not in s:
    if s.count(old)!=1: raise SystemExit('Restauração de falha da reserva não localizada exatamente uma vez.')
    s=s.replace(old,new,1)

# 3) Restaurar o contrato público usado pelo botão/card principal do Portal.
api="""  window.PortalTacsOdontologiaV98 = Object.freeze({
    atualizar: function () { return loadAgenda(false); },
    temCache: function () {
      try { return Boolean(localStorage.getItem(dentalCacheKey())); }
      catch (error) { return false; }
    },
    cacheKey: dentalCacheKey(),
    selecao: function () {
      if (!selection) return null;
      return {
        id: selection.id,
        day: selection.day,
        date: selection.date,
        type: selection.type,
        requestId: selection.requestId,
        confirmed: Boolean(selection.confirmed),
        slowSync: Boolean(selection.slowSync),
        explicitFailure: Boolean(selection.explicitFailure)
      };
    },
    prontoParaEnvio: function () { return Boolean(selection && formReady()); },
    formularioValido: function () { return Boolean(selection && formReady()); }
  });

"""
anchor="  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);\n"
if 'window.PortalTacsOdontologiaV98 = Object.freeze({' not in s:
    if s.count(anchor)!=1: raise SystemExit('Final do controlador odontológico não localizado.')
    s=s.replace(anchor,api+anchor,1)

for marker in [
  "if (!cacheVisible) writeSlotsCache();",
  "writeSlotsCache();\n    item.explicitFailure = true;",
  'window.PortalTacsOdontologiaV98 = Object.freeze({',
  'selecao: function ()',
  'formularioValido: function ()',
  "category.value = REGULAR;",
  "params.set('action', 'reservar_get')",
  "params.set('areaId', currentAreaId())",
  "CACHE_PREFIX = 'portalTacsDentalAgendaV103FullWeek:'",
  'CACHE_FRESH_MS = 90 * 1000',
  'PORTAL_TACS_ODONTO_EXPIRACAO_HORARIO_V1'
]:
    if marker not in s: raise SystemExit('Gate odontológico ausente: '+marker)

js_path.write_text(s,encoding='utf-8')

# 4) Cache-buster somente deste módulo.
h=index_path.read_text(encoding='utf-8')
old_token='portal-odontologia-segunda-sexta.js?v=20260818-cache-territorial-v115'
new_token='portal-odontologia-segunda-sexta.js?v=20260818-cache-api-v116'
if new_token not in h:
    if h.count(old_token)!=1: raise SystemExit('Referência v115 não localizada exatamente uma vez no index.')
    h=h.replace(old_token,new_token,1)
index_path.write_text(h,encoding='utf-8')

# 5) O gate de desempenho volta a conferir explicitamente a API pública que o Portal usa.
t=test_path.read_text(encoding='utf-8')
t=t.replace(
 "  assert.equal(dom.window.__PORTAL_TACS_ODONTOLOGIA_V98__, true, 'Controlador odontológico atual deve estar carregado');\n",
 "  assert.equal(dom.window.__PORTAL_TACS_ODONTOLOGIA_V98__, true, 'Controlador odontológico atual deve estar carregado');\n"
 "  assert.ok(dom.window.PortalTacsOdontologiaV98, 'API odontológica usada pelo card principal deve estar exposta');\n"
 "  assert.equal(typeof dom.window.PortalTacsOdontologiaV98.atualizar, 'function');\n"
 "  assert.equal(typeof dom.window.PortalTacsOdontologiaV98.selecao, 'function');\n"
 "  assert.equal(typeof dom.window.PortalTacsOdontologiaV98.formularioValido, 'function');\n"
 "  assert.equal(dom.window.PortalTacsOdontologiaV98.cacheKey, 'portalTacsDentalAgendaV103FullWeek:JAPARANDUBA');\n",
 1
)
t=t.replace(
 "  assert.ok(index.includes('portal-odontologia-segunda-sexta.js?v=20260818-cache-territorial-v115'), 'Odontologia deve invalidar cache do JavaScript ao ativar v115');",
 "  assert.ok(index.includes('portal-odontologia-segunda-sexta.js?v=20260818-cache-api-v116'), 'Odontologia deve invalidar cache do JavaScript ao ativar v116');",
 1
)
if "PortalTacsOdontologiaV98.formularioValido" not in t: raise SystemExit('Gate da API pública não entrou no teste de desempenho.')
if '20260818-cache-api-v116' not in t: raise SystemExit('Gate do cache-buster v116 não entrou no teste.')
test_path.write_text(t,encoding='utf-8')

print('ODONTOLOGIA_CACHE_API_V116_PATCH_OK')
