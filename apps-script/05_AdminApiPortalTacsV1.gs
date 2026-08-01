/**
 * ADMINISTRAÇÃO SEGURA DO PORTAL TACS — V1
 *
 * Instale este arquivo no projeto Apps Script vinculado à planilha
 * "Portal TACS – Banco de Dados".
 *
 * Nesta etapa, execute apenas:
 *   1. prepararAdminPortalTacsV1
 *   2. validarAdminPortalTacsV1
 *
 * Para criar ou recuperar o PIN depois:
 *   gerarCodigoConfiguracaoAdminTacsV1
 *
 * O código temporário aparece no Registro de execução, expira em 30 minutos
 * e serve para criar/trocar o PIN no ambiente administrativo de teste.
 *
 * Segurança:
 * - o PIN nunca é devolvido pela API;
 * - o PIN é armazenado somente como hash com salt nas Propriedades do Script;
 * - login cria sessão temporária de 6 horas;
 * - escritas exigem sessão válida;
 * - tabelas e campos permitidos são validados no servidor;
 * - todas as alterações são registradas em HISTORICO;
 * - nenhuma rota administrativa expõe a aba MORADORES.
 */

var ADMIN_TACS_V1 = Object.freeze({
  VERSAO: '1.0.0',
  SESSAO_SEGUNDOS: 21600,
  CODIGO_CONFIG_SEGUNDOS: 1800,
  MAX_TENTATIVAS: 5,
  BLOQUEIO_SEGUNDOS: 600,
  PROP_PIN_HASH: 'ADMIN_TACS_V1_PIN_HASH',
  PROP_PIN_SALT: 'ADMIN_TACS_V1_PIN_SALT',
  PROP_SETUP_HASH: 'ADMIN_TACS_V1_SETUP_HASH',
  PROP_SETUP_EXPIRA: 'ADMIN_TACS_V1_SETUP_EXPIRA',
  PROP_SETUP_SALT: 'ADMIN_TACS_V1_SETUP_SALT'
});

