/**
 * Portal TACS — Public Core V1
 *
 * Núcleo público somente leitura. Não declara doGet/doPost.
 * O roteador oficial chama `tratarGetPublicCoreV1_` e serializa a resposta.
 *
 * Fonte pública única:
 * - agendas profissionais;
 * - profissionais ativos e primeiro serviço ativo;
 * - recados ativos;
 * - campanhas ativas.
 */
var TACS_PUBLIC_CORE_V1 = Object.freeze({
  VERSAO: '1.0.0',
  FUSO: 'America/Recife',
  ABA_PROFISSIONAIS: 'PROFISSIONAIS',
  ABA_SERVICOS: 'SERVICOS',
  ABA_AGENDAS: 'PAINEL_PROFISSIONAIS',
  ABA_ENFERMEIRA: 'AGENDA_ENFERMEIRA',
  ABA_RECADOS: 'RECADOS_PORTAL',
  ABA_CAMPANHAS: 'CAMPANHAS_PORTAL'
});

function tratarGetPublicCoreV1_(e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var acao = String(parametros.action || '').trim();

  if (acao === 'painel_publico' || acao === '') {
    return {handled: true, data: tacsPublicV1Painel_()};
  }

  if (acao === 'agenda_enfermeira') {
    return {
      handled: true,
      data: {
        ok: true,
        dias: tacsPublicV1AgendaEnfermeira_(),
        atualizadoEm: tacsPublicV1Agora_(),
        versaoPublica: TACS_PUBLIC_CORE_V1.VERSAO
      }
    };
  }

  if (acao === 'status_publico') {
    return {
      handled: true,
      data: {
        ok: true,
        sistema: 'Portal TACS Public Core',
        versaoPublica: TACS_PUBLIC_CORE_V1.VERSAO,
        atualizadoEm: tacsPublicV1Agora_()
      }
    };
  }

  return null;
}

function tacsPublicV1Painel_() {
  var modulos = tacsPublicV1Modulos_();

  if (!modulos.enfermeira || !modulos.enfermeira.length) {
    var enfermeira = tacsPublicV1AgendaEnfermeira_();
    if (enfermeira.length) {
      modulos.enfermeira = enfermeira.map(function (item, indice) {
        return {
          day: item.day,
          active: item.available === true,
          date: '',
          time: '',
          status: item.available === true ? 'ATENDIMENTO' : 'SEM ATENDIMENTO',
          message: item.service,
          service: item.service,
          closeAtNoon: false,
          common: 0,
          emergency: 0,
          extra: false,
          closedNow: false,
          order: indice + 1
        };
      });
    }
  }

  return {
    ok: true,
    versaoPublica: TACS_PUBLIC_CORE_V1.VERSAO,
    atualizadoEm: tacsPublicV1Agora_(),
    modules: modulos,
    professionals: tacsPublicV1Profissionais_(),
    recados: tacsPublicV1Recados_(),
    campanhas: tacsPublicV1Campanhas_()
  };
}

