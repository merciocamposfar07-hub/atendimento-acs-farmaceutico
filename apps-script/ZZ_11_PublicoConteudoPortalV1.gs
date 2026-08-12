/**
 * ZZ_11_PublicoConteudoPortalV1.gs
 *
 * Leitura pública, somente consulta, para Recados e Campanhas do Portal TACS.
 *
 * Rotas acrescentadas:
 * - GET publico_conteudo_status
 * - GET publico_conteudo
 *
 * Não altera Portal.gs, não modifica doPost e não grava na planilha.
 */

var PUBLICO_CONTEUDO_PORTAL_V1 = Object.freeze({
  VERSAO: '1.1.0',
  AREA_PADRAO: 'JAPARANDUBA',
  ABA_RECADOS: 'RECADOS_PORTAL',
  ABA_CAMPANHAS: 'CAMPANHAS_PORTAL',
  FUSO: 'America/Recife'
});

var publicoConteudoPortalV1DoGetAnterior_ =
  typeof doGet === 'function' ? doGet : null;

doGet = function (e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var action = String(parametros.action || '').trim().toLowerCase();

  if (action === 'publico_conteudo_status') {
    return publicoConteudoPortalV1Responder_(
      {
        ok: true,
        modulo: 'Conteúdo público do Portal TACS',
        versao: PUBLICO_CONTEUDO_PORTAL_V1.VERSAO,
        somenteLeitura: true,
        gravacaoDisponivel: false,
        geradoEm: publicoConteudoPortalV1AgoraIso_()
      },
      parametros.callback
    );
  }

  if (action === 'publico_conteudo') {
    try {
      return publicoConteudoPortalV1Responder_(
        publicoConteudoPortalV1Montar_(parametros.areaId || parametros.area || parametros.territorio || ''),
        parametros.callback
      );
    } catch (erro) {
      return publicoConteudoPortalV1Responder_(
        {
          ok: false,
          message: erro && erro.message ? erro.message : String(erro)
        },
        parametros.callback
      );
    }
  }

  if (typeof publicoConteudoPortalV1DoGetAnterior_ === 'function') {
    return publicoConteudoPortalV1DoGetAnterior_(e);
  }

  return publicoConteudoPortalV1Responder_(
    {ok: false, message: 'Ação não reconhecida.'},
    parametros.callback
  );
};

function publicoConteudoPortalV1Montar_(areaId) {
  areaId = publicoConteudoPortalV1AreaId_(areaId) || PUBLICO_CONTEUDO_PORTAL_V1.AREA_PADRAO;
  var ss = publicoConteudoPortalV1Planilha_();
  var hoje = Utilities.formatDate(
    new Date(),
    PUBLICO_CONTEUDO_PORTAL_V1.FUSO,
    'yyyy-MM-dd'
  );

  var recadosBrutos = publicoConteudoPortalV1LerAba_(
    ss,
    PUBLICO_CONTEUDO_PORTAL_V1.ABA_RECADOS
  );
  var campanhasBrutas = publicoConteudoPortalV1LerAba_(
    ss,
    PUBLICO_CONTEUDO_PORTAL_V1.ABA_CAMPANHAS
  );

  var recados = publicoConteudoPortalV1PrepararRecados_(recadosBrutos, hoje, areaId);
  var campanhas = publicoConteudoPortalV1PrepararCampanhas_(campanhasBrutas, hoje, areaId);

  return {
    ok: true,
    modulo: 'Conteúdo público do Portal TACS',
    versao: PUBLICO_CONTEUDO_PORTAL_V1.VERSAO,
    somenteLeitura: true,
    areaId: areaId,
    hoje: hoje,
    geradoEm: publicoConteudoPortalV1AgoraIso_(),
    totais: {
      recados: recados.length,
      campanhas: campanhas.length
    },
    recados: recados,
    campanhas: campanhas
  };
}

function publicoConteudoPortalV1LerAba_(ss, nomeAba) {
  var aba = ss.getSheetByName(nomeAba);
  if (!aba || aba.getLastRow() < 2 || aba.getLastColumn() < 1) {
    return [];
  }

  var valores = aba
    .getRange(1, 1, aba.getLastRow(), aba.getLastColumn())
    .getDisplayValues();
  var cabecalhos = valores[0].map(publicoConteudoPortalV1Normalizar_);
  var linhas = [];

  for (var i = 1; i < valores.length; i += 1) {
    var registro = {};
    var possuiConteudo = false;

    for (var j = 0; j < cabecalhos.length; j += 1) {
      var chave = cabecalhos[j];
      if (!chave) continue;
      var valor = String(valores[i][j] == null ? '' : valores[i][j]).trim();
      registro[chave] = valor;
      if (valor) possuiConteudo = true;
    }

    if (possuiConteudo) linhas.push(registro);
  }

  return linhas;
}