function prepararAdminPortalTacsV1() {
  var ss = adminTacsV1Planilha_();
  var props = PropertiesService.getScriptProperties();

  if (!props.getProperty(ADMIN_TACS_V1.PROP_PIN_SALT)) {
    props.setProperty(ADMIN_TACS_V1.PROP_PIN_SALT, Utilities.getUuid() + Utilities.getUuid());
  }

  var resultado = validarAdminPortalTacsV1();
  adminTacsV1Historico_(
    ss,
    'PREPARAR_ADMIN',
    'SISTEMA',
    'ADMIN_TACS_V1',
    '',
    JSON.stringify({ versao: ADMIN_TACS_V1.VERSAO, ok: resultado.ok }),
    'Apps Script'
  );
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function validarAdminPortalTacsV1() {
  var ss = adminTacsV1Planilha_();
  var props = PropertiesService.getScriptProperties();
  var obrigatorias = [
    'PROFISSIONAIS',
    'SERVICOS',
    'PAINEL_PROFISSIONAIS',
    'RECADOS_PORTAL',
    'CAMPANHAS_PORTAL',
    'CONFIGURACOES',
    'HISTORICO'
  ];
  var ausentes = obrigatorias.filter(function (nome) {
    return !ss.getSheetByName(nome);
  });

  var resultado = {
    ok: ausentes.length === 0,
    versaoAdmin: ADMIN_TACS_V1.VERSAO,
    planilha: ss.getName(),
    abasAusentes: ausentes,
    pinConfigurado: Boolean(props.getProperty(ADMIN_TACS_V1.PROP_PIN_HASH)),
    sessaoHoras: ADMIN_TACS_V1.SESSAO_SEGUNDOS / 3600,
    observacao: 'Nenhum PIN, hash ou dado de MORADORES é devolvido pela API.'
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function gerarCodigoConfiguracaoAdminTacsV1() {
  var props = PropertiesService.getScriptProperties();
  var codigo = String(Math.floor(10000000 + Math.random() * 90000000));
  var salt = Utilities.getUuid();
  var expira = Date.now() + ADMIN_TACS_V1.CODIGO_CONFIG_SEGUNDOS * 1000;

  props.setProperty(ADMIN_TACS_V1.PROP_SETUP_SALT, salt);
  props.setProperty(ADMIN_TACS_V1.PROP_SETUP_HASH, adminTacsV1Hash_(salt + '|' + codigo));
  props.setProperty(ADMIN_TACS_V1.PROP_SETUP_EXPIRA, String(expira));

  var resultado = {
    ok: true,
    codigoTemporario: codigo,
    expiraEmMinutos: ADMIN_TACS_V1.CODIGO_CONFIG_SEGUNDOS / 60,
    observacao: 'Use este código somente na página administrativa de teste. Não o envie a terceiros.'
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function adminTacsV1Get(e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var action = adminTacsV1Texto_(parametros.action).toLowerCase();

  if (action === 'admin_status') {
    var props = PropertiesService.getScriptProperties();
    return apiTacsV1Resposta_({
      ok: true,
      versaoAdmin: ADMIN_TACS_V1.VERSAO,
      pinConfigurado: Boolean(props.getProperty(ADMIN_TACS_V1.PROP_PIN_HASH)),
      setupTemporarioAtivo: adminTacsV1SetupAtivo_(),
      geradoEm: apiTacsV1IsoAgora_()
    }, parametros.callback);
  }

  return apiTacsV1Resposta_({
    ok: false,
    message: 'Ação administrativa de leitura não reconhecida.'
  }, parametros.callback);
}

function adminTacsV1Post(e) {
  var dados = apiTacsV1LerPost_(e);
  var action = adminTacsV1Texto_(dados.action).toLowerCase();

  if (action === 'admin_criar_pin') return adminTacsV1CriarPin_(dados);
  if (action === 'admin_login') return adminTacsV1Login_(dados);
  if (action === 'admin_logout') return adminTacsV1Logout_(dados);

  var sessao = adminTacsV1ExigirSessao_(dados);

  if (action === 'admin_dados') return adminTacsV1Dados_(sessao);
  if (action === 'admin_salvar_profissional') return adminTacsV1SalvarProfissional_(dados, sessao);
  if (action === 'admin_salvar_servico') return adminTacsV1SalvarServico_(dados, sessao);
  if (action === 'admin_salvar_agenda') return adminTacsV1SalvarAgenda_(dados, sessao);
  if (action === 'admin_salvar_recado') return adminTacsV1SalvarRecado_(dados, sessao);
  if (action === 'admin_salvar_campanha') return adminTacsV1SalvarCampanha_(dados, sessao);
  if (action === 'admin_salvar_configuracao') return adminTacsV1SalvarConfiguracao_(dados, sessao);
  if (action === 'admin_trocar_pin') return adminTacsV1TrocarPin_(dados, sessao);

  return {
    ok: false,
    message: 'Ação administrativa não reconhecida.',
    action: action
  };
}

function adminTacsV1CriarPin_(dados) {
  var codigo = adminTacsV1SomenteDigitos_(dados.codigo);
  var pin = adminTacsV1ValidarNovoPin_(dados.pin, dados.confirmacao);
  var props = PropertiesService.getScriptProperties();

  if (!adminTacsV1SetupAtivo_()) {
    throw new Error('O código temporário expirou ou não foi gerado. Gere outro no Apps Script.');
  }

  var setupSalt = props.getProperty(ADMIN_TACS_V1.PROP_SETUP_SALT) || '';
  var esperado = props.getProperty(ADMIN_TACS_V1.PROP_SETUP_HASH) || '';
  var recebido = adminTacsV1Hash_(setupSalt + '|' + codigo);

  if (!adminTacsV1ComparacaoConstante_(esperado, recebido)) {
    throw new Error('Código temporário inválido.');
  }

  var pinSalt = props.getProperty(ADMIN_TACS_V1.PROP_PIN_SALT) || Utilities.getUuid();
  props.setProperty(ADMIN_TACS_V1.PROP_PIN_SALT, pinSalt);
  props.setProperty(ADMIN_TACS_V1.PROP_PIN_HASH, adminTacsV1Hash_(pinSalt + '|' + pin));
  adminTacsV1LimparSetup_();

  var ss = adminTacsV1Planilha_();
  adminTacsV1Historico_(ss, 'CONFIGURAR_PIN', 'SISTEMA', 'ADMIN', '', 'PIN_CONFIGURADO', 'Portal de Teste');

  return {
    ok: true,
    pinConfigurado: true,
    message: 'PIN configurado. Faça o login.'
  };
}

function adminTacsV1Login_(dados) {
  var pin = adminTacsV1SomenteDigitos_(dados.pin);
  var dispositivo = adminTacsV1Texto_(dados.dispositivo) || 'sem-identificacao';
  var chaveTentativas = 'admin-tentativas-' + adminTacsV1Hash_(dispositivo).substring(0, 20);
  var cache = CacheService.getScriptCache();
  var tentativas = Number(cache.get(chaveTentativas) || 0);

  if (tentativas >= ADMIN_TACS_V1.MAX_TENTATIVAS) {
    throw new Error('Muitas tentativas incorretas neste aparelho. Aguarde 10 minutos.');
  }

  if (!/^\d{4,8}$/.test(pin)) {
    adminTacsV1RegistrarFalhaLogin_(cache, chaveTentativas, tentativas);
    throw new Error('PIN inválido.');
  }

  var props = PropertiesService.getScriptProperties();
  var hashSalvo = props.getProperty(ADMIN_TACS_V1.PROP_PIN_HASH) || '';
  var salt = props.getProperty(ADMIN_TACS_V1.PROP_PIN_SALT) || '';
  if (!hashSalvo) throw new Error('O PIN administrativo ainda não foi configurado.');

  var hashRecebido = adminTacsV1Hash_(salt + '|' + pin);
  if (!adminTacsV1ComparacaoConstante_(hashSalvo, hashRecebido)) {
    adminTacsV1RegistrarFalhaLogin_(cache, chaveTentativas, tentativas);
    throw new Error('PIN incorreto.');
  }

  cache.remove(chaveTentativas);

  var token = adminTacsV1Token_();
  var sessao = {
    token: token,
    dispositivo: dispositivo,
    criadoEm: Date.now(),
    expiraEm: Date.now() + ADMIN_TACS_V1.SESSAO_SEGUNDOS * 1000
  };
  cache.put('admin-sessao-' + token, JSON.stringify(sessao), ADMIN_TACS_V1.SESSAO_SEGUNDOS);

  return {
    ok: true,
    token: token,
    expiraEm: new Date(sessao.expiraEm).toISOString(),
    message: 'Acesso administrativo liberado.'
  };
}

function adminTacsV1Logout_(dados) {
  var token = adminTacsV1Texto_(dados.token);
  if (token) CacheService.getScriptCache().remove('admin-sessao-' + token);
  return { ok: true, message: 'Sessão encerrada.' };
}

function adminTacsV1TrocarPin_(dados, sessao) {
  var pinAtual = adminTacsV1SomenteDigitos_(dados.pinAtual);
  var novoPin = adminTacsV1ValidarNovoPin_(dados.novoPin, dados.confirmacao);
  var props = PropertiesService.getScriptProperties();
  var salt = props.getProperty(ADMIN_TACS_V1.PROP_PIN_SALT) || '';
  var hashSalvo = props.getProperty(ADMIN_TACS_V1.PROP_PIN_HASH) || '';

  if (!adminTacsV1ComparacaoConstante_(hashSalvo, adminTacsV1Hash_(salt + '|' + pinAtual))) {
    throw new Error('PIN atual incorreto.');
  }

  props.setProperty(ADMIN_TACS_V1.PROP_PIN_HASH, adminTacsV1Hash_(salt + '|' + novoPin));
  CacheService.getScriptCache().remove('admin-sessao-' + sessao.token);

  adminTacsV1Historico_(
    adminTacsV1Planilha_(),
    'TROCAR_PIN',
    'SISTEMA',
    'ADMIN',
    '',
    'PIN_ALTERADO',
    'Portal de Teste'
  );

  return { ok: true, exigirNovoLogin: true, message: 'PIN alterado. Entre novamente.' };
}

function adminTacsV1Dados_(sessao) {
  var ss = adminTacsV1Planilha_();
  return {
    ok: true,
    sessao: { expiraEm: new Date(sessao.expiraEm).toISOString() },
    profissionais: adminTacsV1Linhas_(ss, 'PROFISSIONAIS'),
    servicos: adminTacsV1Linhas_(ss, 'SERVICOS'),
    agendas: adminTacsV1Linhas_(ss, 'PAINEL_PROFISSIONAIS'),
    recados: adminTacsV1Linhas_(ss, 'RECADOS_PORTAL'),
    campanhas: adminTacsV1Linhas_(ss, 'CAMPANHAS_PORTAL'),
    configuracoes: adminTacsV1Linhas_(ss, 'CONFIGURACOES').filter(function (linha) {
      return adminTacsV1Booleano_(linha.EDITAVEL);
    }),
    geradoEm: apiTacsV1IsoAgora_()
  };
}

function adminTacsV1SalvarProfissional_(dados, sessao) {
  var ss = adminTacsV1Planilha_();
  var id = adminTacsV1Id_(dados.id);
  if (!id) throw new Error('Informe o ID do profissional.');

  var registro = {
    ID: id,
    NOME: adminTacsV1Obrigatorio_(dados.nome, 'Informe o nome do profissional.'),
    MODULO: id,
    TITULO_PUBLICO: adminTacsV1Obrigatorio_(dados.tituloPublico, 'Informe o título público.'),
    ICONE: adminTacsV1Texto_(dados.icone),
    ORDEM: adminTacsV1Inteiro_(dados.ordem, 1, 999, 'Ordem inválida.'),
    ATIVO: adminTacsV1Booleano_(dados.ativo),
    ATUALIZADO_EM: new Date()
  };

  var resultado = adminTacsV1SalvarPorChave_(ss, 'PROFISSIONAIS', 'ID', id, registro, sessao);
  adminTacsV1GarantirCincoDias_(ss, id);
  SpreadsheetApp.flush();

  return {
    ok: true,
    id: id,
    criado: resultado.criado,
    message: resultado.criado ? 'Profissional adicionado.' : 'Profissional atualizado.'
  };
}

function adminTacsV1SalvarServico_(dados, sessao) {
  var ss = adminTacsV1Planilha_();
  var id = adminTacsV1Id_(dados.id);
  var profissionalId = adminTacsV1Id_(dados.profissionalId);
  if (!id) throw new Error('Informe o ID do serviço.');
  if (!profissionalId) throw new Error('Selecione o profissional.');

  adminTacsV1ExigirRegistro_(ss, 'PROFISSIONAIS', 'ID', profissionalId, 'Profissional não encontrado.');

  var registro = {
    ID: id,
    PROFISSIONAL_ID: profissionalId,
    NOME: adminTacsV1Obrigatorio_(dados.nome, 'Informe o nome do serviço.'),
    DESCRICAO_AUTOMATICA: adminTacsV1Obrigatorio_(dados.descricaoAutomatica, 'Informe a descrição automática.'),
    ORDEM: adminTacsV1Inteiro_(dados.ordem, 1, 999, 'Ordem inválida.'),
    ATIVO: adminTacsV1Booleano_(dados.ativo),
    PERMITE_VAGA_COMUM: adminTacsV1Booleano_(dados.permiteVagaComum),
    PERMITE_EMERGENCIA: adminTacsV1Booleano_(dados.permiteEmergencia),
    ATUALIZADO_EM: new Date()
  };

  var resultado = adminTacsV1SalvarPorChave_(ss, 'SERVICOS', 'ID', id, registro, sessao);
  SpreadsheetApp.flush();

  return {
    ok: true,
    id: id,
    criado: resultado.criado,
    message: resultado.criado ? 'Serviço adicionado.' : 'Serviço atualizado.'
  };
}

function adminTacsV1SalvarAgenda_(dados, sessao) {
  var ss = adminTacsV1Planilha_();
  var modulo = adminTacsV1Id_(dados.modulo);
  var dia = adminTacsV1Dia_(dados.dia);
  if (!modulo) throw new Error('Selecione o profissional.');
  if (!dia) throw new Error('Selecione um dia de segunda a sexta.');

  adminTacsV1ExigirRegistro_(ss, 'PROFISSIONAIS', 'ID', modulo, 'Profissional não encontrado.');

  var registro = {
    MODULO: modulo,
    ORDEM: adminTacsV1OrdemDia_(dia),
    DIA: dia,
    ATIVO: adminTacsV1Booleano_(dados.ativo),
    DATA: adminTacsV1DataPlanilha_(dados.data),
    HORARIO: adminTacsV1Texto_(dados.horario),
    SITUACAO: adminTacsV1Texto_(dados.situacao || 'ATENDIMENTO').toUpperCase(),
    MENSAGEM: adminTacsV1Texto_(dados.mensagem),
    ENCERRA_12H: adminTacsV1Booleano_(dados.encerra12h),
    VAGAS_COMUNS: adminTacsV1Inteiro_(dados.vagasComuns, 0, 999, 'Quantidade de vagas comuns inválida.'),
    VAGAS_EMERGENCIAIS: adminTacsV1Inteiro_(dados.vagasEmergenciais, 0, 999, 'Quantidade de emergências inválida.'),
    DIA_EXTRA: adminTacsV1Booleano_(dados.diaExtra),
    ATUALIZADO_EM: new Date()
  };

  var resultado = adminTacsV1SalvarAgendaPorModuloDia_(ss, modulo, dia, registro, sessao);
  SpreadsheetApp.flush();

  return {
    ok: true,
    modulo: modulo,
    dia: dia,
    criado: resultado.criado,
    message: 'Agenda atualizada.'
  };
}

function adminTacsV1SalvarRecado_(dados, sessao) {
  var ss = adminTacsV1Planilha_();
  var id = adminTacsV1IdLivre_(dados.id) || ('RECADO_' + Date.now());
  var registro = {
    ID: id,
    TITULO: adminTacsV1Obrigatorio_(dados.titulo, 'Informe o título do recado.'),
    MENSAGEM: adminTacsV1Obrigatorio_(dados.mensagem, 'Informe a mensagem.'),
    PRIORIDADE: adminTacsV1Texto_(dados.prioridade || 'INFORMATIVO').toUpperCase(),
    VALIDADE: adminTacsV1DataPlanilha_(dados.validade),
    ATIVO: adminTacsV1Booleano_(dados.ativo),
    ATUALIZADO_EM: new Date()
  };
  var resultado = adminTacsV1SalvarPorChave_(ss, 'RECADOS_PORTAL', 'ID', id, registro, sessao);
  SpreadsheetApp.flush();
  return { ok: true, id: id, criado: resultado.criado, message: 'Recado salvo.' };
}

function adminTacsV1SalvarCampanha_(dados, sessao) {
  var ss = adminTacsV1Planilha_();
  var id = adminTacsV1IdLivre_(dados.id) || ('CAMPANHA_' + Date.now());
  var registro = {
    ID: id,
    TITULO: adminTacsV1Obrigatorio_(dados.titulo, 'Informe o título da campanha.'),
    MENSAGEM: adminTacsV1Obrigatorio_(dados.mensagem, 'Informe a mensagem.'),
    INICIO: adminTacsV1DataPlanilha_(dados.inicio),
    DIAS: adminTacsV1Texto_(dados.dias),
    ATIVO: adminTacsV1Booleano_(dados.ativo),
    ATUALIZADO_EM: new Date()
  };
  var resultado = adminTacsV1SalvarPorChave_(ss, 'CAMPANHAS_PORTAL', 'ID', id, registro, sessao);
  SpreadsheetApp.flush();
  return { ok: true, id: id, criado: resultado.criado, message: 'Campanha salva.' };
}

function adminTacsV1SalvarConfiguracao_(dados, sessao) {
  var ss = adminTacsV1Planilha_();
  var chave = adminTacsV1Texto_(dados.chave).toUpperCase();
  if (!chave) throw new Error('Configuração não informada.');

  var existente = adminTacsV1ExigirRegistro_(
    ss,
    'CONFIGURACOES',
    'CHAVE',
    chave,
    'Configuração não encontrada.'
  );

  if (!adminTacsV1Booleano_(existente.objeto.EDITAVEL)) {
    throw new Error('Esta configuração é interna e não pode ser alterada pelo portal.');
  }

  var valor = adminTacsV1Texto_(dados.valor);
  var tipo = adminTacsV1Texto_(existente.objeto.TIPO || 'TEXTO').toUpperCase();
  var registro = {
    CHAVE: chave,
    VALOR: valor,
    TIPO: tipo,
    EDITAVEL: true,
    ATUALIZADO_EM: new Date()
  };

  adminTacsV1SalvarPorChave_(ss, 'CONFIGURACOES', 'CHAVE', chave, registro, sessao);
  SpreadsheetApp.flush();
  return { ok: true, chave: chave, message: 'Configuração atualizada.' };
}

function adminTacsV1SalvarPorChave_(ss, nomeAba, colunaChave, valorChave, registro, sessao) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var aba = ss.getSheetByName(nomeAba);
    if (!aba) throw new Error('A aba ' + nomeAba + ' não foi encontrada.');

    var estrutura = adminTacsV1EstruturaAba_(aba);
    var indiceChave = estrutura.cabecalhos.indexOf(colunaChave);
    if (indiceChave === -1) throw new Error('A coluna ' + colunaChave + ' não foi encontrada.');

    var linhaEncontrada = 0;
    var anterior = null;

    estrutura.linhas.forEach(function (linha, indice) {
      if (adminTacsV1Texto_(linha[indiceChave]) === adminTacsV1Texto_(valorChave)) {
        linhaEncontrada = indice + 2;
        anterior = adminTacsV1ObjetoLinha_(estrutura.cabecalhos, linha);
      }
    });

    var valores = estrutura.cabecalhos.map(function (cabecalho) {
      if (Object.prototype.hasOwnProperty.call(registro, cabecalho)) return registro[cabecalho];
      if (anterior && Object.prototype.hasOwnProperty.call(anterior, cabecalho)) return anterior[cabecalho];
      return '';
    });

    if (linhaEncontrada) {
      aba.getRange(linhaEncontrada, 1, 1, valores.length).setValues([valores]);
    } else {
      aba.appendRow(valores);
    }

    adminTacsV1Historico_(
      ss,
      linhaEncontrada ? 'ATUALIZAR' : 'CRIAR',
      nomeAba,
      valorChave,
      anterior ? JSON.stringify(adminTacsV1Serializar_(anterior)) : '',
      JSON.stringify(adminTacsV1Serializar_(registro)),
      'Portal Admin • ' + sessao.dispositivo
    );

    return { criado: !linhaEncontrada };
  } finally {
    lock.releaseLock();
  }
}

function adminTacsV1SalvarAgendaPorModuloDia_(ss, modulo, dia, registro, sessao) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var aba = ss.getSheetByName('PAINEL_PROFISSIONAIS');
    if (!aba) throw new Error('A aba PAINEL_PROFISSIONAIS não foi encontrada.');

    var estrutura = adminTacsV1EstruturaAba_(aba);
    var indiceModulo = estrutura.cabecalhos.indexOf('MODULO');
    var indiceDia = estrutura.cabecalhos.indexOf('DIA');
    var linhaEncontrada = 0;
    var anterior = null;

    estrutura.linhas.forEach(function (linha, indice) {
      if (
        adminTacsV1Texto_(linha[indiceModulo]).toUpperCase() === modulo &&
        adminTacsV1Texto_(linha[indiceDia]) === dia
      ) {
        linhaEncontrada = indice + 2;
        anterior = adminTacsV1ObjetoLinha_(estrutura.cabecalhos, linha);
      }
    });

    var valores = estrutura.cabecalhos.map(function (cabecalho) {
      if (Object.prototype.hasOwnProperty.call(registro, cabecalho)) return registro[cabecalho];
      if (anterior && Object.prototype.hasOwnProperty.call(anterior, cabecalho)) return anterior[cabecalho];
      return '';
    });

    if (linhaEncontrada) aba.getRange(linhaEncontrada, 1, 1, valores.length).setValues([valores]);
    else aba.appendRow(valores);

    adminTacsV1Historico_(
      ss,
      linhaEncontrada ? 'ATUALIZAR_AGENDA' : 'CRIAR_AGENDA',
      'PAINEL_PROFISSIONAIS',
      modulo + '|' + dia,
      anterior ? JSON.stringify(adminTacsV1Serializar_(anterior)) : '',
      JSON.stringify(adminTacsV1Serializar_(registro)),
      'Portal Admin • ' + sessao.dispositivo
    );

    return { criado: !linhaEncontrada };
  } finally {
    lock.releaseLock();
  }
}

function adminTacsV1GarantirCincoDias_(ss, modulo) {
  ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'].forEach(function (dia) {
    var existente = adminTacsV1Localizar_(ss, 'PAINEL_PROFISSIONAIS', function (objeto) {
      return adminTacsV1Texto_(objeto.MODULO).toUpperCase() === modulo &&
        adminTacsV1Texto_(objeto.DIA) === dia;
    });

    if (existente) return;

    var aba = ss.getSheetByName('PAINEL_PROFISSIONAIS');
    var estrutura = adminTacsV1EstruturaAba_(aba);
    var registro = {
      MODULO: modulo,
      ORDEM: adminTacsV1OrdemDia_(dia),
      DIA: dia,
      ATIVO: false,
      DATA: '',
      HORARIO: '',
      SITUACAO: 'NAO_CONFIGURADO',
      MENSAGEM: '',
      ENCERRA_12H: false,
      VAGAS_COMUNS: 0,
      VAGAS_EMERGENCIAIS: 0,
      DIA_EXTRA: false,
      ATUALIZADO_EM: new Date()
    };
    aba.appendRow(estrutura.cabecalhos.map(function (cabecalho) {
      return Object.prototype.hasOwnProperty.call(registro, cabecalho) ? registro[cabecalho] : '';
    }));
  });
}