function tacsPublicV1Modulos_() {
  var planilha = tacsPublicV1Planilha_();
  var aba = planilha.getSheetByName(TACS_PUBLIC_CORE_V1.ABA_AGENDAS);
  var saida = {
    medica: [],
    enfermeira: [],
    nutricionista: [],
    odontologia: []
  };

  if (!aba || aba.getLastRow() < 2 || aba.getLastColumn() < 1) {
    return saida;
  }

  var tabela = tacsPublicV1Tabela_(aba);
  var iModulo = tacsPublicV1Indice_(tabela, ['MODULO', 'PROFISSIONAL', 'PROFISSIONAL_ID'], true);
  var iOrdem = tacsPublicV1Indice_(tabela, ['ORDEM'], false);
  var iDia = tacsPublicV1Indice_(tabela, ['DIA', 'DIA_SEMANA'], true);
  var iAtivo = tacsPublicV1Indice_(tabela, ['ATIVO', 'AGENDA_ATIVA', 'PUBLICAR'], true);
  var iData = tacsPublicV1Indice_(tabela, ['DATA', 'DATA_ESPECIFICA'], false);
  var iHorario = tacsPublicV1Indice_(tabela, ['HORARIO'], false);
  var iSituacao = tacsPublicV1Indice_(tabela, ['SITUACAO', 'STATUS'], false);
  var iMensagem = tacsPublicV1Indice_(tabela, ['MENSAGEM', 'SERVICO', 'ATENDIMENTO'], false);
  var iEncerra = tacsPublicV1Indice_(tabela, ['ENCERRA_12H', 'ENCERRAR_AS_12H'], false);
  var iComuns = tacsPublicV1Indice_(tabela, ['VAGAS_COMUNS'], false);
  var iEmergenciais = tacsPublicV1Indice_(tabela, ['VAGAS_EMERGENCIAIS'], false);
  var iExtra = tacsPublicV1Indice_(tabela, ['DIA_EXTRA'], false);

  tabela.linhas.forEach(function (linha) {
    var modulo = tacsPublicV1Modulo_(tacsPublicV1Valor_(linha, iModulo));
    var dia = tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iDia));
    if (!modulo || !dia) return;
    if (!saida[modulo]) saida[modulo] = [];

    var data = tacsPublicV1DataIso_(tacsPublicV1Valor_(linha, iData));
    var encerra = tacsPublicV1Bool_(tacsPublicV1Valor_(linha, iEncerra));
    var mensagem = tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iMensagem));

    saida[modulo].push({
      day: dia,
      active: tacsPublicV1Bool_(tacsPublicV1Valor_(linha, iAtivo)),
      date: data,
      time: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iHorario)),
      status: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iSituacao)),
      message: mensagem,
      service: mensagem,
      closeAtNoon: encerra,
      common: tacsPublicV1NaoNegativo_(tacsPublicV1Valor_(linha, iComuns)),
      emergency: tacsPublicV1NaoNegativo_(tacsPublicV1Valor_(linha, iEmergenciais)),
      extra: tacsPublicV1Bool_(tacsPublicV1Valor_(linha, iExtra)),
      closedNow: tacsPublicV1EncerradoAgora_(data, encerra),
      order: tacsPublicV1NaoNegativo_(tacsPublicV1Valor_(linha, iOrdem))
    });
  });

  Object.keys(saida).forEach(function (modulo) {
    saida[modulo].sort(function (a, b) {
      return Number(a.order || 999) - Number(b.order || 999);
    });
    saida[modulo].forEach(function (item) { delete item.order; });
  });

  return saida;
}

