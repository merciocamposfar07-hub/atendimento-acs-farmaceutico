/**
 * ZZ_12_PublicoAgendasPortalV1.gs
 *
 * Leitura pública e somente leitura das agendas profissionais do Portal TACS.
 * Corrige a incompatibilidade entre os valores administrativos (ex.: MEDICA)
 * e as chaves usadas pelo Portal do Morador (ex.: medica).
 *
 * A resposta não expõe PIN, sessão, histórico, nomes de moradores ou outros
 * dados administrativos. Somente os campos públicos da programação são lidos.
 */

var PUBLICO_AGENDAS_PORTAL_V1 = Object.freeze({
  VERSAO: '1.2.0',
  ACAO: 'painel_publico',
  AREA_PADRAO: 'JAPARANDUBA',
  FUSO: 'America/Recife',
  ABAS_PREFERIDAS: ['PAINEL_PROFISSIONAIS', 'AGENDAS']
});

var publicoAgendasPortalV1DoGetAnterior_ =
  typeof doGet === 'function' ? doGet : null;

doGet = function (e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var acao = String(parametros.action || '').trim().toLowerCase();

  if (acao === PUBLICO_AGENDAS_PORTAL_V1.ACAO) {
    try {
      return publicoAgendasV1Responder_(
        publicoAgendasV1Montar_(parametros.areaId || parametros.area || parametros.territorio || ''),
        parametros.callback
      );
    } catch (erro) {
      return publicoAgendasV1Responder_(
        {
          ok: false,
          message: erro && erro.message ? erro.message : String(erro)
        },
        parametros.callback
      );
    }
  }

  if (typeof publicoAgendasPortalV1DoGetAnterior_ === 'function') {
    return publicoAgendasPortalV1DoGetAnterior_(e);
  }

  return publicoAgendasV1Responder_(
    {ok: false, message: 'Ação não reconhecida.'},
    parametros.callback
  );
};

function publicoAgendasV1Montar_(areaId) {
  areaId = publicoAgendasV1AreaId_(areaId) || PUBLICO_AGENDAS_PORTAL_V1.AREA_PADRAO;
  var planilha = publicoAgendasV1Planilha_();
  var aba = publicoAgendasV1LocalizarAba_(planilha);
  var modulos = {
    medica: [],
    nutricionista: [],
    enfermeira: [],
    odontologia: []
  };

  if (!aba || aba.getLastRow() < 2) {
    return publicoAgendasV1Resposta_(modulos, aba ? aba.getName() : '', areaId, planilha);
  }

  var totalLinhas = aba.getLastRow();
  var totalColunas = aba.getLastColumn();
  var valores = aba.getRange(1, 1, totalLinhas, totalColunas).getValues();
  var exibidos = aba.getRange(1, 1, totalLinhas, totalColunas).getDisplayValues();
  var cabecalhos = exibidos[0].map(publicoAgendasV1Normalizar_);
  var indices = publicoAgendasV1Indices_(cabecalhos);

  for (var linha = 1; linha < valores.length; linha += 1) {
    var areaLinha = indices.area >= 0
      ? publicoAgendasV1AreaId_(publicoAgendasV1Valor_(exibidos[linha], indices.area))
      : '';
    areaLinha = areaLinha || PUBLICO_AGENDAS_PORTAL_V1.AREA_PADRAO;
    if (areaLinha !== areaId) continue;

    var modulo = publicoAgendasV1Modulo_(
      publicoAgendasV1Valor_(exibidos[linha], indices.modulo)
    );
    if (!modulos[modulo]) continue;

    var dia = publicoAgendasV1Texto_(
      publicoAgendasV1Valor_(exibidos[linha], indices.dia)
    );
    if (!dia) continue;

    var dataBruta = publicoAgendasV1Valor_(valores[linha], indices.data);
    var encerra12h = publicoAgendasV1Booleano_(
      publicoAgendasV1Valor_(valores[linha], indices.encerra12h)
    );

    modulos[modulo].push({
      day: dia,
      active: publicoAgendasV1Booleano_(
        publicoAgendasV1Valor_(valores[linha], indices.ativo)
      ),
      date: publicoAgendasV1DataIso_(dataBruta),
      time: publicoAgendasV1Texto_(
        publicoAgendasV1Valor_(exibidos[linha], indices.horario)
      ),
      status: publicoAgendasV1Texto_(
        publicoAgendasV1Valor_(exibidos[linha], indices.situacao)
      ),
      message: publicoAgendasV1Texto_(
        publicoAgendasV1Valor_(exibidos[linha], indices.mensagem)
      ),
      service: publicoAgendasV1Texto_(
        publicoAgendasV1Valor_(exibidos[linha], indices.mensagem)
      ),
      closeAtNoon: encerra12h,
      common: publicoAgendasV1NaoNegativo_(
        publicoAgendasV1Valor_(valores[linha], indices.vagasComuns)
      ),
      emergency: publicoAgendasV1NaoNegativo_(
        publicoAgendasV1Valor_(valores[linha], indices.vagasEmergenciais)
      ),
      extra: publicoAgendasV1Booleano_(
        publicoAgendasV1Valor_(valores[linha], indices.diaExtra)
      ),
      closedNow: publicoAgendasV1EncerradoAgora_(dataBruta, encerra12h),
      order: publicoAgendasV1NaoNegativo_(
        publicoAgendasV1Valor_(valores[linha], indices.ordem)
      )
    });
  }

  Object.keys(modulos).forEach(function (modulo) {
    modulos[modulo].sort(function (a, b) {
      return Number(a.order || 999) - Number(b.order || 999);
    });
    modulos[modulo].forEach(function (item) {
      delete item.order;
    });
  });

  return publicoAgendasV1Resposta_(modulos, aba.getName(), areaId, planilha);
}