function adminTacsV1ExigirSessao_(dados) {
  var token = adminTacsV1Texto_(dados.token);
  var dispositivo = adminTacsV1Texto_(dados.dispositivo);
  if (!token) throw new Error('Sessão administrativa ausente. Entre novamente.');

  var cache = CacheService.getScriptCache();
  var json = cache.get('admin-sessao-' + token);
  if (!json) throw new Error('Sessão expirada. Entre novamente.');

  var sessao;
  try {
    sessao = JSON.parse(json);
  } catch (erro) {
    cache.remove('admin-sessao-' + token);
    throw new Error('Sessão inválida. Entre novamente.');
  }

  if (Date.now() > Number(sessao.expiraEm || 0)) {
    cache.remove('admin-sessao-' + token);
    throw new Error('Sessão expirada. Entre novamente.');
  }

  if (dispositivo && sessao.dispositivo !== dispositivo) {
    throw new Error('A sessão pertence a outro aparelho.');
  }

  sessao.token = token;
  cache.put('admin-sessao-' + token, JSON.stringify(sessao), ADMIN_TACS_V1.SESSAO_SEGUNDOS);
  return sessao;
}

function adminTacsV1RegistrarFalhaLogin_(cache, chave, tentativas) {
  cache.put(chave, String(tentativas + 1), ADMIN_TACS_V1.BLOQUEIO_SEGUNDOS);
}

