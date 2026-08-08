/**
 * Portal TACS — Admin Core V1
 *
 * Núcleo administrativo versionado. Não declara doGet/doPost.
 * O roteador oficial chama:
 *   - tratarGetAdminCoreV1_(e)
 *   - tratarPostAdminCoreV1_(e)
 *
 * Contrato dos painéis:
 * admin_status, admin_result, admin_login, admin_logout, admin_dados,
 * admin_salvar_profissional, admin_salvar_servico, admin_criar_profissional,
 * admin_salvar_agenda, admin_salvar_recado, admin_remover_recado,
 * admin_salvar_campanha e admin_remover_campanha.
 */
var TACS_ADMIN_CORE_V1 = Object.freeze({
  VERSAO: '1.0.0',
  FUSO: 'America/Recife',
  PIN_HASH_KEY: 'TACS_ADMIN_PIN_HASH_V1',
  SESSION_PREFIX: 'TACS_ADMIN_SESSION_V1_',
  SESSION_MS: 8 * 60 * 60 * 1000,
  RESULT_PREFIX: 'tacs_admin_result_v1_',
  RESULT_SECONDS: 300,
  ABA_PROFISSIONAIS: 'PROFISSIONAIS',
  ABA_SERVICOS: 'SERVICOS',
  ABA_AGENDAS: 'PAINEL_PROFISSIONAIS',
  ABA_RECADOS: 'RECADOS_PORTAL',
  ABA_CAMPANHAS: 'CAMPANHAS_PORTAL',
  DIAS: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira']
});

function configurarAdminCoreV1(pin) {
  pin = String(pin == null ? '' : pin).replace(/\D/g, '');
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error('O PIN administrativo deve ter de 4 a 8 dígitos.');
  }

  var props = PropertiesService.getScriptProperties();
  props.setProperty(TACS_ADMIN_CORE_V1.PIN_HASH_KEY, tacsAdminV1Hash_(pin));
  tacsAdminV1GarantirEstrutura_();

  return {
    ok: true,
    versao: TACS_ADMIN_CORE_V1.VERSAO,
    pinConfigurado: true,
    message: 'Admin Core V1 configurado.'
  };
}

function tratarGetAdminCoreV1_(e) {
  var p = e && e.parameter ? e.parameter : {};
  var acao = String(p.action || '').trim();

  if (acao === 'admin_status') {
    return {
      handled: true,
      data: {
        ok: true,
        sistema: 'Portal TACS Admin Core',
        versao: TACS_ADMIN_CORE_V1.VERSAO,
        pinConfigurado: tacsAdminV1PinConfigurado_(),
        atualizadoEm: tacsAdminV1Agora_()
      }
    };
  }

  if (acao === 'admin_result') {
    var requestId = tacsAdminV1RequestIdOpcional_(p.requestId);
    var resultado = requestId ? tacsAdminV1LerResultado_(requestId) : null;
    return {
      handled: true,
      data: resultado
        ? {ok: true, pendente: false, requestId: requestId, result: resultado}
        : {ok: true, pendente: true, requestId: requestId}
    };
  }

  return null;
}

