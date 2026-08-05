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
  VERSAO: '1.0.0',
  ACAO: 'painel_publico',
  FUSO: 'America/Recife',
  ABAS_PREFERIDAS: ['AGENDAS', 'PAINEL_PROFISSIONAIS']
});

var publicoAgendasPortalV1DoGetAnterior_ =
  typeof doGet === 'function' ? doGet : null;

doGet = function (e) {
  var parametros = e && e.parameter ? e.parameter : {};
  var acao = String(parametros.action || '').trim().toLowerCase();

  if (acao === PUBLICO_AGENDAS_PORTAL_V1.ACAO) {
    try {
      return publicoAgendasV1Responder_(
        publicoAgendasV1Montar_(),
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

function publicoAgendasV1Montar_() {
  var planilha = publicoAgendasV1Planilha_();
  var aba = publicoAgendasV1LocalizarAba_(planilha);
  var modulos = {
    medica: [],
    nutricionista: [],
    enfermeira: [],
    odontologia: []
  };

  if (!aba || aba.getLastRow() < 2) {
    return publicoAgendasV1Resposta_(modulos, aba ? aba.getName() : '');
  }

  var totalLinhas = aba.getLastRow();
  var totalColunas = aba.getLastColumn();
  var valores = aba.getRange(1, 1, totalLinhas, totalColunas).getValues();
  var exibidos = aba.getRange(1, 1, totalLinhas, totalColunas).getDisplayValues();
  var cabecalhos = exibidos[0].map(publicoAgendasV1Normalizar_);
  var indices = publicoAgendasV1Indices_(cabecalhos);

  for (var linha = 1; linha < valores.length; linha += 1) {
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

  return publicoAgendasV1Resposta_(modulos, aba.getName());
}

function publicoAgendasV1Resposta_(modulos, aba) {
  return {
    ok: true,
    modulo: 'Agendas públicas do Portal TACS',
    versao: PUBLICO_AGENDAS_PORTAL_V1.VERSAO,
    somenteLeitura: true,
    atualizadoEm: Utilities.formatDate(
      new Date(),
      PUBLICO_AGENDAS_PORTAL_V1.FUSO,
      'dd/MM/yyyy HH:mm'
    ),
    origem: aba,
    modules: modulos,
    recados: [],
    campanhas: []
  };
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
  var id = String(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || ''
  ).trim();
  if (id) return SpreadsheetApp.openById(id);
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) throw new Error('A planilha do Portal TACS não está configurada.');
  return planilha;
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
