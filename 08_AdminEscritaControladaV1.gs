/**
 * 08_AdminEscritaControladaV1.gs
 *
 * Módulo isolado para comprovar escrita real na base do Portal TACS.
 *
 * REGRAS DESTA ETAPA:
 * - criar somente este arquivo no projeto Apps Script de teste;
 * - não alterar Portal.gs;
 * - não alterar os arquivos 05, 06 ou 07;
 * - não publicar nova implantação;
 * - testar pela URL /dev, autenticada com a conta proprietária.
 *
 * O módulo envolve as rotas do aplicativo já existentes e reconhece somente:
 * - POST admin_escrita_ler
 * - POST admin_escrita_aplicar
 * - POST admin_escrita_restaurar
 * - GET  admin_escrita_result
 * - GET  admin_escrita_status
 *
 * Todas as demais ações continuam sendo tratadas pelas rotas anteriores.
 */

var ADMIN_ESCRITA_V1 = Object.freeze({
  VERSAO: '1.0.0',
  SUFIXO_TESTE: ' — TESTE',
  CACHE_PREFIXO: 'admin_escrita_v1_result_',
  CACHE_SEGUNDOS: 300,
  BACKUP_PROPERTY: 'ADMIN_ESCRITA_CONTROLADA_V1_BACKUP',
  HISTORICO_ABA: 'HISTORICO',
  ORIGEM: 'admin-escrita-controlada-v1',
  FUSO: 'America/Recife'
});

var adminEscritaV1DoGetAnterior_;
var adminEscritaV1DoPostAnterior_;

(function instalarAdminEscritaControladaV1_() {
  if (typeof doGet !== 'function' || typeof doPost !== 'function') {
    throw new Error('As rotas do Portal TACS ainda não estão carregadas.');
  }

  adminEscritaV1DoGetAnterior_ = doGet;
  adminEscritaV1DoPostAnterior_ = doPost;

  doGet = function (e) {
    var parametros = e && e.parameter ? e.parameter : {};
    var acao = String(parametros.action || '').trim();

    if (acao === 'admin_escrita_status') {
      return adminEscritaV1Responder_(
        {
          ok: true,
          modulo: 'Escrita controlada',
          versao: ADMIN_ESCRITA_V1.VERSAO,
          ambiente: 'teste-dev',
          implantacaoPublicaAlterada: false,
          geradoEm: adminEscritaV1AgoraIso_()
        },
        parametros.callback
      );
    }

    if (acao === 'admin_escrita_result') {
      return adminEscritaV1Responder_(
        adminEscritaV1ConsultarResultado_(parametros.requestId),
        parametros.callback
      );
    }

    return adminEscritaV1DoGetAnterior_(e);
  };

  doPost = function (e) {
    var parametros = e && e.parameter ? e.parameter : {};
    var acao = String(parametros.action || '').trim();
    var aceitas = [
      'admin_escrita_ler',
      'admin_escrita_aplicar',
      'admin_escrita_restaurar'
    ];

    if (aceitas.indexOf(acao) === -1) {
      return adminEscritaV1DoPostAnterior_(e);
    }

    var requestId = adminEscritaV1ValidarRequestId_(parametros.requestId);
    var resultado;

    try {
      if (acao === 'admin_escrita_ler') {
        resultado = adminEscritaV1Ler_(parametros);
      } else if (acao === 'admin_escrita_aplicar') {
        resultado = adminEscritaV1Aplicar_(parametros, requestId);
      } else {
        resultado = adminEscritaV1Restaurar_(parametros, requestId);
      }
    } catch (erro) {
      resultado = {
        ok: false,
        message: erro && erro.message ? erro.message : String(erro)
      };
    }

    adminEscritaV1GuardarResultado_(requestId, resultado);
    return adminEscritaV1ResponderPost_(requestId, resultado);
  };
})();

