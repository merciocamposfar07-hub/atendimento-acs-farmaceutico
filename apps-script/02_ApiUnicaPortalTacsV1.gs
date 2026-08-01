/**
 * API ÚNICA DO PORTAL TACS — V1
 *
 * Instale este arquivo somente no projeto Apps Script vinculado à planilha:
 * "Portal TACS – Banco de Dados".
 *
 * Esta etapa NÃO altera o Portal público e NÃO exige nova implantação ainda.
 *
 * Funções para executar manualmente nesta etapa:
 *   1. prepararApiUnicaPortalTacsV1
 *   2. testarApiUnicaPortalTacsV1
 *
 * Rotas públicas que serão conectadas ao Portal.gs somente após os testes:
 *   GET  action=bootstrap
 *   GET  action=status
 *   GET  action=novidades
 *   POST action=registrar_consentimento
 *   POST action=revogar_consentimento
 *   POST action=registrar_push
 *   POST action=revogar_push
 *
 * Regras:
 * - nunca devolve a aba MORADORES ao público;
 * - lê profissionais e serviços dinamicamente da planilha;
 * - não possui limite fixo de profissionais;
 * - não inventa dias, vagas, serviços ou recados;
 * - somente registros ativos entram na resposta pública;
 * - mantém suporte para consentimento e futura notificação push;
 * - toda escrita usa LockService e registra HISTORICO.
 */

var API_TACS_V1 = Object.freeze({
  VERSAO: '1.1.0',
  FUSO: 'America/Recife',
  PLANILHA: 'Portal TACS – Banco de Dados',
  ABAS: Object.freeze({
    PROFISSIONAIS: 'PROFISSIONAIS',
    SERVICOS: 'SERVICOS',
    AGENDA: 'PAINEL_PROFISSIONAIS',
    RECADOS: 'RECADOS_PORTAL',
    CAMPANHAS: 'CAMPANHAS_PORTAL',
    CONSENTIMENTOS: 'CONSENTIMENTOS',
    CONFIGURACOES: 'CONFIGURACOES',
    HISTORICO: 'HISTORICO',
    ASSINATURAS_PUSH: 'ASSINATURAS_PUSH',
    NOTIFICACOES_LOG: 'NOTIFICACOES_LOG'
  })
});

function prepararApiUnicaPortalTacsV1() {
  var ss = apiTacsV1Planilha_();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    apiTacsV1GarantirAba_(ss, API_TACS_V1.ABAS.ASSINATURAS_PUSH, [
      'ID', 'ID_PORTAL', 'CPF_CNS', 'ENDPOINT', 'P256DH', 'AUTH', 'DISPOSITIVO',
      'NAVEGADOR', 'ATIVO', 'CRIADO_EM', 'ATUALIZADO_EM'
    ]);

    apiTacsV1GarantirAba_(ss, API_TACS_V1.ABAS.NOTIFICACOES_LOG, [
      'ID', 'DATA_HORA', 'TIPO', 'TITULO', 'MENSAGEM', 'DESTINO', 'STATUS',
      'DETALHE', 'ORIGEM_ID'
    ]);

    apiTacsV1GarantirConfiguracao_(ss, 'API_PORTAL_VERSAO', API_TACS_V1.VERSAO, 'TEXTO', false);
    apiTacsV1GarantirConfiguracao_(ss, 'NOTIFICACOES_HABILITADAS', 'NAO', 'BOOLEANO', true);
    apiTacsV1GarantirConfiguracao_(ss, 'TITULO_NOTIFICACOES', 'Portal TACS • Posto Matias', 'TEXTO', true);
    apiTacsV1GarantirConfiguracao_(ss, 'URL_PUBLICA_PORTAL', '', 'URL', true);

    apiTacsV1Historico_(ss, 'PREPARAR_API', 'SISTEMA', 'API_TACS_V1', '', API_TACS_V1.VERSAO, 'Apps Script');
    SpreadsheetApp.flush();

    var resultado = testarApiUnicaPortalTacsV1();
    resultado.mensagem = resultado.ok
      ? 'API única preparada e validada localmente. Nada foi publicado ainda.'
      : 'A API foi preparada, mas a validação encontrou pendências.';
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  } finally {
    lock.releaseLock();
  }
}

