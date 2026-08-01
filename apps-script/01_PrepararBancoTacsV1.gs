/**
 * PREPARAÇÃO SEGURA DA BASE ÚNICA DO PORTAL TACS
 *
 * Execute somente no projeto Apps Script vinculado à planilha:
 * "Portal TACS – Banco de Dados".
 *
 * Função principal: prepararBancoTacsV1
 * Função de conferência: validarBancoTacsV1
 *
 * Regras:
 * - não apaga MORADORES;
 * - não limpa nenhuma aba;
 * - preserva registros existentes;
 * - completa cabeçalhos ausentes;
 * - cria cópias de segurança das abas operacionais antes da primeira preparação;
 * - migra a AGENDA_ENFERMEIRA para PAINEL_PROFISSIONAIS sem duplicar linhas;
 * - cria linhas editáveis de segunda a sexta para todos os profissionais;
 * - dias ainda não configurados ficam DESATIVADOS, nunca são publicados automaticamente.
 */

var BANCO_TACS_V1 = Object.freeze({
  FUSO: 'America/Recife',
  VERSAO: '1.0.0',
  MODULOS: [
    { id: 'MEDICA', nome: 'Médica', titulo: 'Atendimento com a Médica', icone: '🩺', ordem: 1 },
    { id: 'ENFERMEIRA', nome: 'Enfermeira Chefe', titulo: 'Atendimento com a Enfermeira Chefe', icone: '👩‍⚕️', ordem: 2 },
    { id: 'NUTRICIONISTA', nome: 'Nutricionista', titulo: 'Atendimento com a Nutricionista', icone: '🥗', ordem: 3 },
    { id: 'DENTISTA', nome: 'Dentista', titulo: 'Atendimento odontológico', icone: '🦷', ordem: 4 }
  ],
  DIAS: [
    { ordem: 1, dia: 'Segunda-feira' },
    { ordem: 2, dia: 'Terça-feira' },
    { ordem: 3, dia: 'Quarta-feira' },
    { ordem: 4, dia: 'Quinta-feira' },
    { ordem: 5, dia: 'Sexta-feira' }
  ]
});

function prepararBancoTacsV1() {
  var ss = bancoTacsObterPlanilha_();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    bancoTacsCriarBackupsUmaVez_(ss);

    var moradores = ss.getSheetByName('MORADORES');
    if (!moradores) {
      throw new Error('A aba MORADORES não foi encontrada. A preparação foi interrompida sem alterar a base.');
    }

    bancoTacsGarantirAba_(ss, 'PROFISSIONAIS', [
      'ID', 'NOME', 'MODULO', 'TITULO_PUBLICO', 'ICONE', 'ORDEM', 'ATIVO', 'ATUALIZADO_EM'
    ]);

    bancoTacsGarantirAba_(ss, 'SERVICOS', [
      'ID', 'PROFISSIONAL_ID', 'NOME', 'DESCRICAO_AUTOMATICA', 'ORDEM', 'ATIVO',
      'PERMITE_VAGA_COMUM', 'PERMITE_EMERGENCIA', 'ATUALIZADO_EM'
    ]);

    bancoTacsGarantirAba_(ss, 'PAINEL_PROFISSIONAIS', [
      'MODULO', 'ORDEM', 'DIA', 'ATIVO', 'DATA', 'HORARIO', 'SITUACAO', 'MENSAGEM',
      'ENCERRA_12H', 'VAGAS_COMUNS', 'VAGAS_EMERGENCIAIS', 'DIA_EXTRA', 'ATUALIZADO_EM'
    ]);

    bancoTacsGarantirAba_(ss, 'RECADOS_PORTAL', [
      'ID', 'TITULO', 'MENSAGEM', 'PRIORIDADE', 'VALIDADE', 'ATIVO', 'ATUALIZADO_EM'
    ]);

    bancoTacsGarantirAba_(ss, 'CAMPANHAS_PORTAL', [
      'ID', 'TITULO', 'MENSAGEM', 'INICIO', 'DIAS', 'ATIVO', 'ATUALIZADO_EM'
    ]);

    bancoTacsGarantirAba_(ss, 'SOLICITACOES', [
      'PROTOCOLO', 'DATA_SOLICITACAO', 'ID_PORTAL', 'CPF_CNS', 'NOME', 'NASCIMENTO',
      'IDADE', 'LOCALIDADE', 'PROFISSIONAL_ID', 'SERVICO_ID', 'DATA_AGENDA',
      'TIPO_VAGA', 'DESCRICAO', 'STATUS', 'ATUALIZADO_EM'
    ]);

    bancoTacsGarantirAba_(ss, 'CONSENTIMENTOS', [
      'ID', 'ID_PORTAL', 'CPF_CNS', 'TIPO', 'CANAL', 'ATIVO', 'DATA_CONSENTIMENTO',
      'DATA_REVOGACAO', 'DISPOSITIVO', 'ATUALIZADO_EM'
    ]);

    bancoTacsGarantirAba_(ss, 'CONFIGURACOES', [
      'CHAVE', 'VALOR', 'TIPO', 'EDITAVEL', 'ATUALIZADO_EM'
    ]);

    bancoTacsGarantirAba_(ss, 'HISTORICO', [
      'ID', 'DATA_HORA', 'ACAO', 'TABELA', 'REGISTRO_ID', 'VALOR_ANTERIOR',
      'VALOR_NOVO', 'ORIGEM'
    ]);

    bancoTacsSemearProfissionais_(ss);
    bancoTacsSemearServicos_(ss);
    bancoTacsSemearConfiguracoes_(ss);
    bancoTacsMigrarAgendaEnfermeira_(ss);
    bancoTacsGarantirDiasEditaveis_(ss);
    bancoTacsRegistrarHistorico_(ss, 'PREPARAR_BANCO', 'SISTEMA', 'BANCO_TACS_V1', '', BANCO_TACS_V1.VERSAO, 'Apps Script');

    SpreadsheetApp.flush();

    var resultado = validarBancoTacsV1();
    resultado.mensagem = resultado.ok
      ? 'Base única preparada e validada. Nenhuma informação foi publicada no portal.'
      : 'A preparação terminou, mas a validação encontrou pendências.';
    return resultado;
  } finally {
    lock.releaseLock();
  }
}

