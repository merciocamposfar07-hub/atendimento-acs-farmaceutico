from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'moradores-autofill.js'
text = PATH.read_text(encoding='utf-8')
original = text


def replace_once(pattern, replacement, label):
    global text
    text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 bloco, encontrado {count}')

text = text.replace(
"  var activeTimeout = null;\n  var activeNonce = '';\n  var activeCallback = '';",
"  var activeBridgeTimeout = null;\n  var activeJsonpTimeout = null;\n  var adaptiveHedgeTimer = null;\n  var activeNonce = '';\n  var activeCallback = '';\n  var completedRequestId = 0;\n  var HEDGE_DELAY_MS = 1250;\n  var BRIDGE_LIMIT_MS = 6500;"
)
if text == original:
    raise SystemExit('globais adaptativos não foram aplicados')

replace_once(
    r"  function cleanupTransport\(\) \{.*?\n  \}\n\n  function install\(\)",
'''  function cleanupTransport() {
    if (activeBridgeTimeout) clearTimeout(activeBridgeTimeout);
    if (activeJsonpTimeout) clearTimeout(activeJsonpTimeout);
    if (adaptiveHedgeTimer) clearTimeout(adaptiveHedgeTimer);
    activeBridgeTimeout = null;
    activeJsonpTimeout = null;
    adaptiveHedgeTimer = null;
    activeNonce = '';

    if (activeFrame) {
      if (activeFrame.parentNode) activeFrame.parentNode.removeChild(activeFrame);
      activeFrame = null;
    }

    if (activeScript) {
      activeScript.onerror = null;
      if (activeScript.parentNode) activeScript.parentNode.removeChild(activeScript);
      activeScript = null;
    }

    if (activeCallback) {
      try { delete window[activeCallback]; } catch (e) { window[activeCallback] = undefined; }
      activeCallback = '';
    }
  }

  function finishBridgeOnly() {
    if (activeBridgeTimeout) clearTimeout(activeBridgeTimeout);
    activeBridgeTimeout = null;
    activeNonce = '';
    if (activeFrame) {
      if (activeFrame.parentNode) activeFrame.parentNode.removeChild(activeFrame);
      activeFrame = null;
    }
  }

  function finishJsonpOnly() {
    if (activeJsonpTimeout) clearTimeout(activeJsonpTimeout);
    activeJsonpTimeout = null;
    if (activeScript) {
      activeScript.onerror = null;
      if (activeScript.parentNode) activeScript.parentNode.removeChild(activeScript);
      activeScript = null;
    }
    if (activeCallback) {
      try { delete window[activeCallback]; } catch (e) { window[activeCallback] = undefined; }
      activeCallback = '';
    }
  }

  function install()''',
    'cleanupTransport'
)

replace_once(
    r"    function complete\(payload, token\) \{.*?\n    \}\n\n    function failOrRetry",
'''    function complete(payload, token) {
      if (token !== requestId || token === completedRequestId) return;
      completedRequestId = token;
      cleanupTransport();

      if (payload && payload.ok === true && payload.encontrado === true) {
        var expectedArea = portalAreaId();
        var returnedArea = normalizeArea(payload.morador && payload.morador.areaId);
        if (!returnedArea || returnedArea !== expectedArea) {
          clearResidentFields();
          setStatus(status, 'Este cadastro não pertence à área deste TACS.', 'invalid');
          return;
        }
        if (fillFields(payload)) {
          applyFamilyContext(payload);
          setStatus(status, (validCns(input.value) ? 'Cartão SUS encontrado ✓ ' : 'CPF encontrado ✓ ') + 'Dados carregados automaticamente. Confira nome, nascimento e localidade; se algo estiver errado, corrija antes de continuar.', 'valid');
        } else {
          clearResidentFields();
          setStatus(status, 'O cadastro retornado está incompleto. Procure seu TACS.', 'invalid');
        }
      } else if (payload && payload.ok === true && payload.encontrado === false) {
        setStatus(status, validCns(input.value) ? 'Cartão SUS não localizado nesta área. Confira os 15 números ou procure seu TACS.' : 'CPF não localizado nesta área. Tente informar o Cartão SUS (CNS).', 'invalid');
      } else {
        setStatus(status, payload && payload.message ? payload.message : 'Não foi possível consultar agora. Tente novamente.', 'invalid');
      }
    }

    function failOrRetry''',
    'complete'
)