function testarApiUnicaPortalTacsV1() {
  var bootstrap = apiTacsV1GerarBootstrap_();
  var profissionais = bootstrap.profissionais || [];
  var ids = {};
  var duplicados = [];

  profissionais.forEach(function (profissional) {
    if (ids[profissional.id]) duplicados.push(profissional.id);
    ids[profissional.id] = true;
  });

  var resultado = {
    ok: bootstrap.ok === true && duplicados.length === 0,
    versaoApi: bootstrap.apiVersao,
    planilha: bootstrap.planilha,
    revisaoConteudo: bootstrap.revisaoConteudo,
    profissionaisAtivos: profissionais.length,
    servicosAtivos: bootstrap.resumo.servicos,
    agendasPublicadas: bootstrap.resumo.agendas,
    recadosAtivos: bootstrap.resumo.recados,
    campanhasAtivas: bootstrap.resumo.campanhas,
    profissionaisDuplicados: duplicados,
    notificacoesHabilitadas: bootstrap.notificacoes.habilitadas,
    observacao: 'A quantidade de profissionais é dinâmica e vem da aba PROFISSIONAIS.'
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function apiUnicaPortalTacsGetV1(e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var action = String(parametros.action || 'status').trim().toLowerCase();

  if (action === 'bootstrap') {
    return apiTacsV1Resposta_(apiTacsV1GerarBootstrap_(), parametros.callback);
  }

  if (action === 'novidades') {
    return apiTacsV1Resposta_({
      ok: true,
      apiVersao: API_TACS_V1.VERSAO,
      geradoEm: apiTacsV1IsoAgora_(),
      novidades: apiTacsV1GerarNovidades_()
    }, parametros.callback);
  }

  if (action === 'status') {
    return apiTacsV1Resposta_({
      ok: true,
      apiVersao: API_TACS_V1.VERSAO,
      planilha: apiTacsV1Planilha_().getName(),
      geradoEm: apiTacsV1IsoAgora_()
    }, parametros.callback);
  }

  return apiTacsV1Resposta_({
    ok: false,
    message: 'Ação pública não reconhecida.',
    action: action
  }, parametros.callback);
}

function apiUnicaPortalTacsPostV1(e) {
  var dados = apiTacsV1LerPost_(e);
  var action = String(dados.action || '').trim().toLowerCase();

  if (action === 'registrar_consentimento') {
    return apiTacsV1Resposta_(apiTacsV1RegistrarConsentimento_(dados));
  }

  if (action === 'revogar_consentimento') {
    return apiTacsV1Resposta_(apiTacsV1RevogarConsentimento_(dados));
  }

  if (action === 'registrar_push') {
    return apiTacsV1Resposta_(apiTacsV1RegistrarPush_(dados));
  }

  if (action === 'revogar_push') {
    return apiTacsV1Resposta_(apiTacsV1RevogarPush_(dados));
  }

  return apiTacsV1Resposta_({
    ok: false,
    message: 'Ação de gravação não reconhecida.',
    action: action
  });
}

function apiTacsV1GerarBootstrap_() {
  var ss = apiTacsV1Planilha_();
  var configuracoes = apiTacsV1Configuracoes_(ss);
  var profissionaisRows = apiTacsV1Objetos_(ss, API_TACS_V1.ABAS.PROFISSIONAIS);
  var servicosRows = apiTacsV1Objetos_(ss, API_TACS_V1.ABAS.SERVICOS);
  var agendaRows = apiTacsV1Objetos_(ss, API_TACS_V1.ABAS.AGENDA);
  var recadosRows = apiTacsV1Objetos_(ss, API_TACS_V1.ABAS.RECADOS);
  var campanhasRows = apiTacsV1Objetos_(ss, API_TACS_V1.ABAS.CAMPANHAS);

  var hoje = apiTacsV1DataHoje_();

  var profissionais = profissionaisRows
    .filter(function (linha) { return apiTacsV1Booleano_(linha.ATIVO); })
    .map(function (linha) {
      return {
        id: apiTacsV1Texto_(linha.ID),
        nome: apiTacsV1Texto_(linha.NOME),
        modulo: apiTacsV1Texto_(linha.MODULO || linha.ID),
        tituloPublico: apiTacsV1Texto_(linha.TITULO_PUBLICO || linha.NOME),
        icone: apiTacsV1Texto_(linha.ICONE),
        ordem: apiTacsV1Numero_(linha.ORDEM, 999),
        atualizadoEm: apiTacsV1DataSaida_(linha.ATUALIZADO_EM)
      };
    })
    .filter(function (linha) { return Boolean(linha.id); })
    .sort(apiTacsV1OrdenarOrdemNome_);

  var profissionalAtivo = {};
  profissionais.forEach(function (profissional) {
    profissionalAtivo[profissional.id] = true;
  });

  var servicos = servicosRows
    .filter(function (linha) {
      return apiTacsV1Booleano_(linha.ATIVO) && profissionalAtivo[apiTacsV1Texto_(linha.PROFISSIONAL_ID)];
    })
    .map(function (linha) {
      return {
        id: apiTacsV1Texto_(linha.ID),
        profissionalId: apiTacsV1Texto_(linha.PROFISSIONAL_ID),
        nome: apiTacsV1Texto_(linha.NOME),
        descricaoAutomatica: apiTacsV1Texto_(linha.DESCRICAO_AUTOMATICA),
        ordem: apiTacsV1Numero_(linha.ORDEM, 999),
        permiteVagaComum: apiTacsV1Booleano_(linha.PERMITE_VAGA_COMUM),
        permiteEmergencia: apiTacsV1Booleano_(linha.PERMITE_EMERGENCIA),
        atualizadoEm: apiTacsV1DataSaida_(linha.ATUALIZADO_EM)
      };
    })
    .filter(function (linha) { return Boolean(linha.id && linha.profissionalId); })
    .sort(apiTacsV1OrdenarOrdemNome_);

  var agendas = agendaRows
    .filter(function (linha) {
      if (!apiTacsV1Booleano_(linha.ATIVO)) return false;
      var modulo = apiTacsV1Texto_(linha.MODULO);
      if (!profissionalAtivo[modulo]) return false;
      var data = apiTacsV1DataIso_(linha.DATA);
      return !data || data >= hoje;
    })
    .map(function (linha, indice) {
      return {
        id: apiTacsV1Texto_(linha.ID) || [
          apiTacsV1Texto_(linha.MODULO),
          apiTacsV1Texto_(linha.DIA),
          apiTacsV1DataIso_(linha.DATA) || 'RECORRENTE',
          indice + 1
        ].join('-'),
        profissionalId: apiTacsV1Texto_(linha.MODULO),
        ordem: apiTacsV1Numero_(linha.ORDEM, 999),
        dia: apiTacsV1Texto_(linha.DIA),
        data: apiTacsV1DataIso_(linha.DATA),
        horario: apiTacsV1HoraSaida_(linha.HORARIO),
        situacao: apiTacsV1Texto_(linha.SITUACAO),
        mensagem: apiTacsV1Texto_(linha.MENSAGEM),
        encerra12h: apiTacsV1Booleano_(linha.ENCERRA_12H),
        vagasComuns: apiTacsV1NumeroOuNulo_(linha.VAGAS_COMUNS),
        vagasEmergenciais: apiTacsV1NumeroOuNulo_(linha.VAGAS_EMERGENCIAIS),
        diaExtra: apiTacsV1Booleano_(linha.DIA_EXTRA),
        atualizadoEm: apiTacsV1DataSaida_(linha.ATUALIZADO_EM)
      };
    })
    .sort(apiTacsV1OrdenarAgenda_);

  var recados = recadosRows
    .filter(function (linha) {
      if (!apiTacsV1Booleano_(linha.ATIVO)) return false;
      var validade = apiTacsV1DataIso_(linha.VALIDADE);
      return !validade || validade >= hoje;
    })
    .map(function (linha) {
      return {
        id: apiTacsV1Texto_(linha.ID),
        titulo: apiTacsV1Texto_(linha.TITULO),
        mensagem: apiTacsV1Texto_(linha.MENSAGEM),
        prioridade: apiTacsV1Texto_(linha.PRIORIDADE || 'INFORMATIVO'),
        validade: apiTacsV1DataIso_(linha.VALIDADE),
        atualizadoEm: apiTacsV1DataSaida_(linha.ATUALIZADO_EM)
      };
    })
    .filter(function (linha) { return Boolean(linha.id || linha.titulo || linha.mensagem); });

  var campanhas = campanhasRows
    .filter(function (linha) { return apiTacsV1Booleano_(linha.ATIVO); })
    .map(function (linha) {
      return {
        id: apiTacsV1Texto_(linha.ID),
        titulo: apiTacsV1Texto_(linha.TITULO),
        mensagem: apiTacsV1Texto_(linha.MENSAGEM),
        inicio: apiTacsV1DataIso_(linha.INICIO),
        dias: apiTacsV1Texto_(linha.DIAS),
        atualizadoEm: apiTacsV1DataSaida_(linha.ATUALIZADO_EM)
      };
    })
    .filter(function (linha) { return Boolean(linha.id || linha.titulo || linha.mensagem); });

  profissionais.forEach(function (profissional) {
    profissional.servicos = servicos.filter(function (servico) {
      return servico.profissionalId === profissional.id;
    });
    profissional.agenda = agendas.filter(function (agenda) {
      return agenda.profissionalId === profissional.id;
    });
  });

  var conteudoRevisao = JSON.stringify({
    configuracoes: configuracoes,
    profissionais: profissionais,
    recados: recados,
    campanhas: campanhas
  });

  return {
    ok: true,
    apiVersao: API_TACS_V1.VERSAO,
    planilha: ss.getName(),
    geradoEm: apiTacsV1IsoAgora_(),
    revisaoConteudo: apiTacsV1Hash_(conteudoRevisao),
    configuracoes: configuracoes,
    profissionais: profissionais,
    recados: recados,
    campanhas: campanhas,
    novidades: apiTacsV1GerarNovidadesComDados_(recados, campanhas, agendas),
    notificacoes: {
      habilitadas: apiTacsV1Booleano_(configuracoes.NOTIFICACOES_HABILITADAS),
      titulo: configuracoes.TITULO_NOTIFICACOES || 'Portal TACS • Posto Matias',
      exigeConsentimento: true,
      pushConfigurado: false
    },
    resumo: {
      profissionais: profissionais.length,
      servicos: servicos.length,
      agendas: agendas.length,
      recados: recados.length,
      campanhas: campanhas.length
    }
  };
}

function apiTacsV1GerarNovidades_() {
  var bootstrap = apiTacsV1GerarBootstrap_();
  return bootstrap.novidades;
}

function apiTacsV1GerarNovidadesComDados_(recados, campanhas, agendas) {
  var novidades = [];

  recados.forEach(function (item) {
    novidades.push({
      id: 'RECADO-' + (item.id || apiTacsV1Hash_(item.titulo + item.mensagem)),
      tipo: 'RECADO',
      titulo: item.titulo || 'Novo recado da Unidade',
      mensagem: item.mensagem,
      atualizadoEm: item.atualizadoEm,
      prioridade: item.prioridade
    });
  });

  campanhas.forEach(function (item) {
    novidades.push({
      id: 'CAMPANHA-' + (item.id || apiTacsV1Hash_(item.titulo + item.mensagem)),
      tipo: 'CAMPANHA',
      titulo: item.titulo || 'Nova campanha da Unidade',
      mensagem: item.mensagem,
      atualizadoEm: item.atualizadoEm,
      prioridade: 'INFORMATIVO'
    });
  });

  agendas.forEach(function (item) {
    var situacao = apiTacsV1Normalizar_(item.situacao);
    if (
      situacao.indexOf('cancel') === -1 &&
      situacao.indexOf('suspens') === -1 &&
      situacao.indexOf('alterad') === -1
    ) return;

    novidades.push({
      id: 'AGENDA-' + item.id,
      tipo: 'AGENDA',
      titulo: 'Alteração de atendimento',
      mensagem: [item.dia, item.data, item.situacao, item.mensagem].filter(Boolean).join(' • '),
      atualizadoEm: item.atualizadoEm,
      prioridade: situacao.indexOf('cancel') !== -1 ? 'IMPORTANTE' : 'INFORMATIVO'
    });
  });

  novidades.sort(function (a, b) {
    return String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || ''));
  });

  return novidades;
}

