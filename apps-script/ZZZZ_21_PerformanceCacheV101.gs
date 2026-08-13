/**
 * ZZZZ_21_PerformanceCacheV101.gs
 *
 * MARCADOR DE ESTABILIDADE — v101.1
 *
 * O cache global que envolvia doGet/doPost foi DESATIVADO após o gate live
 * detectar respostas HTTP 500 intermitentes na rota pública de agenda.
 *
 * Esta versão deliberadamente NÃO redefine doGet, doPost ou qualquer regra de
 * negócio. O ganho de velocidade v101 permanece no frontend (snapshot local,
 * revalidação em segundo plano, warmup curto e atualização inteligente).
 *
 * O arquivo permanece no release para substituir com segurança qualquer cópia
 * anterior existente no projeto Apps Script durante a implantação.
 */

var TACS_PERFORMANCE_CACHE_V101 = Object.freeze({
  VERSAO: '1.1.0',
  ATIVO: false,
  MOTIVO: 'cache-global-desativado-por-gate-live'
});