function adminEscritaV1Ler_(parametros) {
  var sessao = adminEscritaV1ValidarSessao_(
    parametros.token,
    parametros.dispositivo
  );
  var alvo = adminEscritaV1LocalizarNutricionista_(sessao);
  var backup = adminEscritaV1LerBackup_();

  return {
    ok: true,
    sessaoValidada: true,
    sessao: sessao.sessao || {},
    profissionalId: alvo.profissionalId,
    aba: alvo.aba.getName(),
    linha: alvo.linha,
    coluna: alvo.coluna,
    campo: alvo.campo,
    valorAtual: alvo.valorAtual,
    valorOriginal: backup
      ? String(backup.valorOriginal || '')
      : alvo.valorAtual,
    valorTeste: backup
      ? String(backup.valorTeste || '')
      : adminEscritaV1ValorTeste_(alvo.valorAtual),
    testeAtivo: !!backup && alvo.valorAtual === String(backup.valorTeste || ''),
    backupAtivo: !!backup,
    atualizadoEm: adminEscritaV1AgoraIso_()
  };
}

function adminEscritaV1Aplicar_(parametros, requestId) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error('Outra gravação está em andamento. Tente novamente em alguns segundos.');
  }

  try {
    var sessao = adminEscritaV1ValidarSessao_(
      parametros.token,
      parametros.dispositivo
    );
    var alvo = adminEscritaV1LocalizarNutricionista_(sessao);
    var backupExistente = adminEscritaV1LerBackup_();

    if (backupExistente) {
      if (alvo.valorAtual === String(backupExistente.valorTeste || '')) {
        return {
          ok: true,
          jaAplicado: true,
          message: 'O teste já estava aplicado e permanece pronto para restauração.',
          valorAnterior: String(backupExistente.valorOriginal || ''),
          valorGravado: alvo.valorAtual,
          gravacaoConfirmada: true,
          atualizadoEm: adminEscritaV1AgoraIso_()
        };
      }
      throw new Error('Existe um teste anterior pendente. Restaure o valor original antes de aplicar outro.');
    }

    if (!alvo.valorAtual) {
      throw new Error('O título público da nutricionista está vazio. O teste foi bloqueado.');
    }

    if (alvo.valorAtual.slice(-ADMIN_ESCRITA_V1.SUFIXO_TESTE.length) === ADMIN_ESCRITA_V1.SUFIXO_TESTE) {
      throw new Error('O título já termina com “TESTE”, mas não existe backup seguro para restaurá-lo.');
    }

    var valorTeste = adminEscritaV1ValorTeste_(alvo.valorAtual);
    var backup = {
      versao: ADMIN_ESCRITA_V1.VERSAO,
      aba: alvo.aba.getName(),
      linha: alvo.linha,
      coluna: alvo.coluna,
      campo: alvo.campo,
      profissionalId: alvo.profissionalId,
      valorOriginal: alvo.valorAtual,
      valorTeste: valorTeste,
      dispositivo: String(parametros.dispositivo || ''),
      criadoEm: adminEscritaV1AgoraIso_(),
      requestId: requestId
    };

    adminEscritaV1SalvarBackup_(backup);
    alvo.aba.getRange(alvo.linha, alvo.coluna).setValue(valorTeste);
    SpreadsheetApp.flush();

    var confirmado = String(
      alvo.aba.getRange(alvo.linha, alvo.coluna).getDisplayValue() || ''
    ).trim();

    if (confirmado !== valorTeste) {
      alvo.aba.getRange(alvo.linha, alvo.coluna).setValue(alvo.valorAtual);
      SpreadsheetApp.flush();
      adminEscritaV1ApagarBackup_();
      throw new Error('A planilha não confirmou o novo valor. O conteúdo original foi restaurado.');
    }

    try {
      adminEscritaV1RegistrarHistorico_({
        acao: 'APLICAR_TESTE_ESCRITA',
        alvo: alvo,
        antes: alvo.valorAtual,
        depois: confirmado,
        dispositivo: parametros.dispositivo,
        requestId: requestId
      });
    } catch (erroHistorico) {
      alvo.aba.getRange(alvo.linha, alvo.coluna).setValue(alvo.valorAtual);
      SpreadsheetApp.flush();
      adminEscritaV1ApagarBackup_();
      throw new Error(
        'A gravação foi revertida porque o HISTORICO não pôde ser registrado: ' +
        (erroHistorico && erroHistorico.message
          ? erroHistorico.message
          : String(erroHistorico))
      );
    }

    return {
      ok: true,
      message: 'Gravação confirmada diretamente na planilha.',
      sessaoValidada: true,
      profissionalId: alvo.profissionalId,
      aba: alvo.aba.getName(),
      linha: alvo.linha,
      coluna: alvo.coluna,
      campo: alvo.campo,
      valorAnterior: alvo.valorAtual,
      valorGravado: confirmado,
      gravacaoConfirmada: confirmado === valorTeste,
      historicoRegistrado: true,
      atualizadoEm: adminEscritaV1AgoraIso_()
    };
  } finally {
    lock.releaseLock();
  }
}