function apiTacsV1RegistrarConsentimento_(dados) {
  var ss = apiTacsV1Planilha_();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var idPortal = apiTacsV1Texto_(dados.idPortal || dados.id_portal);
    var cpfCns = apiTacsV1SomenteDigitos_(dados.cpfCns || dados.cpf_cns);
    var tipo = apiTacsV1Texto_(dados.tipo || 'NOVIDADES_PORTAL');
    var canal = apiTacsV1Texto_(dados.canal || 'WEB_PUSH');
    var dispositivo = apiTacsV1Texto_(dados.dispositivo);

    if (!idPortal && !cpfCns) {
      throw new Error('Informe ID_PORTAL ou CPF/CNS para registrar o consentimento.');
    }

    var aba = ss.getSheetByName(API_TACS_V1.ABAS.CONSENTIMENTOS);
    if (!aba) throw new Error('A aba CONSENTIMENTOS não foi encontrada.');

    var objetos = apiTacsV1ObjetosDaAba_(aba);
    var indice = -1;
    objetos.forEach(function (item, i) {
      if (
        apiTacsV1Texto_(item.ID_PORTAL) === idPortal &&
        apiTacsV1Texto_(item.TIPO) === tipo &&
        apiTacsV1Texto_(item.CANAL) === canal
      ) indice = i;
    });

    var agora = new Date();
    var valores = [
      indice >= 0 ? apiTacsV1Texto_(objetos[indice].ID) : Utilities.getUuid(),
      idPortal,
      cpfCns,
      tipo,
      canal,
      true,
      indice >= 0 && objetos[indice].DATA_CONSENTIMENTO ? objetos[indice].DATA_CONSENTIMENTO : agora,
      '',
      dispositivo,
      agora
    ];

    if (indice >= 0) aba.getRange(indice + 2, 1, 1, valores.length).setValues([valores]);
    else aba.appendRow(valores);

    apiTacsV1Historico_(ss, 'REGISTRAR_CONSENTIMENTO', 'CONSENTIMENTOS', valores[0], '', JSON.stringify({ idPortal: idPortal, tipo: tipo, canal: canal }), 'Portal do Morador');
    SpreadsheetApp.flush();

    return { ok: true, id: valores[0], ativo: true, message: 'Consentimento registrado.' };
  } finally {
    lock.releaseLock();
  }
}