function tratarPostAdminCoreV1_(e) {
  var p = e && e.parameter ? e.parameter : {};
  var acao = String(p.action || '').trim();
  var aceitas = [
    'admin_login',
    'admin_logout',
    'admin_dados',
    'admin_salvar_profissional',
    'admin_salvar_servico',
    'admin_criar_profissional',
    'admin_salvar_agenda',
    'admin_salvar_recado',
    'admin_remover_recado',
    'admin_salvar_campanha',
    'admin_remover_campanha'
  ];
  if (aceitas.indexOf(acao) === -1) return null;

  var requestId = tacsAdminV1ValidarRequestId_(p.requestId);
  var repetido = tacsAdminV1LerResultado_(requestId);
  if (repetido) {
    return {handled: true, requestId: requestId, data: repetido};
  }

  var resultado;
  try {
    if (acao === 'admin_login') {
      resultado = tacsAdminV1Login_(p);
    } else if (acao === 'admin_logout') {
      resultado = tacsAdminV1Logout_(p);
    } else {
      tacsAdminV1ValidarSessao_(p);
      if (acao === 'admin_dados') {
        resultado = tacsAdminV1Dados_();
      } else {
        resultado = tacsAdminV1ComLock_(function () {
          if (acao === 'admin_salvar_profissional') return tacsAdminV1SalvarProfissional_(p);
          if (acao === 'admin_salvar_servico') return tacsAdminV1SalvarServico_(p);
          if (acao === 'admin_criar_profissional') return tacsAdminV1CriarProfissional_(p);
          if (acao === 'admin_salvar_agenda') return tacsAdminV1SalvarAgenda_(p);
          if (acao === 'admin_salvar_recado') return tacsAdminV1SalvarRecado_(p);
          if (acao === 'admin_remover_recado') return tacsAdminV1RemoverRegistro_(TACS_ADMIN_CORE_V1.ABA_RECADOS, p.id, 'Recado');
          if (acao === 'admin_salvar_campanha') return tacsAdminV1SalvarCampanha_(p);
          if (acao === 'admin_remover_campanha') return tacsAdminV1RemoverRegistro_(TACS_ADMIN_CORE_V1.ABA_CAMPANHAS, p.id, 'Campanha');
          throw new Error('Ação administrativa não reconhecida.');
        });
      }
    }
  } catch (erro) {
    resultado = {
      ok: false,
      message: erro && erro.message ? erro.message : String(erro)
    };
  }

  tacsAdminV1GuardarResultado_(requestId, resultado);
  return {handled: true, requestId: requestId, data: resultado};
}

function tacsAdminV1Login_(p) {
  var pin = String(p.pin || '').replace(/\D/g, '');
  var dispositivo = tacsAdminV1Texto_(p.dispositivo);
  if (!dispositivo) throw new Error('Identificador do dispositivo ausente.');
  if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN inválido.');
  if (!tacsAdminV1PinValido_(pin)) throw new Error('PIN administrativo incorreto.');

  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  var sessao = {
    dispositivo: dispositivo,
    criadoEm: Date.now(),
    expiraEm: Date.now() + TACS_ADMIN_CORE_V1.SESSION_MS
  };
  PropertiesService.getScriptProperties().setProperty(
    TACS_ADMIN_CORE_V1.SESSION_PREFIX + token,
    JSON.stringify(sessao)
  );
  return {ok: true, token: token, expiraEm: sessao.expiraEm};
}

function tacsAdminV1Logout_(p) {
  var token = tacsAdminV1Texto_(p.token);
  if (token) {
    PropertiesService.getScriptProperties().deleteProperty(TACS_ADMIN_CORE_V1.SESSION_PREFIX + token);
  }
  return {ok: true, message: 'Sessão encerrada.'};
}

function tacsAdminV1ValidarSessao_(p) {
  var token = tacsAdminV1Texto_(p.token);
  var dispositivo = tacsAdminV1Texto_(p.dispositivo);
  if (!token || !dispositivo) throw new Error('Sessão administrativa ausente. Entre novamente com o PIN.');

  var props = PropertiesService.getScriptProperties();
  var texto = props.getProperty(TACS_ADMIN_CORE_V1.SESSION_PREFIX + token);
  if (!texto) throw new Error('Sessão administrativa inválida ou expirada.');

  var sessao;
  try { sessao = JSON.parse(texto); } catch (erro) { sessao = null; }
  if (!sessao || sessao.dispositivo !== dispositivo || Number(sessao.expiraEm || 0) <= Date.now()) {
    props.deleteProperty(TACS_ADMIN_CORE_V1.SESSION_PREFIX + token);
    throw new Error('Sessão administrativa inválida ou expirada.');
  }

  sessao.expiraEm = Date.now() + TACS_ADMIN_CORE_V1.SESSION_MS;
  props.setProperty(TACS_ADMIN_CORE_V1.SESSION_PREFIX + token, JSON.stringify(sessao));
  return sessao;
}