function publicoConteudoPortalV1PrepararRecados_(linhas, hoje, areaId) {
  areaId = publicoConteudoPortalV1AreaId_(areaId) || PUBLICO_CONTEUDO_PORTAL_V1.AREA_PADRAO;
  var saida = [];

  (Array.isArray(linhas) ? linhas : []).forEach(function (linha) {
    if (!publicoConteudoPortalV1LinhaDaArea_(linha, areaId)) return;
    var ativo = publicoConteudoPortalV1Booleano_(
      publicoConteudoPortalV1Campo_(linha, ['ATIVO', 'RECADO_ATIVO', 'PUBLICAR'])
    );
    if (!ativo) return;

    var validade = publicoConteudoPortalV1DataIso_(
      publicoConteudoPortalV1Campo_(linha, ['VALIDADE', 'DATA_VALIDADE', 'ATE'])
    );
    if (validade && validade < hoje) return;

    var prioridade = publicoConteudoPortalV1NormalizarPrioridade_(
      publicoConteudoPortalV1Campo_(linha, ['PRIORIDADE', 'TIPO'])
    );
    var titulo = publicoConteudoPortalV1Texto_(
      publicoConteudoPortalV1Campo_(linha, ['TITULO', 'TITULO_PUBLICO', 'NOME'])
    );
    var mensagem = publicoConteudoPortalV1Texto_(
      publicoConteudoPortalV1Campo_(linha, ['MENSAGEM', 'TEXTO', 'CONTEUDO'])
    );

    if (!mensagem) return;
    if (!titulo) titulo = prioridade === 'INFORMATIVO' ? 'Informativo' : prioridade;

    saida.push({
      id: publicoConteudoPortalV1Texto_(
        publicoConteudoPortalV1Campo_(linha, ['ID', 'CODIGO', 'RECADO_ID'])
      ),
      titulo: titulo,
      mensagem: mensagem,
      prioridade: prioridade,
      validade: validade
    });
  });

  saida.sort(function (a, b) {
    var peso = {URGENTE: 0, IMPORTANTE: 1, INFORMATIVO: 2};
    return peso[a.prioridade] - peso[b.prioridade];
  });

  return saida;
}

function publicoConteudoPortalV1PrepararCampanhas_(linhas, hoje, areaId) {
  areaId = publicoConteudoPortalV1AreaId_(areaId) || PUBLICO_CONTEUDO_PORTAL_V1.AREA_PADRAO;
  var saida = [];

  (Array.isArray(linhas) ? linhas : []).forEach(function (linha) {
    if (!publicoConteudoPortalV1LinhaDaArea_(linha, areaId)) return;
    var ativo = publicoConteudoPortalV1Booleano_(
      publicoConteudoPortalV1Campo_(linha, ['ATIVO', 'CAMPANHA_ATIVA', 'PUBLICAR'])
    );
    if (!ativo) return;

    var inicio = publicoConteudoPortalV1DataIso_(
      publicoConteudoPortalV1Campo_(linha, ['INICIO', 'DATA_INICIO', 'INICIAR_EM'])
    );
    if (inicio && inicio > hoje) return;

    var titulo = publicoConteudoPortalV1Texto_(
      publicoConteudoPortalV1Campo_(linha, ['TITULO', 'TITULO_PUBLICO', 'NOME'])
    );
    var mensagem = publicoConteudoPortalV1Texto_(
      publicoConteudoPortalV1Campo_(linha, ['MENSAGEM', 'TEXTO', 'CONTEUDO'])
    );
    if (!titulo && !mensagem) return;

    saida.push({
      id: publicoConteudoPortalV1Texto_(
        publicoConteudoPortalV1Campo_(linha, ['ID', 'CODIGO', 'CAMPANHA_ID'])
      ),
      titulo: titulo || 'Campanha de saúde',
      mensagem: mensagem,
      inicio: inicio,
      dias: publicoConteudoPortalV1Texto_(
        publicoConteudoPortalV1Campo_(linha, ['DIAS', 'DIAS_EXIBICAO', 'PERIODO'])
      )
    });
  });

  return saida;
}

function publicoConteudoPortalV1AreaId_(valor) {
  var area = publicoConteudoPortalV1Normalizar_(valor);
  return /^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(area) ? area.slice(0, 64) : '';
}

function publicoConteudoPortalV1LinhaDaArea_(linha, areaId) {
  var areaLinha = publicoConteudoPortalV1AreaId_(
    publicoConteudoPortalV1Campo_(linha, ['AREA_ID', 'AREA', 'TERRITORIO'])
  ) || PUBLICO_CONTEUDO_PORTAL_V1.AREA_PADRAO;
  return areaLinha === areaId;
}

