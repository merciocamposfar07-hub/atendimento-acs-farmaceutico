/**
 * PORTAL TACS — ROTAS ÚNICAS COM ADMINISTRAÇÃO V1
 *
 * Este arquivo substitui TODO o conteúdo de Portal.gs somente depois que
 * 05_AdminApiPortalTacsV1.gs tiver sido instalado e validado.
 *
 * Antes de implantar, execute:
 *   testarRotasComAdminTacsV1
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

    if (respostaIntegral) {
      return respostaIntegral;
    }

    var respostaPainel = tratarGetPainelTacs_(e);

    if (respostaPainel) {
      return respostaPainel;
    }

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
        message:
          erro && erro.message
            ? erro.message
            : String(erro)
      },
      callbackErro
    );
  }
}

function doPost(e) {
  try {
    var action = portalTacsAcaoPostV1_(e);

    if (action.indexOf('admin_') === 0) {
      return portalTacsRespostaIframeV1_(
        adminTacsV1Post(e)
      );
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

    if (respostaIntegral) {
      return respostaIntegral;
    }

    var respostaPainel = tratarPostPainelTacs_(e);

    if (respostaPainel) {
      return respostaPainel;
    }

    return portalTacsRespostaIframeV1_({
      ok: false,
      message: 'Ação não reconhecida.',
      action: action
    });

  } catch (erro) {
    return portalTacsRespostaIframeV1_({
      ok: false,
      message:
        erro && erro.message
          ? erro.message
          : String(erro)
    });
  }
}

function testarRotasComAdminTacsV1() {
  var statusSaida = doGet({ parameter: { action: 'status' } });
  var bootstrapSaida = doGet({ parameter: { action: 'bootstrap' } });
  var adminStatusSaida = doGet({ parameter: { action: 'admin_status' } });

  var status = JSON.parse(statusSaida.getContent());
  var bootstrap = JSON.parse(bootstrapSaida.getContent());
  var adminStatus = JSON.parse(adminStatusSaida.getContent());
  var validacaoAdmin = validarAdminPortalTacsV1();

  var resultado = {
    ok:
      status.ok === true &&
      bootstrap.ok === true &&
      adminStatus.ok === true &&
      validacaoAdmin.ok === true &&
      status.apiVersao === '1.1.0' &&
      bootstrap.apiVersao === '1.1.0',
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
    observacao: 'Teste local. Nenhuma implantação foi realizada por esta função.'
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
    '<head>' +
    '<meta charset="utf-8">' +
    '</head>' +
    '<body>' +
    '<script>' +
    'parent.postMessage(' + payload + ',"*");' +
    '</script>' +
    '</body>' +
    '</html>'
  ).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL
  );
}