function apiTacsV1RevogarConsentimento_(dados) {
  var ss = apiTacsV1Planilha_();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var idPortal = apiTacsV1Texto_(dados.idPortal || dados.id_portal);
    var tipo = apiTacsV1Texto_(dados.tipo || 'NOVIDADES_PORTAL');
    var canal = apiTacsV1Texto_(dados.canal || 'WEB_PUSH');
    var aba = ss.getSheetByName(API_TACS_V1.ABAS.CONSENTIMENTOS);
    if (!aba || aba.getLastRow() < 2) return { ok: true, alterados: 0 };

    var objetos = apiTacsV1ObjetosDaAba_(aba);
    var alterados = 0;
    var agora = new Date();

    objetos.forEach(function (item, indice) {
      if (
        apiTacsV1Texto_(item.ID_PORTAL) === idPortal &&
        apiTacsV1Texto_(item.TIPO) === tipo &&
        apiTacsV1Texto_(item.CANAL) === canal &&
        apiTacsV1Booleano_(item.ATIVO)
      ) {
        aba.getRange(indice + 2, 6).setValue(false);
        aba.getRange(indice + 2, 8).setValue(agora);
        aba.getRange(indice + 2, 10).setValue(agora);
        alterados += 1;
      }
    });

    apiTacsV1Historico_(ss, 'REVOGAR_CONSENTIMENTO', 'CONSENTIMENTOS', idPortal, '', JSON.stringify({ tipo: tipo, canal: canal }), 'Portal do Morador');
    SpreadsheetApp.flush();
    return { ok: true, alterados: alterados, ativo: false };
  } finally {
    lock.releaseLock();
  }
}