function publicoAgendasV1Resposta_(modulos, aba, areaId, planilha) {
  areaId = publicoAgendasV1AreaId_(areaId) || PUBLICO_AGENDAS_PORTAL_V1.AREA_PADRAO;
  return {
    ok: true,
    modulo: 'Agendas públicas do Portal TACS',
    versao: PUBLICO_AGENDAS_PORTAL_V1.VERSAO,
    somenteLeitura: true,
    areaId: areaId,
    atualizadoEm: Utilities.formatDate(
      new Date(),
      PUBLICO_AGENDAS_PORTAL_V1.FUSO,
      'dd/MM/yyyy HH:mm'
    ),
    origem: aba,
    modules: modulos,
    professionals: publicoAgendasV1LerProfissionais_(planilha, areaId),
    recados: publicoAgendasV1LerRecados_(planilha, areaId),
    campanhas: []
  };
}

function publicoAgendasV1LerProfissionais_(planilha, areaId) {
  areaId = publicoAgendasV1AreaId_(areaId) || PUBLICO_AGENDAS_PORTAL_V1.AREA_PADRAO;
  if (!planilha || typeof planilha.getSheetByName !== 'function') return [];

  var abaProfissionais = planilha.getSheetByName('PROFISSIONAIS');
  var abaServicos = planilha.getSheetByName('SERVICOS');
  if (!abaProfissionais || abaProfissionais.getLastRow() < 2) return [];

  var profissionais = publicoAgendasV1TabelaPublica_(abaProfissionais);
  var servicos = abaServicos && abaServicos.getLastRow() >= 2
    ? publicoAgendasV1TabelaPublica_(abaServicos)
    : null;
  var servicoPorProfissional = {};

  if (servicos) {
    var servicoIdx = {
      profissional: publicoAgendasV1IndicePublico_(
        servicos.cabecalhos,
        ['PROFISSIONAL_ID', 'PROFISSIONAL', 'MODULO']
      ),
      nome: publicoAgendasV1IndicePublico_(
        servicos.cabecalhos,
        ['NOME', 'SERVICO', 'TITULO']
      ),
      descricao: publicoAgendasV1IndicePublico_(
        servicos.cabecalhos,
        ['DESCRICAO_AUTOMATICA', 'DESCRICAO', 'MENSAGEM']
      ),
      ordem: publicoAgendasV1IndicePublico_(servicos.cabecalhos, ['ORDEM']),
      ativo: publicoAgendasV1IndicePublico_(servicos.cabecalhos, ['ATIVO']),
      area: publicoAgendasV1IndicePublico_(
        servicos.cabecalhos,
        ['AREA_ID', 'AREA', 'TERRITORIO']
      )
    };

    servicos.linhas.forEach(function (linha) {
      if (!publicoAgendasV1LinhaPublicaDaArea_(linha, servicoIdx.area, areaId)) return;
      if (servicoIdx.ativo >= 0 && !publicoAgendasV1Booleano_(linha[servicoIdx.ativo])) return;
      var modulo = servicoIdx.profissional >= 0
        ? publicoAgendasV1Modulo_(linha[servicoIdx.profissional])
        : '';
      if (!modulo) return;
      var ordem = servicoIdx.ordem >= 0
        ? publicoAgendasV1NaoNegativo_(linha[servicoIdx.ordem]) || 999
        : 999;
      var candidato = {
        name: servicoIdx.nome >= 0 ? publicoAgendasV1Texto_(linha[servicoIdx.nome]) : '',
        description: servicoIdx.descricao >= 0
          ? publicoAgendasV1Texto_(linha[servicoIdx.descricao])
          : '',
        order: ordem
      };
      if (!servicoPorProfissional[modulo] || ordem < servicoPorProfissional[modulo].order) {
        servicoPorProfissional[modulo] = candidato;
      }
    });
  }

  var profissionalIdx = {
    id: publicoAgendasV1IndicePublico_(
      profissionais.cabecalhos,
      ['ID', 'PROFISSIONAL_ID', 'MODULO']
    ),
    titulo: publicoAgendasV1IndicePublico_(
      profissionais.cabecalhos,
      ['TITULO_PUBLICO', 'TITULO', 'NOME']
    ),
    icone: publicoAgendasV1IndicePublico_(profissionais.cabecalhos, ['ICONE']),
    ordem: publicoAgendasV1IndicePublico_(profissionais.cabecalhos, ['ORDEM']),
    ativo: publicoAgendasV1IndicePublico_(profissionais.cabecalhos, ['ATIVO']),
    area: publicoAgendasV1IndicePublico_(
      profissionais.cabecalhos,
      ['AREA_ID', 'AREA', 'TERRITORIO']
    )
  };
  var unicos = {};

  profissionais.linhas.forEach(function (linha) {
    if (!publicoAgendasV1LinhaPublicaDaArea_(linha, profissionalIdx.area, areaId)) return;
    if (profissionalIdx.ativo >= 0 && !publicoAgendasV1Booleano_(linha[profissionalIdx.ativo])) return;
    var modulo = profissionalIdx.id >= 0
      ? publicoAgendasV1Modulo_(linha[profissionalIdx.id])
      : '';
    if (!modulo) return;
    var ordem = profissionalIdx.ordem >= 0
      ? publicoAgendasV1NaoNegativo_(linha[profissionalIdx.ordem]) || 999
      : 999;
    var titulo = profissionalIdx.titulo >= 0
      ? publicoAgendasV1Texto_(linha[profissionalIdx.titulo])
      : '';
    var item = {
      id: modulo,
      title: titulo || modulo.replace(/_/g, ' '),
      icon: profissionalIdx.icone >= 0
        ? publicoAgendasV1Texto_(linha[profissionalIdx.icone]) || '👤'
        : '👤',
      order: ordem,
      active: true,
      category: 'Solicitar atendimento com ' + (titulo || modulo.replace(/_/g, ' ')),
      service: servicoPorProfissional[modulo] || null
    };
    if (!unicos[modulo] || ordem < unicos[modulo].order) unicos[modulo] = item;
  });

  return Object.keys(unicos)
    .map(function (modulo) { return unicos[modulo]; })
    .sort(function (a, b) { return a.order - b.order || a.title.localeCompare(b.title); });
}

