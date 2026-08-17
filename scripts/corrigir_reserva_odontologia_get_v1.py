from pathlib import Path
import json


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'Trecho não encontrado em {path}: {old[:220]!r}')
    p.write_text(text.replace(old, new, 1))


# V106 — corrige a falha real observada no iPhone: o POST/sendBeacon não está
# persistindo a reserva no Apps Script. A agenda já funciona via doGet/JSONP;
# portanto a reserva ganha uma rota GET idempotente, mantendo o POST como fallback.

backend_path = Path('apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs')
backend = backend_path.read_text()
backend = backend.replace("VERSAO:'2.1.0'", "VERSAO:'2.2.0'", 1)
old_get = """      if(action==='reserva_status'||action==='status_reserva_odontologia'){
        try{
          return agendasProfissionaisTerritoriaisV1ResponderJson_(correcaoDataOdontologiaV1StatusReserva_(p),p.callback);
        }catch(erroStatusReserva){
          return agendasProfissionaisTerritoriaisV1ResponderJson_({ok:false,message:correcaoDataOdontologiaV1Erro_(erroStatusReserva)},p.callback);
        }
      }
"""
new_get = """      if(action==='reservar_get'||action==='reservar_odontologia_get'){
        if(correcaoDataOdontologiaV1Texto_(p.probe)==='1'){
          return agendasProfissionaisTerritoriaisV1ResponderJson_({ok:true,probe:true,versao:TACS_CORRECAO_DATA_ODONTOLOGIA_V1.VERSAO,route:'reservar_get'},p.callback);
        }
        var resultadoGet;
        try{resultadoGet=correcaoDataOdontologiaV1Reservar_(p);}
        catch(erroReservaGet){resultadoGet={ok:false,message:correcaoDataOdontologiaV1Erro_(erroReservaGet)};}
        return agendasProfissionaisTerritoriaisV1ResponderJson_(resultadoGet,p.callback);
      }
      if(action==='reserva_status'||action==='status_reserva_odontologia'){
        try{
          return agendasProfissionaisTerritoriaisV1ResponderJson_(correcaoDataOdontologiaV1StatusReserva_(p),p.callback);
        }catch(erroStatusReserva){
          return agendasProfissionaisTerritoriaisV1ResponderJson_({ok:false,message:correcaoDataOdontologiaV1Erro_(erroStatusReserva)},p.callback);
        }
      }
"""
if new_get not in backend:
    if old_get not in backend:
        raise SystemExit('Bloco doGet de reserva_status não encontrado')
    backend = backend.replace(old_get, new_get, 1)
backend_path.write_text(backend)


dental_path = Path('portal-odontologia-segunda-sexta.js')
dental = dental_path.read_text()
old_queue = """  function queueDurableReservation(item) {
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
new_queue = """  function queueDurableReservation(item) {
    if (!API || !item || !item.requestId) return false;
    var params = reservationParams(item);

    // O canal de leitura GET/JSONP do Apps Script já é o canal comprovadamente
    // funcional no Safari. A reserva usa o mesmo canal, com requestId idempotente.
    var getParams = new URLSearchParams(params.toString());
    getParams.set('action', 'reservar_get');
    getParams.set('v', String(Date.now()));
    var getUrl = API + (API.indexOf('?') === -1 ? '?' : '&') + getParams.toString();
    var getQueued = false;
    try {
      if (window.fetch) {
        window.fetch(getUrl, {
          method: 'GET',
          mode: 'no-cors',
          keepalive: true,
          credentials: 'omit',
          cache: 'no-store'
        }).catch(function () {});
        getQueued = true;
      }
    } catch (error) {}
    if (!getQueued) {
      try {
        var beaconImage = new Image();
        beaconImage.src = getUrl;
        getQueued = true;
      } catch (error) {}
    }

    // Mantém os transportes antigos apenas como redundância/fallback.
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
    return getQueued;
  }
"""
if new_queue not in dental:
    if old_queue not in dental:
        raise SystemExit('queueDurableReservation V105 não encontrada')
    dental = dental.replace(old_queue, new_queue, 1)
dental_path.write_text(dental)

# Cache-buster novo no portal.
index_path = Path('index.html')
index = index_path.read_text()
index = index.replace('portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v5',
                      'portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v6', 1)
index_path.write_text(index)

# Simulação DOM passa a registrar explicitamente a tentativa GET idempotente.
test_dom_path = Path('scripts/test_dom_flows.js')
t = test_dom_path.read_text()
old_records = """      alerts: [],
      durableReservations: []
