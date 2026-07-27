(function (global) {
  'use strict';

  /**
   * MATRIZ MODULAR — PORTAL TACS
   *
   * Esta configuração separa as regras dos serviços do núcleo do portal.
   * Novos módulos podem ser incluídos futuramente sem reescrever os módulos já ativos.
   *
   * Tipos disponíveis:
   * - solicitacao: cria uma demanda do comunitário para o TACS.
   * - informativo: aparece no mural, card ou banner, sem solicitação de vaga.
   */

  var MODULES = [
    {
      id: 'odontologia-comum',
      nome: 'Agendamento Odontológico',
      icone: '🦷',
      tipo: 'solicitacao',
      ativo: true,
      ordem: 10,
      valorLegado: 'Solicitar atendimento odontológico (dentista)',
      agenda: {
        habilitada: true,
        origem: 'AGENDA',
        reservaAutomatica: true,
        modalidade: 'comum'
      },
      campos: [],
      card: { cor: 'azul-petroleo', titulo: 'Nova Solicitação Odontológica' }
    },
    {
      id: 'odontologia-emergencia',
      nome: 'Odontologia — Emergência',
      icone: '🚨',
      tipo: 'solicitacao',
      ativo: true,
      ordem: 20,
      valorLegado: 'Solicitar atendimento odontológico de emergência (dentista)',
      agenda: {
        habilitada: true,
        origem: 'AGENDA',
        reservaAutomatica: true,
        modalidade: 'emergencial'
      },
      campos: [],
      card: { cor: 'azul-petroleo', titulo: 'Nova Solicitação Odontológica' }
    },
    {
      id: 'vacinacao',
      nome: 'Vacinação',
      icone: '💉',
      tipo: 'solicitacao',
      ativo: true,
      ordem: 30,
      valorLegado: 'Vacinação ou campanha de saúde',
      agenda: { habilitada: false },
      campos: [
        {
          id: 'vacinaDesejada',
          tipo: 'texto',
          rotulo: 'Qual vacina você deseja?',
          obrigatorio: true,
          placeholder: 'Ex.: vacina da criança, gripe, febre amarela'
        }
      ],
      respostaPosterior: {
        permitida: true,
        formato: 'card',
        campos: ['paciente', 'vacina', 'data', 'hora', 'local'],
        orientacao: 'Levar o cartão de vacinação.'
      },
      card: { cor: 'azul-petroleo', titulo: 'Nova Solicitação de Vacinação' }
    },
    {
      id: 'enfermeira-chefe',
      nome: 'Atendimento com a Enfermeira Chefe',
      icone: '👩‍⚕️',
      tipo: 'solicitacao',
      ativo: true,
      ordem: 40,
      valorLegado: 'Atendimento com a Enfermeira Chefe',
      agenda: {
        habilitada: true,
        origem: 'AGENDA_ENFERMEIRA',
        reservaAutomatica: false,
        escolherHorario: false
      },
      campos: [],
      card: { cor: 'azul-petroleo', titulo: 'Nova Solicitação à Enfermeira' }
    },
    {
      id: 'declaracoes',
      nome: 'Declarações',
      icone: '📄',
      tipo: 'solicitacao',
      ativo: true,
      ordem: 50,
      valorLegado: 'Declarações para aposentadoria / benefícios / auxílio-maternidade',
      agenda: { habilitada: false },
      campos: [
        {
          id: 'tipoDeclaracao',
          tipo: 'opcoes',
          rotulo: 'Qual tipo de declaração você deseja?',
          obrigatorio: true,
          opcoes: ['Aposentadoria', 'Benefício', 'Auxílio-maternidade']
        }
      ],
      card: { cor: 'azul-petroleo', titulo: 'Nova Solicitação de Declaração' }
    },
    {
      id: 'outras-solicitacoes',
      nome: 'Outras solicitações ao TACS',
      icone: '📋',
      tipo: 'solicitacao',
      ativo: true,
      ordem: 60,
      valorLegado: 'Outro assunto comunitário relacionado à Unidade de Saúde Posto Matias',
      agenda: { habilitada: false },
      campos: [
        {
          id: 'motivo',
          tipo: 'texto-longo',
          rotulo: 'Descreva o motivo da solicitação',
          obrigatorio: true
        }
      ],
      card: { cor: 'azul-petroleo', titulo: 'Nova Solicitação ao TACS' }
    },
    {
      id: 'implanon',
      nome: 'Implanon',
      icone: '🩺',
      tipo: 'solicitacao',
      ativo: true,
      ordem: 70,
      valorLegado: 'Implanon',
      agenda: { habilitada: false },
      campos: [
        {
          id: 'implanonEscolha',
          tipo: 'opcoes',
          rotulo: 'O que você deseja sobre o Implanon?',
          obrigatorio: true,
          opcoes: [
            'Quero saber mais sobre o Implanon',
            'Quero solicitar a implantação do Implanon'
          ]
        }
      ],
      card: { cor: 'azul-petroleo', titulo: 'Nova Solicitação sobre o Implanon' }
    },

    /* Serviços informativos — não criam solicitação de marcação. */
    {
      id: 'nutricionista',
      nome: 'Atendimento com Nutricionista',
      icone: '🥗',
      tipo: 'informativo',
      ativo: true,
      ordem: 110,
      mural: { formatos: ['texto', 'card', 'banner'], validadeAutomatica: true }
    },
    {
      id: 'outubro-rosa',
      nome: 'Outubro Rosa',
      icone: '🎀',
      tipo: 'informativo',
      ativo: true,
      ordem: 120,
      campanha: { mes: 10, cor: 'rosa' },
      mural: { formatos: ['texto', 'card', 'banner'], validadeAutomatica: true }
    },
    {
      id: 'novembro-azul',
      nome: 'Novembro Azul',
      icone: '💙',
      tipo: 'informativo',
      ativo: true,
      ordem: 130,
      campanha: { mes: 11, cor: 'azul' },
      mural: { formatos: ['texto', 'card', 'banner'], validadeAutomatica: true }
    },
    {
      id: 'campanhas-vacinacao',
      nome: 'Campanhas de Vacinação',
      icone: '💉',
      tipo: 'informativo',
      ativo: true,
      ordem: 140,
      mural: { formatos: ['texto', 'card', 'banner'], validadeAutomatica: true }
    },
    {
      id: 'avisos-unidade',
      nome: 'Avisos da Unidade de Saúde',
      icone: '📢',
      tipo: 'informativo',
      ativo: true,
      ordem: 150,
      mural: { formatos: ['texto', 'card', 'banner'], validadeAutomatica: true }
    },

    /* Módulos futuros — preparados, porém invisíveis enquanto inativos. */
    { id: 'psicologia', nome: 'Psicologia', icone: '🧠', tipo: 'solicitacao', ativo: false, ordem: 210, agenda: { habilitada: true } },
    { id: 'fisioterapia', nome: 'Fisioterapia', icone: '🦿', tipo: 'solicitacao', ativo: false, ordem: 220, agenda: { habilitada: true } },
    { id: 'visita-domiciliar', nome: 'Visita domiciliar', icone: '🏠', tipo: 'solicitacao', ativo: false, ordem: 230, agenda: { habilitada: false } },
    { id: 'bolsa-familia', nome: 'Acompanhamento do Bolsa Família', icone: '👨‍👩‍👧‍👦', tipo: 'solicitacao', ativo: false, ordem: 240, agenda: { habilitada: false } },
    { id: 'calendario-exames', nome: 'Calendário de exames', icone: '🧪', tipo: 'informativo', ativo: false, ordem: 250, mural: { formatos: ['texto', 'card'] } },
    { id: 'transporte-sanitario', nome: 'Transporte sanitário', icone: '🚐', tipo: 'solicitacao', ativo: false, ordem: 260, agenda: { habilitada: false } }
  ];

  var SETTINGS = {
    versao: '1.0.0',
    publico: 'Moradores da zona rural do Sítio Japaranduba',
    unidade: 'Unidade de Saúde Posto Matias',
    municipio: 'Chã Grande/PE',
    corPrincipal: '#062c46',
    fundo: '#eef3f6',
    cardSolicitacao: 'azul-petroleo',
    cardConfirmacao: 'verde',
    cardAviso: 'amarelo',
    cardUrgencia: 'vermelho',
    regras: {
      mobileFirst: true,
      linguagemSimples: true,
      botoesGrandes: true,
      historicoPermanente: true,
      expansaoSemReescreverNucleo: true
    }
  };

  function listar(tipo, somenteAtivos) {
    return MODULES
      .filter(function (item) {
        return (!tipo || item.tipo === tipo) && (!somenteAtivos || item.ativo === true);
      })
      .slice()
      .sort(function (a, b) { return (a.ordem || 9999) - (b.ordem || 9999); });
  }

  function obter(id) {
    for (var i = 0; i < MODULES.length; i += 1) {
      if (MODULES[i].id === id) return MODULES[i];
    }
    return null;
  }

  global.PORTAL_TACS = Object.freeze({
    settings: SETTINGS,
    modules: MODULES,
    listar: listar,
    obter: obter
  });
}(window));