function publicoConteudoPortalV1Campo_(registro, nomes) {
  for (var i = 0; i < nomes.length; i += 1) {
    var chave = publicoConteudoPortalV1Normalizar_(nomes[i]);
    if (Object.prototype.hasOwnProperty.call(registro || {}, chave)) {
      return registro[chave];
    }
  }
  return '';
}

function publicoConteudoPortalV1Texto_(valor) {
  return String(valor == null ? '' : valor).trim();
}

function publicoConteudoPortalV1Booleano_(valor) {
  if (valor === true || valor === 1) return true;
  var texto = publicoConteudoPortalV1Normalizar_(valor);
  return ['TRUE', '1', 'SIM', 'YES', 'ATIVO', 'ATIVA'].indexOf(texto) !== -1;
}

function publicoConteudoPortalV1NormalizarPrioridade_(valor) {
  var prioridade = publicoConteudoPortalV1Normalizar_(valor);
  if (['URGENTE', 'IMPORTANTE', 'INFORMATIVO'].indexOf(prioridade) === -1) {
    return 'INFORMATIVO';
  }
  return prioridade;
}

function publicoConteudoPortalV1DataIso_(valor) {
  var texto = String(valor == null ? '' : valor).trim();
  if (!texto) return '';

  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

  var br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return br[3] + '-' + br[2] + '-' + br[1];

  return '';
}

function publicoConteudoPortalV1Normalizar_(valor) {
  return String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function publicoConteudoPortalV1Planilha_() {
  if (typeof adminTacsV1Planilha_ === 'function') {
    return adminTacsV1Planilha_();
  }
  if (typeof getPlanilha === 'function') {
    return getPlanilha();
  }
  var ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (!ativa) throw new Error('A planilha do Portal TACS não está disponível.');
  return ativa;
}

function publicoConteudoPortalV1Responder_(dados, callback) {
  callback = String(callback || '').trim();
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

function publicoConteudoPortalV1AgoraIso_() {
  return Utilities.formatDate(
    new Date(),
    PUBLICO_CONTEUDO_PORTAL_V1.FUSO,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );
}

/**
 * Teste interno sem gravação.
 * Valida filtros, datas, prioridade, preservação da rota anterior e leitura real.
 */
function testarPublicoConteudoPortalV1() {
  var hojeTeste = '2026-08-02';
  var recadosTeste = publicoConteudoPortalV1PrepararRecados_([
    {
      ATIVO: 'sim',
      TITULO: 'Recado válido',
      MENSAGEM: 'Mensagem válida',
      PRIORIDADE: 'URGENTE',
      VALIDADE: '03/08/2026'
    },
    {
      ATIVO: 'não',
      TITULO: 'Recado inativo',
      MENSAGEM: 'Não pode aparecer',
      PRIORIDADE: 'INFORMATIVO'
    },
    {
      ATIVO: 'sim',
      TITULO: 'Recado vencido',
      MENSAGEM: 'Não pode aparecer',
      VALIDADE: '01/08/2026'
    }
  ], hojeTeste);

  var campanhasTeste = publicoConteudoPortalV1PrepararCampanhas_([
    {
      ATIVO: 'true',
      TITULO: 'Campanha válida',
      MENSAGEM: 'Mensagem',
      INICIO: '02/08/2026'
    },
    {
      ATIVO: 'true',
      TITULO: 'Campanha futura',
      MENSAGEM: 'Não pode aparecer',
      INICIO: '03/08/2026'
    }
  ], hojeTeste);

  if (recadosTeste.length !== 1 || recadosTeste[0].titulo !== 'Recado válido') {
    throw new Error('O filtro interno de recados falhou.');
  }
  if (campanhasTeste.length !== 1 || campanhasTeste[0].titulo !== 'Campanha válida') {
    throw new Error('O filtro interno de campanhas falhou.');
  }
  if (publicoConteudoPortalV1DataIso_('02/08/2026') !== '2026-08-02') {
    throw new Error('A conversão interna de datas falhou.');
  }

  var leituraReal = publicoConteudoPortalV1Montar_();
  if (!leituraReal || leituraReal.ok !== true) {
    throw new Error('A leitura real do conteúdo público falhou.');
  }

  var resultado = {
    ok: true,
    versao: PUBLICO_CONTEUDO_PORTAL_V1.VERSAO,
    rotaAnteriorPreservada:
      typeof publicoConteudoPortalV1DoGetAnterior_ === 'function',
    filtrosInternosAprovados: true,
    leituraRealAprovada: true,
    recadosPublicosAtuais: leituraReal.recados.length,
    campanhasPublicasAtuais: leituraReal.campanhas.length,
    gravacaoRealExecutada: false
  };

  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