function tacsAdminV1Dados_() {
  tacsAdminV1GarantirEstrutura_();
  return {
    ok: true,
    versaoAdmin: TACS_ADMIN_CORE_V1.VERSAO,
    profissionais: tacsAdminV1Objetos_(TACS_ADMIN_CORE_V1.ABA_PROFISSIONAIS),
    servicos: tacsAdminV1Objetos_(TACS_ADMIN_CORE_V1.ABA_SERVICOS),
    agendas: tacsAdminV1Objetos_(TACS_ADMIN_CORE_V1.ABA_AGENDAS),
    recados: tacsAdminV1Objetos_(TACS_ADMIN_CORE_V1.ABA_RECADOS),
    campanhas: tacsAdminV1Objetos_(TACS_ADMIN_CORE_V1.ABA_CAMPANHAS),
    atualizadoEm: tacsAdminV1Agora_()
  };
}

function tacsAdminV1SalvarProfissional_(p) {
  var tabela = tacsAdminV1Tabela_(TACS_ADMIN_CORE_V1.ABA_PROFISSIONAIS, tacsAdminV1HeadersProfissionais_());
  var registro = tacsAdminV1Encontrar_(tabela, 'ID', p.id);
  if (!registro) throw new Error('Profissional não encontrado.');
  var nome = tacsAdminV1Texto_(p.nome);
  var titulo = tacsAdminV1Texto_(p.tituloPublico);
  if (!nome || !titulo) throw new Error('Nome e título público são obrigatórios.');

  tacsAdminV1Atualizar_(tabela, registro, {
    NOME: nome,
    TITULO_PUBLICO: titulo,
    ICONE: tacsAdminV1Texto_(p.icone) || '👤',
    ORDEM: tacsAdminV1Positivo_(p.ordem, 1),
    ATIVO: tacsAdminV1Bool_(p.ativo),
    ATUALIZADO_EM: new Date()
  });
  SpreadsheetApp.flush();
  return {ok: true, id: tacsAdminV1Texto_(p.id), message: 'Profissional salvo.'};
}

function tacsAdminV1SalvarServico_(p) {
  var tabela = tacsAdminV1Tabela_(TACS_ADMIN_CORE_V1.ABA_SERVICOS, tacsAdminV1HeadersServicos_());
  var registro = tacsAdminV1Encontrar_(tabela, 'ID', p.id);
  if (!registro) throw new Error('Serviço não encontrado.');
  var profissionalId = tacsAdminV1Texto_(p.profissionalId);
  var profissionais = tacsAdminV1Tabela_(TACS_ADMIN_CORE_V1.ABA_PROFISSIONAIS, tacsAdminV1HeadersProfissionais_());
  if (!tacsAdminV1Encontrar_(profissionais, 'ID', profissionalId)) throw new Error('Profissional associado não encontrado.');
  var nome = tacsAdminV1Texto_(p.nome);
  var descricao = tacsAdminV1Texto_(p.descricaoAutomatica);
  if (!nome || !descricao) throw new Error('Nome e descrição automática são obrigatórios.');

  tacsAdminV1Atualizar_(tabela, registro, {
    PROFISSIONAL_ID: profissionalId,
    NOME: nome,
    DESCRICAO_AUTOMATICA: descricao,
    ORDEM: tacsAdminV1Positivo_(p.ordem, 1),
    ATIVO: tacsAdminV1Bool_(p.ativo),
    PERMITE_VAGA_COMUM: tacsAdminV1Bool_(p.permiteVagaComum),
    PERMITE_EMERGENCIA: tacsAdminV1Bool_(p.permiteEmergencia),
    ATUALIZADO_EM: new Date()
  });
  SpreadsheetApp.flush();
  return {ok: true, id: tacsAdminV1Texto_(p.id), message: 'Serviço salvo.'};
}