function adminEscritaV1Restaurar_(parametros, requestId) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error('Outra gravação está em andamento. Tente novamente em alguns segundos.');
  }

  try {
    var sessao = adminEscritaV1ValidarSessao_(
      parametros.token,
      parametros.dispositivo
    );
    var backup = adminEscritaV1LerBackup_();

    if (!backup) {
      var alvoSemBackup = adminEscritaV1LocalizarNutricionista_(sessao);
      return {
        ok: true,
        jaRestaurado: true,
        message: 'Não existe teste pendente. O valor atual foi preservado.',
        valorRestaurado: alvoSemBackup.valorAtual,
        restauracaoConfirmada: true,
        atualizadoEm: adminEscritaV1AgoraIso_()
      };
    }

    var planilha = adminEscritaV1Planilha_();
    var aba = planilha.getSheetByName(String(backup.aba || ''));
    if (!aba) {
      throw new Error('A aba gravada no backup não foi encontrada. Nenhuma célula foi alterada.');
    }

    var linha = Number(backup.linha || 0);
    var coluna = Number(backup.coluna || 0);
    if (linha < 2 || coluna < 1) {
      throw new Error('O backup do teste está inválido. Nenhuma célula foi alterada.');
    }

    var atual = String(aba.getRange(linha, coluna).getDisplayValue() || '').trim();
    var original = String(backup.valorOriginal || '');
    var teste = String(backup.valorTeste || '');

    if (atual === original) {
      adminEscritaV1RegistrarHistorico_({
        acao: 'CONFIRMAR_RESTAURACAO_TESTE_ESCRITA',
        alvo: {
          aba: aba,
          linha: linha,
          coluna: coluna,
          campo: String(backup.campo || 'TITULO_PUBLICO'),
          profissionalId: String(backup.profissionalId || 'nutricionista')
        },
        antes: String(backup.valorTeste || ''),
        depois: original,
        dispositivo: parametros.dispositivo,
        requestId: requestId
      });
      adminEscritaV1ApagarBackup_();
      return {
        ok: true,
        jaRestaurado: true,
        message: 'O valor original já estava restaurado e foi confirmado no HISTORICO.',
        valorRestaurado: original,
        restauracaoConfirmada: true,
        historicoRegistrado: true,
        atualizadoEm: adminEscritaV1AgoraIso_()
      };
    }

    if (atual !== teste) {
      throw new Error('O título foi alterado depois do teste. A restauração automática foi bloqueada para não sobrescrever outra mudança.');
    }

    aba.getRange(linha, coluna).setValue(original);
    SpreadsheetApp.flush();

    var confirmado = String(aba.getRange(linha, coluna).getDisplayValue() || '').trim();
    if (confirmado !== original) {
      throw new Error('A planilha não confirmou a restauração do valor original.');
    }

    adminEscritaV1RegistrarHistorico_({
      acao: 'RESTAURAR_TESTE_ESCRITA',
      alvo: {
        aba: aba,
        linha: linha,
        coluna: coluna,
        campo: String(backup.campo || 'TITULO_PUBLICO'),
        profissionalId: String(backup.profissionalId || 'nutricionista')
      },
      antes: atual,
      depois: confirmado,
      dispositivo: parametros.dispositivo,
      requestId: requestId
    });

    adminEscritaV1ApagarBackup_();

    return {
      ok: true,
      message: 'Valor original restaurado e confirmado na planilha.',
      sessaoValidada: true,
      profissionalId: String(backup.profissionalId || ''),
      aba: aba.getName(),
      linha: linha,
      coluna: coluna,
      campo: String(backup.campo || 'TITULO_PUBLICO'),
      valorAntesDaRestauracao: atual,
      valorRestaurado: confirmado,
      restauracaoConfirmada: confirmado === original,
      historicoRegistrado: true,
      atualizadoEm: adminEscritaV1AgoraIso_()
    };
  } finally {
    lock.releaseLock();
  }
}

