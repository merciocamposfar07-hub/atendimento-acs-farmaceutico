/**
 * ZZZ_13_ProfissionaisDinamicosPortalV1.gs
 *
 * Extensão isolada para profissionais dinâmicos do Portal TACS.
 *
 * Não substitui nem apaga os módulos atuais. Médica, Enfermeira,
 * Nutricionista e Dentista continuam usando as rotas existentes.
 * Este arquivo acrescenta:
 *
 * - POST admin_criar_profissional;
 * - salvamento de profissionais, serviços e agendas não legados;
 * - leitura pública dinâmica dos profissionais ativos;
 * - adoção idempotente de cadastros já inseridos manualmente.
 */

var PROFISSIONAIS_DINAMICOS_PORTAL_V1 = Object.freeze({
  VERSAO: '1.0.0',
  ABA_PROFISSIONAIS: 'PROFISSIONAIS',
  ABA_SERVICOS: 'SERVICOS',
  ABA_AGENDAS: 'PAINEL_PROFISSIONAIS',
  CACHE_PREFIXO: 'profissionais_dinamicos_v1_',
  CACHE_SEGUNDOS: 300,
  FUSO: 'America/Recife',
  DIAS: [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira'
  ]
});

var profissionaisDinamicosV1GetAnterior_;
var profissionaisDinamicosV1PostAnterior_;
var profissionaisDinamicosV1DoGetAnterior_;
var profissionaisDinamicosV1DoPostAnterior_;
var profissionaisDinamicosV1PainelPublicoAnterior_;
var profissionaisDinamicosV1TacsPublicoAnterior_;

(function instalarProfissionaisDinamicosPortalV1_() {
  if (typeof doGet === 'function') {
    profissionaisDinamicosV1DoGetAnterior_ = doGet;

    doGet = function (e) {
      var resposta = profissionaisDinamicosV1TratarGet_(e);
      return resposta || profissionaisDinamicosV1DoGetAnterior_(e);
    };
  }

  if (typeof doPost === 'function') {
    profissionaisDinamicosV1DoPostAnterior_ = doPost;

    doPost = function (e) {
      var resposta = profissionaisDinamicosV1TratarPost_(e);
      return resposta || profissionaisDinamicosV1DoPostAnterior_(e);
    };
  }

  if (typeof tratarGetPainelTacs_ === 'function') {
    profissionaisDinamicosV1GetAnterior_ = tratarGetPainelTacs_;

    tratarGetPainelTacs_ = function (e) {
      var resposta = profissionaisDinamicosV1TratarGet_(e);
      return resposta || profissionaisDinamicosV1GetAnterior_(e);
    };
  }

  if (typeof tratarPostPainelTacs_ === 'function') {
    profissionaisDinamicosV1PostAnterior_ = tratarPostPainelTacs_;

    tratarPostPainelTacs_ = function (e) {
      var resposta = profissionaisDinamicosV1TratarPost_(e);
      return resposta || profissionaisDinamicosV1PostAnterior_(e);
    };
  }

  if (typeof integralLerModulos_ === 'function') {
    integralLerModulos_ = profissionaisDinamicosV1LerModulosPublicos_;
  }

  if (typeof tacsReadModules_ === 'function') {
    tacsReadModules_ = profissionaisDinamicosV1LerModulosPublicos_;
  }

  if (typeof publicoAgendasV1LerModulos_ === 'function') {
    publicoAgendasV1LerModulos_ = profissionaisDinamicosV1LerModulosPublicos_;
  }

  if (typeof integralObterPainelPublico_ === 'function') {
    profissionaisDinamicosV1PainelPublicoAnterior_ = integralObterPainelPublico_;

    integralObterPainelPublico_ = function () {
      return profissionaisDinamicosV1EnriquecerPublico_(
        profissionaisDinamicosV1PainelPublicoAnterior_()
      );
    };
  }

  if (typeof tacsGetPublic_ === 'function') {
    profissionaisDinamicosV1TacsPublicoAnterior_ = tacsGetPublic_;

    tacsGetPublic_ = function () {
      return profissionaisDinamicosV1EnriquecerPublico_(
        profissionaisDinamicosV1TacsPublicoAnterior_()
      );
    };
  }
})();

function profissionaisDinamicosV1TratarGet_(e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var acao = String(parametros.action || '').trim();

  if (acao !== 'admin_result') return null;

  var requestId = String(parametros.requestId || '').trim();
  var resultado = profissionaisDinamicosV1LerResultado_(requestId);

  if (!resultado) return null;

  return profissionaisDinamicosV1ResponderJson_(
    {
      ok: true,
      pendente: false,
      requestId: requestId,
      result: resultado
    },
    parametros.callback
  );
}

function profissionaisDinamicosV1TratarPost_(e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var acao = String(parametros.action || '').trim();
  var dinamica = acao === 'admin_criar_profissional';

  if (acao === 'admin_salvar_profissional') {
    dinamica = !profissionaisDinamicosV1Legado_(parametros.id);
  } else if (acao === 'admin_salvar_servico') {
    dinamica = !profissionaisDinamicosV1Legado_(parametros.profissionalId);
  } else if (acao === 'admin_salvar_agenda') {
    dinamica = !profissionaisDinamicosV1Legado_(parametros.modulo);
  }

  if (!dinamica) return null;

  var requestId = profissionaisDinamicosV1Texto_(parametros.requestId);
  var resultado;

  try {
    requestId = profissionaisDinamicosV1ValidarRequestId_(requestId);
    profissionaisDinamicosV1ValidarSessao_(parametros);

    if (acao === 'admin_criar_profissional') {
      resultado = profissionaisDinamicosV1Criar_(parametros);
    } else if (acao === 'admin_salvar_profissional') {
      resultado = profissionaisDinamicosV1SalvarProfissional_(parametros);
    } else if (acao === 'admin_salvar_servico') {
      resultado = profissionaisDinamicosV1SalvarServico_(parametros);
    } else {
      resultado = profissionaisDinamicosV1SalvarAgenda_(parametros);
    }
  } catch (erro) {
    resultado = {
      ok: false,
      message: erro && erro.message ? erro.message : String(erro)
    };
  }

  if (/^[A-Za-z0-9_-]{8,160}$/.test(requestId)) {
    profissionaisDinamicosV1GuardarResultado_(requestId, resultado);
  }
  return profissionaisDinamicosV1ResponderPost_(requestId, resultado);
}

