from pathlib import Path
import re

p = Path('portal-odontologia-segunda-sexta.js')
t = p.read_text()
pattern = r"  function postReservation\(item\) \{.*?\n  \}\n\n  function slotForSelection\(item\) \{"
replacement = r'''  function postReservation(item) {
    return new Promise(function (resolve, reject) {
      if (!API) { reject(new Error('A vaga não está conectada à planilha.')); return; }

      var callbackName = 'dentalV111Reserve' + Date.now() + Math.floor(Math.random() * 10000);
      var script = document.createElement('script');
      var finished = false;
      var timer = setTimeout(function () {
        var timeout = new Error('A confirmação da reserva está demorando.');
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
        if (data && data.ok) {
          finish(null, data);
          return;
        }
        var error = new Error(data && data.message ? data.message : 'Não foi possível reservar a vaga.');
        error.code = clean(data && data.code);
        finish(error);
      };

      var params = new URLSearchParams();
      params.set('action', 'reservar_get');
      params.set('areaId', window.TACS_AREA_ID || 'JAPARANDUBA');
      params.set('requestId', item.requestId);
      params.set('date', item.date);
      params.set('type', item.type);
      params.set('callback', callbackName);
      params.set('v', String(Date.now()));

      script.onerror = function () {
        var error = new Error('Não foi possível confirmar a reserva na agenda.');
        error.code = 'NETWORK';
        finish(error);
      };
      script.src = API + (API.indexOf('?') === -1 ? '?' : '&') + params.toString();
      document.head.appendChild(script);
    });
  }

  function slotForSelection(item) {'''
nt, n = re.subn(pattern, replacement, t, count=1, flags=re.S)
if n != 1:
    raise SystemExit('Nao foi possivel localizar postReservation atual')
p.write_text(nt)

p = Path('index.html')
t = p.read_text()
nt, n = re.subn(r"portal-odontologia-segunda-sexta\.js\?v=[^\"']+", 'portal-odontologia-segunda-sexta.js?v=20260817-reserva-get-v111', t, count=1)
if n != 1:
    raise SystemExit('Referencia do JS odontologico nao localizada no index')
p.write_text(nt)