function tacsAdminV1CriarProfissional_(p) {
  var nome = tacsAdminV1Texto_(p.nome);
  var titulo = tacsAdminV1Texto_(p.tituloPublico);
  var servicoNome = tacsAdminV1Texto_(p.servicoNome);
  var descricao = tacsAdminV1Texto_(p.descricaoAutomatica);
  var id = tacsAdminV1Id_(p.id || nome || titulo);
  if (!nome || !titulo || !servicoNome || !descricao || id.length < 3) {
    throw new Error('Nome, título público, serviço e descrição são obrigatórios.');
  }

  var prof = tacsAdminV1Tabela_(TACS_ADMIN_CORE_V1.ABA_PROFISSIONAIS, tacsAdminV1HeadersProfissionais_());
  var serv = tacsAdminV1Tabela_(TACS_ADMIN_CORE_V1.ABA_SERVICOS, tacsAdminV1HeadersServicos_());
  var agendas = tacsAdminV1Tabela_(TACS_ADMIN_CORE_V1.ABA_AGENDAS, tacsAdminV1HeadersAgendas_());
  var existente = tacsAdminV1Encontrar_(prof, 'ID', id);
  var jaExistia = !!existente;
  var agora = new Date();

  if (!existente) {
    tacsAdminV1Adicionar_(prof, {
      ID: id,
      NOME: nome,
      TITULO_PUBLICO: titulo,
      ICONE: tacsAdminV1Texto_(p.icone) || '👤',
      ORDEM: tacsAdminV1Positivo_(p.ordem, tacsAdminV1ProximaOrdem_(prof)),
      ATIVO: tacsAdminV1Bool_(p.ativo),
      ATUALIZADO_EM: agora
    });
  }

  var vinculados = tacsAdminV1EncontrarTodos_(serv, 'PROFISSIONAL_ID', id);
  var servicoCriado = false;
  if (!vinculados.length) {
    var servicoId = 'ATENDIMENTO_' + id;
    if (tacsAdminV1Encontrar_(serv, 'ID', servicoId)) {
      throw new Error('Já existe outro serviço usando o identificador ' + servicoId + '.');
    }
    tacsAdminV1Adicionar_(serv, {
      ID: servicoId,
      PROFISSIONAL_ID: id,
      NOME: servicoNome,
      DESCRICAO_AUTOMATICA: descricao,
      ORDEM: 1,
      ATIVO: tacsAdminV1Bool_(p.ativo),
      PERMITE_VAGA_COMUM: tacsAdminV1Bool_(p.permiteVagaComum),
      PERMITE_EMERGENCIA: tacsAdminV1Bool_(p.permiteEmergencia),
      ATUALIZADO_EM: agora
    });
    servicoCriado = true;
  }

  var agendasCriadas = tacsAdminV1GarantirAgendas_(agendas, id, descricao || servicoNome, agora);
  SpreadsheetApp.flush();
  return {
    ok: true,
    id: id,
    jaExistia: jaExistia,
    servicoCriado: servicoCriado,
    agendasCriadas: agendasCriadas,
    message: jaExistia
      ? 'Cadastro existente reconhecido; serviço e agenda conferidos.'
      : 'Profissional criado com serviço e cinco dias de agenda.'
  };
}

function tacsAdminV1SalvarAgenda_(p) {
  var tabela = tacsAdminV1Tabela_(TACS_ADMIN_CORE_V1.ABA_AGENDAS, tacsAdminV1HeadersAgendas_());
  var registro = tacsAdminV1EncontrarAgenda_(tabela, p.modulo, p.dia);
  if (!registro) throw new Error('Agenda não encontrada.');

  tacsAdminV1Atualizar_(tabela, registro, {
    DATA: tacsAdminV1Texto_(p.data),
    HORARIO: tacsAdminV1Texto_(p.horario),
    SITUACAO: tacsAdminV1Texto_(p.situacao),
    MENSAGEM: tacsAdminV1Texto_(p.mensagem),
    ENCERRA_12H: tacsAdminV1Bool_(p.encerra12h),
    VAGAS_COMUNS: tacsAdminV1NaoNegativo_(p.vagasComuns),
    VAGAS_EMERGENCIAIS: tacsAdminV1NaoNegativo_(p.vagasEmergenciais),
    DIA_EXTRA: tacsAdminV1Bool_(p.diaExtra),
    ATIVO: tacsAdminV1Bool_(p.ativo),
    ATUALIZADO_EM: new Date()
  });
  SpreadsheetApp.flush();
  return {ok: true, modulo: tacsAdminV1Texto_(p.modulo), dia: tacsAdminV1Texto_(p.dia), message: 'Agenda salva.'};
}

