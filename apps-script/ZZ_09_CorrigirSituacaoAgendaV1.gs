/**
 * ZZ_09_CorrigirSituacaoAgendaV1.gs
 *
 * Correção complementar e autônoma para uso no iPhone.
 * Não exige localizar nem editar linha dentro do arquivo 05.
 *
 * Corrige somente adminTacsV1SalvarAgenda_:
 * - situação vazia continua vazia;
 * - SEM_ATENDIMENTO vira SEM ATENDIMENTO;
 * - somente valores permitidos são aceitos.
 *
 * Não altera Portal.gs, não cria doGet/doPost e não toca no portal público.
 */

function adminTacsV1SituacaoAgendaCorrigidaV1_(valor) {
  var situacao = adminTacsV1Texto_(valor)
    .toUpperCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!situacao) return '';

  var permitidas = [
    'ATENDIMENTO',
    'SEM ATENDIMENTO',
    'FERIADO',
    'CANCELADO'
  ];

  if (permitidas.indexOf(situacao) === -1) {
    throw new Error('Situação da agenda inválida.');
  }

  return situacao;
}

/*
 * Substitui apenas a função defeituosa do arquivo 05.
 * O prefixo ZZ mantém este complemento por último no projeto.
 */
adminTacsV1SalvarAgenda_ = function (dados, sessao) {
  var ss = adminTacsV1Planilha_();
  var modulo = adminTacsV1Id_(dados.modulo);
  var dia = adminTacsV1Dia_(dados.dia);

  if (!modulo) throw new Error('Selecione o profissional.');
  if (!dia) throw new Error('Selecione um dia de segunda a sexta.');

  adminTacsV1ExigirRegistro_(
    ss,
    'PROFISSIONAIS',
    'ID',
    modulo,
    'Profissional não encontrado.'
  );

  var registro = {
    MODULO: modulo,
    ORDEM: adminTacsV1OrdemDia_(dia),
    DIA: dia,
    ATIVO: adminTacsV1Booleano_(dados.ativo),
    DATA: adminTacsV1DataPlanilha_(dados.data),
    HORARIO: adminTacsV1Texto_(dados.horario),
    SITUACAO: adminTacsV1SituacaoAgendaCorrigidaV1_(dados.situacao),
    MENSAGEM: adminTacsV1Texto_(dados.mensagem),
    ENCERRA_12H: adminTacsV1Booleano_(dados.encerra12h),
    VAGAS_COMUNS: adminTacsV1Inteiro_(
      dados.vagasComuns,
      0,
      999,
      'Quantidade de vagas comuns inválida.'
    ),
    VAGAS_EMERGENCIAIS: adminTacsV1Inteiro_(
      dados.vagasEmergenciais,
      0,
      999,
      'Quantidade de emergências inválida.'
    ),
    DIA_EXTRA: adminTacsV1Booleano_(dados.diaExtra),
    ATUALIZADO_EM: new Date()
  };

  var resultado = adminTacsV1SalvarAgendaPorModuloDia_(
    ss,
    modulo,
    dia,
    registro,
    sessao
  );

  SpreadsheetApp.flush();

  return {
    ok: true,
    modulo: modulo,
    dia: dia,
    criado: resultado.criado,
    situacaoGravada: registro.SITUACAO,
    correcaoSituacaoAgendaV1: true,
    message: 'Agenda atualizada.'
  };
};

function testarCorrecaoSituacaoAgendaV1() {
  var casos = [
    { entrada: '', esperado: '' },
    { entrada: null, esperado: '' },
    { entrada: 'SEM_ATENDIMENTO', esperado: 'SEM ATENDIMENTO' },
    { entrada: 'SEM ATENDIMENTO', esperado: 'SEM ATENDIMENTO' },
    { entrada: '  sem_atendimento  ', esperado: 'SEM ATENDIMENTO' },
    { entrada: 'ATENDIMENTO', esperado: 'ATENDIMENTO' },
    { entrada: 'FERIADO', esperado: 'FERIADO' },
    { entrada: 'CANCELADO', esperado: 'CANCELADO' }
  ];

  var resultados = casos.map(function (caso) {
    var recebido = adminTacsV1SituacaoAgendaCorrigidaV1_(caso.entrada);
    return {
      entrada: caso.entrada,
      esperado: caso.esperado,
      recebido: recebido,
      ok: recebido === caso.esperado
    };
  });

  var invalidaBloqueada = false;
  try {
    adminTacsV1SituacaoAgendaCorrigidaV1_('VALOR INVALIDO');
  } catch (erro) {
    invalidaBloqueada = Boolean(
      erro && erro.message === 'Situação da agenda inválida.'
    );
  }

  var substituicaoAtiva =
    typeof adminTacsV1SalvarAgenda_ === 'function' &&
    String(adminTacsV1SalvarAgenda_).indexOf(
      'adminTacsV1SituacaoAgendaCorrigidaV1_'
    ) !== -1;

  var ok = resultados.every(function (item) {
    return item.ok;
  }) && invalidaBloqueada && substituicaoAtiva;

  var resposta = {
    ok: ok,
    substituicaoAtiva: substituicaoAtiva,
    situacaoInvalidaBloqueada: invalidaBloqueada,
    casos: resultados,
    gravacaoRealExecutada: false
  };

  Logger.log(JSON.stringify(resposta, null, 2));

  if (!ok) {
    throw new Error('A correção autônoma da agenda falhou no teste interno.');
  }

  return resposta;
}