function publicoAgendasV1TabelaPublica_(aba) {
  var valores = aba
    .getRange(1, 1, aba.getLastRow(), aba.getLastColumn())
    .getDisplayValues();
  return {
    cabecalhos: valores[0].map(publicoAgendasV1Normalizar_),
    linhas: valores.slice(1)
  };
}

function publicoAgendasV1IndicePublico_(cabecalhos, nomes) {
  for (var i = 0; i < nomes.length; i += 1) {
    var indice = cabecalhos.indexOf(publicoAgendasV1Normalizar_(nomes[i]));
    if (indice >= 0) return indice;
  }
  return -1;
}

function publicoAgendasV1LinhaPublicaDaArea_(linha, indiceArea, areaId) {
  var areaLinha = indiceArea >= 0
    ? publicoAgendasV1AreaId_(linha[indiceArea])
    : '';
  areaLinha = areaLinha || PUBLICO_AGENDAS_PORTAL_V1.AREA_PADRAO;
  return areaLinha === areaId;
}

function publicoAgendasV1LerRecados_(planilha, areaId) {
  areaId = publicoAgendasV1AreaId_(areaId) || PUBLICO_AGENDAS_PORTAL_V1.AREA_PADRAO;
  if (!planilha || typeof planilha.getSheetByName !== 'function') return [];

  var aba = planilha.getSheetByName('RECADOS_PORTAL');
  if (!aba || aba.getLastRow() < 2 || aba.getLastColumn() < 1) return [];

  var valores = aba
    .getRange(1, 1, aba.getLastRow(), aba.getLastColumn())
    .getDisplayValues();
  var cabecalhos = valores[0].map(publicoAgendasV1Normalizar_);

  function indice(nomes) {
    for (var i = 0; i < nomes.length; i += 1) {
      var encontrado = cabecalhos.indexOf(publicoAgendasV1Normalizar_(nomes[i]));
      if (encontrado >= 0) return encontrado;
    }
    return -1;
  }

  var idx = {
    id: indice(['ID', 'CODIGO', 'RECADO_ID']),
    area: indice(['AREA_ID', 'AREA', 'TERRITORIO']),
    titulo: indice(['TITULO', 'TITULO_PUBLICO', 'NOME']),
    mensagem: indice(['MENSAGEM', 'TEXTO', 'CONTEUDO']),
    prioridade: indice(['PRIORIDADE', 'TIPO']),
    validade: indice(['VALIDADE', 'DATA_VALIDADE', 'ATE']),
    ativo: indice(['ATIVO', 'RECADO_ATIVO', 'PUBLICAR'])
  };

  if (idx.mensagem < 0 || idx.ativo < 0) return [];

  var hoje = Utilities.formatDate(
    new Date(),
    PUBLICO_AGENDAS_PORTAL_V1.FUSO,
    'yyyy-MM-dd'
  );
  var recados = [];

  for (var linha = 1; linha < valores.length; linha += 1) {
    var registro = valores[linha];
    var areaLinha = idx.area >= 0
      ? publicoAgendasV1AreaId_(registro[idx.area])
      : '';
    areaLinha = areaLinha || PUBLICO_AGENDAS_PORTAL_V1.AREA_PADRAO;
    if (areaLinha !== areaId) continue;
    if (!publicoAgendasV1Booleano_(registro[idx.ativo])) continue;

    var validade = idx.validade >= 0
      ? publicoAgendasV1DataIso_(registro[idx.validade])
      : '';
    if (validade && validade < hoje) continue;

    var mensagem = String(registro[idx.mensagem] || '').trim();
    if (!mensagem) continue;

    var titulo = idx.titulo >= 0
      ? String(registro[idx.titulo] || '').trim()
      : '';
    var prioridade = idx.prioridade >= 0
      ? String(registro[idx.prioridade] || '').trim()
      : '';

    recados.push({
      id: idx.id >= 0 ? String(registro[idx.id] || '').trim() : '',
      title: titulo || 'Recado da Unidade',
      message: mensagem,
      priority: prioridade || 'INFORMATIVO',
      validity: validade,
      active: true
    });
  }

  return recados;
}