function apiTacsV1RegistrarPush_(dados) {
  var ss = apiTacsV1Planilha_();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var endpoint = apiTacsV1Texto_(dados.endpoint);
    var p256dh = apiTacsV1Texto_(dados.p256dh);
    var auth = apiTacsV1Texto_(dados.auth);
    var idPortal = apiTacsV1Texto_(dados.idPortal || dados.id_portal);
    var cpfCns = apiTacsV1SomenteDigitos_(dados.cpfCns || dados.cpf_cns);

    if (!endpoint || !p256dh || !auth) {
      throw new Error('Assinatura push incompleta.');
    }

    var aba = ss.getSheetByName(API_TACS_V1.ABAS.ASSINATURAS_PUSH);
    if (!aba) throw new Error('A aba ASSINATURAS_PUSH não foi encontrada.');

    var objetos = apiTacsV1ObjetosDaAba_(aba);
    var indice = -1;
    objetos.forEach(function (item, i) {
      if (apiTacsV1Texto_(item.ENDPOINT) === endpoint) indice = i;
    });

    var agora = new Date();
    var valores = [
      indice >= 0 ? apiTacsV1Texto_(objetos[indice].ID) : Utilities.getUuid(),
      idPortal,
      cpfCns,
      endpoint,
      p256dh,
      auth,
      apiTacsV1Texto_(dados.dispositivo),
      apiTacsV1Texto_(dados.navegador),
      true,
      indice >= 0 && objetos[indice].CRIADO_EM ? objetos[indice].CRIADO_EM : agora,
      agora
    ];

    if (indice >= 0) aba.getRange(indice + 2, 1, 1, valores.length).setValues([valores]);
    else aba.appendRow(valores);

    apiTacsV1Historico_(ss, 'REGISTRAR_PUSH', 'ASSINATURAS_PUSH', valores[0], '', endpoint, 'Portal do Morador');
    SpreadsheetApp.flush();

    return {
      ok: true,
      id: valores[0],
      ativo: true,
      message: 'Assinatura salva. O envio push será ativado somente após configurar o serviço de entrega.'
    };
  } finally {
    lock.releaseLock();
  }
}