function profissionaisDinamicosV1Criar_(parametros) {
  var nome = profissionaisDinamicosV1Texto_(parametros.nome);
  var titulo = profissionaisDinamicosV1Texto_(parametros.tituloPublico);
  var servicoNome = profissionaisDinamicosV1Texto_(parametros.servicoNome);
  var descricao = profissionaisDinamicosV1Texto_(parametros.descricaoAutomatica);
  var idSugerido = profissionaisDinamicosV1Id_(
    parametros.id || nome || titulo
  );

  if (!nome || !titulo || !servicoNome || !descricao) {
    throw new Error(
      'Nome, título público, serviço e descrição automática são obrigatórios.'
    );
  }

  if (idSugerido.length < 3) {
    throw new Error('Não foi possível gerar um ID válido para o profissional.');
  }

  if (profissionaisDinamicosV1Legado_(idSugerido)) {
    throw new Error(
      'Esse identificador pertence a um profissional já integrado ao portal.'
    );
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error(
      'Outra gravação está em andamento. Tente novamente em alguns segundos.'
    );
  }

  try {
    var planilha = profissionaisDinamicosV1Planilha_();
    var tabelaProf = profissionaisDinamicosV1Tabela_(
      planilha,
      PROFISSIONAIS_DINAMICOS_PORTAL_V1.ABA_PROFISSIONAIS,
      ['ID', 'NOME', 'TITULO_PUBLICO', 'ICONE', 'ORDEM', 'ATIVO']
    );
    var tabelaServ = profissionaisDinamicosV1Tabela_(
      planilha,
      PROFISSIONAIS_DINAMICOS_PORTAL_V1.ABA_SERVICOS,
      [
        'ID',
        'PROFISSIONAL_ID',
        'NOME',
        'DESCRICAO_AUTOMATICA',
        'ORDEM',
        'ATIVO',
        'PERMITE_VAGA_COMUM',
        'PERMITE_EMERGENCIA'
      ]
    );
    var tabelaAgenda = profissionaisDinamicosV1Tabela_(
      planilha,
      PROFISSIONAIS_DINAMICOS_PORTAL_V1.ABA_AGENDAS,
      [
        'MODULO',
        'ORDEM',
        'DIA',
        'ATIVO',
        'DATA',
        'HORARIO',
        'SITUACAO',
        'MENSAGEM',
        'ENCERRA_12H',
        'VAGAS_COMUNS',
        'VAGAS_EMERGENCIAIS',
        'DIA_EXTRA'
      ]
    );

    var profissional = profissionaisDinamicosV1Encontrar_(
      tabelaProf,
      'ID',
      idSugerido
    );
    var jaExistia = !!profissional;
    var ordem = profissionaisDinamicosV1InteiroPositivo_(
      parametros.ordem,
      profissionaisDinamicosV1ProximaOrdem_(tabelaProf)
    );
    var ativo = profissionaisDinamicosV1Booleano_(parametros.ativo);
    var agora = new Date();
    var idReal = profissionaisDinamicosV1Texto_(
      profissional && profissional.valores[
        profissionaisDinamicosV1Indice_(tabelaProf, 'ID')
      ]
    ) || idSugerido;
    var servicos = profissionaisDinamicosV1EncontrarTodos_(
      tabelaServ,
      'PROFISSIONAL_ID',
      idReal
    );
    var servicoId = 'ATENDIMENTO_' + profissionaisDinamicosV1Id_(idReal);
    var servicoMesmoId = profissionaisDinamicosV1Encontrar_(
      tabelaServ,
      'ID',
      servicoId
    );
    var servicoCriado = false;

    if (!servicos.length && servicoMesmoId) {
      throw new Error(
        'Já existe outro serviço usando o identificador ' + servicoId +
        '. Nenhuma linha foi duplicada.'
      );
    }

    if (!profissional) {
      profissionaisDinamicosV1Adicionar_(tabelaProf, {
        ID: idSugerido,
        NOME: nome,
        TITULO_PUBLICO: titulo,
        ICONE: profissionaisDinamicosV1Texto_(parametros.icone) || '👤',
        ORDEM: ordem,
        ATIVO: ativo,
        ATUALIZADO_EM: agora
      });
      profissional = profissionaisDinamicosV1Encontrar_(
        profissionaisDinamicosV1AtualizarTabela_(tabelaProf),
        'ID',
        idSugerido
      );
    }

    if (!servicos.length) {
      profissionaisDinamicosV1Adicionar_(tabelaServ, {
        ID: servicoId,
        PROFISSIONAL_ID: idReal,
        NOME: servicoNome,
        DESCRICAO_AUTOMATICA: descricao,
        ORDEM: 1,
        ATIVO: ativo,
        PERMITE_VAGA_COMUM: profissionaisDinamicosV1Booleano_(
          parametros.permiteVagaComum
        ),
        PERMITE_EMERGENCIA: profissionaisDinamicosV1Booleano_(
          parametros.permiteEmergencia
        ),
        ATUALIZADO_EM: agora
      });
      servicoCriado = true;
    }

    var agendasCriadas = profissionaisDinamicosV1GarantirAgenda_(
      tabelaAgenda,
      idReal,
      descricao || servicoNome,
      agora
    );

    SpreadsheetApp.flush();

    return {
      ok: true,
      message: jaExistia
        ? 'Cadastro existente reconhecido. Serviços e agenda foram conferidos.'
        : 'Profissional criado com serviço e cinco dias de agenda.',
      id: idReal,
      jaExistia: jaExistia,
      servicoCriado: servicoCriado,
      agendasCriadas: agendasCriadas,
      ativo: profissional
        ? profissionaisDinamicosV1Booleano_(
            profissional.valores[
              profissionaisDinamicosV1Indice_(tabelaProf, 'ATIVO')
            ]
          )
        : ativo
    };
  } finally {
    lock.releaseLock();
  }
}

