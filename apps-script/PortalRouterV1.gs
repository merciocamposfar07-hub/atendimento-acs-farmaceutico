/**
 * Portal TACS — Router V1
 *
 * ÚNICO arquivo da arquitetura estabilizada que declara doGet/doPost.
 * Os núcleos público, administrativo e de desempenho apenas tratam ações.
 */
var TACS_PORTAL_ROUTER_V1 = Object.freeze({
  VERSAO: '1.1.0',
  RELEASE_ID: '20260807-estavel-v1'
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
      if (
        action === 'admin_status' &&
        String(parametros.prewarm || '') === '1' &&
        typeof tacsPerformanceV1PreaquecerAdmin_ === 'function'
      ) {
        admin.data.preaquecimento = tacsPerformanceV1PreaquecerAdmin_();
      }
      return tacsRouterV1Responder_(admin.data, callback);
    }

    if (
      (action === 'painel_publico' || action === '') &&
      typeof tacsPerformanceV1PublicoCache_ === 'function'
    ) {
      var publicoEmCache = tacsPerformanceV1PublicoCache_();
      if (publicoEmCache) {
        return tacsRouterV1Responder_(publicoEmCache, callback);
      }
    }

    var publico = typeof tratarGetPublicCoreV1_ === 'function'
      ? tratarGetPublicCoreV1_(e)
      : null;
    if (publico && publico.handled) {
      if (
        (action === 'painel_publico' || action === '') &&
        typeof tacsPerformanceV1GuardarPublico_ === 'function'
      ) {
        tacsPerformanceV1GuardarPublico_(publico.data);
      }
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
  var action = String(parametros.action || '').trim();
  var requestId = String(parametros.requestId || '').trim();

  try {
    if (
      action === 'admin_dados' &&
      typeof tacsPerformanceV1AdminDadosCache_ === 'function'
    ) {
      var adminEmCache = tacsPerformanceV1AdminDadosCache_(parametros);
      if (adminEmCache && adminEmCache.handled) {
        return tacsRouterV1ResponderPostAdmin_(
          adminEmCache.data,
          adminEmCache.requestId || requestId
        );
      }
    }

    var admin = typeof tratarPostAdminCoreV1_ === 'function'
      ? tratarPostAdminCoreV1_(e)
      : null;
    if (admin && admin.handled) {
      if (typeof tacsPerformanceV1DepoisDeAdmin_ === 'function') {
        tacsPerformanceV1DepoisDeAdmin_(action, admin.data);
      }
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

function tacsRouterV1ComRelease_(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return dados;
  dados.releaseId = TACS_PORTAL_ROUTER_V1.RELEASE_ID;
  return dados;
}

function tacsRouterV1Responder_(dados, callback) {
  dados = tacsRouterV1ComRelease_(dados);
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
  resultado = tacsRouterV1ComRelease_(resultado);
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