function tacsAdminV1SalvarRecado_(p) {
  var tabela = tacsAdminV1Tabela_(TACS_ADMIN_CORE_V1.ABA_RECADOS, tacsAdminV1HeadersRecados_());
  var titulo = tacsAdminV1Texto_(p.titulo);
  var mensagem = tacsAdminV1Texto_(p.mensagem);
  if (!titulo || !mensagem) throw new Error('Título e mensagem são obrigatórios.');
  var id = tacsAdminV1Texto_(p.id) || Utilities.getUuid();
  var registro = tacsAdminV1Encontrar_(tabela, 'ID', id);
  var campos = {
    ID: id,
    TITULO: titulo,
    MENSAGEM: mensagem,
    PRIORIDADE: tacsAdminV1Texto_(p.prioridade) || 'INFORMATIVO',
    VALIDADE: tacsAdminV1Texto_(p.validade),
    ATIVO: tacsAdminV1Bool_(p.ativo),
    ATUALIZADO_EM: new Date()
  };
  if (registro) tacsAdminV1Atualizar_(tabela, registro, campos);
  else tacsAdminV1Adicionar_(tabela, campos);
  SpreadsheetApp.flush();
  return {ok: true, id: id, message: 'Recado salvo.'};
}

function tacsAdminV1SalvarCampanha_(p) {
  var tabela = tacsAdminV1Tabela_(TACS_ADMIN_CORE_V1.ABA_CAMPANHAS, tacsAdminV1HeadersCampanhas_());
  var titulo = tacsAdminV1Texto_(p.titulo);
  var mensagem = tacsAdminV1Texto_(p.mensagem);
  if (!titulo || !mensagem) throw new Error('Título e mensagem são obrigatórios.');
  var id = tacsAdminV1Texto_(p.id) || Utilities.getUuid();
  var registro = tacsAdminV1Encontrar_(tabela, 'ID', id);
  var campos = {
    ID: id,
    TITULO: titulo,
    MENSAGEM: mensagem,
    INICIO: tacsAdminV1Texto_(p.inicio),
    DIAS: tacsAdminV1Texto_(p.dias),
    ATIVO: tacsAdminV1Bool_(p.ativo),
    ATUALIZADO_EM: new Date()
  };
  if (registro) tacsAdminV1Atualizar_(tabela, registro, campos);
  else tacsAdminV1Adicionar_(tabela, campos);
  SpreadsheetApp.flush();
  return {ok: true, id: id, message: 'Campanha salva.'};
}

function tacsAdminV1RemoverRegistro_(nomeAba, id, rotulo) {
  id = tacsAdminV1Texto_(id);
  if (!id) throw new Error(rotulo + ' sem identificador.');
  var tabela = tacsAdminV1Tabela_(nomeAba, nomeAba === TACS_ADMIN_CORE_V1.ABA_RECADOS ? tacsAdminV1HeadersRecados_() : tacsAdminV1HeadersCampanhas_());
  var registro = tacsAdminV1Encontrar_(tabela, 'ID', id);
  if (!registro) return {ok: true, id: id, jaAusente: true, message: rotulo + ' já estava ausente.'};
  tabela.aba.deleteRow(registro.linha);
  SpreadsheetApp.flush();
  return {ok: true, id: id, message: rotulo + ' removido.'};
}

function tacsAdminV1GarantirAgendas_(tabela, modulo, mensagem, agora) {
  var existentes = {};
  var iModulo = tacsAdminV1Indice_(tabela, 'MODULO', true);
  var iDia = tacsAdminV1Indice_(tabela, 'DIA', true);
  tabela.registros.forEach(function (registro) {
    if (tacsAdminV1Modulo_(registro.valores[iModulo]) !== tacsAdminV1Modulo_(modulo)) return;
    existentes[tacsAdminV1Normalizar_(registro.valores[iDia])] = true;
  });

  var criadas = 0;
  TACS_ADMIN_CORE_V1.DIAS.forEach(function (dia, indice) {
    if (existentes[tacsAdminV1Normalizar_(dia)]) return;
    tacsAdminV1Adicionar_(tabela, {
      MODULO: modulo,
      ORDEM: indice + 1,
      DIA: dia,
      ATIVO: false,
      DATA: '',
      HORARIO: '',
      SITUACAO: 'NAO_CONFIGURADO',
      MENSAGEM: mensagem,
      ENCERRA_12H: false,
      VAGAS_COMUNS: 0,
      VAGAS_EMERGENCIAIS: 0,
      DIA_EXTRA: false,
      ATUALIZADO_EM: agora
    });
    criadas += 1;
  });
  return criadas;
}