function profissionaisDinamicosV1SalvarProfissional_(parametros) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error('Outra gravação está em andamento. Tente novamente.');
  }

  try {
    var tabela = profissionaisDinamicosV1Tabela_(
      profissionaisDinamicosV1Planilha_(),
      PROFISSIONAIS_DINAMICOS_PORTAL_V1.ABA_PROFISSIONAIS,
      ['ID', 'NOME', 'TITULO_PUBLICO', 'ICONE', 'ORDEM', 'ATIVO']
    );
    var registro = profissionaisDinamicosV1Encontrar_(
      tabela,
      'ID',
      parametros.id
    );

    if (!registro) {
      throw new Error('Profissional não encontrado na planilha.');
    }

    var nome = profissionaisDinamicosV1Texto_(parametros.nome);
    var titulo = profissionaisDinamicosV1Texto_(parametros.tituloPublico);
    if (!nome || !titulo) {
      throw new Error('Nome e título público são obrigatórios.');
    }

    profissionaisDinamicosV1AtualizarRegistro_(tabela, registro, {
      NOME: nome,
      TITULO_PUBLICO: titulo,
      ICONE: profissionaisDinamicosV1Texto_(parametros.icone) || '👤',
      ORDEM: profissionaisDinamicosV1InteiroPositivo_(parametros.ordem, 1),
      ATIVO: profissionaisDinamicosV1Booleano_(parametros.ativo),
      ATUALIZADO_EM: new Date()
    });
    SpreadsheetApp.flush();

    return {
      ok: true,
      id: profissionaisDinamicosV1Texto_(parametros.id),
      message: 'Profissional salvo.'
    };
  } finally {
    lock.releaseLock();
  }
}

function profissionaisDinamicosV1SalvarServico_(parametros) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error('Outra gravação está em andamento. Tente novamente.');
  }

  try {
    var planilha = profissionaisDinamicosV1Planilha_();
    var tabela = profissionaisDinamicosV1Tabela_(
      planilha,
      PROFISSIONAIS_DINAMICOS_PORTAL_V1.ABA_SERVICOS,
      [
        'ID',
        'PROFISSIONAL_ID',
        'NOME',
        'DESCRICAO_AUTOMATICA',
        'ORDEM',
        'ATIVO',
        'PERMITE_VAGA_COMUM',
        'PERMITE_EMERGENCIA'
      ]
    );
    var registro = profissionaisDinamicosV1Encontrar_(
      tabela,
      'ID',
      parametros.id
    );

    if (!registro) throw new Error('Serviço não encontrado na planilha.');

    var nome = profissionaisDinamicosV1Texto_(parametros.nome);
    var descricao = profissionaisDinamicosV1Texto_(
      parametros.descricaoAutomatica
    );
    var profissionalId = profissionaisDinamicosV1Texto_(
      parametros.profissionalId
    );
    if (!nome || !descricao) {
      throw new Error('Nome e descrição automática são obrigatórios.');
    }

    var tabelaProfissionais = profissionaisDinamicosV1Tabela_(
      planilha,
      PROFISSIONAIS_DINAMICOS_PORTAL_V1.ABA_PROFISSIONAIS,
      ['ID']
    );
    var profissional = profissionaisDinamicosV1Encontrar_(
      tabelaProfissionais,
      'ID',
      profissionalId
    );
    if (!profissional) {
      throw new Error('O profissional associado ao serviço não foi encontrado.');
    }
    profissionalId = profissionaisDinamicosV1Texto_(
      profissional.valores[
        profissionaisDinamicosV1Indice_(tabelaProfissionais, 'ID')
      ]
    );

    profissionaisDinamicosV1AtualizarRegistro_(tabela, registro, {
      PROFISSIONAL_ID: profissionalId,
      NOME: nome,
      DESCRICAO_AUTOMATICA: descricao,
      ORDEM: profissionaisDinamicosV1InteiroPositivo_(parametros.ordem, 1),
      ATIVO: profissionaisDinamicosV1Booleano_(parametros.ativo),
      PERMITE_VAGA_COMUM: profissionaisDinamicosV1Booleano_(
        parametros.permiteVagaComum
      ),
      PERMITE_EMERGENCIA: profissionaisDinamicosV1Booleano_(
        parametros.permiteEmergencia
      ),
      ATUALIZADO_EM: new Date()
    });
    SpreadsheetApp.flush();

    return {
      ok: true,
      id: profissionaisDinamicosV1Texto_(parametros.id),
      message: 'Serviço salvo.'
    };
  } finally {
    lock.releaseLock();
  }
}