replace_once(
    r"    function failOrRetry\(doc, token, attempt\) \{.*?\n    \}\n\n    function startJsonp",
'''    function failOrRetry(doc, token, attempt) {
      if (token !== requestId || token === completedRequestId) return;
      finishJsonpOnly();

      if (attempt < 2) {
        setLoadingStatus(status);
        setTimeout(function () {
          if (token === requestId && token !== completedRequestId) startJsonp(doc, token, attempt + 1, Boolean(activeFrame));
        }, 700);
      } else {
        cleanupTransport();
        setStatus(status, 'Não foi possível consultar agora. Tente novamente.', 'invalid');
      }
    }

    function startJsonp''',
    'failOrRetry'
)

replace_once(
    r"    function startJsonp\(doc, token, attempt\) \{.*?\n    \}\n\n    function startBridge",
'''    function startJsonp(doc, token, attempt, keepBridge) {
      if (token !== requestId || token === completedRequestId) return;
      if (!keepBridge) cleanupTransport();
      else finishJsonpOnly();

      var callback = 'moradorTacs_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
      activeCallback = callback;
      window[callback] = function (data) {
        complete(data, token);
      };

      var script = document.createElement('script');
      activeScript = script;
      script.async = true;
      script.src = API + '?action=buscar_morador&documento=' + encodeURIComponent(doc) + '&areaId=' + encodeURIComponent(portalAreaId()) + '&familiaReferencia=' + encodeURIComponent(familyReference()) + '&callback=' + encodeURIComponent(callback) + '&tentativa=' + attempt + '&v=' + Date.now();
      script.onerror = function () {
        failOrRetry(doc, token, attempt);
      };

      activeJsonpTimeout = setTimeout(function () {
        failOrRetry(doc, token, attempt);
      }, 6500);

      document.head.appendChild(script);
    }

    function startBridge''',
    'startJsonp'
)

replace_once(
    r"    function startBridge\(doc, token\) \{.*?\n    \}\n\n    window\.addEventListener\('message'",
'''    function startBridge(doc, token) {
      if (token !== requestId || token === completedRequestId) return;
      cleanupTransport();

      var nonce = 'morador-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
      var frame = document.createElement('iframe');
      frame.hidden = true;
      frame.setAttribute('aria-hidden', 'true');
      frame.title = 'Consulta de cadastro';
      frame.src = API + '?action=buscar_morador_bridge&documento=' + encodeURIComponent(doc) + '&areaId=' + encodeURIComponent(portalAreaId()) + '&familiaReferencia=' + encodeURIComponent(familyReference()) + '&nonce=' + encodeURIComponent(nonce) + '&v=' + Date.now();

      activeNonce = nonce;
      activeFrame = frame;

      adaptiveHedgeTimer = setTimeout(function () {
        if (token !== requestId || token === completedRequestId || !activeFrame || activeScript) return;
        setLoadingStatus(status);
        startJsonp(doc, token, 0, true);
      }, HEDGE_DELAY_MS);

      activeBridgeTimeout = setTimeout(function () {
        if (token !== requestId || token === completedRequestId) return;
        finishBridgeOnly();
        if (!activeScript) {
          setLoadingStatus(status);
          startJsonp(doc, token, 0, false);
        }
      }, BRIDGE_LIMIT_MS);

      document.body.appendChild(frame);
    }

    window.addEventListener('message' ''',
    'startBridge'
)

# Corrige o espaço inserido pelo delimitador acima.
text = text.replace("window.addEventListener('message' , function", "window.addEventListener('message', function")

# A cada nova consulta, o token concluído anterior deixa de bloquear o novo pedido.
needle = "      var token = ++requestId;\n      cleanupTransport();"
replacement = "      var token = ++requestId;\n      completedRequestId = 0;\n      cleanupTransport();"
if needle not in text:
    raise SystemExit('lookup token: trecho não encontrado')
text = text.replace(needle, replacement, 1)

if 'activeTimeout' in text:
    raise SystemExit('restou referência ao timeout único legado')

PATH.write_text(text, encoding='utf-8')
print('AUTOFILL_ADAPTATIVO_V1_APLICADO')