function apiTacsV1RevogarPush_(dados) {
  var ss = apiTacsV1Planilha_();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var endpoint = apiTacsV1Texto_(dados.endpoint);
    var aba = ss.getSheetByName(API_TACS_V1.ABAS.ASSINATURAS_PUSH);
    if (!aba || aba.getLastRow() < 2 || !endpoint) return { ok: true, alterados: 0 };

    var objetos = apiTacsV1ObjetosDaAba_(aba);
    var alterados = 0;
    var agora = new Date();

    objetos.forEach(function (item, indice) {
      if (apiTacsV1Texto_(item.ENDPOINT) === endpoint && apiTacsV1Booleano_(item.ATIVO)) {
        aba.getRange(indice + 2, 9).setValue(false);
        aba.getRange(indice + 2, 11).setValue(agora);
        alterados += 1;
      }
    });

    apiTacsV1Historico_(ss, 'REVOGAR_PUSH', 'ASSINATURAS_PUSH', endpoint, '', 'DESATIVADO', 'Portal do Morador');
    SpreadsheetApp.flush();
    return { ok: true, alterados: alterados, ativo: false };
  } finally {
    lock.releaseLock();
  }
}

function apiTacsV1Planilha_() {
  if (typeof getPlanilha === 'function') {
    var planilhaConfigurada = getPlanilha();
    if (planilhaConfigurada) return planilhaConfigurada;
  }
  var ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (!ativa) throw new Error('Abra o Apps Script pela planilha "' + API_TACS_V1.PLANILHA + '".');
  return ativa;
}