function tacsPublicV1Profissionais_() {
  var planilha = tacsPublicV1Planilha_();
  var abaProf = planilha.getSheetByName(TACS_PUBLIC_CORE_V1.ABA_PROFISSIONAIS);
  var abaServ = planilha.getSheetByName(TACS_PUBLIC_CORE_V1.ABA_SERVICOS);
  if (!abaProf || abaProf.getLastRow() < 2) return [];

  var prof = tacsPublicV1Tabela_(abaProf);
  var iId = tacsPublicV1Indice_(prof, ['ID'], true);
  var iNome = tacsPublicV1Indice_(prof, ['NOME'], false);
  var iTitulo = tacsPublicV1Indice_(prof, ['TITULO_PUBLICO'], false);
  var iIcone = tacsPublicV1Indice_(prof, ['ICONE'], false);
  var iOrdem = tacsPublicV1Indice_(prof, ['ORDEM'], false);
  var iAtivo = tacsPublicV1Indice_(prof, ['ATIVO'], true);

  var servicos = {};
  if (abaServ && abaServ.getLastRow() >= 2) {
    var serv = tacsPublicV1Tabela_(abaServ);
    var sProf = tacsPublicV1Indice_(serv, ['PROFISSIONAL_ID'], true);
    var sNome = tacsPublicV1Indice_(serv, ['NOME'], false);
    var sDescricao = tacsPublicV1Indice_(serv, ['DESCRICAO_AUTOMATICA'], false);
    var sOrdem = tacsPublicV1Indice_(serv, ['ORDEM'], false);
    var sAtivo = tacsPublicV1Indice_(serv, ['ATIVO'], true);

    serv.linhas.forEach(function (linha) {
      if (!tacsPublicV1Bool_(tacsPublicV1Valor_(linha, sAtivo))) return;
      var chave = tacsPublicV1Modulo_(tacsPublicV1Valor_(linha, sProf));
      if (!chave) return;
      var candidato = {
        name: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, sNome)),
        description: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, sDescricao)),
        order: tacsPublicV1Positivo_(tacsPublicV1Valor_(linha, sOrdem), 999)
      };
      if (!servicos[chave] || candidato.order < servicos[chave].order) {
        servicos[chave] = candidato;
      }
    });
  }

  var unicos = {};
  prof.linhas.forEach(function (linha) {
    if (!tacsPublicV1Bool_(tacsPublicV1Valor_(linha, iAtivo))) return;
    var idOriginal = tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iId));
    var chave = tacsPublicV1Modulo_(idOriginal);
    if (!chave) return;

    var legado = ['medica', 'enfermeira', 'nutricionista', 'odontologia'].indexOf(chave) !== -1;
    if (!legado && !servicos[chave]) return;

    var titulo = tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iTitulo)) ||
      tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iNome)) ||
      tacsPublicV1Titulo_(chave);
    var item = {
      id: chave,
      title: titulo,
      icon: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iIcone)) || '👤',
      order: tacsPublicV1Positivo_(tacsPublicV1Valor_(linha, iOrdem), 999),
      active: true,
      category: tacsPublicV1Categoria_(chave, titulo),
      service: servicos[chave] || null
    };
    if (!unicos[chave] || item.order < unicos[chave].order) unicos[chave] = item;
  });

  return Object.keys(unicos).map(function (chave) {
    return unicos[chave];
  }).sort(function (a, b) {
    return a.order - b.order || a.title.localeCompare(b.title);
  });
}

function tacsPublicV1Recados_() {
  var aba = tacsPublicV1Planilha_().getSheetByName(TACS_PUBLIC_CORE_V1.ABA_RECADOS);
  if (!aba || aba.getLastRow() < 2) return [];
  var tabela = tacsPublicV1Tabela_(aba);
  var iId = tacsPublicV1Indice_(tabela, ['ID'], false);
  var iTitulo = tacsPublicV1Indice_(tabela, ['TITULO'], false);
  var iMensagem = tacsPublicV1Indice_(tabela, ['MENSAGEM'], false);
  var iPrioridade = tacsPublicV1Indice_(tabela, ['PRIORIDADE'], false);
  var iValidade = tacsPublicV1Indice_(tabela, ['VALIDADE'], false);
  var iAtivo = tacsPublicV1Indice_(tabela, ['ATIVO'], true);
  var hoje = tacsPublicV1Hoje_();
  var saida = [];

  tabela.linhas.forEach(function (linha) {
    var ativo = tacsPublicV1Bool_(tacsPublicV1Valor_(linha, iAtivo));
    var validade = tacsPublicV1DataIso_(tacsPublicV1Valor_(linha, iValidade));
    if (validade && validade < hoje) ativo = false;
    if (!ativo) return;
    saida.push({
      id: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iId)),
      title: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iTitulo)),
      message: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iMensagem)),
      priority: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iPrioridade)) || 'INFORMATIVO',
      validity: validade,
      active: true
    });
  });
  return saida;
}

