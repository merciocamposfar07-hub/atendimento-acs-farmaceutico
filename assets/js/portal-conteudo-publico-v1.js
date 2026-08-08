(function (window, document) {
  'use strict';

  var API_URL = String(
    window.TACS_ADMIN_API_URL ||
    'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec'
  ).trim();
  var TARGET_ID = 'noticeArea';
  var TIMEOUT_MS = 15000;

  function texto(valor) {
    return valor === null || valor === undefined ? '' : String(valor).trim();
  }

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
    var inicio = primeiro(item, ['inicio', 'INICIO', 'start', 'dataInicio', 'DATA_INICIO']);
    var fim = primeiro(item, ['fim', 'FIM', 'end', 'validade', 'VALIDADE', 'validity', 'dataFim', 'DATA_FIM']);

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

    return {
      ok: resposta.ok === true,
      geradoEm: texto(resposta.geradoEm || resposta.atualizadoEm),
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
    if (!alvo) return {ok: false, motivo: 'alvo_nao_encontrado'};

    alvo.replaceChildren();
    if (!dados.ok || (dados.recados.length === 0 && dados.campanhas.length === 0)) {
      alvo.hidden = true;
      return {
        ok: dados.ok,
        visivel: false,
        recados: dados.recados.length,
        campanhas: dados.campanhas.length
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
      recados: dados.recados.length,
      campanhas: dados.campanhas.length
    };
  }

  function resumir(resposta) {
    var dados = normalizarResposta(resposta);
    return {
      ok: dados.ok,
      visivel: false,
      renderizado: false,
      recados: dados.recados.length,
      campanhas: dados.campanhas.length
    };
  }

  function carregarCompartilhado(opcoes) {
    if (!window.PortalTacsPublicData || typeof window.PortalTacsPublicData.get !== 'function') {
      return null;
    }
    var deveRenderizar = opcoes.renderizar !== false;
    var alvo = document.getElementById(TARGET_ID);
    return window.PortalTacsPublicData.get().then(function (resposta) {
      return deveRenderizar ? renderizar(resposta, alvo) : resumir(resposta);
    });
  }

  function carregarFallback(opcoes) {
    var deveRenderizar = opcoes.renderizar !== false;
    var alvo = document.getElementById(TARGET_ID);
    if (deveRenderizar && !alvo) return Promise.resolve({ok: false, motivo: 'alvo_nao_encontrado'});

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
          finalizar(deveRenderizar ? renderizar(resposta, alvo) : resumir(resposta));
        } catch (erro) {
          if (alvo) alvo.hidden = true;
          finalizar({ok: false, motivo: 'falha_processamento', detalhe: texto(erro && erro.message)});
        }
      };
      script.onerror = function () {
        if (alvo) alvo.hidden = true;
        finalizar({ok: false, motivo: 'falha_conexao'});
      };
      timer = window.setTimeout(function () {
        if (alvo) alvo.hidden = true;
        finalizar({ok: false, motivo: 'tempo_esgotado'});
      }, TIMEOUT_MS);
      script.src = API_URL + '?action=painel_publico&callback=' + encodeURIComponent(callback) + '&_=' + Date.now();
      script.async = true;
      document.head.appendChild(script);
    });
  }

  function carregar(opcoes) {
    opcoes = opcoes || {};
    var compartilhado = carregarCompartilhado(opcoes);
    return compartilhado || carregarFallback(opcoes);
  }

  window.PortalTacsConteudoPublicoV1 = Object.freeze({
    versao: '2.0.0',
    somenteLeitura: true,
    renderizacaoAutomatica: false,
    leituraAutomatica: false,
    fontePreferencial: 'painel_publico_compartilhado',
    normalizarResposta: normalizarResposta,
    renderizar: renderizar,
    carregar: carregar
  });

  /*
   * Não existe mais leitura silenciosa automática aqui. O Portal oficial já
   * carrega `painel_publico` por PortalTacsPublicData; disparar outra consulta
   * nesta inicialização duplicaria o trabalho do Apps Script.
   */
})(window, document);