function tacsAdminV1GarantirEstrutura_() {
  tacsAdminV1GarantirAba_(TACS_ADMIN_CORE_V1.ABA_PROFISSIONAIS, tacsAdminV1HeadersProfissionais_());
  tacsAdminV1GarantirAba_(TACS_ADMIN_CORE_V1.ABA_SERVICOS, tacsAdminV1HeadersServicos_());
  tacsAdminV1GarantirAba_(TACS_ADMIN_CORE_V1.ABA_AGENDAS, tacsAdminV1HeadersAgendas_());
  tacsAdminV1GarantirAba_(TACS_ADMIN_CORE_V1.ABA_RECADOS, tacsAdminV1HeadersRecados_());
  tacsAdminV1GarantirAba_(TACS_ADMIN_CORE_V1.ABA_CAMPANHAS, tacsAdminV1HeadersCampanhas_());
}

function tacsAdminV1GarantirAba_(nome, headers) {
  var planilha = tacsAdminV1Planilha_();
  var aba = planilha.getSheetByName(nome) || planilha.insertSheet(nome);
  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (aba.setFrozenRows) aba.setFrozenRows(1);
    return aba;
  }
  var atuais = aba.getRange(1, 1, 1, aba.getLastColumn()).getDisplayValues()[0].map(tacsAdminV1Normalizar_);
  headers.forEach(function (header) {
    if (atuais.indexOf(tacsAdminV1Normalizar_(header)) === -1) {
      throw new Error('A aba ' + nome + ' não possui a coluna obrigatória ' + header + '.');
    }
  });
  return aba;
}

function tacsAdminV1Tabela_(nome, headers) {
  var aba = tacsAdminV1GarantirAba_(nome, headers);
  var colunas = aba.getLastColumn();
  var cabecalhos = aba.getRange(1, 1, 1, colunas).getDisplayValues()[0].map(tacsAdminV1Normalizar_);
  var valores = aba.getLastRow() > 1 ? aba.getRange(2, 1, aba.getLastRow() - 1, colunas).getValues() : [];
  return {
    aba: aba,
    colunas: colunas,
    cabecalhos: cabecalhos,
    registros: valores.map(function (linha, indice) {
      return {linha: indice + 2, valores: linha};
    })
  };
}

function tacsAdminV1Objetos_(nome) {
  var headers = nome === TACS_ADMIN_CORE_V1.ABA_PROFISSIONAIS ? tacsAdminV1HeadersProfissionais_()
    : nome === TACS_ADMIN_CORE_V1.ABA_SERVICOS ? tacsAdminV1HeadersServicos_()
    : nome === TACS_ADMIN_CORE_V1.ABA_AGENDAS ? tacsAdminV1HeadersAgendas_()
    : nome === TACS_ADMIN_CORE_V1.ABA_RECADOS ? tacsAdminV1HeadersRecados_()
    : tacsAdminV1HeadersCampanhas_();
  var tabela = tacsAdminV1Tabela_(nome, headers);
  return tabela.registros.map(function (registro) {
    var item = {};
    tabela.cabecalhos.forEach(function (cabecalho, indice) {
      item[cabecalho] = registro.valores[indice];
    });
    return item;
  });
}

function tacsAdminV1Encontrar_(tabela, campo, valor) {
  var indice = tacsAdminV1Indice_(tabela, campo, true);
  var chave = tacsAdminV1Id_(valor);
  for (var i = 0; i < tabela.registros.length; i += 1) {
    if (tacsAdminV1Id_(tabela.registros[i].valores[indice]) === chave) return tabela.registros[i];
  }
  return null;
}

function tacsAdminV1EncontrarTodos_(tabela, campo, valor) {
  var indice = tacsAdminV1Indice_(tabela, campo, true);
  var chave = tacsAdminV1Id_(valor);
  return tabela.registros.filter(function (registro) {
    return tacsAdminV1Id_(registro.valores[indice]) === chave;
  });
}