function profissionaisDinamicosV1SalvarAgenda_(parametros) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error('Outra gravação está em andamento. Tente novamente.');
  }

  try {
    var tabela = profissionaisDinamicosV1Tabela_(
      profissionaisDinamicosV1Planilha_(),
      PROFISSIONAIS_DINAMICOS_PORTAL_V1.ABA_AGENDAS,
      [
        'MODULO',
        'ORDEM',
        'DIA',
        'ATIVO',
        'DATA',
        'HORARIO',
        'SITUACAO',
        'MENSAGEM',
        'ENCERRA_12H',
        'VAGAS_COMUNS',
        'VAGAS_EMERGENCIAIS',
        'DIA_EXTRA'
      ]
    );
    var modulo = profissionaisDinamicosV1Texto_(parametros.modulo);
    var dia = profissionaisDinamicosV1Texto_(parametros.dia);
    var registro = profissionaisDinamicosV1EncontrarAgenda_(
      tabela,
      modulo,
      dia
    );

    if (!registro) {
      throw new Error('Agenda não encontrada na planilha.');
    }

    profissionaisDinamicosV1AtualizarRegistro_(tabela, registro, {
      DATA: profissionaisDinamicosV1Texto_(parametros.data),
      HORARIO: profissionaisDinamicosV1Texto_(parametros.horario),
      SITUACAO: profissionaisDinamicosV1Texto_(parametros.situacao),
      MENSAGEM: profissionaisDinamicosV1Texto_(parametros.mensagem),
      ENCERRA_12H: profissionaisDinamicosV1Booleano_(parametros.encerra12h),
      VAGAS_COMUNS: profissionaisDinamicosV1NaoNegativo_(
        parametros.vagasComuns
      ),
      VAGAS_EMERGENCIAIS: profissionaisDinamicosV1NaoNegativo_(
        parametros.vagasEmergenciais
      ),
      DIA_EXTRA: profissionaisDinamicosV1Booleano_(parametros.diaExtra),
      ATIVO: profissionaisDinamicosV1Booleano_(parametros.ativo),
      ATUALIZADO_EM: new Date()
    });
    SpreadsheetApp.flush();

    return {
      ok: true,
      modulo: modulo,
      dia: dia,
      message: 'Agenda salva.'
    };
  } finally {
    lock.releaseLock();
  }
}