function validarBancoTacsV1() {
  var ss = bancoTacsObterPlanilha_();
  var obrigatorias = [
    'MORADORES', 'PROFISSIONAIS', 'SERVICOS', 'PAINEL_PROFISSIONAIS',
    'RECADOS_PORTAL', 'CAMPANHAS_PORTAL', 'SOLICITACOES', 'CONSENTIMENTOS',
    'CONFIGURACOES', 'HISTORICO'
  ];
  var ausentes = obrigatorias.filter(function (nome) {
    return !ss.getSheetByName(nome);
  });

  var painel = ss.getSheetByName('PAINEL_PROFISSIONAIS');
  var quantidadePainel = painel ? Math.max(0, painel.getLastRow() - 1) : 0;
  var profissionais = ss.getSheetByName('PROFISSIONAIS');
  var quantidadeProfissionais = profissionais ? Math.max(0, profissionais.getLastRow() - 1) : 0;
  var servicos = ss.getSheetByName('SERVICOS');
  var quantidadeServicos = servicos ? Math.max(0, servicos.getLastRow() - 1) : 0;

  var esperadoPainel = BANCO_TACS_V1.MODULOS.length * BANCO_TACS_V1.DIAS.length;
  var ok = ausentes.length === 0 &&
    quantidadeProfissionais >= BANCO_TACS_V1.MODULOS.length &&
    quantidadeServicos >= 4 &&
    quantidadePainel >= esperadoPainel;

  var resultado = {
    ok: ok,
    versao: BANCO_TACS_V1.VERSAO,
    planilha: ss.getName(),
    abasAusentes: ausentes,
    profissionais: quantidadeProfissionais,
    servicos: quantidadeServicos,
    linhasAgenda: quantidadePainel,
    minimoLinhasAgenda: esperadoPainel
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function bancoTacsObterPlanilha_() {
  if (typeof getPlanilha === 'function') {
    return getPlanilha();
  }
  var ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (!ativa) {
    throw new Error('Abra o Apps Script pela planilha "Portal TACS – Banco de Dados".');
  }
  return ativa;
}

function bancoTacsCriarBackupsUmaVez_(ss) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('BANCO_TACS_V1_BACKUP_REALIZADO') === 'SIM') return;

  var carimbo = Utilities.formatDate(new Date(), BANCO_TACS_V1.FUSO, 'yyyyMMdd_HHmmss');
  [
    'PAINEL_PROFISSIONAIS', 'RECADOS_PORTAL', 'CAMPANHAS_PORTAL',
    'AGENDA_ENFERMEIRA', 'SOLICITACOES', 'CONSENTIMENTOS', 'CONFIGURACOES', 'HISTORICO'
  ].forEach(function (nome) {
    var aba = ss.getSheetByName(nome);
    if (!aba || aba.getLastRow() < 1) return;
    var copia = aba.copyTo(ss);
    copia.setName(bancoTacsNomeUnico_(ss, 'BACKUP_' + nome.substring(0, 55) + '_' + carimbo));
  });

  props.setProperty('BANCO_TACS_V1_BACKUP_REALIZADO', 'SIM');
  props.setProperty('BANCO_TACS_V1_BACKUP_EM', new Date().toISOString());
}