function tacsPublicV1Campanhas_() {
  var aba = tacsPublicV1Planilha_().getSheetByName(TACS_PUBLIC_CORE_V1.ABA_CAMPANHAS);
  if (!aba || aba.getLastRow() < 2) return [];
  var tabela = tacsPublicV1Tabela_(aba);
  var iId = tacsPublicV1Indice_(tabela, ['ID'], false);
  var iTitulo = tacsPublicV1Indice_(tabela, ['TITULO'], false);
  var iMensagem = tacsPublicV1Indice_(tabela, ['MENSAGEM'], false);
  var iInicio = tacsPublicV1Indice_(tabela, ['INICIO'], false);
  var iDias = tacsPublicV1Indice_(tabela, ['DIAS'], false);
  var iAtivo = tacsPublicV1Indice_(tabela, ['ATIVO'], true);
  var hoje = tacsPublicV1Hoje_();
  var saida = [];

  tabela.linhas.forEach(function (linha) {
    var inicio = tacsPublicV1DataIso_(tacsPublicV1Valor_(linha, iInicio));
    var diasTexto = tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iDias));
    var numero = Number(diasTexto);
    var duracaoNumerica = diasTexto !== '' && isFinite(numero) && numero >= 1;
    var fim = duracaoNumerica ? tacsPublicV1SomarDias_(inicio, Math.floor(numero) - 1) : '';
    var ativo = tacsPublicV1Bool_(tacsPublicV1Valor_(linha, iAtivo));

    if (inicio && hoje < inicio) ativo = false;
    if (fim && hoje > fim) ativo = false;
    if (!ativo) return;

    saida.push({
      id: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iId)),
      title: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iTitulo)),
      message: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iMensagem)),
      start: inicio,
      days: diasTexto,
      end: fim,
      active: true
    });
  });
  return saida;
}

function tacsPublicV1AgendaEnfermeira_() {
  var aba = tacsPublicV1Planilha_().getSheetByName(TACS_PUBLIC_CORE_V1.ABA_ENFERMEIRA);
  if (!aba || aba.getLastRow() < 2) return [];
  var tabela = tacsPublicV1Tabela_(aba);
  var iOrdem = tacsPublicV1Indice_(tabela, ['ORDEM'], false);
  var iDia = tacsPublicV1Indice_(tabela, ['DIA'], true);
  var iAtendimento = tacsPublicV1Indice_(tabela, ['ATENDIMENTO', 'SERVICO'], false);
  var iIcone = tacsPublicV1Indice_(tabela, ['ICONE'], false);
  var iDisponivel = tacsPublicV1Indice_(tabela, ['DISPONIVEL', 'ATIVO'], false);

  return tabela.linhas.map(function (linha) {
    return {
      day: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iDia)),
      service: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iAtendimento)),
      icon: tacsPublicV1Texto_(tacsPublicV1Valor_(linha, iIcone)),
      available: tacsPublicV1Bool_(tacsPublicV1Valor_(linha, iDisponivel)),
      order: tacsPublicV1Positivo_(tacsPublicV1Valor_(linha, iOrdem), 999)
    };
  }).filter(function (item) {
    return !!item.day;
  }).sort(function (a, b) {
    return a.order - b.order;
  }).map(function (item) {
    delete item.order;
    return item;
  });
}

function tacsPublicV1Tabela_(aba) {
  var colunas = aba.getLastColumn();
  if (colunas < 1) return {aba: aba, cabecalhos: [], linhas: []};
  var cabecalhos = aba.getRange(1, 1, 1, colunas).getDisplayValues()[0].map(tacsPublicV1Normalizar_);
  var linhas = aba.getLastRow() > 1
    ? aba.getRange(2, 1, aba.getLastRow() - 1, colunas).getValues()
    : [];
  return {aba: aba, cabecalhos: cabecalhos, linhas: linhas};
}

function tacsPublicV1Indice_(tabela, nomes, obrigatorio) {
  for (var i = 0; i < nomes.length; i += 1) {
    var indice = tabela.cabecalhos.indexOf(tacsPublicV1Normalizar_(nomes[i]));
    if (indice >= 0) return indice;
  }
  if (obrigatorio) {
    throw new Error('Campo público obrigatório ausente: ' + nomes[0] + ' em ' + tabela.aba.getName());
  }
  return -1;
}

function tacsPublicV1Valor_(linha, indice) {
  return indice >= 0 && indice < linha.length ? linha[indice] : '';
}

function tacsPublicV1Planilha_() {
  if (typeof getPlanilha === 'function') return getPlanilha();
  var id = '';
  try {
    id = String(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '').trim();
  } catch (erro) {}
  if (id) return SpreadsheetApp.openById(id);
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) throw new Error('A planilha do Portal TACS não está configurada.');
  return planilha;
}