function adminTacsV1SetupAtivo_() {
  var props = PropertiesService.getScriptProperties();
  var hash = props.getProperty(ADMIN_TACS_V1.PROP_SETUP_HASH);
  var expira = Number(props.getProperty(ADMIN_TACS_V1.PROP_SETUP_EXPIRA) || 0);
  if (!hash || !expira || Date.now() > expira) {
    adminTacsV1LimparSetup_();
    return false;
  }
  return true;
}

function adminTacsV1LimparSetup_() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(ADMIN_TACS_V1.PROP_SETUP_HASH);
  props.deleteProperty(ADMIN_TACS_V1.PROP_SETUP_EXPIRA);
  props.deleteProperty(ADMIN_TACS_V1.PROP_SETUP_SALT);
}

function adminTacsV1ValidarNovoPin_(pin, confirmacao) {
  var valor = adminTacsV1SomenteDigitos_(pin);
  var repeticao = adminTacsV1SomenteDigitos_(confirmacao);
  if (!/^\d{4,8}$/.test(valor)) throw new Error('O PIN deve ter de 4 a 8 números.');
  if (valor !== repeticao) throw new Error('A confirmação do PIN não confere.');
  return valor;
}

function adminTacsV1Linhas_(ss, nomeAba) {
  var aba = ss.getSheetByName(nomeAba);
  if (!aba) return [];
  return adminTacsV1ObjetosDaAba_(aba).map(adminTacsV1Serializar_);
}