function profissionaisDinamicosV1GarantirAgenda_(
  tabela,
  modulo,
  mensagem,
  agora
) {
  var existentes = {};

  tabela.linhas.forEach(function (linha) {
    var registro = {linha: linha.linha, valores: linha.valores};
    var valorModulo = linha.valores[
      profissionaisDinamicosV1Indice_(tabela, 'MODULO')
    ];
    if (
      profissionaisDinamicosV1ChaveModulo_(valorModulo) !==
      profissionaisDinamicosV1ChaveModulo_(modulo)
    ) {
      return;
    }
    var valorDia = linha.valores[
      profissionaisDinamicosV1Indice_(tabela, 'DIA')
    ];
    existentes[profissionaisDinamicosV1Normalizar_(valorDia)] = registro;
  });

  var criadas = 0;
  PROFISSIONAIS_DINAMICOS_PORTAL_V1.DIAS.forEach(function (dia, indice) {
    if (existentes[profissionaisDinamicosV1Normalizar_(dia)]) return;

    profissionaisDinamicosV1Adicionar_(tabela, {
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

function profissionaisDinamicosV1LerModulosPublicos_() {
  var planilha = profissionaisDinamicosV1Planilha_();
  var aba = planilha.getSheetByName(
    PROFISSIONAIS_DINAMICOS_PORTAL_V1.ABA_AGENDAS
  );
  var saida = {
    medica: [],
    nutricionista: [],
    enfermeira: [],
    odontologia: []
  };

  if (!aba || aba.getLastRow() < 2 || aba.getLastColumn() < 1) {
    return saida;
  }

  var tabela = profissionaisDinamicosV1TabelaExistente_(aba);
  [
    'MODULO',
    'ORDEM',
    'DIA',
    'ATIVO',
    'DATA',
    'HORARIO',
    'SITUACAO',
    'MENSAGEM',
    'ENCERRA_12H',
    'VAGAS_COMUNS',
    'VAGAS_EMERGENCIAIS',
    'DIA_EXTRA'
  ].forEach(function (campo) {
    profissionaisDinamicosV1Indice_(tabela, campo, true);
  });

  tabela.linhas.sort(function (a, b) {
    var moduloA = profissionaisDinamicosV1ChaveModulo_(
      a.valores[profissionaisDinamicosV1Indice_(tabela, 'MODULO')]
    );
    var moduloB = profissionaisDinamicosV1ChaveModulo_(
      b.valores[profissionaisDinamicosV1Indice_(tabela, 'MODULO')]
    );
    return moduloA.localeCompare(moduloB) ||
      Number(a.valores[profissionaisDinamicosV1Indice_(tabela, 'ORDEM')]) -
      Number(b.valores[profissionaisDinamicosV1Indice_(tabela, 'ORDEM')]);
  });

  tabela.linhas.forEach(function (linha) {
    var valor = linha.valores;
    var modulo = profissionaisDinamicosV1ChaveModulo_(
      valor[profissionaisDinamicosV1Indice_(tabela, 'MODULO')]
    );
    if (!modulo) return;
    if (!saida[modulo]) saida[modulo] = [];

    var dataBruta = valor[
      profissionaisDinamicosV1Indice_(tabela, 'DATA')
    ];
    var data = profissionaisDinamicosV1DataIso_(dataBruta);
    var encerra = profissionaisDinamicosV1Booleano_(
      valor[profissionaisDinamicosV1Indice_(tabela, 'ENCERRA_12H')]
    );

    saida[modulo].push({
      day: profissionaisDinamicosV1Texto_(
        valor[profissionaisDinamicosV1Indice_(tabela, 'DIA')]
      ),
      active: profissionaisDinamicosV1Booleano_(
        valor[profissionaisDinamicosV1Indice_(tabela, 'ATIVO')]
      ),
      date: data,
      time: profissionaisDinamicosV1Texto_(
        valor[profissionaisDinamicosV1Indice_(tabela, 'HORARIO')]
      ),
      status: profissionaisDinamicosV1Texto_(
        valor[profissionaisDinamicosV1Indice_(tabela, 'SITUACAO')]
      ),
      message: profissionaisDinamicosV1Texto_(
        valor[profissionaisDinamicosV1Indice_(tabela, 'MENSAGEM')]
      ),
      service: profissionaisDinamicosV1Texto_(
        valor[profissionaisDinamicosV1Indice_(tabela, 'MENSAGEM')]
      ),
      closeAtNoon: encerra,
      common: profissionaisDinamicosV1NaoNegativo_(
        valor[profissionaisDinamicosV1Indice_(tabela, 'VAGAS_COMUNS')]
      ),
      emergency: profissionaisDinamicosV1NaoNegativo_(
        valor[
          profissionaisDinamicosV1Indice_(tabela, 'VAGAS_EMERGENCIAIS')
        ]
      ),
      extra: profissionaisDinamicosV1Booleano_(
        valor[profissionaisDinamicosV1Indice_(tabela, 'DIA_EXTRA')]
      ),
      closedNow: profissionaisDinamicosV1EncerradoAgora_(data, encerra)
    });
  });

  return saida;
}

function profissionaisDinamicosV1LerPublicos_() {
  var planilha = profissionaisDinamicosV1Planilha_();
  var abaProf = planilha.getSheetByName(
    PROFISSIONAIS_DINAMICOS_PORTAL_V1.ABA_PROFISSIONAIS
  );
  var abaServ = planilha.getSheetByName(
    PROFISSIONAIS_DINAMICOS_PORTAL_V1.ABA_SERVICOS
  );

  if (!abaProf || abaProf.getLastRow() < 2) return [];

  var tabelaProf = profissionaisDinamicosV1TabelaExistente_(abaProf);
  ['ID', 'TITULO_PUBLICO', 'ICONE', 'ORDEM', 'ATIVO'].forEach(function (campo) {
    profissionaisDinamicosV1Indice_(tabelaProf, campo, true);
  });
  var tabelaServ = abaServ && abaServ.getLastRow() >= 2
    ? profissionaisDinamicosV1TabelaExistente_(abaServ)
    : null;
  var servicos = {};

  if (tabelaServ) {
    [
      'PROFISSIONAL_ID',
      'NOME',
      'DESCRICAO_AUTOMATICA',
      'ORDEM',
      'ATIVO'
    ].forEach(function (campo) {
      profissionaisDinamicosV1Indice_(tabelaServ, campo, true);
    });

    tabelaServ.linhas.forEach(function (linha) {
      var valores = linha.valores;
      if (!profissionaisDinamicosV1Booleano_(
        valores[profissionaisDinamicosV1Indice_(tabelaServ, 'ATIVO')]
      )) return;
      var chave = profissionaisDinamicosV1ChaveModulo_(
        valores[
          profissionaisDinamicosV1Indice_(tabelaServ, 'PROFISSIONAL_ID')
        ]
      );
      if (!chave) return;
      var candidato = {
        name: profissionaisDinamicosV1Texto_(
          valores[profissionaisDinamicosV1Indice_(tabelaServ, 'NOME')]
        ),
        description: profissionaisDinamicosV1Texto_(
          valores[
            profissionaisDinamicosV1Indice_(
              tabelaServ,
              'DESCRICAO_AUTOMATICA'
            )
          ]
        ),
        order: profissionaisDinamicosV1InteiroPositivo_(
          valores[profissionaisDinamicosV1Indice_(tabelaServ, 'ORDEM')],
          999
        )
      };
      if (!servicos[chave] || candidato.order < servicos[chave].order) {
        servicos[chave] = candidato;
      }
    });
  }

  var unicos = {};

  tabelaProf.linhas.forEach(function (linha) {
    var valores = linha.valores;
    if (!profissionaisDinamicosV1Booleano_(
      valores[profissionaisDinamicosV1Indice_(tabelaProf, 'ATIVO')]
    )) return;

    var chave = profissionaisDinamicosV1ChaveModulo_(
      valores[profissionaisDinamicosV1Indice_(tabelaProf, 'ID')]
    );
    if (!chave) return;
    if (!profissionaisDinamicosV1Legado_(chave) && !servicos[chave]) {
      return;
    }

    var titulo = profissionaisDinamicosV1Texto_(
      valores[profissionaisDinamicosV1Indice_(tabelaProf, 'TITULO_PUBLICO')]
    );
    var item = {
      id: chave,
      title: titulo || profissionaisDinamicosV1TituloChave_(chave),
      icon: profissionaisDinamicosV1Texto_(
        valores[profissionaisDinamicosV1Indice_(tabelaProf, 'ICONE')]
      ) || '👤',
      order: profissionaisDinamicosV1InteiroPositivo_(
        valores[profissionaisDinamicosV1Indice_(tabelaProf, 'ORDEM')],
        999
      ),
      active: true,
      category: profissionaisDinamicosV1Categoria_(chave, titulo),
      service: servicos[chave] || null
    };

    if (!unicos[chave] || item.order < unicos[chave].order) {
      unicos[chave] = item;
    }
  });

  return Object.keys(unicos)
    .map(function (chave) { return unicos[chave]; })
    .sort(function (a, b) {
      return a.order - b.order || a.title.localeCompare(b.title);
    });
}

function profissionaisDinamicosV1EnriquecerPublico_(dados) {
  dados = dados && typeof dados === 'object' ? dados : {ok: true};
  var tinhaModulos = dados.modules && typeof dados.modules === 'object';
  var modulos = tinhaModulos ? dados.modules : {};
  var profissionais = profissionaisDinamicosV1LerPublicos_();
  var precisaCompletar = !tinhaModulos;

  profissionais.some(function (profissional) {
    if (
      !profissionaisDinamicosV1Legado_(profissional.id) &&
      !Object.prototype.hasOwnProperty.call(modulos, profissional.id)
    ) {
      precisaCompletar = true;
      return true;
    }
    return false;
  });

  if (precisaCompletar) {
    var lidos = profissionaisDinamicosV1LerModulosPublicos_();
    Object.keys(lidos).forEach(function (chave) {
      if (
        !Object.prototype.hasOwnProperty.call(modulos, chave) ||
        !profissionaisDinamicosV1Legado_(chave)
      ) {
        modulos[chave] = lidos[chave];
      }
    });
  }

  dados.modules = modulos;
  dados.professionals = profissionais;
  dados.profissionaisDinamicosVersao =
    PROFISSIONAIS_DINAMICOS_PORTAL_V1.VERSAO;
  return dados;
}

function profissionaisDinamicosV1ValidarSessao_(parametros) {
  var token = profissionaisDinamicosV1Texto_(parametros.token);
  var dispositivo = profissionaisDinamicosV1Texto_(parametros.dispositivo);
  var rotaPost = typeof profissionaisDinamicosV1DoPostAnterior_ === 'function'
    ? profissionaisDinamicosV1DoPostAnterior_
    : profissionaisDinamicosV1PostAnterior_;
  var rotaGet = typeof profissionaisDinamicosV1DoGetAnterior_ === 'function'
    ? profissionaisDinamicosV1DoGetAnterior_
    : profissionaisDinamicosV1GetAnterior_;

  if (!token || !dispositivo) {
    throw new Error('Sessão administrativa ausente. Entre novamente com o PIN.');
  }

  if (
    typeof rotaPost !== 'function' ||
    typeof rotaGet !== 'function'
  ) {
    throw new Error('As rotas administrativas anteriores não estão disponíveis.');
  }

  var requestId = 'pdv1_auth_' + Utilities.getUuid().replace(/-/g, '');
  rotaPost(
    profissionaisDinamicosV1Evento_({
      action: 'admin_dados',
      token: token,
      dispositivo: dispositivo,
      requestId: requestId
    })
  );

  var envelope = null;
  for (var tentativa = 0; tentativa < 20; tentativa += 1) {
    envelope = profissionaisDinamicosV1ConteudoResposta_(
      rotaGet(
        profissionaisDinamicosV1Evento_({
          action: 'admin_result',
          requestId: requestId,
          callback: ''
        })
      )
    );

    if (envelope && envelope.ok === true && envelope.pendente === false) {
      break;
    }
    Utilities.sleep(150);
  }

  if (!envelope || envelope.ok !== true || envelope.pendente !== false) {
    throw new Error('Não foi possível validar a sessão administrativa.');
  }

  var resultado = envelope.result || {};
  if (resultado.ok !== true) {
    throw new Error(
      resultado.message || 'Sessão administrativa inválida ou expirada.'
    );
  }

  return resultado;
}

function profissionaisDinamicosV1Tabela_(planilha, nome, obrigatorios) {
  var aba = planilha.getSheetByName(nome);
  if (!aba) throw new Error('A aba ' + nome + ' não foi encontrada.');
  var tabela = profissionaisDinamicosV1TabelaExistente_(aba);
  obrigatorios.forEach(function (campo) {
    profissionaisDinamicosV1Indice_(tabela, campo, true);
  });
  return tabela;
}

function profissionaisDinamicosV1TabelaExistente_(aba) {
  if (aba.getLastColumn() < 1) {
    throw new Error('A aba ' + aba.getName() + ' está sem cabeçalhos.');
  }
  var colunas = aba.getLastColumn();
  var cabecalhos = aba
    .getRange(1, 1, 1, colunas)
    .getDisplayValues()[0]
    .map(profissionaisDinamicosV1Normalizar_);
  var valores = aba.getLastRow() > 1
    ? aba.getRange(2, 1, aba.getLastRow() - 1, colunas).getValues()
    : [];
  return {
    aba: aba,
    colunas: colunas,
    cabecalhos: cabecalhos,
    linhas: valores.map(function (linha, indice) {
      return {linha: indice + 2, valores: linha};
    })
  };
}

function profissionaisDinamicosV1AtualizarTabela_(tabela) {
  var atualizada = profissionaisDinamicosV1TabelaExistente_(tabela.aba);
  tabela.colunas = atualizada.colunas;
  tabela.cabecalhos = atualizada.cabecalhos;
  tabela.linhas = atualizada.linhas;
  return tabela;
}

function profissionaisDinamicosV1Indice_(tabela, campo, obrigatorio) {
  var indice = tabela.cabecalhos.indexOf(
    profissionaisDinamicosV1Normalizar_(campo)
  );
  if (indice < 0 && obrigatorio) {
    throw new Error(
      'A coluna ' + campo + ' não foi encontrada na aba ' +
      tabela.aba.getName() + '.'
    );
  }
  return indice;
}

function profissionaisDinamicosV1Encontrar_(tabela, campo, procurado) {
  var indice = profissionaisDinamicosV1Indice_(tabela, campo, true);
  var chave = profissionaisDinamicosV1Id_(procurado);
  for (var i = 0; i < tabela.linhas.length; i += 1) {
    if (profissionaisDinamicosV1Id_(tabela.linhas[i].valores[indice]) === chave) {
      return tabela.linhas[i];
    }
  }
  return null;
}

function profissionaisDinamicosV1EncontrarTodos_(tabela, campo, procurado) {
  var indice = profissionaisDinamicosV1Indice_(tabela, campo, true);
  var chave = profissionaisDinamicosV1Id_(procurado);
  return tabela.linhas.filter(function (linha) {
    return profissionaisDinamicosV1Id_(linha.valores[indice]) === chave;
  });
}

function profissionaisDinamicosV1EncontrarAgenda_(tabela, modulo, dia) {
  var indiceModulo = profissionaisDinamicosV1Indice_(tabela, 'MODULO', true);
  var indiceDia = profissionaisDinamicosV1Indice_(tabela, 'DIA', true);
  var chaveModulo = profissionaisDinamicosV1ChaveModulo_(modulo);
  var chaveDia = profissionaisDinamicosV1Normalizar_(dia);

  for (var i = 0; i < tabela.linhas.length; i += 1) {
    var valores = tabela.linhas[i].valores;
    if (
      profissionaisDinamicosV1ChaveModulo_(valores[indiceModulo]) ===
        chaveModulo &&
      profissionaisDinamicosV1Normalizar_(valores[indiceDia]) === chaveDia
    ) {
      return tabela.linhas[i];
    }
  }
  return null;
}

function profissionaisDinamicosV1Adicionar_(tabela, campos) {
  var linha = new Array(tabela.colunas);
  for (var i = 0; i < tabela.colunas; i += 1) linha[i] = '';
  Object.keys(campos).forEach(function (campo) {
    var indice = profissionaisDinamicosV1Indice_(tabela, campo, false);
    if (indice >= 0) linha[indice] = campos[campo];
  });
  tabela.aba.appendRow(linha);
  tabela.linhas.push({linha: tabela.aba.getLastRow(), valores: linha});
}

function profissionaisDinamicosV1AtualizarRegistro_(tabela, registro, campos) {
  var linha = registro.valores.slice();
  Object.keys(campos).forEach(function (campo) {
    var indice = profissionaisDinamicosV1Indice_(tabela, campo, false);
    if (indice >= 0) linha[indice] = campos[campo];
  });
  tabela.aba.getRange(registro.linha, 1, 1, tabela.colunas).setValues([linha]);
  registro.valores = linha;
}

function profissionaisDinamicosV1ProximaOrdem_(tabela) {
  var indice = profissionaisDinamicosV1Indice_(tabela, 'ORDEM', true);
  var maior = 0;
  tabela.linhas.forEach(function (linha) {
    maior = Math.max(maior, Number(linha.valores[indice]) || 0);
  });
  return maior + 1;
}

function profissionaisDinamicosV1Planilha_() {
  if (typeof getPlanilha === 'function') return getPlanilha();
  if (typeof publicoAgendasV1Planilha_ === 'function') {
    return publicoAgendasV1Planilha_();
  }
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) {
    throw new Error('A planilha do Portal TACS não está disponível.');
  }
  return planilha;
}

function profissionaisDinamicosV1Categoria_(chave, titulo) {
  if (chave === 'medica') return 'Solicitar atendimento com a Médica';
  if (chave === 'enfermeira') {
    return 'Solicitar atendimento com a Enfermeira Chefe';
  }
  if (chave === 'nutricionista') {
    return 'Solicitar atendimento com nutricionista';
  }
  if (chave === 'odontologia') {
    return 'Solicitar atendimento odontológico (dentista)';
  }

  titulo = profissionaisDinamicosV1Texto_(titulo);
  if (/^atendimento\s+/i.test(titulo)) {
    return 'Solicitar ' + titulo.charAt(0).toLowerCase() + titulo.slice(1);
  }
  return 'Solicitar atendimento com ' +
    (titulo || profissionaisDinamicosV1TituloChave_(chave));
}

function profissionaisDinamicosV1TituloChave_(chave) {
  return String(chave || '')
    .split('_')
    .map(function (parte) {
      return parte ? parte.charAt(0).toUpperCase() + parte.slice(1) : '';
    })
    .join(' ');
}

function profissionaisDinamicosV1Legado_(valor) {
  return [
    'medica',
    'nutricionista',
    'enfermeira',
    'odontologia'
  ].indexOf(profissionaisDinamicosV1ChaveModulo_(valor)) !== -1;
}

function profissionaisDinamicosV1ChaveModulo_(valor) {
  var chave = profissionaisDinamicosV1Id_(valor).toLowerCase();
  if (!chave) return '';
  if (['medica', 'medico', 'medicina'].indexOf(chave) !== -1) {
    return 'medica';
  }
  if (['nutricionista', 'nutricao'].indexOf(chave) !== -1) {
    return 'nutricionista';
  }
  if (['enfermeira', 'enfermeiro', 'enfermagem'].indexOf(chave) !== -1) {
    return 'enfermeira';
  }
  if (['odontologia', 'dentista'].indexOf(chave) !== -1) {
    return 'odontologia';
  }
  return chave;
}

function profissionaisDinamicosV1Id_(valor) {
  return profissionaisDinamicosV1Normalizar_(valor)
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function profissionaisDinamicosV1Normalizar_(valor) {
  var texto = profissionaisDinamicosV1Texto_(valor).toUpperCase();
  return texto.normalize
    ? texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    : texto.replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function profissionaisDinamicosV1Booleano_(valor) {
  if (valor === true || valor === 1) return true;
  return [
    'TRUE',
    '1',
    'SIM',
    'YES',
    'ATIVO',
    'ATIVA',
    'VERDADEIRO'
  ].indexOf(profissionaisDinamicosV1Normalizar_(valor)) !== -1;
}

function profissionaisDinamicosV1NaoNegativo_(valor) {
  var numero = Number(valor);
  return isFinite(numero) && numero >= 0 ? Math.floor(numero) : 0;
}

function profissionaisDinamicosV1InteiroPositivo_(valor, padrao) {
  var numero = Number(valor);
  return isFinite(numero) && numero >= 1
    ? Math.floor(numero)
    : Math.max(1, Number(padrao) || 1);
}

function profissionaisDinamicosV1DataIso_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    if (isNaN(valor.getTime())) return '';
    return Utilities.formatDate(
      valor,
      PROFISSIONAIS_DINAMICOS_PORTAL_V1.FUSO,
      'yyyy-MM-dd'
    );
  }
  var texto = profissionaisDinamicosV1Texto_(valor);
  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  var br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? br[3] + '-' + br[2] + '-' + br[1] : '';
}

function profissionaisDinamicosV1EncerradoAgora_(data, encerra) {
  if (!encerra || !data) return false;
  var agora = new Date();
  var hoje = Utilities.formatDate(
    agora,
    PROFISSIONAIS_DINAMICOS_PORTAL_V1.FUSO,
    'yyyy-MM-dd'
  );
  if (data !== hoje) return false;
  return Number(
    Utilities.formatDate(
      agora,
      PROFISSIONAIS_DINAMICOS_PORTAL_V1.FUSO,
      'HH'
    )
  ) >= 12;
}

function profissionaisDinamicosV1ValidarRequestId_(valor) {
  var requestId = profissionaisDinamicosV1Texto_(valor);
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(requestId)) {
    throw new Error('Identificador da operação inválido.');
  }
  return requestId;
}

function profissionaisDinamicosV1GuardarResultado_(requestId, resultado) {
  try {
    CacheService.getScriptCache().put(
      PROFISSIONAIS_DINAMICOS_PORTAL_V1.CACHE_PREFIXO + requestId,
      JSON.stringify(resultado),
      PROFISSIONAIS_DINAMICOS_PORTAL_V1.CACHE_SEGUNDOS
    );
  } catch (erro) {
    // A resposta direta pelo iframe continua válida mesmo sem o cache auxiliar.
  }
}

function profissionaisDinamicosV1LerResultado_(requestId) {
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(String(requestId || ''))) return null;
  var texto = CacheService.getScriptCache().get(
    PROFISSIONAIS_DINAMICOS_PORTAL_V1.CACHE_PREFIXO + requestId
  );
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch (erro) {
    return null;
  }
}

function profissionaisDinamicosV1ResponderPost_(requestId, resultado) {
  var mensagem = {
    source: 'admin-painel-tacs-v1',
    requestId: requestId,
    result: resultado
  };
  var saida = HtmlService.createHtmlOutput(
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head>' +
    '<body><script>parent.postMessage(' +
    JSON.stringify(mensagem).replace(/</g, '\\u003c') +
    ',"*");<\/script></body></html>'
  );
  return saida.setXFrameOptionsMode
    ? saida.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    : saida;
}

function profissionaisDinamicosV1ResponderJson_(dados, callback) {
  var json = JSON.stringify(dados);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function profissionaisDinamicosV1Evento_(parametros) {
  var lista = {};
  Object.keys(parametros || {}).forEach(function (chave) {
    lista[chave] = [String(parametros[chave] == null ? '' : parametros[chave])];
  });
  return {
    parameter: parametros || {},
    parameters: lista,
    postData: {type: 'application/x-www-form-urlencoded', contents: ''}
  };
}

function profissionaisDinamicosV1ConteudoResposta_(resposta) {
  if (!resposta) return null;
  var conteudo = typeof resposta.getContent === 'function'
    ? resposta.getContent()
    : String(resposta || '');
  try {
    return JSON.parse(conteudo);
  } catch (erro) {
    return null;
  }
}

function profissionaisDinamicosV1Texto_(valor) {
  return String(valor == null ? '' : valor).trim();
}

/**
 * Diagnóstico manual e somente leitura antes da implantação.
 * Não cria, edita ou apaga qualquer linha da planilha.
 */
function testarProfissionaisDinamicosPortalV1() {
  var modulos = profissionaisDinamicosV1LerModulosPublicos_();
  var profissionais = profissionaisDinamicosV1LerPublicos_();
  var contagens = {};

  Object.keys(modulos).forEach(function (chave) {
    contagens[chave] = Array.isArray(modulos[chave])
      ? modulos[chave].length
      : 0;
  });

  var resultado = {
    ok: true,
    versao: PROFISSIONAIS_DINAMICOS_PORTAL_V1.VERSAO,
    somenteLeitura: true,
    profissionaisAtivos: profissionais.map(function (item) {
      return item.id;
    }),
    agendasPorProfissional: contagens
  };

  console.log(JSON.stringify(resultado));
  return resultado;
}
