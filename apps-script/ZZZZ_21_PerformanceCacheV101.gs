/**
 * ZZZZ_21_PerformanceCacheV101.gs
 *
 * Camada isolada de desempenho para leituras do Portal TACS.
 *
 * REGRAS:
 * - não altera regras de negócio;
 * - não altera autenticação, reservas ou gravações;
 * - cacheia somente respostas GET de leitura;
 * - qualquer mutação relevante invalida o cache por geração;
 * - callbacks JSONP nunca são armazenados, apenas o JSON puro.
 */

var TACS_PERFORMANCE_CACHE_V101 = Object.freeze({
  VERSAO: '1.0.0',
  PREFIXO: 'tacs_perf_v101_',
  EPOCH_KEY: 'tacs_perf_v101_epoch',
  EPOCH_SEGUNDOS: 21600,
  TTL: Object.freeze({
    agenda: 30,
    painel_publico: 30,
    publico_conteudo: 60,
    publico_conteudo_status: 60,
    admin_status: 15
  })
});

var tacsPerformanceV101DoGetAnterior_ = typeof doGet === 'function' ? doGet : null;
var tacsPerformanceV101DoPostAnterior_ = typeof doPost === 'function' ? doPost : null;

doGet = function (e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var acao = String(parametros.action || '').trim().toLowerCase();
  var ttl = Number(TACS_PERFORMANCE_CACHE_V101.TTL[acao] || 0);

  if (!ttl || typeof tacsPerformanceV101DoGetAnterior_ !== 'function') {
    return tacsPerformanceV101DoGetAnterior_
      ? tacsPerformanceV101DoGetAnterior_(e)
      : tacsPerformanceV101Responder_({ok: false, message: 'Ação não reconhecida.'}, parametros.callback);
  }

  try {
    var cache = CacheService.getScriptCache();
    var chave = tacsPerformanceV101Chave_(cache, acao, parametros);
    var salvo = cache.get(chave);
    if (salvo) {
      var dadosCache = JSON.parse(salvo);
      if (dadosCache && dadosCache.ok === true) {
        dadosCache.cachePerformanceV101 = true;
        return tacsPerformanceV101Responder_(dadosCache, parametros.callback);
      }
    }

    var resposta = tacsPerformanceV101DoGetAnterior_(tacsPerformanceV101EventoSemCallback_(e));
    var dados = tacsPerformanceV101ExtrairJson_(resposta);

    if (!dados) {
      return tacsPerformanceV101DoGetAnterior_(e);
    }

    if (dados.ok === true) {
      var copia = tacsPerformanceV101Copiar_(dados);
      delete copia.cachePerformanceV101;
      cache.put(chave, JSON.stringify(copia), ttl);
    }

    return tacsPerformanceV101Responder_(dados, parametros.callback);
  } catch (erro) {
    return tacsPerformanceV101DoGetAnterior_(e);
  }
};

doPost = function (e) {
  if (typeof tacsPerformanceV101DoPostAnterior_ !== 'function') {
    return HtmlService.createHtmlOutput('');
  }

  var parametros = e && e.parameter ? e.parameter : {};
  var acao = String(parametros.action || '').trim().toLowerCase();
  var invalida = tacsPerformanceV101EhMutacao_(acao);

  if (!invalida) {
    return tacsPerformanceV101DoPostAnterior_(e);
  }

  try {
    return tacsPerformanceV101DoPostAnterior_(e);
  } finally {
    // Mesmo se uma rotina de gravação lançar erro depois de uma alteração parcial,
    // a próxima leitura não reutiliza um snapshot potencialmente antigo.
    tacsPerformanceV101Invalidar_();
  }
};

function tacsPerformanceV101EhMutacao_(acao) {
  if (!acao) return false;
  if (acao === 'reservar' || acao === 'reservar_odontologia') return true;
  if (/^(salvar_|cancelar_)/.test(acao)) return true;
  if (!/^admin_/.test(acao)) return false;

  // As rotinas administrativas existentes não usam todas o mesmo prefixo verbal.
  // Ex.: admin_salvar_agenda e admin_publicacoes_salvar_recado. Qualquer verbo de
  // escrita em uma ação admin invalida somente o cache de leitura; não muda a ação.
  return /(?:^|_)(salvar|criar|remover|restaurar|ativar|desativar|publicar|cancelar)(?:_|$)/.test(acao);
}

function tacsPerformanceV101Invalidar_() {
  try {
    CacheService.getScriptCache().put(
      TACS_PERFORMANCE_CACHE_V101.EPOCH_KEY,
      String(new Date().getTime()),
      TACS_PERFORMANCE_CACHE_V101.EPOCH_SEGUNDOS
    );
  } catch (erro) {}
}

function tacsPerformanceV101Chave_(cache, acao, parametros) {
  var epoch = '';
  try { epoch = String(cache.get(TACS_PERFORMANCE_CACHE_V101.EPOCH_KEY) || '0'); }
  catch (erro) { epoch = '0'; }

  var area = tacsPerformanceV101Normalizar_(
    parametros.areaId || parametros.area || parametros.territorio || 'JAPARANDUBA'
  ) || 'JAPARANDUBA';

  return (
    TACS_PERFORMANCE_CACHE_V101.PREFIXO +
    TACS_PERFORMANCE_CACHE_V101.VERSAO + '_' +
    epoch + '_' +
    acao + '_' +
    area
  ).slice(0, 240);
}

function tacsPerformanceV101EventoSemCallback_(e) {
  var origem = e || {};
  var parametros = origem.parameter || {};
  var copiaParametros = {};
  Object.keys(parametros).forEach(function (chave) {
    copiaParametros[chave] = parametros[chave];
  });
  copiaParametros.callback = '';

  var copia = {};
  Object.keys(origem).forEach(function (chave) {
    copia[chave] = origem[chave];
  });
  copia.parameter = copiaParametros;

  if (origem.parameters) {
    copia.parameters = {};
    Object.keys(origem.parameters).forEach(function (chave) {
      var valor = origem.parameters[chave];
      copia.parameters[chave] = Array.isArray(valor) ? valor.slice() : valor;
    });
    copia.parameters.callback = [''];
  }

  return copia;
}

function tacsPerformanceV101ExtrairJson_(resposta) {
  if (!resposta || typeof resposta.getContent !== 'function') return null;
  var texto = String(resposta.getContent() || '').trim();
  if (!texto) return null;

  try { return JSON.parse(texto); }
  catch (erroJson) {}

  var inicio = texto.indexOf('(');
  var fim = texto.lastIndexOf(')');
  if (inicio > 0 && fim > inicio) {
    try { return JSON.parse(texto.slice(inicio + 1, fim)); }
    catch (erroJsonp) {}
  }
  return null;
}

function tacsPerformanceV101Responder_(dados, callback) {
  callback = String(callback || '').trim();
  var json = JSON.stringify(dados || {});

  if (callback && /^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function tacsPerformanceV101Copiar_(valor) {
  return JSON.parse(JSON.stringify(valor || {}));
}

function tacsPerformanceV101Normalizar_(valor) {
  var texto = String(valor == null ? '' : valor).trim().toUpperCase();
  if (texto.normalize) texto = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return texto.replace(/[^A-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}