function adminTacsV1ObjetosDaAba_(aba) {
  var estrutura = adminTacsV1EstruturaAba_(aba);
  return estrutura.linhas.map(function (linha) {
    return adminTacsV1ObjetoLinha_(estrutura.cabecalhos, linha);
  });
}

function adminTacsV1EstruturaAba_(aba) {
  var ultimaLinha = aba.getLastRow();
  var ultimaColuna = aba.getLastColumn();
  if (ultimaColuna < 1) return { cabecalhos: [], linhas: [] };
  var valores = aba.getRange(1, 1, Math.max(ultimaLinha, 1), ultimaColuna).getValues();
  var cabecalhos = valores.shift().map(function (valor) {
    return adminTacsV1Texto_(valor).toUpperCase();
  });
  return { cabecalhos: cabecalhos, linhas: valores };
}

function adminTacsV1ObjetoLinha_(cabecalhos, linha) {
  var objeto = {};
  cabecalhos.forEach(function (cabecalho, indice) {
    if (cabecalho) objeto[cabecalho] = linha[indice];
  });
  return objeto;
}

function adminTacsV1Serializar_(valor) {
  if (valor instanceof Date) return Utilities.formatDate(valor, 'America/Recife', "yyyy-MM-dd'T'HH:mm:ssXXX");
  if (Array.isArray(valor)) return valor.map(adminTacsV1Serializar_);
  if (valor && typeof valor === 'object') {
    var saida = {};
    Object.keys(valor).forEach(function (chave) {
      saida[chave] = adminTacsV1Serializar_(valor[chave]);
    });
    return saida;
  }
  return valor;
}