function adminEscritaV1ValidarSessao_(token, dispositivo) {
  token = String(token || '').trim();
  dispositivo = String(dispositivo || '').trim();

  if (!token || !dispositivo) {
    throw new Error('Sessão administrativa ausente. Entre novamente com o PIN.');
  }

  if (
    typeof adminEscritaV1DoPostAnterior_ !== 'function' ||
    typeof adminEscritaV1DoGetAnterior_ !== 'function'
  ) {
    throw new Error('As rotas administrativas anteriores não estão disponíveis.');
  }

  var requestId = 'ecv1_auth_' + Utilities.getUuid().replace(/-/g, '');
  var parametros = {
    action: 'admin_dados',
    token: token,
    dispositivo: dispositivo,
    requestId: requestId
  };

  adminEscritaV1DoPostAnterior_(adminEscritaV1Evento_(parametros));

  var envelope = null;
  for (var tentativa = 0; tentativa < 20; tentativa += 1) {
    var resposta = adminEscritaV1DoGetAnterior_(
      adminEscritaV1Evento_({
        action: 'admin_result',
        requestId: requestId,
        callback: ''
      })
    );

    envelope = adminEscritaV1ConteudoResposta_(resposta);
    if (envelope && envelope.ok === true && envelope.pendente === false) {
      break;
    }
    Utilities.sleep(150);
  }

  if (!envelope || envelope.ok !== true || envelope.pendente !== false) {
    throw new Error('Não foi possível validar a sessão administrativa no servidor.');
  }

  var resultado = envelope.result || {};
  if (resultado.ok !== true) {
    throw new Error(resultado.message || 'Sessão administrativa inválida ou expirada.');
  }

  return resultado;
}

function adminEscritaV1LocalizarNutricionista_(dadosAdmin) {
  var profissionais = dadosAdmin && Array.isArray(dadosAdmin.profissionais)
    ? dadosAdmin.profissionais
    : [];
  var profissional = null;

  profissionais.some(function (item) {
    var texto = [
      item && item.ID,
      item && item.NOME,
      item && item.TITULO_PUBLICO
    ].join(' ');
    if (adminEscritaV1Normalizar_(texto).indexOf('NUTRIC') !== -1) {
      profissional = item;
      return true;
    }
    return false;
  });

  if (!profissional) {
    throw new Error('A nutricionista não foi encontrada nos dados administrativos.');
  }

  var idProfissional = String(profissional.ID || '').trim();
  var planilha = adminEscritaV1Planilha_();
  var abas = planilha.getSheets().slice();

  abas.sort(function (a, b) {
    var an = adminEscritaV1Normalizar_(a.getName());
    var bn = adminEscritaV1Normalizar_(b.getName());
    var ap = an.indexOf('PROFISSION') !== -1 ? 0 : 1;
    var bp = bn.indexOf('PROFISSION') !== -1 ? 0 : 1;
    return ap - bp;
  });

  for (var s = 0; s < abas.length; s += 1) {
    var aba = abas[s];
    if (aba.getLastRow() < 2 || aba.getLastColumn() < 2) {
      continue;
    }

    var cabecalhos = aba
      .getRange(1, 1, 1, aba.getLastColumn())
      .getDisplayValues()[0]
      .map(adminEscritaV1Normalizar_);
    var colunaId = adminEscritaV1IndiceCabecalho_(cabecalhos, [
      'ID',
      'ID_PROFISSIONAL',
      'CODIGO',
      'CODIGO_PROFISSIONAL'
    ]);
    var colunaTitulo = adminEscritaV1IndiceCabecalho_(cabecalhos, [
      'TITULO_PUBLICO',
      'TITULO_DO_PORTAL',
      'NOME_PUBLICO'
    ]);
    var colunaNome = adminEscritaV1IndiceCabecalho_(cabecalhos, [
      'NOME',
      'PROFISSIONAL',
      'NOME_PROFISSIONAL'
    ]);

    if (colunaTitulo < 0) {
      continue;
    }

    var valores = aba
      .getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn())
      .getDisplayValues();

    for (var i = 0; i < valores.length; i += 1) {
      var linha = valores[i];
      var idLinha = colunaId >= 0 ? String(linha[colunaId] || '').trim() : '';
      var tituloLinha = String(linha[colunaTitulo] || '').trim();
      var nomeLinha = colunaNome >= 0 ? String(linha[colunaNome] || '').trim() : '';
      var correspondeId = idProfissional && idLinha === idProfissional;
      var correspondeTexto = adminEscritaV1Normalizar_(
        [idLinha, tituloLinha, nomeLinha].join(' ')
      ).indexOf('NUTRIC') !== -1;

      if (correspondeId || correspondeTexto) {
        return {
          aba: aba,
          linha: i + 2,
          coluna: colunaTitulo + 1,
          campo: String(
            aba.getRange(1, colunaTitulo + 1).getDisplayValue() || 'TITULO_PUBLICO'
          ).trim(),
          profissionalId: idProfissional || idLinha || 'nutricionista',
          valorAtual: tituloLinha
        };
      }
    }
  }

  throw new Error('A linha da nutricionista com a coluna TITULO_PUBLICO não foi encontrada na planilha.');
}