"""
new_records = """      alerts: [],
      durableReservations: [],
      durableGetReservations: []
"""
if new_records not in t:
    if old_records not in t:
        raise SystemExit('Bloco durableReservations não encontrado')
    t = t.replace(old_records, new_records, 1)

old_beacon = """        Object.defineProperty(window.navigator, 'sendBeacon', {
          configurable: true,
          value: function (url, body) {
"""
new_beacon = """        window.fetch = function (url, options) {
          const parsed = new window.URL(String(url || ''), window.location.href);
          if (parsed.hostname === 'script.google.com' && parsed.searchParams.get('action') === 'reservar_get') {
            harness.records.durableGetReservations.push({
              url: parsed.href,
              action: parsed.searchParams.get('action') || '',
              areaId: parsed.searchParams.get('areaId') || '',
              requestId: parsed.searchParams.get('requestId') || '',
              date: parsed.searchParams.get('date') || '',
              type: parsed.searchParams.get('type') || '',
              keepalive: Boolean(options && options.keepalive),
              method: String(options && options.method || 'GET')
            });
            return Promise.resolve({ok: true});
          }
          return Promise.resolve({ok: true});
        };
        Object.defineProperty(window.navigator, 'sendBeacon', {
          configurable: true,
          value: function (url, body) {
"""
if new_beacon not in t:
    if old_beacon not in t:
        raise SystemExit('Mock sendBeacon não encontrado')
    t = t.replace(old_beacon, new_beacon, 1)

old_assert = """    assert.match(durable.requestId, /^MATIAS-/);
    const cacheKey = window.PortalTacsOdontologiaV98.cacheKey;
"""
new_assert = """    assert.match(durable.requestId, /^MATIAS-/);
    await waitFor(
      () => harness.records.durableGetReservations.length >= 1,
      'A rota GET durável não foi disparada no clique da vaga'
    );
    const durableGet = harness.records.durableGetReservations[0];
    assert.equal(durableGet.action, 'reservar_get');
    assert.equal(durableGet.type, 'emergencial');
    assert.equal(durableGet.date, '2099-08-03');
    assert.equal(durableGet.method, 'GET');
    assert.equal(durableGet.keepalive, true);
    assert.equal(durableGet.requestId, durable.requestId);
    const cacheKey = window.PortalTacsOdontologiaV98.cacheKey;
"""
if new_assert not in t:
    if old_assert not in t:
        raise SystemExit('Ponto de asserção da reserva durável não encontrado')
    t = t.replace(old_assert, new_assert, 1)
test_dom_path.write_text(t)

# Gate de código exige agora a rota GET no frontend e no backend.
gate_path = Path('scripts/test_dental_confirmation_gate_v103.js')
gate = gate_path.read_text()
gate = gate.replace("assert.match(dental,/navigator\\.sendBeacon\\(API, params\\)/);\n",
                    "assert.match(dental,/getParams\\.set\\('action', 'reservar_get'\\)/);\nassert.match(dental,/method:\\s*'GET'/);\nassert.match(dental,/navigator\\.sendBeacon\\(API, params\\)/);\n", 1)
gate = gate.replace("assert.match(backend,/CODIGO_SOLICITACAO/);\n",
                    "assert.match(backend,/action==='reservar_get'/);\nassert.match(backend,/route:'reservar_get'/);\nassert.match(backend,/VERSAO:'2\\.2\\.0'/);\nassert.match(backend,/CODIGO_SOLICITACAO/);\n", 1)
gate = gate.replace('dental-whatsapp-bridge-v5', 'dental-whatsapp-bridge-v6')
gate = gate.replace("DENTAL_VACANCY_PERSISTENCE_V105_OK", "DENTAL_VACANCY_GET_ROUTE_V106_OK")
gate_path.write_text(gate)

Path('portal-version.json').write_text(json.dumps({
    'version': 'dental-vacancy-get-route-v106',
    'releasedAt': '2026-08-17T15:38:00Z',
    'scope': 'Reserva odontológica idempotente também por GET keepalive; POST mantido apenas como fallback'
}, ensure_ascii=False, indent=2) + '\n')

# O mesmo commit solicita uma nova versão do Apps Script depois dos testes.
Path('.github/apps-script-release-request').write_text('odontologia-reserva-get-v106 publicar-2026-08-17-12h38\n')