function adminTacsV1Localizar_(ss, nomeAba, criterio) {
  var aba = ss.getSheetByName(nomeAba);
  if (!aba) return null;
  var objetos = adminTacsV1ObjetosDaAba_(aba);
  for (var i = 0; i < objetos.length; i += 1) {
    if (criterio(objetos[i])) return { objeto: objetos[i], indice: i, linha: i + 2 };
  }
  return null;
}

function adminTacsV1ExigirRegistro_(ss, nomeAba, coluna, valor, mensagem) {
  var encontrado = adminTacsV1Localizar_(ss, nomeAba, function (objeto) {
    return adminTacsV1Texto_(objeto[coluna]) === adminTacsV1Texto_(valor);
  });
  if (!encontrado) throw new Error(mensagem);
  return encontrado;
}

function adminTacsV1Planilha_() {
  if (typeof getPlanilha === 'function') {
    var planilha = getPlanilha();
    if (planilha) return planilha;
  }
  var ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (!ativa) throw new Error('Planilha não localizada.');
  return ativa;
}

function adminTacsV1Historico_(ss, acao, tabela, registroId, anterior, novo, origem) {
  if (typeof apiTacsV1Historico_ === 'function') {
    apiTacsV1Historico_(ss, acao, tabela, registroId, anterior, novo, origem);
    return;
  }
  var aba = ss.getSheetByName('HISTORICO');
  if (!aba) return;
  aba.appendRow([Utilities.getUuid(), new Date(), acao, tabela, registroId, anterior, novo, origem]);
}

