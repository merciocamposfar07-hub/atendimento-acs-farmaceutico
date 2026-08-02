/**
 * 09_CorrigirSituacaoAgendaV1.gs
 *
 * Corrige o tratamento da situação da agenda administrativa:
 * - preserva valor vazio;
 * - aceita SEM_ATENDIMENTO e normaliza para SEM ATENDIMENTO;
 * - valida somente as situações permitidas.
 *
 * Depois de criar este arquivo no Apps Script, altere em
 * 05_AdminApiPortalTacsV1.gs a propriedade SITUACAO para:
 *
 * SITUACAO: adminTacsV1SituacaoAgenda_(dados.situacao),
 *
 * Execute testarCorrecaoSituacaoAgendaV1 antes de atualizar
 * a implantação separada de teste.
 */

function adminTacsV1SituacaoAgenda_(valor) {
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
    var recebido = adminTacsV1SituacaoAgenda_(caso.entrada);
    return {
      entrada: caso.entrada,
      esperado: caso.esperado,
      recebido: recebido,
      ok: recebido === caso.esperado
    };
  });

  var invalidaBloqueada = false;
  try {
    adminTacsV1SituacaoAgenda_('QUALQUER OUTRA COISA');
  } catch (erro) {
    invalidaBloqueada = erro && erro.message === 'Situação da agenda inválida.';
  }

  var ok = resultados.every(function (item) {
    return item.ok;
  }) && invalidaBloqueada;

  var resposta = {
    ok: ok,
    casos: resultados,
    situacaoInvalidaBloqueada: invalidaBloqueada
  };

  Logger.log(JSON.stringify(resposta, null, 2));

  if (!ok) {
    throw new Error('A correção da situação da agenda falhou nos testes internos.');
  }

  return resposta;
}
