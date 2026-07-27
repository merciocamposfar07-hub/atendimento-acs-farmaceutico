/*
 * BACKEND DO PAINEL ADMINISTRATIVO — PORTAL TACS
 * Google Apps Script vinculado a uma Planilha Google.
 *
 * 1. Crie/abra a planilha administrativa.
 * 2. Extensões > Apps Script.
 * 3. Cole este código.
 * 4. Execute configurarPainelTacs() uma vez.
 * 5. Implantar > Nova implantação > Aplicativo da Web.
 * 6. Executar como: você. Acesso: qualquer pessoa com o link.
 * 7. Use a URL /exec em window.TACS_ADMIN_API_URL no agenda-config.js.
 */

var ABA_AGENDA_ENFERMEIRA = 'AGENDA_ENFERMEIRA';
var ABA_CONFIGURACOES = 'CONFIGURACOES';

function doGet(e) {
  var action = String((e && e.parameter && e.parameter.action) || '').trim();
  var callback = String((e && e.parameter && e.parameter.callback) || '').trim();
  var data;

  try {
    if (action === 'agenda_enfermeira') data = obterAgendaEnfermeira_();
    else if (action === 'status') data = { ok: true, sistema: 'Painel TACS', atualizadoEm: new Date().toISOString() };
    else data = { ok: false, message: 'Ação não reconhecida.' };
  } catch (error) {
    data = { ok: false, message: error && error.message ? error.message : String(error) };
  }

  return responder_(data, callback);
}

function doPost(e) {
  var action = String((e && e.parameter && e.parameter.action) || '').trim();
  var result;

  try {
    if (action === 'salvar_agenda_enfermeira') {
      validarChaveAdministrativa_(e);
      result = salvarAgendaEnfermeira_(e.parameter.payload);
    } else {
      result = { ok: false, message: 'Ação não reconhecida.' };
    }
  } catch (error) {
    result = { ok: false, message: error && error.message ? error.message : String(error) };
  }

  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><script>' +
    'parent.postMessage(' + JSON.stringify({ source: 'painel-tacs', result: result }) + ',"*");' +
    '</script>'
  );
}

function configurarPainelTacs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var agenda = ss.getSheetByName(ABA_AGENDA_ENFERMEIRA) || ss.insertSheet(ABA_AGENDA_ENFERMEIRA);
  agenda.clear();
  agenda.getRange(1, 1, 1, 6).setValues([['ORDEM', 'DIA', 'ATENDIMENTO', 'ICONE', 'DISPONIVEL', 'ATUALIZADO_EM']]);
  agenda.getRange(2, 1, 5, 6).setValues([
    [1, 'Segunda-feira', 'Visita', '🏠', true, new Date()],
    [2, 'Terça-feira', 'Pré-natal', '🤰', true, new Date()],
    [3, 'Quarta-feira', 'Folga', '❌', false, new Date()],
    [4, 'Quinta-feira', 'Puericultura - acompanhamento de crianças e adolescentes', '👶', true, new Date()],
    [5, 'Sexta-feira', 'Preventivo', '🌸', true, new Date()]
  ]);
  agenda.setFrozenRows(1);
  agenda.autoResizeColumns(1, 6);

  var config = ss.getSheetByName(ABA_CONFIGURACOES) || ss.insertSheet(ABA_CONFIGURACOES);
  if (config.getLastRow() === 0) {
    config.getRange(1, 1, 1, 2).setValues([['CHAVE', 'VALOR']]);
    config.getRange(2, 1, 1, 2).setValues([['CHAVE_ADMIN', gerarChave_()]]);
    config.setFrozenRows(1);
    config.autoResizeColumns(1, 2);
  }

  return { ok: true, message: 'Painel TACS configurado.', chaveAdmin: obterConfiguracao_('CHAVE_ADMIN') };
}

function obterAgendaEnfermeira_() {
  var sheet = obterOuCriarAgenda_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, dias: [], atualizadoEm: '' };

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
    atualizadoEm: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Recife', 'dd/MM/yyyy HH:mm')
  };
}

function salvarAgendaEnfermeira_(payloadText) {
  var payload = JSON.parse(String(payloadText || '{}'));
  if (!payload || !Array.isArray(payload.dias) || payload.dias.length !== 5) {
    throw new Error('A agenda deve conter os cinco dias úteis.');
  }

  var sheet = obterOuCriarAgenda_();
  var rows = payload.dias.map(function (item, index) {
    var day = String(item.day || '').trim();
    var service = String(item.service || '').trim();
    var icon = String(item.icon || '').trim();
    if (!day || !service) throw new Error('Todos os dias precisam ter nome e atendimento.');
    return [index + 1, day, service, icon, item.available === true, new Date()];
  });

  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clearContent();
  sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  SpreadsheetApp.flush();
  return { ok: true, message: 'Agenda publicada com sucesso.', dias: payload.dias };
}

function validarChaveAdministrativa_(e) {
  var cadastrada = String(obterConfiguracao_('CHAVE_ADMIN') || '').trim();
  if (!cadastrada) return;
  var informada = String((e && e.parameter && e.parameter.adminKey) || '').trim();
  if (informada !== cadastrada) throw new Error('Chave administrativa inválida.');
}

function obterOuCriarAgenda_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_AGENDA_ENFERMEIRA);
  if (!sheet) {
    configurarPainelTacs();
    sheet = ss.getSheetByName(ABA_AGENDA_ENFERMEIRA);
  }
  return sheet;
}

function obterConfiguracao_(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_CONFIGURACOES);
  if (!sheet || sheet.getLastRow() < 2) return '';
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < values.length; i += 1) {
    if (String(values[i][0]).trim() === key) return values[i][1];
  }
  return '';
}

function responder_(data, callback) {
  var json = JSON.stringify(data);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function gerarChave_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 20).toUpperCase();
}
