/**
 * PORTAL TACS — ROTAS ÚNICAS V1
 *
 * Este arquivo foi preparado para substituir TODO o conteúdo atual de Portal.gs
 * somente no ambiente de reconstrução controlada.
 *
 * NÃO implante nova versão nesta etapa.
 *
 * Depois de substituir e salvar, execute:
 *   testarRotasPortalTacsV1
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

function testarRotasPortalTacsV1() {
  var statusSaida = doGet({ parameter: { action: 'status' } });
  var bootstrapSaida = doGet({ parameter: { action: 'bootstrap' } });

  var status = JSON.parse(statusSaida.getContent());
  var bootstrap = JSON.parse(bootstrapSaida.getContent());

  var resultado = {
    ok:
      status.ok === true &&
      bootstrap.ok === true &&
      status.apiVersao === '1.1.0' &&
      bootstrap.apiVersao === '1.1.0',
    status: status,
    bootstrap: {
      revisaoConteudo: bootstrap.revisaoConteudo,
      profissionais: bootstrap.resumo.profissionais,
      servicos: bootstrap.resumo.servicos,
      agendas: bootstrap.resumo.agendas,
      recados: bootstrap.resumo.recados,
      campanhas: bootstrap.resumo.campanhas,
      notificacoesHabilitadas: bootstrap.notificacoes.habilitadas
    },
    observacao: 'Teste local das rotas. Nenhuma nova implantação foi realizada.'
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
  return HtmlService.createHtmlOutput(
    '<!doctype html>' +
    '<html lang="pt-BR">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '</head>' +
    '<body>' +
    '<script>' +
    'parent.postMessage(' +
    JSON.stringify({
      source: 'portal-tacs',
      result: resultado
    }) +
    ',"*");' +
    '</script>' +
    '</body>' +
    '</html>'
  ).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL
  );
}
