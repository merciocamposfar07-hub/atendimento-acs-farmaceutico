/*
 * BACKEND DO PAINEL ADMINISTRATIVO — PORTAL TACS
 * Adaptado ao projeto existente, que usa getPlanilha() do arquivo Config.gs.
 *
 * IMPORTANTE:
 * - Este arquivo NÃO deve declarar outro doGet/doPost caso o projeto já possua
 *   essas funções em Portal.gs. Nesse caso, use as funções de roteamento
 *   tratarGetPainelTacs_ e tratarPostPainelTacs_ dentro do doGet/doPost existente.
 */

var ABA_AGENDA_ENFERMEIRA = 'AGENDA_ENFERMEIRA';
var ABA_CONFIGURACOES_PAINEL = 'CONFIGURACOES';

function configurarPainelTacs() {
  var ss = getPlanilha();

  var agenda = ss.getSheetByName(ABA_AGENDA_ENFERMEIRA);
  if (!agenda) agenda = ss.insertSheet(ABA_AGENDA_ENFERMEIRA);

  agenda.clear();
  agenda.getRange(1, 1, 1, 6).setValues([[
    'ORDEM',
    'DIA',
    'ATENDIMENTO',
    'ICONE',
    'DISPONIVEL',
    'ATUALIZADO_EM'
  ]]);

  agenda.getRange(2, 1, 5, 6).setValues([
    [1, 'Segunda-feira', 'Visita', '🏠', true, new Date()],
    [2, 'Terça-feira', 'Pré-natal', '🤰', true, new Date()],
    [3, 'Quarta-feira', 'Folga', '❌', false, new Date()],
    [4, 'Quinta-feira', 'Puericultura - acompanhamento de crianças e adolescentes', '👶', true, new Date()],
    [5, 'Sexta-feira', 'Preventivo', '🌸', true, new Date()]
  ]);

  agenda.setFrozenRows(1);
  agenda.autoResizeColumns(1, 6);

  var config = ss.getSheetByName(ABA_CONFIGURACOES_PAINEL);
  if (!config) config = ss.insertSheet(ABA_CONFIGURACOES_PAINEL);

  if (config.getLastRow() === 0) {
    config.getRange(1, 1, 1, 2).setValues([['CHAVE', 'VALOR']]);
    config.setFrozenRows(1);
  }

  var chave = obterConfiguracaoPainel_('CHAVE_ADMIN');
  if (!chave) {
    chave = gerarChavePainel_();
    gravarConfiguracaoPainel_('CHAVE_ADMIN', chave);
  }

  config.autoResizeColumns(1, 2);
  SpreadsheetApp.flush();

  return {
    ok: true,
    message: 'Painel TACS configurado na planilha principal.',
    chaveAdmin: chave
  };
}

function tratarGetPainelTacs_(e) {
  var action = String((e && e.parameter && e.parameter.action) || '').trim();

  if (action === 'agenda_enfermeira') {
    return obterAgendaEnfermeira_();
  }

  if (action === 'status_painel') {
    return {
      ok: true,
      sistema: 'Painel TACS',
      atualizadoEm: new Date().toISOString()
    };
  }

  return null;
}

function tratarPostPainelTacs_(e) {
  var action = String((e && e.parameter && e.parameter.action) || '').trim();

  if (action !== 'salvar_agenda_enfermeira') return null;

  validarChaveAdministrativaPainel_(e);
  return salvarAgendaEnfermeira_(e.parameter.payload);
}

function obterAgendaEnfermeira_() {
  var sheet = obterOuCriarAgendaEnfermeira_();
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return { ok: true, dias: [], atualizadoEm: '' };
  }

  var values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var dias = values
    .filter(function (row) { return row[1]; })
    .sort(function (a, b) { return Number(a[0]) - Number(b[0]); })
    .map(function (row) {
      return {
        day: String(row[1]),
        service: String(row[2]),
        icon: String(row[3] || ''),
        available: row[4] === true || String(row[4]).toLowerCase() === 'true'
      };
    });

  return {
    ok: true,
    dias: dias,
    atualizadoEm: Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone() || 'America/Recife',
      'dd/MM/yyyy HH:mm'
    )
  };
}

function salvarAgendaEnfermeira_(payloadText) {
  var payload = JSON.parse(String(payloadText || '{}'));

  if (!payload || !Array.isArray(payload.dias) || payload.dias.length !== 5) {
    throw new Error('A agenda deve conter os cinco dias úteis.');
  }

  var sheet = obterOuCriarAgendaEnfermeira_();
  var rows = payload.dias.map(function (item, index) {
    var day = String(item.day || '').trim();
    var service = String(item.service || '').trim();
    var icon = String(item.icon || '').trim();

    if (!day || !service) {
      throw new Error('Todos os dias precisam ter nome e atendimento.');
    }

    return [index + 1, day, service, icon, item.available === true, new Date()];
  });

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clearContent();
  }

  sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  SpreadsheetApp.flush();

  return {
    ok: true,
    message: 'Agenda publicada com sucesso.',
    dias: payload.dias
  };
}

function obterOuCriarAgendaEnfermeira_() {
  var ss = getPlanilha();
  var sheet = ss.getSheetByName(ABA_AGENDA_ENFERMEIRA);

  if (!sheet) {
    configurarPainelTacs();
    sheet = ss.getSheetByName(ABA_AGENDA_ENFERMEIRA);
  }

  return sheet;
}

function validarChaveAdministrativaPainel_(e) {
  var cadastrada = String(obterConfiguracaoPainel_('CHAVE_ADMIN') || '').trim();
  var informada = String((e && e.parameter && e.parameter.adminKey) || '').trim();

  if (!cadastrada || informada !== cadastrada) {
    throw new Error('Chave administrativa inválida.');
  }
}

function obterConfiguracaoPainel_(key) {
  var ss = getPlanilha();
  var sheet = ss.getSheetByName(ABA_CONFIGURACOES_PAINEL);

  if (!sheet || sheet.getLastRow() < 2) return '';

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < values.length; i += 1) {
    if (String(values[i][0]).trim() === key) return values[i][1];
  }

  return '';
}

function gravarConfiguracaoPainel_(key, value) {
  var ss = getPlanilha();
  var sheet = ss.getSheetByName(ABA_CONFIGURACOES_PAINEL);
  if (!sheet) sheet = ss.insertSheet(ABA_CONFIGURACOES_PAINEL);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 2).setValues([['CHAVE', 'VALOR']]);
  }

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < values.length; i += 1) {
      if (String(values[i][0]).trim() === key) {
        sheet.getRange(i + 2, 2).setValue(value);
        return;
      }
    }
  }

  sheet.appendRow([key, value]);
}

function gerarChavePainel_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 20).toUpperCase();
}