function adminEscritaV1RegistrarHistorico_(dados) {
  var planilha = adminEscritaV1Planilha_();
  var aba = planilha.getSheetByName(ADMIN_ESCRITA_V1.HISTORICO_ABA);

  if (!aba) {
    aba = planilha.insertSheet(ADMIN_ESCRITA_V1.HISTORICO_ABA);
  }

  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, 13).setValues([[
      'DATA_HORA',
      'ACAO',
      'ORIGEM',
      'ABA',
      'REGISTRO_ID',
      'CAMPO',
      'VALOR_ANTERIOR',
      'VALOR_NOVO',
      'LINHA',
      'COLUNA',
      'DISPOSITIVO',
      'REQUEST_ID',
      'STATUS'
    ]]);
    aba.setFrozenRows(1);
  }

  var cabecalhos = aba
    .getRange(1, 1, 1, aba.getLastColumn())
    .getDisplayValues()[0]
    .map(adminEscritaV1Normalizar_);
  var agora = new Date();
  var valores = cabecalhos.map(function (cabecalho) {
    if (['DATA_HORA', 'DATA', 'QUANDO', 'CRIADO_EM', 'ATUALIZADO_EM'].indexOf(cabecalho) !== -1) return agora;
    if (['ACAO', 'OPERACAO', 'EVENTO'].indexOf(cabecalho) !== -1) return String(dados.acao || '');
    if (['ORIGEM', 'FONTE'].indexOf(cabecalho) !== -1) return ADMIN_ESCRITA_V1.ORIGEM;
    if (['ABA', 'TABELA', 'ENTIDADE', 'MODULO'].indexOf(cabecalho) !== -1) return dados.alvo.aba.getName();
    if (['REGISTRO_ID', 'ID_REGISTRO', 'ID'].indexOf(cabecalho) !== -1) return String(dados.alvo.profissionalId || '');
    if (['CAMPO', 'COLUNA_NOME'].indexOf(cabecalho) !== -1) return String(dados.alvo.campo || '');
    if (['VALOR_ANTERIOR', 'VALOR_ANTES', 'ANTES'].indexOf(cabecalho) !== -1) return String(dados.antes || '');
    if (['VALOR_NOVO', 'VALOR_DEPOIS', 'DEPOIS'].indexOf(cabecalho) !== -1) return String(dados.depois || '');
    if (cabecalho === 'LINHA') return Number(dados.alvo.linha || 0);
    if (cabecalho === 'COLUNA') return Number(dados.alvo.coluna || 0);
    if (cabecalho === 'DISPOSITIVO') return String(dados.dispositivo || '');
    if (['REQUEST_ID', 'REQUISICAO'].indexOf(cabecalho) !== -1) return String(dados.requestId || '');
    if (['STATUS', 'RESULTADO'].indexOf(cabecalho) !== -1) return 'CONFIRMADO';
    if (['USUARIO', 'AUTOR', 'RESPONSAVEL'].indexOf(cabecalho) !== -1) return 'ADMIN_PORTAL_TACS_V1';
    return '';
  });

  aba.appendRow(valores);
  SpreadsheetApp.flush();
}