function publicoAgendasV1LocalizarAba_(planilha) {
  var abas = planilha.getSheets().slice();
  abas.sort(function (a, b) {
    return publicoAgendasV1PesoAba_(a.getName()) -
      publicoAgendasV1PesoAba_(b.getName());
  });

  for (var i = 0; i < abas.length; i += 1) {
    var aba = abas[i];
    if (aba.getLastRow() < 1 || aba.getLastColumn() < 3) continue;
    var cabecalhos = aba
      .getRange(1, 1, 1, aba.getLastColumn())
      .getDisplayValues()[0]
      .map(publicoAgendasV1Normalizar_);
    var indices = publicoAgendasV1Indices_(cabecalhos, true);
    if (indices.modulo >= 0 && indices.dia >= 0 && indices.ativo >= 0) {
      return aba;
    }
  }
  throw new Error('A aba administrativa de agendas não foi encontrada.');
}

function publicoAgendasV1PesoAba_(nome) {
  var normalizado = publicoAgendasV1Normalizar_(nome);
  for (var i = 0; i < PUBLICO_AGENDAS_PORTAL_V1.ABAS_PREFERIDAS.length; i += 1) {
    if (normalizado === PUBLICO_AGENDAS_PORTAL_V1.ABAS_PREFERIDAS[i]) return i;
  }
  return 99;
}