function tacsAdminV1EncontrarAgenda_(tabela, modulo, dia) {
  var iModulo = tacsAdminV1Indice_(tabela, 'MODULO', true);
  var iDia = tacsAdminV1Indice_(tabela, 'DIA', true);
  var chaveModulo = tacsAdminV1Modulo_(modulo);
  var chaveDia = tacsAdminV1Normalizar_(dia);
  for (var i = 0; i < tabela.registros.length; i += 1) {
    var valores = tabela.registros[i].valores;
    if (tacsAdminV1Modulo_(valores[iModulo]) === chaveModulo && tacsAdminV1Normalizar_(valores[iDia]) === chaveDia) {
      return tabela.registros[i];
    }
  }
  return null;
}

function tacsAdminV1Indice_(tabela, campo, obrigatorio) {
  var indice = tabela.cabecalhos.indexOf(tacsAdminV1Normalizar_(campo));
  if (indice < 0 && obrigatorio) throw new Error('Coluna obrigatória ausente: ' + campo + ' em ' + tabela.aba.getName());
  return indice;
}

function tacsAdminV1Atualizar_(tabela, registro, campos) {
  var linha = registro.valores.slice();
  Object.keys(campos).forEach(function (campo) {
    var indice = tacsAdminV1Indice_(tabela, campo, false);
    if (indice >= 0) linha[indice] = campos[campo];
  });
  tabela.aba.getRange(registro.linha, 1, 1, tabela.colunas).setValues([linha]);
  registro.valores = linha;
}

function tacsAdminV1Adicionar_(tabela, campos) {
  var linha = new Array(tabela.colunas);
  for (var i = 0; i < linha.length; i += 1) linha[i] = '';
  Object.keys(campos).forEach(function (campo) {
    var indice = tacsAdminV1Indice_(tabela, campo, false);
    if (indice >= 0) linha[indice] = campos[campo];
  });
  tabela.aba.appendRow(linha);
  tabela.registros.push({linha: tabela.aba.getLastRow(), valores: linha});
}

function tacsAdminV1ProximaOrdem_(tabela) {
  var indice = tacsAdminV1Indice_(tabela, 'ORDEM', false);
  if (indice < 0) return tabela.registros.length + 1;
  var maior = 0;
  tabela.registros.forEach(function (registro) {
    maior = Math.max(maior, Number(registro.valores[indice]) || 0);
  });
  return maior + 1;
}

function tacsAdminV1ComLock_(funcao) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Outra gravação está em andamento. Tente novamente em alguns segundos.');
  try { return funcao(); } finally { lock.releaseLock(); }
}

function tacsAdminV1Planilha_() {
  if (typeof getPlanilha === 'function') return getPlanilha();
  var id = '';
  try { id = String(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '').trim(); } catch (erro) {}
  if (id) return SpreadsheetApp.openById(id);
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) throw new Error('A planilha do Portal TACS não está configurada.');
  return planilha;
}

function tacsAdminV1PinConfigurado_() {
  var props = PropertiesService.getScriptProperties();
  return !!String(props.getProperty(TACS_ADMIN_CORE_V1.PIN_HASH_KEY) || props.getProperty('ADMIN_PIN') || props.getProperty('PIN_ADMIN') || '').trim();
}

function tacsAdminV1PinValido_(pin) {
  var props = PropertiesService.getScriptProperties();
  var hash = String(props.getProperty(TACS_ADMIN_CORE_V1.PIN_HASH_KEY) || '').trim();
  if (hash) return hash === tacsAdminV1Hash_(pin);

  var legado = String(props.getProperty('ADMIN_PIN') || props.getProperty('PIN_ADMIN') || '').replace(/\D/g, '');
  if (legado && legado === pin) {
    props.setProperty(TACS_ADMIN_CORE_V1.PIN_HASH_KEY, tacsAdminV1Hash_(pin));
    return true;
  }
  return false;
}

function tacsAdminV1Hash_(valor) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(valor),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (byte) {
    var numero = byte < 0 ? byte + 256 : byte;
    return ('0' + numero.toString(16)).slice(-2);
  }).join('');
}

function tacsAdminV1GuardarResultado_(requestId, resultado) {
  try {
    CacheService.getScriptCache().put(
      TACS_ADMIN_CORE_V1.RESULT_PREFIX + requestId,
      JSON.stringify(resultado),
      TACS_ADMIN_CORE_V1.RESULT_SECONDS
    );
  } catch (erro) {}
}

