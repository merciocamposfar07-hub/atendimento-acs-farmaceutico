(function (window, document) {
  'use strict';

  var API_URL = 'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec';
  var ACTION = 'publico_conteudo';
  var TARGET_ID = 'noticeArea';
  var TIMEOUT_MS = 15000;
  var IDLE_FALLBACK_MS = 900;

  function texto(valor) {
    return valor === null || valor === undefined ? '' : String(valor).trim();
  }

  function normalizarArea(valor) {
    var area = texto(valor).toUpperCase();
    if (area.normalize) area = area.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    area = area.replace(/[^A-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
    return /^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(area) ? area : '';
  }

  var DEFAULT_AREA_ID = normalizarArea(window.TACS_DEFAULT_AREA_ID || 'JAPARANDUBA') || 'JAPARANDUBA';
  var AREA_ID = normalizarArea(window.TACS_AREA_ID) || DEFAULT_AREA_ID;

  function primeiro(obj, chaves) {
    for (var i = 0; i < chaves.length; i += 1) {
      var valor = obj && obj[chaves[i]];
      if (valor !== null && valor !== undefined && texto(valor) !== '') return valor;
    }
    return '';
  }

  function normalizarPrioridade(valor) {
    var prioridade = texto(valor).toUpperCase();
    if (prioridade === 'URGENTE') return 'urgent';
    if (prioridade === 'IMPORTANTE' || prioridade === 'ALERTA') return 'important';
    return '';
  }

  function normalizarItem(item, tipo) {
    item = item || {};
    var titulo = primeiro(item, ['titulo', 'TITULO', 'title', 'nome', 'NOME']);
    var mensagem = primeiro(item, ['mensagem', 'MENSAGEM', 'message', 'descricao', 'DESCRICAO']);
    var prioridade = primeiro(item, ['prioridade', 'PRIORIDADE', 'priority']);
    var inicio = primeiro(item, ['inicio', 'INICIO', 'dataInicio', 'DATA_INICIO']);
    var fim = primeiro(item, ['fim', 'FIM', 'validade', 'VALIDADE', 'dataFim', 'DATA_FIM']);

    return {
      tipo: tipo,
      titulo: texto(titulo) || (tipo === 'campanha' ? 'Campanha' : 'Recado'),
      mensagem: texto(mensagem),
      prioridade: texto(prioridade) || 'INFORMATIVO',
      classePrioridade: normalizarPrioridade(prioridade),
      inicio: texto(inicio),
      fim: texto(fim)
    };
  }

  function normalizarResposta(resposta) {
    resposta = resposta || {};
    var recadosBrutos = Array.isArray(resposta.recados) ? resposta.recados : [];
    var campanhasBrutas = Array.isArray(resposta.campanhas) ? resposta.campanhas : [];
    var areaResposta = normalizarArea(resposta.areaId);
    var areaEfetiva = areaResposta || DEFAULT_AREA_ID;

    return {
      ok: resposta.ok === true && areaEfetiva === AREA_ID && (AREA_ID === DEFAULT_AREA_ID || Boolean(areaResposta)),
      areaId: areaEfetiva,
      areaConfirmada: Boolean(areaResposta) || AREA_ID === DEFAULT_AREA_ID,
      geradoEm: texto(resposta.geradoEm),
      recados: recadosBrutos.map(function (item) { return normalizarItem(item, 'recado'); }),
      campanhas: campanhasBrutas.map(function (item) { return normalizarItem(item, 'campanha'); })
    };
  }

  function elemento(tag, classe, textoConteudo) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (textoConteudo !== undefined && textoConteudo !== null) el.textContent = String(textoConteudo);
    return el;
  }

  function formatarDataHora(valor) {
    if (!valor) return '';
    var data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;
    try {
      return data.toLocaleString('pt-BR', {
        timeZone: 'America/Recife',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (erro) {
      return data.toLocaleString('pt-BR');
    }
  }

  function criarCartao(item) {
    var cartao = elemento('article', 'notice-card' + (item.classePrioridade ? ' ' + item.classePrioridade : ''));
    cartao.appendChild(elemento('small', '', item.tipo === 'campanha' ? 'Campanha' : item.prioridade));
    cartao.appendChild(elemento('strong', '', item.titulo));

    if (item.mensagem) cartao.appendChild(elemento('p', '', item.mensagem));

    var periodo = '';
    if (item.inicio && item.fim) periodo = 'De ' + item.inicio + ' até ' + item.fim;
    else if (item.inicio) periodo = 'A partir de ' + item.inicio;
    else if (item.fim) periodo = 'Válido até ' + item.fim;

    if (periodo) cartao.appendChild(elemento('p', 'notice-period', periodo));
    return cartao;
  }

  function renderizar(resposta, alvo) {
    var dados = normalizarResposta(resposta);
    alvo = alvo || document.getElementById(TARGET_ID);
    if (!alvo) return { ok: false, motivo: 'alvo_nao_encontrado' };

    alvo.replaceChildren();

    if (!dados.ok) {
      alvo.hidden = true;
      return {
        ok: false,
        motivo: dados.areaId !== AREA_ID || !dados.areaConfirmada ? 'area_divergente' : 'resposta_invalida',
        areaId: dados.areaId
      };
    }

    if (dados.recados.length === 0 && dados.campanhas.length === 0) {
      alvo.hidden = true;
      return {
        ok: true,
        visivel: false,
        areaId: dados.areaId,
        recados: 0,
        campanhas: 0
      };
    }

    var quadro = elemento('div', 'notice-board');
    quadro.appendChild(elemento('h2', '', 'Recados e campanhas'));

    var atualizado = formatarDataHora(dados.geradoEm);
    if (atualizado) quadro.appendChild(elemento('p', 'notice-updated', 'Atualizado em ' + atualizado));

    var lista = elemento('div', 'notice-list');
    dados.recados.forEach(function (item) { lista.appendChild(criarCartao(item)); });
    dados.campanhas.forEach(function (item) { lista.appendChild(criarCartao(item)); });
    quadro.appendChild(lista);
    alvo.appendChild(quadro);
    alvo.hidden = false;

    return {
      ok: true,
      visivel: true,
      areaId: dados.areaId,
      recados: dados.recados.length,
      campanhas: dados.campanhas.length
    };
  }

  function carregar(opcoes) {
    opcoes = opcoes || {};
    var deveRenderizar = opcoes.renderizar !== false;
    var alvo = document.getElementById(TARGET_ID);
    if (deveRenderizar && !alvo) return Promise.resolve({ ok: false, motivo: 'alvo_nao_encontrado' });

    return new Promise(function (resolve) {
      var callback = '__portalTacsConteudoPublicoV1_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
      var script = document.createElement('script');
      var encerrado = false;
      var timer;

      function finalizar(resultado) {
        if (encerrado) return;
        encerrado = true;
        window.clearTimeout(timer);
        try { delete window[callback]; } catch (erro) { window[callback] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve(resultado);
      }

      window[callback] = function (resposta) {
        try {
          if (deveRenderizar) {
            finalizar(renderizar(resposta, alvo));
            return;
          }

          var dados = normalizarResposta(resposta);
          finalizar({
            ok: dados.ok,
            visivel: false,
            renderizado: false,
            areaId: dados.areaId,
            motivo: dados.ok ? '' : 'area_divergente',
            recados: dados.ok ? dados.recados.length : 0,
            campanhas: dados.ok ? dados.campanhas.length : 0
          });
        } catch (erro) {
          if (alvo) alvo.hidden = true;
          finalizar({ ok: false, motivo: 'falha_processamento', detalhe: texto(erro && erro.message) });
        }
      };

      script.onerror = function () {
        if (alvo) alvo.hidden = true;
        finalizar({ ok: false, motivo: 'falha_conexao' });
      };

      timer = window.setTimeout(function () {
        if (alvo) alvo.hidden = true;
        finalizar({ ok: false, motivo: 'tempo_esgotado' });
      }, TIMEOUT_MS);

      script.src = API_URL + '?action=' + encodeURIComponent(ACTION) +
        '&areaId=' + encodeURIComponent(AREA_ID) +
        '&callback=' + encodeURIComponent(callback) +
        '&_=' + Date.now();
      script.async = true;
      document.head.appendChild(script);
    });
  }

  window.PortalTacsConteudoPublicoV1 = Object.freeze({
    versao: '1.2.0',
    somenteLeitura: true,
    renderizacaoAutomatica: false,
    leituraAutomatica: true,
    leituraSilenciosaAdiada: true,
    areaId: AREA_ID,
    normalizarResposta: normalizarResposta,
    renderizar: renderizar,
    carregar: carregar
  });

  function iniciarLeituraSilenciosa() {
    carregar({ renderizar: false });
  }

  function agendarLeituraSilenciosa() {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(iniciarLeituraSilenciosa, { timeout: 1400 });
      return;
    }
    window.setTimeout(iniciarLeituraSilenciosa, IDLE_FALLBACK_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', agendarLeituraSilenciosa, { once: true });
  } else {
    agendarLeituraSilenciosa();
  }
})(window, document);