function apiTacsV1Configuracoes_(ss) {
  var objetos = apiTacsV1Objetos_(ss, API_TACS_V1.ABAS.CONFIGURACOES);
  var resultado = {};
  objetos.forEach(function (linha) {
    var chave = apiTacsV1Texto_(linha.CHAVE);
    if (chave) resultado[chave] = apiTacsV1ValorConfiguracao_(linha.VALOR, linha.TIPO);
  });
  return resultado;
}

function apiTacsV1ValorConfiguracao_(valor, tipo) {
  var tipoNormalizado = apiTacsV1Normalizar_(tipo);
  if (tipoNormalizado === 'booleano') return apiTacsV1Booleano_(valor);
  if (tipoNormalizado === 'numero') return apiTacsV1NumeroOuNulo_(valor);
  return apiTacsV1DataSaida_(valor) || apiTacsV1Texto_(valor);
}

function apiTacsV1Objetos_(ss, nomeAba) {
  var aba = ss.getSheetByName(nomeAba);
  if (!aba) return [];
  return apiTacsV1ObjetosDaAba_(aba);
}

function apiTacsV1ObjetosDaAba_(aba) {
  var ultimaLinha = aba.getLastRow();
  var ultimaColuna = aba.getLastColumn();
  if (ultimaLinha < 2 || ultimaColuna < 1) return [];

  var valores = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
  var cabecalhos = valores.shift().map(function (valor) {
    return apiTacsV1Texto_(valor).toUpperCase();
  });

  return valores.map(function (linha) {
    var objeto = {};
    cabecalhos.forEach(function (cabecalho, indice) {
      if (cabecalho) objeto[cabecalho] = linha[indice];
    });
    return objeto;
  });
}

function apiTacsV1GarantirAba_(ss, nome, cabecalhos) {
  var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
  if (aba.getMaxColumns() < cabecalhos.length) {
    aba.insertColumnsAfter(aba.getMaxColumns(), cabecalhos.length - aba.getMaxColumns());
  }
  var existentes = aba.getRange(1, 1, 1, cabecalhos.length).getDisplayValues()[0];
  var finais = cabecalhos.map(function (cabecalho, indice) {
    return apiTacsV1Texto_(existentes[indice]) || cabecalho;
  });
  aba.getRange(1, 1, 1, cabecalhos.length).setValues([finais]);
  aba.getRange(1, 1, 1, cabecalhos.length).setFontWeight('bold');
  aba.setFrozenRows(1);
  return aba;
}

function apiTacsV1GarantirConfiguracao_(ss, chave, valor, tipo, editavel) {
  var aba = ss.getSheetByName(API_TACS_V1.ABAS.CONFIGURACOES);
  if (!aba) throw new Error('A aba CONFIGURACOES não foi encontrada.');
  var objetos = apiTacsV1ObjetosDaAba_(aba);
  var existe = objetos.some(function (linha) {
    return apiTacsV1Texto_(linha.CHAVE) === chave;
  });
  if (!existe) aba.appendRow([chave, valor, tipo, editavel, new Date()]);
}

