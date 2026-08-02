/**
 * PORTAL TACS — ROTAS ÚNICAS COM RETORNO ADMINISTRATIVO POR POLLING V1
 *
 * Substitua TODO o conteúdo de Portal.gs por este arquivo somente no projeto
 * Apps Script de reconstrução controlada. Depois execute:
 *   testarRotasPollingAdminTacsV1
 *
 * Motivo: o POST administrativo continua sendo enviado por formulário oculto,
 * mas o navegador não depende mais do postMessage do iframe para receber a
 * resposta. O resultado é guardado por até 120 segundos e consultado por JSONP.
 */

function doGet(e) {
  try {
    var action = String(
      e && e.parameter
        ? e.parameter.action || ''
        : ''
    ).trim().toLowerCase();

    var callback = String(
      e && e.parameter
        ? e.parameter.callback || ''
        : ''
    ).trim();

    if (['bootstrap', 'status', 'novidades'].indexOf(action) !== -1) {
      return apiUnicaPortalTacsGetV1(e);
    }

    if (action === 'admin_status') {
      return adminTacsV1Get(e);
    }

    if (action === 'admin_result') {
      return portalTacsAdminResultadoPollingV1_(e);
    }

    if (action === 'buscar_morador_bridge') {
      return responderMoradorPorIframe_(
        buscarMoradorPorDocumento_(
          e && e.parameter
            ? e.parameter.documento || ''
            : ''
        ),
        e && e.parameter
          ? e.parameter.nonce || ''
          : ''
      );
    }

    if (action === 'buscar_morador') {
      return responderPainelTacs_(
        buscarMoradorPorDocumento_(
          e && e.parameter
            ? e.parameter.documento || ''
            : ''
        ),
        callback
      );
    }

    var respostaIntegral = tratarGetControleIntegralTacs_(e);
    if (respostaIntegral) return respostaIntegral;

    var respostaPainel = tratarGetPainelTacs_(e);
    if (respostaPainel) return respostaPainel;

    return responderPainelTacs_(
      {
        ok: false,
        message: 'Ação não reconhecida.',
        action: action
      },
      callback
    );

  } catch (erro) {
    var callbackErro = String(
      e && e.parameter
        ? e.parameter.callback || ''
        : ''
    ).trim();

    return responderPainelTacs_(
      {
        ok: false,
        message: erro && erro.message ? erro.message : String(erro)
      },
      callbackErro
    );
  }
}

function doPost(e) {
  var action = '';
  var requestId = '';

  try {
    action = portalTacsAcaoPostV1_(e);
    requestId = portalTacsRequestIdPollingV1_(e);

    if (action.indexOf('admin_') === 0) {
      var resultadoAdmin;

      try {
        resultadoAdmin = adminTacsV1Post(e);
      } catch (erroAdmin) {
        resultadoAdmin = {
          ok: false,
          message: erroAdmin && erroAdmin.message
            ? erroAdmin.message
            : String(erroAdmin)
        };
      }

      portalTacsGuardarResultadoPollingV1_(requestId, resultadoAdmin);
      return portalTacsRespostaIframeV1_(resultadoAdmin);
    }

    if ([
      'registrar_consentimento',
      'revogar_consentimento',
      'registrar_push',
      'revogar_push'
    ].indexOf(action) !== -1) {
      return apiUnicaPortalTacsPostV1(e);
    }

    var respostaIntegral = tratarPostControleIntegralTacs_(e);
    if (respostaIntegral) return respostaIntegral;

    var respostaPainel = tratarPostPainelTacs_(e);
    if (respostaPainel) return respostaPainel;

    return portalTacsRespostaIframeV1_({
      ok: false,
      message: 'Ação não reconhecida.',
      action: action
    });

  } catch (erro) {
    var resultadoErro = {
      ok: false,
      message: erro && erro.message ? erro.message : String(erro)
    };

    if (action.indexOf('admin_') === 0) {
      portalTacsGuardarResultadoPollingV1_(requestId, resultadoErro);
    }

    return portalTacsRespostaIframeV1_(resultadoErro);
  }
}