function adminTacsV1Dia_(valor) {
  var normalizado = adminTacsV1Normalizar_(valor);
  var mapa = {
    'segunda-feira': 'Segunda-feira',
    'terca-feira': 'Terça-feira',
    'quarta-feira': 'Quarta-feira',
    'quinta-feira': 'Quinta-feira',
    'sexta-feira': 'Sexta-feira'
  };
  return mapa[normalizado] || '';
}

function adminTacsV1OrdemDia_(dia) {
  return ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'].indexOf(dia) + 1;
}

function adminTacsV1DataPlanilha_(valor) {
  var texto = adminTacsV1Texto_(valor);
  if (!texto) return '';
  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) throw new Error('Data inválida. Use dia, mês e ano.');
  var data = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0);
  if (isNaN(data.getTime())) throw new Error('Data inválida.');
  return data;
}

function adminTacsV1Inteiro_(valor, minimo, maximo, mensagem) {
  if (valor === '' || valor === null || valor === undefined) return minimo;
  var numero = Number(valor);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) throw new Error(mensagem);
  return numero;
}

function adminTacsV1Obrigatorio_(valor, mensagem) {
  var texto = adminTacsV1Texto_(valor);
  if (!texto) throw new Error(mensagem);
  return texto;
}

function adminTacsV1Id_(valor) {
  return adminTacsV1Texto_(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 60);
}