function apiTacsV1Historico_(ss, acao, tabela, registroId, anterior, novo, origem) {
  var aba = ss.getSheetByName(API_TACS_V1.ABAS.HISTORICO);
  if (!aba) return;
  aba.appendRow([
    Utilities.getUuid(), new Date(), acao, tabela, registroId,
    apiTacsV1Texto_(anterior), apiTacsV1Texto_(novo), origem
  ]);
}

function apiTacsV1LerPost_(e) {
  var dados = {};
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (chave) {
      dados[chave] = e.parameter[chave];
    });
  }
  if (e && e.postData && e.postData.contents) {
    try {
      var json = JSON.parse(e.postData.contents);
      Object.keys(json || {}).forEach(function (chave) {
        dados[chave] = json[chave];
      });
    } catch (erro) {
      // Formulários tradicionais continuam válidos.
    }
  }
  return dados;
}

function apiTacsV1Resposta_(objeto, callback) {
  var json = JSON.stringify(objeto);
  var nomeCallback = apiTacsV1Texto_(callback);

  if (nomeCallback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(nomeCallback)) {
    return ContentService
      .createTextOutput(nomeCallback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function apiTacsV1DataHoje_() {
  return Utilities.formatDate(new Date(), API_TACS_V1.FUSO, 'yyyy-MM-dd');
}

function apiTacsV1IsoAgora_() {
  return Utilities.formatDate(new Date(), API_TACS_V1.FUSO, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function apiTacsV1DataIso_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, API_TACS_V1.FUSO, 'yyyy-MM-dd');
  }
  var texto = apiTacsV1Texto_(valor);
  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  var br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return br[3] + '-' + br[2] + '-' + br[1];
  return '';
}

function apiTacsV1HoraSaida_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, API_TACS_V1.FUSO, 'HH:mm');
  }
  return apiTacsV1Texto_(valor);
}

function apiTacsV1DataSaida_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, API_TACS_V1.FUSO, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return apiTacsV1Texto_(valor);
}

function apiTacsV1Booleano_(valor) {
  if (valor === true) return true;
  if (valor === false || valor === null || valor === undefined || valor === '') return false;
  var texto = apiTacsV1Normalizar_(valor);
  return ['true', 'sim', 's', '1', 'ativo', 'ativado', 'publicado'].indexOf(texto) !== -1;
}

function apiTacsV1Numero_(valor, padrao) {
  var numero = Number(valor);
  return Number.isFinite(numero) ? numero : padrao;
}

function apiTacsV1NumeroOuNulo_(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  var numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(0, numero) : null;
}

function apiTacsV1Texto_(valor) {
  return String(valor == null ? '' : valor).trim();
}

function apiTacsV1SomenteDigitos_(valor) {
  return apiTacsV1Texto_(valor).replace(/\D/g, '');
}

function apiTacsV1Normalizar_(valor) {
  var texto = apiTacsV1Texto_(valor).toLowerCase();
  return texto.normalize ? texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : texto;
}

function apiTacsV1OrdenarOrdemNome_(a, b) {
  return (a.ordem - b.ordem) || String(a.nome || '').localeCompare(String(b.nome || ''));
}

function apiTacsV1OrdenarAgenda_(a, b) {
  var dataA = a.data || '9999-12-31';
  var dataB = b.data || '9999-12-31';
  return dataA.localeCompare(dataB) || (a.ordem - b.ordem) || a.dia.localeCompare(b.dia);
}

function apiTacsV1Hash_(texto) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8);
  return bytes.map(function (byte) {
    var valor = byte < 0 ? byte + 256 : byte;
    return ('0' + valor.toString(16)).slice(-2);
  }).join('').substring(0, 24);
}