function portalTacsAdminResultadoPollingV1_(e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var callback = String(parametros.callback || '').trim();
  var requestId = portalTacsNormalizarRequestIdPollingV1_(parametros.requestId || parametros.request_id || '');

  if (!requestId) {
    return apiTacsV1Resposta_({
      ok: false,
      pendente: false,
      message: 'Identificador da operação inválido.'
    }, callback);
  }

  var cache = CacheService.getScriptCache();
  var chave = 'admin-resposta-v1-' + requestId;
  var json = cache.get(chave);

  if (!json) {
    return apiTacsV1Resposta_({
      ok: true,
      pendente: true,
      requestId: requestId
    }, callback);
  }

  cache.remove(chave);

  var resultado;
  try {
    resultado = JSON.parse(json);
  } catch (erro) {
    resultado = {
      ok: false,
      message: 'A resposta administrativa ficou inválida no servidor.'
    };
  }

  return apiTacsV1Resposta_({
    ok: true,
    pendente: false,
    requestId: requestId,
    result: resultado
  }, callback);
}

function portalTacsGuardarResultadoPollingV1_(requestId, resultado) {
  var id = portalTacsNormalizarRequestIdPollingV1_(requestId);
  if (!id) return;

  CacheService.getScriptCache().put(
    'admin-resposta-v1-' + id,
    JSON.stringify(resultado == null ? {
      ok: false,
      message: 'Resposta administrativa vazia.'
    } : resultado),
    120
  );
}

function portalTacsRequestIdPollingV1_(e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var valor = parametros.requestId || parametros.request_id || '';

  if (!valor && e && e.postData && e.postData.contents) {
    try {
      var json = JSON.parse(e.postData.contents);
      valor = json && (json.requestId || json.request_id) || '';
    } catch (erro) {
      valor = '';
    }
  }

  return portalTacsNormalizarRequestIdPollingV1_(valor);
}

function portalTacsNormalizarRequestIdPollingV1_(valor) {
  var id = String(valor == null ? '' : valor).trim();
  return /^[A-Za-z0-9_-]{20,100}$/.test(id) ? id : '';
}

function testarRotasPollingAdminTacsV1() {
  var statusSaida = doGet({ parameter: { action: 'status' } });
  var bootstrapSaida = doGet({ parameter: { action: 'bootstrap' } });
  var adminStatusSaida = doGet({ parameter: { action: 'admin_status' } });
  var requestId = 'teste_polling_admin_12345678901234567890';

  portalTacsGuardarResultadoPollingV1_(requestId, {
    ok: true,
    teste: 'polling'
  });

  var pollingSaida = doGet({
    parameter: {
      action: 'admin_result',
      requestId: requestId
    }
  });

  var status = JSON.parse(statusSaida.getContent());
  var bootstrap = JSON.parse(bootstrapSaida.getContent());
  var adminStatus = JSON.parse(adminStatusSaida.getContent());
  var polling = JSON.parse(pollingSaida.getContent());
  var validacaoAdmin = validarAdminPortalTacsV1();

  var resultado = {
    ok:
      status.ok === true &&
      bootstrap.ok === true &&
      adminStatus.ok === true &&
      validacaoAdmin.ok === true &&
      polling.ok === true &&
      polling.pendente === false &&
      polling.result &&
      polling.result.teste === 'polling',
    status: status,
    bootstrap: {
      revisaoConteudo: bootstrap.revisaoConteudo,
      profissionais: bootstrap.resumo.profissionais,
      servicos: bootstrap.resumo.servicos,
      agendas: bootstrap.resumo.agendas,
      recados: bootstrap.resumo.recados,
      campanhas: bootstrap.resumo.campanhas
    },
    admin: {
      versao: adminStatus.versaoAdmin,
      pinConfigurado: adminStatus.pinConfigurado,
      setupTemporarioAtivo: adminStatus.setupTemporarioAtivo,
      abasAusentes: validacaoAdmin.abasAusentes
    },
    polling: polling,
    observacao: 'Teste local do retorno por polling. Nenhuma implantação foi realizada por esta função.'
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function portalTacsAcaoPostV1_(e) {
  var action = String(
    e && e.parameter
      ? e.parameter.action || ''
      : ''
  ).trim().toLowerCase();

  if (action) return action;

  if (e && e.postData && e.postData.contents) {
    try {
      var json = JSON.parse(e.postData.contents);
      return String(json && json.action ? json.action : '').trim().toLowerCase();
    } catch (erro) {
      return '';
    }
  }

  return '';
}

function portalTacsRespostaIframeV1_(resultado) {
  var payload = JSON.stringify({
    source: 'portal-tacs',
    result: resultado
  }).replace(/</g, '\\u003c');

  return HtmlService.createHtmlOutput(
    '<!doctype html>' +
    '<html lang="pt-BR">' +
    '<head><meta charset="utf-8"></head>' +
    '<body>' +
    '<script>' +
    'try{parent.postMessage(' + payload + ',"*");}catch(e){}' +
    '</script>' +
    '</body>' +
    '</html>'
  ).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL
  );
}
