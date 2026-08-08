/**
 * Portal TACS — Router V1
 *
 * ÚNICO arquivo da arquitetura estabilizada que declara doGet/doPost.
 * Os núcleos público e administrativo apenas tratam ações e retornam dados.
 */
var TACS_PORTAL_ROUTER_V1 = Object.freeze({
  VERSAO: '1.0.0'
});

function doGet(e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var action = String(parametros.action || '').trim();
  var callback = String(parametros.callback || '').trim();

  try {
    var admin = typeof tratarGetAdminCoreV1_ === 'function'
      ? tratarGetAdminCoreV1_(e)
      : null;
    if (admin && admin.handled) {
      return tacsRouterV1Responder_(admin.data, callback);
    }

    var publico = typeof tratarGetPublicCoreV1_ === 'function'
      ? tratarGetPublicCoreV1_(e)
      : null;
    if (publico && publico.handled) {
      return tacsRouterV1Responder_(publico.data, callback);
    }

    if (action === 'buscar_morador_bridge' && typeof buscarMoradorPorDocumento_ === 'function' && typeof responderMoradorPorIframe_ === 'function') {
      return responderMoradorPorIframe_(
        buscarMoradorPorDocumento_(parametros.documento || ''),
        parametros.nonce || ''
      );
    }

    if (action === 'buscar_morador' && typeof buscarMoradorPorDocumento_ === 'function') {
      return tacsRouterV1Responder_(
        buscarMoradorPorDocumento_(parametros.documento || ''),
        callback
      );
    }

    return tacsRouterV1Responder_({
      ok: false,
      message: 'Ação não reconhecida.',
      action: action,
      versaoRouter: TACS_PORTAL_ROUTER_V1.VERSAO
    }, callback);
  } catch (erro) {
    return tacsRouterV1Responder_({
      ok: false,
      message: erro && erro.message ? erro.message : String(erro),
      versaoRouter: TACS_PORTAL_ROUTER_V1.VERSAO
    }, callback);
  }
}

function doPost(e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var requestId = String(parametros.requestId || '').trim();

  try {
    var admin = typeof tratarPostAdminCoreV1_ === 'function'
      ? tratarPostAdminCoreV1_(e)
      : null;
    if (admin && admin.handled) {
      return tacsRouterV1ResponderPostAdmin_(admin.data, admin.requestId || requestId);
    }

    return tacsRouterV1ResponderPostAdmin_({
      ok: false,
      message: 'Ação administrativa não reconhecida.'
    }, requestId);
  } catch (erro) {
    return tacsRouterV1ResponderPostAdmin_({
      ok: false,
      message: erro && erro.message ? erro.message : String(erro)
    }, requestId);
  }
}

function tacsRouterV1Responder_(dados, callback) {
  var json = JSON.stringify(dados);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function tacsRouterV1ResponderPostAdmin_(resultado, requestId) {
  var mensagem = {
    source: 'admin-painel-tacs-v1',
    requestId: String(requestId || ''),
    result: resultado
  };
  var seguro = JSON.stringify(mensagem).replace(/</g, '\\u003c').replace(/-->/g, '--\\>');
  var saida = HtmlService.createHtmlOutput(
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head>' +
    '<body><script>parent.postMessage(' + seguro + ',"*");<\\/script></body></html>'
  );
  return saida.setXFrameOptionsMode
    ? saida.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    : saida;
}