function bancoTacsNomeUnico_(ss, base) {
  var nome = base.substring(0, 95);
  var contador = 2;
  while (ss.getSheetByName(nome)) {
    nome = (base.substring(0, 90) + '_' + contador).substring(0, 95);
    contador += 1;
  }
  return nome;
}

function bancoTacsGarantirAba_(ss, nome, cabecalhos) {
  var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
  if (aba.getMaxColumns() < cabecalhos.length) {
    aba.insertColumnsAfter(aba.getMaxColumns(), cabecalhos.length - aba.getMaxColumns());
  }

  var atuais = aba.getRange(1, 1, 1, cabecalhos.length).getDisplayValues()[0];
  var novos = cabecalhos.map(function (cabecalho, indice) {
    return String(atuais[indice] || '').trim() || cabecalho;
  });
  aba.getRange(1, 1, 1, cabecalhos.length).setValues([novos]);
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, cabecalhos.length).setFontWeight('bold');
  return aba;
}

function bancoTacsSemearProfissionais_(ss) {
  var aba = ss.getSheetByName('PROFISSIONAIS');
  var existentes = bancoTacsMapaPorColuna_(aba, 1);
  var agora = new Date();
  var novas = [];

  BANCO_TACS_V1.MODULOS.forEach(function (modulo) {
    if (existentes[modulo.id]) return;
    novas.push([
      modulo.id, modulo.nome, modulo.id, modulo.titulo, modulo.icone,
      modulo.ordem, true, agora
    ]);
  });

  bancoTacsAnexar_(aba, novas);
}

function bancoTacsSemearServicos_(ss) {
  var aba = ss.getSheetByName('SERVICOS');
  var existentes = bancoTacsMapaPorColuna_(aba, 1);
  var agora = new Date();
  var servicos = [
    ['MEDICA_CONSULTA', 'MEDICA', 'Consulta médica', 'Solicitação de atendimento com a Médica.', 1, true, false, false, agora],
    ['ENFERMEIRA_ATENDIMENTO', 'ENFERMEIRA', 'Atendimento com a Enfermeira Chefe', 'Solicitação de atendimento com a Enfermeira Chefe.', 1, true, false, false, agora],
    ['NUTRICIONISTA_CONSULTA', 'NUTRICIONISTA', 'Consulta com nutricionista', 'Solicitação de atendimento com a Nutricionista.', 1, true, false, false, agora],
    ['DENTISTA_COMUM', 'DENTISTA', 'Atendimento odontológico', 'Solicitação de vaga para atendimento odontológico com a dentista.', 1, true, true, false, agora],
    ['DENTISTA_EMERGENCIA', 'DENTISTA', 'Atendimento odontológico de emergência', 'Solicitação de vaga odontológica de emergência para a dentista.', 2, true, false, true, agora]
  ];

  var novas = servicos.filter(function (linha) {
    return !existentes[linha[0]];
  });
  bancoTacsAnexar_(aba, novas);
}

function bancoTacsSemearConfiguracoes_(ss) {
  var aba = ss.getSheetByName('CONFIGURACOES');
  var existentes = bancoTacsMapaPorColuna_(aba, 1);
  var agora = new Date();
  var valores = [
    ['PORTAL_VERSAO_BANCO', BANCO_TACS_V1.VERSAO, 'TEXTO', false, agora],
    ['UNIDADE_NOME', 'Unidade de Saúde Posto Matias', 'TEXTO', true, agora],
    ['LOCALIDADE', 'Sítio Japaranduba • Chã Grande/PE', 'TEXTO', true, agora],
    ['TACS_RESPONSAVEL', 'Mércio José Campos dos Santos', 'TEXTO', true, agora],
    ['WHATSAPP_TACS', '5581989613130', 'TELEFONE', true, agora],
    ['RODAPE_DIREITOS', '© 2026 Mércio José Campos dos Santos — Portal TACS. Todos os direitos reservados.', 'TEXTO', true, agora],
    ['PORTAL_PUBLICADO', 'NAO', 'BOOLEANO', true, agora]
  ];

  bancoTacsAnexar_(aba, valores.filter(function (linha) {
    return !existentes[linha[0]];
  }));
}

