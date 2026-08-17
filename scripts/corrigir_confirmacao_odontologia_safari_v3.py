from pathlib import Path
import json


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Trecho não encontrado em {path}: {old[:180]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


backend = Path('apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs')
bt = backend.read_text(encoding='utf-8')
bt = bt.replace("VERSAO:'2.0.0'", "VERSAO:'2.1.0'", 1)
marker = "      return correcaoDataOdontologiaV1DoGetAnterior_(e);"
status_route = """      if(action==='reserva_status'||action==='status_reserva_odontologia'){
        try{
          return agendasProfissionaisTerritoriaisV1ResponderJson_(correcaoDataOdontologiaV1StatusReserva_(p),p.callback);
        }catch(erroStatusReserva){
          return agendasProfissionaisTerritoriaisV1ResponderJson_({ok:false,message:correcaoDataOdontologiaV1Erro_(erroStatusReserva)},p.callback);
        }
      }
      return correcaoDataOdontologiaV1DoGetAnterior_(e);"""
if "action==='reserva_status'" not in bt:
    if marker not in bt:
        raise SystemExit('Ponto de inserção do status da reserva não encontrado no backend')
    bt = bt.replace(marker, status_route, 1)

function_marker = "function correcaoDataOdontologiaV1Reservar_(p){"
status_function = """function correcaoDataOdontologiaV1StatusReserva_(p){
  var areaId=agendasProfissionaisTerritoriaisV1AreaId_(p.areaId||p.area)||TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AREA_PADRAO;
  var requestId=correcaoDataOdontologiaV1Texto_(p.requestId);
  if(!/^[A-Z0-9-]{8,60}$/.test(requestId))return{ok:false,code:'INVALID_REQUEST',message:'Código da solicitação inválido.'};
  var reservas=agendasProfissionaisTerritoriaisV1Tabela_(agendasProfissionaisTerritoriaisV1Planilha_(),TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_RESERVAS,TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.RESERVA_HEADERS,true);
  var existente=agendasProfissionaisTerritoriaisV1Encontrar_(reservas,'CODIGO_SOLICITACAO',requestId,areaId);
  if(!existente)return{ok:true,found:false,requestId:requestId,areaId:areaId};
  var item=agendasProfissionaisTerritoriaisV1Objeto_(reservas.headers,existente.values);
  return{
    ok:true,found:true,requestId:requestId,areaId:areaId,
    date:correcaoDataOdontologiaV1DataCivil_(item.DATA_CONSULTA)||agendasProfissionaisTerritoriaisV1Data_(item.DATA_CONSULTA),
    type:correcaoDataOdontologiaV1Texto_(item.TIPO_VAGA).toLowerCase(),
    remaining:agendasProfissionaisTerritoriaisV1NaoNegativo_(item.VAGAS_RESTANTES),
    situacao:correcaoDataOdontologiaV1Texto_(item.SITUACAO)
  };
}

"""
if 'function correcaoDataOdontologiaV1StatusReserva_' not in bt:
    if function_marker not in bt:
        raise SystemExit('Ponto de inserção da função de status não encontrado')
    bt = bt.replace(function_marker, status_function + function_marker, 1)
backend.write_text(bt, encoding='utf-8')


dental = Path('portal-odontologia-segunda-sexta.js')
dt = dental.read_text(encoding='utf-8')
post_marker = "  function postReservation(item) {"
status_js = """  function fetchReservationStatus(item) {
    return new Promise(function (resolve, reject) {
      if (!API) { reject(new Error('A vaga não está conectada à planilha.')); return; }
      var callbackName = 'dentalV103Status' + Date.now() + Math.floor(Math.random() * 10000);
      var script = document.createElement('script');
      var finished = false;
      var timer = setTimeout(function () {
        var timeout = new Error('A confirmação da reserva ainda não respondeu.');
        timeout.code = 'TIMEOUT';
        finish(timeout);
      }, 6500);

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
          var error = new Error(data && data.message ? data.message : 'Não foi possível conferir a reserva.');
          error.code = clean(data && data.code);
          finish(error);
          return;
        }
        finish(null, data);
      };
      script.onerror = function () {
        var error = new Error('Não foi possível conferir a confirmação da vaga.');
        error.code = 'TIMEOUT';
        finish(error);
      };
      script.src = API + (API.indexOf('?') === -1 ? '?' : '&') +
        'action=reserva_status&areaId=' + encodeURIComponent(AREA_ID) +
        '&requestId=' + encodeURIComponent(item.requestId) +
        '&callback=' + encodeURIComponent(callbackName) + '&v=' + Date.now();
      document.head.appendChild(script);
    });
  }

  function applyReservationStatus(item, result) {
    if (!result || !result.found) return false;
    if (normalizeDate(result.date) !== item.date || clean(result.type) !== item.type) {
      var conflict = new Error('Este formulário já reservou outra data.');
      conflict.code = 'CONFLICT';
      throw conflict;
    }
    if (Number.isFinite(Number(result.remaining))) applyServerRemaining(item, result.remaining);
    item.confirmed = true;
    item.slowSync = false;
    renderAgenda();
    refreshSend();
    return true;
  }

  function recoverReservationStatus(item) {
    return fetchReservationStatus(item).then(function (result) {
      if (!result || !result.found) {
        var notFound = new Error('A reserva ainda não apareceu na planilha.');
        notFound.code = 'NOT_FOUND';
        throw notFound;
      }
      applyReservationStatus(item, result);
      return result;
    });
  }

"""
if 'function fetchReservationStatus(item)' not in dt:
    if post_marker not in dt:
        raise SystemExit('Ponto de inserção do status JSONP não encontrado no portal odontológico')
    dt = dt.replace(post_marker, status_js + post_marker, 1)

old_verify = """    if (error.code && error.code !== 'TIMEOUT') {
      handleExplicitReservationFailure(item, error);
      return;
    }
    if (attempt < 5) {
      scheduleVerify(item, attempt + 1, Math.min(6000, 1500 + attempt * 900));
      return;
    }
    item.slowSync = true;
    renderAgenda();
    refreshSend();"""
new_verify = """    if (error.code && error.code !== 'TIMEOUT') {
      handleExplicitReservationFailure(item, error);
      return;
    }
    recoverReservationStatus(item).then(function () {
      loadAgenda(true);
    }).catch(function (statusError) {
      if (statusError.code && statusError.code !== 'NOT_FOUND' && statusError.code !== 'TIMEOUT') {
        handleExplicitReservationFailure(item, statusError);
        return;
      }
      if (attempt < 5) {
        scheduleVerify(item, attempt + 1, Math.min(6000, 1500 + attempt * 900));
        return;
      }
      item.slowSync = true;
      renderAgenda();
      refreshSend();
    });"""
if old_verify not in dt:
    raise SystemExit('Trecho de verificação odontológica não encontrado')
dt = dt.replace(old_verify, new_verify, 1)

old_persist = """    }).catch(function (error) {
      if (error.code && error.code !== 'TIMEOUT') handleExplicitReservationFailure(item, error);
      else scheduleVerify(item, 0, 1200);
    });
  }

  function selectDental(button) {"""
new_persist = """    }).catch(function (error) {
      if (error.code && error.code !== 'TIMEOUT') {
        handleExplicitReservationFailure(item, error);
        return;
      }
      recoverReservationStatus(item).then(function () {
        loadAgenda(true);
      }).catch(function (statusError) {
        if (statusError.code && statusError.code !== 'NOT_FOUND' && statusError.code !== 'TIMEOUT') handleExplicitReservationFailure(item, statusError);
        else scheduleVerify(item, 0, 900);
      });
    });
  }

  function selectDental(button) {"""
if old_persist not in dt:
    raise SystemExit('Trecho de persistência odontológica não encontrado')
dt = dt.replace(old_persist, new_persist, 1)
dental.write_text(dt, encoding='utf-8')


card = Path('portal-ajustes-finais.js')
ct = card.read_text(encoding='utf-8')
ct = ct.replace('var deadline = Date.now() + 16000;', 'var deadline = Date.now() + 26000;', 1)
card.write_text(ct, encoding='utf-8')


index = Path('index.html')
it = index.read_text(encoding='utf-8')
it = it.replace('portal-ajustes-finais.js?v=20260817-dental-card-bridge-v2', 'portal-ajustes-finais.js?v=20260817-dental-card-bridge-v3', 1)
it = it.replace('portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v2', 'portal-odontologia-segunda-sexta.js?v=20260817-dental-whatsapp-bridge-v3', 1)
index.write_text(it, encoding='utf-8')


gate = Path('scripts/test_dental_confirmation_gate_v103.js')
gt = gate.read_text(encoding='utf-8')
gt = gt.replace('dental-whatsapp-bridge-v2', 'dental-whatsapp-bridge-v3')
gt = gt.replace("assert.match(backend,/VERSAO:'2\\.0\\.0'/);", "assert.match(backend,/VERSAO:'2\\.1\\.0'/);")
marker = "assert.match(dental,/formularioValido: function \\(\\)/);"
extra = """assert.match(dental,/function fetchReservationStatus\\(item\\)/);
assert.match(dental,/action=reserva_status/);
assert.match(dental,/function recoverReservationStatus\\(item\\)/);
assert.match(backend,/reserva_status/);
assert.match(backend,/function correcaoDataOdontologiaV1StatusReserva_/);
"""
if 'function fetchReservationStatus' not in gt:
    if marker not in gt:
        raise SystemExit('Marcador do gate odontológico não encontrado')
    gt = gt.replace(marker, marker + '\n' + extra, 1)
gate.write_text(gt, encoding='utf-8')


Path('portal-version.json').write_text(json.dumps({
    'version': 'd17a1c0ff003',
    'releasedAt': '2026-08-17T14:52:00Z',
    'scope': 'Confirmação odontológica robusta no Safari com verificação direta da reserva'
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

Path('.github/apps-script-release-request').write_text(
    'odontologia-confirmacao-safari-v3 publicar-2026-08-17-11h52\n',
    encoding='utf-8'
)