function tacsAdminV1LerResultado_(requestId) {
  if (!requestId) return null;
  try {
    var texto = CacheService.getScriptCache().get(TACS_ADMIN_CORE_V1.RESULT_PREFIX + requestId);
    return texto ? JSON.parse(texto) : null;
  } catch (erro) {
    return null;
  }
}

function tacsAdminV1ValidarRequestId_(valor) {
  var requestId = tacsAdminV1Texto_(valor);
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(requestId)) throw new Error('Identificador da operação inválido.');
  return requestId;
}

function tacsAdminV1RequestIdOpcional_(valor) {
  var requestId = tacsAdminV1Texto_(valor);
  return /^[A-Za-z0-9_-]{8,160}$/.test(requestId) ? requestId : '';
}

function tacsAdminV1HeadersProfissionais_() {
  return ['ID', 'NOME', 'TITULO_PUBLICO', 'ICONE', 'ORDEM', 'ATIVO', 'ATUALIZADO_EM'];
}
function tacsAdminV1HeadersServicos_() {
  return ['ID', 'PROFISSIONAL_ID', 'NOME', 'DESCRICAO_AUTOMATICA', 'ORDEM', 'ATIVO', 'PERMITE_VAGA_COMUM', 'PERMITE_EMERGENCIA', 'ATUALIZADO_EM'];
}
function tacsAdminV1HeadersAgendas_() {
  return ['MODULO', 'ORDEM', 'DIA', 'ATIVO', 'DATA', 'HORARIO', 'SITUACAO', 'MENSAGEM', 'ENCERRA_12H', 'VAGAS_COMUNS', 'VAGAS_EMERGENCIAIS', 'DIA_EXTRA', 'ATUALIZADO_EM'];
}
function tacsAdminV1HeadersRecados_() {
  return ['ID', 'TITULO', 'MENSAGEM', 'PRIORIDADE', 'VALIDADE', 'ATIVO', 'ATUALIZADO_EM'];
}
function tacsAdminV1HeadersCampanhas_() {
  return ['ID', 'TITULO', 'MENSAGEM', 'INICIO', 'DIAS', 'ATIVO', 'ATUALIZADO_EM'];
}

function tacsAdminV1Modulo_(valor) {
  var chave = tacsAdminV1Normalizar_(valor).toLowerCase();
  if (['medica', 'medico', 'medicina'].indexOf(chave) !== -1) return 'medica';
  if (['nutricionista', 'nutricao'].indexOf(chave) !== -1) return 'nutricionista';
  if (['enfermeira', 'enfermeiro', 'enfermagem'].indexOf(chave) !== -1) return 'enfermeira';
  if (['odontologia', 'dentista'].indexOf(chave) !== -1) return 'odontologia';
  return chave;
}

function tacsAdminV1Id_(valor) {
  return tacsAdminV1Normalizar_(valor).slice(0, 80);
}

function tacsAdminV1Normalizar_(valor) {
  var texto = tacsAdminV1Texto_(valor).toUpperCase();
  if (texto.normalize) texto = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return texto.replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function tacsAdminV1Texto_(valor) {
  return String(valor == null ? '' : valor).trim();
}

function tacsAdminV1Bool_(valor) {
  if (valor === true || valor === 1) return true;
  return ['TRUE', '1', 'SIM', 'YES', 'ATIVO', 'ATIVA', 'VERDADEIRO'].indexOf(tacsAdminV1Normalizar_(valor)) !== -1;
}

function tacsAdminV1NaoNegativo_(valor) {
  var numero = Number(valor);
  return isFinite(numero) && numero >= 0 ? Math.floor(numero) : 0;
}

function tacsAdminV1Positivo_(valor, padrao) {
  var numero = Number(valor);
  return isFinite(numero) && numero >= 1 ? Math.floor(numero) : Math.max(1, Number(padrao) || 1);
}

function tacsAdminV1Agora_() {
  return Utilities.formatDate(new Date(), TACS_ADMIN_CORE_V1.FUSO, 'dd/MM/yyyy HH:mm');
}
