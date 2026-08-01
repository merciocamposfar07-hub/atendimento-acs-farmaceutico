/**
 * CORREÇÃO DE TIPOS DA ABA CONFIGURACOES — V1
 *
 * Corrige valores de versão que o Google Planilhas possa ter interpretado
 * automaticamente como data.
 *
 * Execute:
 *   corrigirTiposConfiguracoesTacsV1
 * Depois execute:
 *   validarTiposConfiguracoesTacsV1
 */

function corrigirTiposConfiguracoesTacsV1() {
  var ss = typeof getPlanilha === 'function'
    ? getPlanilha()
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) throw new Error('Planilha não localizada.');

  var aba = ss.getSheetByName('CONFIGURACOES');
  if (!aba) throw new Error('A aba CONFIGURACOES não foi encontrada.');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (aba.getLastColumn() < 5) {
      aba.insertColumnsAfter(aba.getLastColumn(), 5 - aba.getLastColumn());
    }

    aba.getRange(1, 1, 1, 5).setValues([[
      'CHAVE', 'VALOR', 'TIPO', 'EDITAVEL', 'ATUALIZADO_EM'
    ]]);

    var ultimaLinha = Math.max(aba.getLastRow(), 1);
    var dados = ultimaLinha > 1
      ? aba.getRange(2, 1, ultimaLinha - 1, 5).getValues()
      : [];

    var agora = new Date();
    var encontrados = {};

    dados.forEach(function (linha, indice) {
      var chave = String(linha[0] || '').trim();
      if (!chave) return;
      encontrados[chave] = indice + 2;
    });

    garantirTexto_('PORTAL_VERSAO_BANCO', '1.0.0', false);
    garantirTexto_('API_PORTAL_VERSAO', '1.1.0', false);

    SpreadsheetApp.flush();

    if (typeof apiTacsV1Historico_ === 'function') {
      apiTacsV1Historico_(
        ss,
        'CORRIGIR_TIPOS_CONFIGURACOES',
        'CONFIGURACOES',
        'VERSOES',
        '',
        JSON.stringify({ PORTAL_VERSAO_BANCO: '1.0.0', API_PORTAL_VERSAO: '1.1.0' }),
        'Apps Script'
      );
    }

    var resultado = validarTiposConfiguracoesTacsV1();
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;

    function garantirTexto_(chave, valor, editavel) {
      var linha = encontrados[chave];
      if (!linha) {
        linha = aba.getLastRow() + 1;
        aba.getRange(linha, 1, 1, 5).setValues([[
          chave, '', 'TEXTO', editavel, agora
        ]]);
        encontrados[chave] = linha;
      }

      aba.getRange(linha, 2).setNumberFormat('@');
      aba.getRange(linha, 2).setValue(String(valor));
      aba.getRange(linha, 3).setValue('TEXTO');
      aba.getRange(linha, 4).setValue(Boolean(editavel));
      aba.getRange(linha, 5).setValue(agora);
    }
  } finally {
    lock.releaseLock();
  }
}

function validarTiposConfiguracoesTacsV1() {
  var ss = typeof getPlanilha === 'function'
    ? getPlanilha()
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) throw new Error('Planilha não localizada.');

  var aba = ss.getSheetByName('CONFIGURACOES');
  if (!aba) throw new Error('A aba CONFIGURACOES não foi encontrada.');

  var valores = aba.getDataRange().getDisplayValues();
  var cabecalhos = valores.shift();
  var indiceChave = cabecalhos.indexOf('CHAVE');
  var indiceValor = cabecalhos.indexOf('VALOR');
  var indiceTipo = cabecalhos.indexOf('TIPO');
  var mapa = {};

  valores.forEach(function (linha) {
    var chave = String(linha[indiceChave] || '').trim();
    if (!chave) return;
    mapa[chave] = {
      valor: String(linha[indiceValor] || '').trim(),
      tipo: String(linha[indiceTipo] || '').trim()
    };
  });

  var resultado = {
    ok:
      mapa.PORTAL_VERSAO_BANCO &&
      mapa.PORTAL_VERSAO_BANCO.valor === '1.0.0' &&
      mapa.PORTAL_VERSAO_BANCO.tipo === 'TEXTO' &&
      mapa.API_PORTAL_VERSAO &&
      mapa.API_PORTAL_VERSAO.valor === '1.1.0' &&
      mapa.API_PORTAL_VERSAO.tipo === 'TEXTO',
    PORTAL_VERSAO_BANCO: mapa.PORTAL_VERSAO_BANCO || null,
    API_PORTAL_VERSAO: mapa.API_PORTAL_VERSAO || null,
    observacao: 'Os valores de versão devem permanecer como texto, nunca como data.'
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