function adminEscritaV1Planilha_() {
  if (typeof getPlanilha === 'function') {
    return getPlanilha();
  }
  var ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (!ativa) {
    throw new Error('A planilha do Portal TACS não está disponível.');
  }
  return ativa;
}

function adminEscritaV1Evento_(parametros) {
  var lista = {};
  Object.keys(parametros || {}).forEach(function (chave) {
    lista[chave] = [String(parametros[chave] == null ? '' : parametros[chave])];
  });
  return {
    parameter: parametros || {},
    parameters: lista,
    postData: {
      type: 'application/x-www-form-urlencoded',
      contents: ''
    }
  };
}

function adminEscritaV1ConteudoResposta_(resposta) {
  if (!resposta) return null;
  var conteudo = typeof resposta.getContent === 'function'
    ? resposta.getContent()
    : String(resposta || '');
  try {
    return JSON.parse(conteudo);
  } catch (erro) {
    return null;
  }
}

function adminEscritaV1IndiceCabecalho_(cabecalhos, nomes) {
  for (var i = 0; i < nomes.length; i += 1) {
    var indice = cabecalhos.indexOf(adminEscritaV1Normalizar_(nomes[i]));
    if (indice >= 0) return indice;
  }
  return -1;
}

function adminEscritaV1Normalizar_(valor) {
  return String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function adminEscritaV1ValorTeste_(valor) {
  return String(valor || '').trim() + ADMIN_ESCRITA_V1.SUFIXO_TESTE;
}

function adminEscritaV1SalvarBackup_(backup) {
  PropertiesService.getScriptProperties().setProperty(
    ADMIN_ESCRITA_V1.BACKUP_PROPERTY,
    JSON.stringify(backup)
  );
}

function adminEscritaV1LerBackup_() {
  var texto = PropertiesService.getScriptProperties().getProperty(
    ADMIN_ESCRITA_V1.BACKUP_PROPERTY
  );
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch (erro) {
    throw new Error('O backup do teste está corrompido. Nenhuma gravação foi realizada.');
  }
}

function adminEscritaV1ApagarBackup_() {
  PropertiesService.getScriptProperties().deleteProperty(
    ADMIN_ESCRITA_V1.BACKUP_PROPERTY
  );
}

function adminEscritaV1ValidarRequestId_(valor) {
  var requestId = String(valor || '').trim();
  if (!/^[A-Za-z0-9_-]{24,160}$/.test(requestId)) {
    throw new Error('Identificador da operação inválido.');
  }
  return requestId;
}

function adminEscritaV1GuardarResultado_(requestId, resultado) {
  CacheService.getScriptCache().put(
    ADMIN_ESCRITA_V1.CACHE_PREFIXO + requestId,
    JSON.stringify(resultado),
    ADMIN_ESCRITA_V1.CACHE_SEGUNDOS
  );
}

function adminEscritaV1ConsultarResultado_(requestId) {
  requestId = String(requestId || '').trim();
  if (!/^[A-Za-z0-9_-]{24,160}$/.test(requestId)) {
    return {ok: false, message: 'Identificador da operação inválido.'};
  }
  var texto = CacheService.getScriptCache().get(
    ADMIN_ESCRITA_V1.CACHE_PREFIXO + requestId
  );
  if (!texto) {
    return {ok: true, pendente: true, requestId: requestId};
  }
  try {
    return {
      ok: true,
      pendente: false,
      requestId: requestId,
      result: JSON.parse(texto)
    };
  } catch (erro) {
    return {ok: false, message: 'O resultado armazenado está inválido.'};
  }
}

function adminEscritaV1Responder_(dados, callback) {
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

function adminEscritaV1ResponderPost_(requestId, resultado) {
  var pacote = {
    source: 'admin-escrita-controlada-v1',
    requestId: requestId,
    result: resultado
  };
  var seguro = JSON.stringify(pacote)
    .replace(/</g, '\\u003c')
    .replace(/-->/g, '--\\>');
  return HtmlService
    .createHtmlOutput(
      '<!doctype html><meta charset="utf-8"><script>' +
      'parent.postMessage(' + seguro + ',"*");' +
      '<\\/script>'
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function adminEscritaV1AgoraIso_() {
  return Utilities.formatDate(
    new Date(),
    ADMIN_ESCRITA_V1.FUSO,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );
}