function publicoAgendasV1Indices_(cabecalhos, permitirAusentes) {
  function indice(nomes, obrigatorio) {
    for (var i = 0; i < nomes.length; i += 1) {
      var encontrado = cabecalhos.indexOf(publicoAgendasV1Normalizar_(nomes[i]));
      if (encontrado >= 0) return encontrado;
    }
    if (obrigatorio && !permitirAusentes) {
      throw new Error('Campo obrigatório ausente na agenda: ' + nomes[0]);
    }
    return -1;
  }

  return {
    area: indice(['AREA_ID', 'AREA', 'TERRITORIO'], false),
    modulo: indice(['MODULO', 'PROFISSIONAL', 'PROFISSIONAL_ID'], true),
    ordem: indice(['ORDEM'], false),
    dia: indice(['DIA', 'DIA_SEMANA'], true),
    ativo: indice(['ATIVO', 'AGENDA_ATIVA', 'PUBLICAR'], true),
    data: indice(['DATA', 'DATA_ESPECIFICA'], false),
    horario: indice(['HORARIO'], false),
    situacao: indice(['SITUACAO', 'STATUS'], false),
    mensagem: indice(['MENSAGEM', 'SERVICO', 'ATENDIMENTO'], false),
    encerra12h: indice(['ENCERRA_12H', 'ENCERRAR_AS_12H'], false),
    vagasComuns: indice(['VAGAS_COMUNS'], false),
    vagasEmergenciais: indice(['VAGAS_EMERGENCIAIS'], false),
    diaExtra: indice(['DIA_EXTRA'], false)
  };
}

function publicoAgendasV1Planilha_() {
  if (typeof adminTacsV1Planilha_ === 'function') {
    return adminTacsV1Planilha_();
  }
  if (typeof getPlanilha === 'function') {
    return getPlanilha();
  }
  var id = String(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || ''
  ).trim();
  if (id) return SpreadsheetApp.openById(id);
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) throw new Error('A planilha do Portal TACS não está disponível.');
  return planilha;
}

function publicoAgendasV1AreaId_(valor) {
  var area = publicoAgendasV1Normalizar_(valor);
  return /^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(area) ? area.slice(0, 64) : '';
}

function publicoAgendasV1Modulo_(valor) {
  var modulo = publicoAgendasV1Normalizar_(valor).toLowerCase();
  if (modulo === 'medica' || modulo.indexOf('medic') !== -1) return 'medica';
  if (modulo.indexOf('nutric') !== -1) return 'nutricionista';
  if (modulo.indexOf('enferm') !== -1) return 'enfermeira';
  if (modulo.indexOf('odont') !== -1 || modulo.indexOf('dentist') !== -1) {
    return 'odontologia';
  }
  return modulo;
}

function publicoAgendasV1Booleano_(valor) {
  if (valor === true || valor === 1) return true;
  var texto = publicoAgendasV1Normalizar_(valor);
  return ['TRUE', '1', 'SIM', 'YES', 'ATIVO', 'ATIVA', 'VERDADEIRO'].indexOf(texto) !== -1;
}

function publicoAgendasV1NaoNegativo_(valor) {
  var numero = Number(valor);
  return isFinite(numero) && numero >= 0 ? Math.floor(numero) : 0;
}

function publicoAgendasV1DataIso_(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    if (isNaN(valor.getTime())) return '';
    return Utilities.formatDate(
      valor,
      PUBLICO_AGENDAS_PORTAL_V1.FUSO,
      'yyyy-MM-dd'
    );
  }
  var texto = String(valor).trim();
  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  var br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? br[3] + '-' + br[2] + '-' + br[1] : '';
}

function publicoAgendasV1EncerradoAgora_(data, encerra12h) {
  if (!encerra12h) return false;
  var hoje = Utilities.formatDate(
    new Date(),
    PUBLICO_AGENDAS_PORTAL_V1.FUSO,
    'yyyy-MM-dd'
  );
  if (publicoAgendasV1DataIso_(data) !== hoje) return false;
  return Number(
    Utilities.formatDate(new Date(), PUBLICO_AGENDAS_PORTAL_V1.FUSO, 'HH')
  ) >= 12;
}

function publicoAgendasV1Valor_(linha, indice) {
  return indice >= 0 && indice < linha.length ? linha[indice] : '';
}

function publicoAgendasV1Texto_(valor) {
  return String(valor == null ? '' : valor).trim();
}

function publicoAgendasV1Normalizar_(valor) {
  var texto = publicoAgendasV1Texto_(valor).toUpperCase();
  return texto.normalize
    ? texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    : texto;
}

function publicoAgendasV1Responder_(dados, callback) {
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