function bancoTacsMigrarAgendaEnfermeira_(ss) {
  var origem = ss.getSheetByName('AGENDA_ENFERMEIRA');
  if (!origem || origem.getLastRow() < 2) return;

  var destino = ss.getSheetByName('PAINEL_PROFISSIONAIS');
  var existentes = bancoTacsMapaModuloDia_(destino);
  var linhas = origem.getRange(2, 1, origem.getLastRow() - 1, Math.max(3, origem.getLastColumn())).getDisplayValues();
  var agora = new Date();
  var novas = [];

  linhas.forEach(function (linha) {
    var ordem = Number(linha[0] || 0);
    var dia = String(linha[1] || '').trim();
    var atendimento = String(linha[2] || '').trim();
    if (!dia || existentes['ENFERMEIRA|' + dia]) return;

    var folga = bancoTacsNormalizar_(atendimento) === 'folga';
    novas.push([
      'ENFERMEIRA', ordem || bancoTacsOrdemDia_(dia), dia, !folga, '', '',
      folga ? 'FOLGA' : 'ATENDIMENTO', atendimento, false, 0, 0, false, agora
    ]);
    existentes['ENFERMEIRA|' + dia] = true;
  });

  bancoTacsAnexar_(destino, novas);
}

function bancoTacsGarantirDiasEditaveis_(ss) {
  var aba = ss.getSheetByName('PAINEL_PROFISSIONAIS');
  var existentes = bancoTacsMapaModuloDia_(aba);
  var agora = new Date();
  var novas = [];

  BANCO_TACS_V1.MODULOS.forEach(function (modulo) {
    BANCO_TACS_V1.DIAS.forEach(function (dia) {
      var chave = modulo.id + '|' + dia.dia;
      if (existentes[chave]) return;
      novas.push([
        modulo.id, dia.ordem, dia.dia, false, '', '', 'NAO_CONFIGURADO', '',
        false, 0, 0, false, agora
      ]);
      existentes[chave] = true;
    });
  });

  bancoTacsAnexar_(aba, novas);
  if (aba.getLastRow() > 2) {
    aba.getRange(2, 1, aba.getLastRow() - 1, 13).sort([
      { column: 1, ascending: true },
      { column: 2, ascending: true }
    ]);
  }
}

function bancoTacsMapaPorColuna_(aba, coluna) {
  var mapa = {};
  if (!aba || aba.getLastRow() < 2) return mapa;
  aba.getRange(2, coluna, aba.getLastRow() - 1, 1).getDisplayValues().forEach(function (linha) {
    var chave = String(linha[0] || '').trim();
    if (chave) mapa[chave] = true;
  });
  return mapa;
}

function bancoTacsMapaModuloDia_(aba) {
  var mapa = {};
  if (!aba || aba.getLastRow() < 2) return mapa;
  aba.getRange(2, 1, aba.getLastRow() - 1, 3).getDisplayValues().forEach(function (linha) {
    var modulo = String(linha[0] || '').trim().toUpperCase();
    var dia = String(linha[2] || '').trim();
    if (modulo && dia) mapa[modulo + '|' + dia] = true;
  });
  return mapa;
}

function bancoTacsAnexar_(aba, linhas) {
  if (!linhas || !linhas.length) return;
  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
}

function bancoTacsOrdemDia_(dia) {
  for (var i = 0; i < BANCO_TACS_V1.DIAS.length; i += 1) {
    if (BANCO_TACS_V1.DIAS[i].dia === dia) return BANCO_TACS_V1.DIAS[i].ordem;
  }
  return 99;
}

function bancoTacsNormalizar_(valor) {
  return String(valor || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function bancoTacsRegistrarHistorico_(ss, acao, tabela, registroId, anterior, novo, origem) {
  var aba = ss.getSheetByName('HISTORICO');
  if (!aba) return;
  var id = Utilities.getUuid();
  aba.appendRow([id, new Date(), acao, tabela, registroId, anterior, novo, origem]);
}
