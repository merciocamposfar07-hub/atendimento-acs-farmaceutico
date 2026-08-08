/**
 * Portal TACS — Performance Core V1
 *
 * Cache curto e pré-aquecimento explícito para reduzir a espera dos painéis.
 * Não declara doGet/doPost e não altera regras de negócio.
 */
var TACS_PERFORMANCE_CORE_V1 = Object.freeze({
  VERSAO: '1.0.0',
  ADMIN_CACHE_KEY: 'tacs_admin_snapshot_v1',
  PUBLIC_CACHE_KEY: 'tacs_public_snapshot_v1',
  ADMIN_SECONDS: 45,
  PUBLIC_SECONDS: 45
});

function tacsPerformanceV1PreaquecerAdmin_() {
  try {
    var cache = CacheService.getScriptCache();
    var existente = cache.get(TACS_PERFORMANCE_CORE_V1.ADMIN_CACHE_KEY);
    if (existente) {
      return {ok: true, aquecido: true, cache: true};
    }

    var dados = tacsAdminV1Dados_();
    if (!dados || dados.ok !== true) return {ok: false, aquecido: false};
    cache.put(
      TACS_PERFORMANCE_CORE_V1.ADMIN_CACHE_KEY,
      JSON.stringify(dados),
      TACS_PERFORMANCE_CORE_V1.ADMIN_SECONDS
    );
    return {ok: true, aquecido: true, cache: false, atualizadoEm: dados.atualizadoEm || ''};
  } catch (erro) {
    return {ok: false, aquecido: false, message: erro && erro.message ? erro.message : String(erro)};
  }
}

function tacsPerformanceV1AdminDadosCache_(parametros) {
  parametros = parametros || {};
  try {
    tacsAdminV1ValidarSessao_(parametros);
    var cache = CacheService.getScriptCache();
    var texto = cache.get(TACS_PERFORMANCE_CORE_V1.ADMIN_CACHE_KEY);
    if (!texto) return null;
    var dados = JSON.parse(texto);
    if (!dados || dados.ok !== true) return null;
    dados.cache = true;
    dados.cachePerformance = TACS_PERFORMANCE_CORE_V1.VERSAO;
    var requestId = tacsAdminV1ValidarRequestId_(parametros.requestId);
    tacsAdminV1GuardarResultado_(requestId, dados);
    return {handled: true, requestId: requestId, data: dados};
  } catch (erro) {
    return null;
  }
}

function tacsPerformanceV1GuardarAdminDados_(resultado) {
  if (!resultado || resultado.ok !== true) return;
  try {
    CacheService.getScriptCache().put(
      TACS_PERFORMANCE_CORE_V1.ADMIN_CACHE_KEY,
      JSON.stringify(resultado),
      TACS_PERFORMANCE_CORE_V1.ADMIN_SECONDS
    );
  } catch (erro) {}
}

function tacsPerformanceV1InvalidarAdmin_() {
  try { CacheService.getScriptCache().remove(TACS_PERFORMANCE_CORE_V1.ADMIN_CACHE_KEY); } catch (erro) {}
}

function tacsPerformanceV1PublicoCache_() {
  try {
    var texto = CacheService.getScriptCache().get(TACS_PERFORMANCE_CORE_V1.PUBLIC_CACHE_KEY);
    if (!texto) return null;
    var dados = JSON.parse(texto);
    if (!dados || dados.ok !== true) return null;
    dados.cache = true;
    dados.cachePerformance = TACS_PERFORMANCE_CORE_V1.VERSAO;
    return dados;
  } catch (erro) {
    return null;
  }
}

function tacsPerformanceV1GuardarPublico_(resultado) {
  if (!resultado || resultado.ok !== true) return;
  try {
    CacheService.getScriptCache().put(
      TACS_PERFORMANCE_CORE_V1.PUBLIC_CACHE_KEY,
      JSON.stringify(resultado),
      TACS_PERFORMANCE_CORE_V1.PUBLIC_SECONDS
    );
  } catch (erro) {}
}

function tacsPerformanceV1InvalidarPublico_() {
  try { CacheService.getScriptCache().remove(TACS_PERFORMANCE_CORE_V1.PUBLIC_CACHE_KEY); } catch (erro) {}
}

function tacsPerformanceV1DepoisDeAdmin_(acao, resultado) {
  acao = String(acao || '').trim();
  if (acao === 'admin_dados' && resultado && resultado.ok === true) {
    tacsPerformanceV1GuardarAdminDados_(resultado);
    return;
  }
  if (/^admin_(salvar|remover|criar)_/.test(acao)) {
    tacsPerformanceV1InvalidarAdmin_();
    tacsPerformanceV1InvalidarPublico_();
  }
}