function tacsPublicV1Modulo_(valor) {
  var chave = tacsPublicV1Normalizar_(valor).toLowerCase();
  if (['medica', 'medico', 'medicina'].indexOf(chave) !== -1) return 'medica';
  if (['nutricionista', 'nutricao'].indexOf(chave) !== -1) return 'nutricionista';
  if (['enfermeira', 'enfermeiro', 'enfermagem'].indexOf(chave) !== -1) return 'enfermeira';
  if (['odontologia', 'dentista'].indexOf(chave) !== -1) return 'odontologia';
  return chave;
}

function tacsPublicV1Categoria_(chave, titulo) {
  if (chave === 'medica') return 'Solicitar atendimento com a Médica';
  if (chave === 'enfermeira') return 'Solicitar atendimento com a Enfermeira Chefe';
  if (chave === 'nutricionista') return 'Solicitar atendimento com nutricionista';
  if (chave === 'odontologia') return 'Solicitar atendimento odontológico (dentista)';
  titulo = tacsPublicV1Texto_(titulo);
  if (/^atendimento\s+/i.test(titulo)) {
    return 'Solicitar ' + titulo.charAt(0).toLowerCase() + titulo.slice(1);
  }
  return 'Solicitar atendimento com ' + (titulo || tacsPublicV1Titulo_(chave));
}

function tacsPublicV1Titulo_(chave) {
  return String(chave || '').split('_').map(function (parte) {
    return parte ? parte.charAt(0).toUpperCase() + parte.slice(1) : '';
  }).join(' ');
}

function tacsPublicV1Normalizar_(valor) {
  var texto = tacsPublicV1Texto_(valor).toUpperCase();
  if (texto.normalize) texto = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return texto.replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function tacsPublicV1Texto_(valor) {
  return String(valor == null ? '' : valor).trim();
}

function tacsPublicV1Bool_(valor) {
  if (valor === true || valor === 1) return true;
  return ['TRUE', '1', 'SIM', 'YES', 'ATIVO', 'ATIVA', 'VERDADEIRO'].indexOf(tacsPublicV1Normalizar_(valor)) !== -1;
}

function tacsPublicV1NaoNegativo_(valor) {
  var numero = Number(valor);
  return isFinite(numero) && numero >= 0 ? Math.floor(numero) : 0;
}

function tacsPublicV1Positivo_(valor, padrao) {
  var numero = Number(valor);
  return isFinite(numero) && numero >= 1 ? Math.floor(numero) : Math.max(1, Number(padrao) || 1);
}

function tacsPublicV1DataIso_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    if (isNaN(valor.getTime())) return '';
    return Utilities.formatDate(valor, TACS_PUBLIC_CORE_V1.FUSO, 'yyyy-MM-dd');
  }
  var texto = tacsPublicV1Texto_(valor);
  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  var br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? br[3] + '-' + br[2] + '-' + br[1] : '';
}

function tacsPublicV1SomarDias_(iso, dias) {
  if (!iso) return '';
  var partes = iso.split('-').map(Number);
  var data = new Date(partes[0], partes[1] - 1, partes[2]);
  data.setDate(data.getDate() + Number(dias || 0));
  return Utilities.formatDate(data, TACS_PUBLIC_CORE_V1.FUSO, 'yyyy-MM-dd');
}

function tacsPublicV1EncerradoAgora_(data, encerra) {
  if (!encerra || !data) return false;
  if (data !== tacsPublicV1Hoje_()) return false;
  return Number(Utilities.formatDate(new Date(), TACS_PUBLIC_CORE_V1.FUSO, 'HH')) >= 12;
}

function tacsPublicV1Hoje_() {
  return Utilities.formatDate(new Date(), TACS_PUBLIC_CORE_V1.FUSO, 'yyyy-MM-dd');
}

function tacsPublicV1Agora_() {
  return Utilities.formatDate(new Date(), TACS_PUBLIC_CORE_V1.FUSO, 'dd/MM/yyyy HH:mm');
}