function adminTacsV1IdLivre_(valor) {
  return adminTacsV1Id_(valor);
}

function adminTacsV1Texto_(valor) {
  return String(valor == null ? '' : valor).trim();
}

function adminTacsV1SomenteDigitos_(valor) {
  return adminTacsV1Texto_(valor).replace(/\D/g, '');
}

function adminTacsV1Normalizar_(valor) {
  var texto = adminTacsV1Texto_(valor).toLowerCase();
  return texto.normalize ? texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : texto;
}

function adminTacsV1Booleano_(valor) {
  if (valor === true) return true;
  var normalizado = adminTacsV1Normalizar_(valor);
  return ['true', 'sim', '1', 'ativo', 'on', 'yes'].indexOf(normalizado) !== -1;
}

function adminTacsV1Hash_(texto) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(texto),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (byte) {
    var valor = byte < 0 ? byte + 256 : byte;
    return ('0' + valor.toString(16)).slice(-2);
  }).join('');
}

function adminTacsV1ComparacaoConstante_(a, b) {
  var x = String(a || '');
  var y = String(b || '');
  var tamanho = Math.max(x.length, y.length);
  var diferenca = x.length ^ y.length;
  for (var i = 0; i < tamanho; i += 1) {
    diferenca |= (x.charCodeAt(i % Math.max(x.length, 1)) || 0) ^
      (y.charCodeAt(i % Math.max(y.length, 1)) || 0);
  }
  return diferenca === 0;
}

function adminTacsV1Token_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}
