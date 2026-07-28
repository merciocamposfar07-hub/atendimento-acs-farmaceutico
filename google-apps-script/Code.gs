const AGENDA_CONFIG = Object.freeze({
  agendaSheet: 'AGENDA',
  reservationsSheet: 'RESERVAS',
  timeZone: 'America/Recife',
});

const AGENDA_HEADERS = ['Data', 'Dia', 'Vagas comuns', 'Vagas emergenciais'];
const RESERVATION_HEADERS = [
  'Código da solicitação',
  'Registrada em',
  'Data da consulta',
  'Tipo de vaga',
  'Situação',
];

function configurarPlanilha() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Abra o Apps Script a partir da própria Planilha Google.');

  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  const agenda = getOrCreateSheet_(spreadsheet, AGENDA_CONFIG.agendaSheet, AGENDA_HEADERS);
  const reservations = getOrCreateSheet_(spreadsheet, AGENDA_CONFIG.reservationsSheet, RESERVATION_HEADERS);
  formatAgendaSheet_(agenda);
  formatReservationsSheet_(reservations);

  if (agenda.getLastRow() === 1) {
    const rows = nextDentalDates_().map(function (date) {
      return [date, weekdayName_(date), 0, 0];
    });
    agenda.getRange(2, 1, rows.length, 4).setValues(rows);
    agenda.getRange(2, 1, rows.length, 1).setNumberFormat('dd/MM/yyyy');
  }

  if (!PropertiesService.getScriptProperties().getProperty('ADMIN_KEY')) {
    PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', 'ALTERE-ESTA-CHAVE');
  }

  markUpdated_();
  SpreadsheetApp.flush();
}

function definirChaveAdministrativa() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Chave administrativa',
    'Digite a mesma chave usada no Painel TACS. Evite espaços.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const key = String(response.getResponseText() || '').trim();
  if (key.length < 6) throw new Error('A chave precisa ter pelo menos 6 caracteres.');
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', key);
  ui.alert('Chave administrativa salva.');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Agenda da dentista')
    .addItem('Preparar a planilha', 'configurarPlanilha')
    .addItem('Definir chave administrativa', 'definirChaveAdministrativa')
    .addItem('Adicionar próxima semana', 'adicionarProximaSemana')
    .addToUi();
}

function adicionarProximaSemana() {
  const sheet = getAgendaSheet_();
  const existing = agendaRows_(sheet).map(function (row) { return dateKey_(row[0]); });
  const rows = nextDentalDates_()
    .filter(function (date) { return existing.indexOf(dateKey_(date)) === -1; })
    .map(function (date) { return [date, weekdayName_(date), 0, 0]; });
  if (!rows.length) return;
  const firstRow = sheet.getLastRow() + 1;
  sheet.getRange(firstRow, 1, rows.length, 4).setValues(rows);
  sheet.getRange(firstRow, 1, rows.length, 1).setNumberFormat('dd/MM/yyyy');
  markUpdated_();
  SpreadsheetApp.flush();
}

function doGet(e) {
  const callback = safeCallback_(e && e.parameter ? e.parameter.callback : '');
  let payload;
  try {
    const action = String(e && e.parameter ? e.parameter.action || '' : '');
    if (action !== 'agenda') throw new Error('Ação inválida.');
    payload = readAgenda_();
  } catch (error) {
    payload = failure_('AGENDA_ERROR', error.message || 'Não foi possível carregar a agenda.');
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  const params = e && e.parameter ? e.parameter : {};
  const nonce = String(params.nonce || '').slice(0, 100);
  let payload;
  try {
    const action = String(params.action || '');
    if (action === 'reservar') {
      payload = reserveSlot_(params);
    } else if (action === 'salvar_agenda') {
      payload = saveAgendaAdmin_(params);
    } else {
      throw new Error('Ação inválida.');
    }
  } catch (error) {
    payload = failure_('REQUEST_ERROR', error.message || 'Não foi possível concluir a solicitação.');
  }

  payload.source = 'agenda-odontologica-tacs';
  payload.nonce = nonce;
  const safePayload = JSON.stringify(payload).replace(/</g, '\\u003c').replace(/-->/g, '--\\>');

  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><script>' +
    'window.parent.postMessage(' + safePayload + ',"*");' +
    '</script>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveAgendaAdmin_(params) {
  assertAdminKey_(params.adminKey);
  let body;
  try {
    body = JSON.parse(String(params.payload || '{}'));
  } catch (error) {
    throw new Error('Os dados da agenda são inválidos.');
  }

  const days = Array.isArray(body.dias) ? body.dias : [];
  if (!days.length || days.length > 40) throw new Error('Informe entre 1 e 40 datas.');

  const seen = {};
  const rows = days.map(function (item) {
    const date = dateKey_(item && item.data);
    if (!date) throw new Error('Há uma data inválida.');
    if (seen[date]) throw new Error('A data ' + date + ' está repetida.');
    seen[date] = true;

    const weekday = weekdayNumber_(date);
    if ([1, 2, 4].indexOf(weekday) === -1) {
      throw new Error('A data ' + date + ' não é segunda, terça ou quinta-feira.');
    }

    const common = nonNegativeInteger_(item.vagasComuns, 'Vagas comuns');
    const emergency = nonNegativeInteger_(item.vagasEmergenciais, 'Vagas emergenciais');
    return [dateObject_(date), weekdayName_(date), common, emergency];
  }).sort(function (left, right) {
    return dateKey_(left[0]).localeCompare(dateKey_(right[0]));
  });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('A agenda está sendo atualizada. Tente novamente.');
  try {
    const sheet = getAgendaSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 4).clearContent();
    sheet.getRange(2, 1, rows.length, 4).setValues(rows);
    sheet.getRange(2, 1, rows.length, 1).setNumberFormat('dd/MM/yyyy');
    formatAgendaSheet_(sheet);
    markUpdated_();
    SpreadsheetApp.flush();
    return readAgenda_();
  } finally {
    lock.releaseLock();
  }
}

function reserveSlot_(params) {
  const requestId = String(params.requestId || '').trim();
  const date = dateKey_(params.date);
  const type = String(params.type || '').trim();

  if (!/^[A-Z0-9-]{8,50}$/.test(requestId)) return failure_('INVALID_REQUEST', 'Código da solicitação inválido.');
  if (!date) return failure_('INVALID_DATE', 'Data da consulta inválida.');
  if (date < todayKey_()) return failure_('PAST_DATE', 'Essa data já passou e não pode mais receber reservas.');
  if (type !== 'comum' && type !== 'emergencial') return failure_('INVALID_TYPE', 'Tipo de vaga inválido.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return failure_('BUSY', 'A agenda está sendo atualizada. Tente novamente.');

  try {
    const spreadsheet = getSpreadsheet_();
    const agenda = spreadsheet.getSheetByName(AGENDA_CONFIG.agendaSheet);
    const reservations = spreadsheet.getSheetByName(AGENDA_CONFIG.reservationsSheet);
    if (!agenda || !reservations) return failure_('NOT_CONFIGURED', 'A planilha da agenda ainda não foi configurada.');

    const existing = findReservation_(reservations, requestId);
    if (existing) {
      return {ok:true,alreadyReserved:true,requestId:requestId,date:existing.date,type:existing.type,message:'Esta solicitação já possui uma vaga reservada.'};
    }

    const row = findAgendaRow_(agenda, date);
    if (!row) return failure_('DATE_NOT_FOUND', 'Essa data não está mais disponível na agenda.');
    if ([1, 2, 4].indexOf(weekdayNumber_(date)) === -1) return failure_('INVALID_WEEKDAY', 'A agenda odontológica aceita segunda, terça ou quinta-feira.');

    const vacancyColumn = type === 'comum' ? 3 : 4;
    const cell = agenda.getRange(row, vacancyColumn);
    const available = Number(cell.getValue());
    if (!Number.isInteger(available) || available <= 0) {
      return failure_('NO_SLOTS', type === 'emergencial' ? 'A vaga emergencial desse dia acabou.' : 'As vagas comuns desse dia acabaram.');
    }

    const remaining = available - 1;
    cell.setValue(remaining);
    reservations.appendRow([requestId, new Date(), date, type, 'Reservada pelo portal']);
    reservations.getRange(reservations.getLastRow(), 2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    reservations.getRange(reservations.getLastRow(), 3).setNumberFormat('@');
    markUpdated_();
    SpreadsheetApp.flush();

    return {ok:true,alreadyReserved:false,requestId:requestId,date:date,type:type,remaining:remaining,message:'Vaga reservada.'};
  } finally {
    lock.releaseLock();
  }
}

function readAgenda_() {
  const days = agendaRows_(getAgendaSheet_())
    .filter(function (row) { return Boolean(dateKey_(row[0])); })
    .map(function (row) {
      const date = dateKey_(row[0]);
      return {
        id: date,
        dia: String(row[1] || weekdayName_(row[0])),
        data: date,
        vagasComuns: vacancyValue_(row[2]),
        vagasEmergenciais: vacancyValue_(row[3]),
      };
    })
    .sort(function (left, right) { return left.data.localeCompare(right.data); });

  return {
    ok: true,
    atualizadoEm: PropertiesService.getScriptProperties().getProperty('UPDATED_AT') || '',
    dias: days,
  };
}

function assertAdminKey_(provided) {
  const expected = String(PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || '').trim();
  if (!expected || expected === 'ALTERE-ESTA-CHAVE') {
    throw new Error('A chave administrativa ainda não foi configurada no Apps Script.');
  }
  if (String(provided || '').trim() !== expected) throw new Error('Chave administrativa inválida.');
}

function nonNegativeInteger_(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(label + ' deve ser um número inteiro igual ou maior que zero.');
  return number;
}

function dateObject_(key) {
  const parts = key.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Execute a função configurarPlanilha antes de publicar o aplicativo.');
  return SpreadsheetApp.openById(id);
}

function getAgendaSheet_() {
  const sheet = getSpreadsheet_().getSheetByName(AGENDA_CONFIG.agendaSheet);
  if (!sheet) throw new Error('A aba AGENDA não foi encontrada.');
  return sheet;
}

function getOrCreateSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function formatAgendaSheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, AGENDA_HEADERS.length)
    .setBackground('#15332d').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setColumnWidth(1, 115);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 180);
  const rule = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false)
    .setHelpText('Digite uma quantidade igual ou maior que zero.').build();
  sheet.getRange('C2:D').setDataValidation(rule).setBackground('#e9f7f2');
}

function formatReservationsSheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, RESERVATION_HEADERS.length)
    .setBackground('#2a668a').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 170);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 190);
}

function agendaRows_(sheet) {
  const lastRow = sheet.getLastRow();
  return lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, 4).getValues();
}

function findAgendaRow_(sheet, date) {
  const rows = agendaRows_(sheet);
  for (let index = 0; index < rows.length; index += 1) {
    if (dateKey_(rows[index][0]) === date) return index + 2;
  }
  return null;
}

function findReservation_(sheet, requestId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  for (let index = 0; index < rows.length; index += 1) {
    if (String(rows[index][0]) === requestId) {
      return {date:dateKey_(rows[index][2]),type:String(rows[index][3])};
    }
  }
  return null;
}

function vacancyValue_(value) {
  if (value === '' || value === null) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function dateKey_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (Number.isNaN(value.getTime())) return '';
    return Utilities.formatDate(value, AGENDA_CONFIG.timeZone, 'yyyy-MM-dd');
  }
  const text = String(value || '').trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return validDateKey_(Number(match[1]), Number(match[2]), Number(match[3]));
  match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? validDateKey_(Number(match[3]), Number(match[2]), Number(match[1])) : '';
}

function validDateKey_(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function weekdayNumber_(value) {
  const key = dateKey_(value);
  if (!key) return -1;
  const parts = key.split('-').map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
}

function todayKey_() {
  return Utilities.formatDate(new Date(), AGENDA_CONFIG.timeZone, 'yyyy-MM-dd');
}

function weekdayName_(value) {
  return ({1:'Segunda-feira',2:'Terça-feira',4:'Quinta-feira'})[weekdayNumber_(value)] || '';
}

function nextDentalDates_() {
  const parts = todayKey_().split('-').map(Number);
  const today = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  return [1, 2, 4].map(function (targetWeekday) {
    let distance = (targetWeekday - today.getUTCDay() + 7) % 7;
    if (distance === 0) distance = 7;
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + distance);
    return date;
  });
}

function safeCallback_(value) {
  const callback = String(value || '');
  return /^[A-Za-z_$][A-Za-z0-9_$]{0,80}$/.test(callback) ? callback : 'dentalAgendaCallback';
}

function markUpdated_() {
  PropertiesService.getScriptProperties().setProperty(
    'UPDATED_AT',
    Utilities.formatDate(new Date(), AGENDA_CONFIG.timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX")
  );
}

function failure_(code, message) {
  return {ok:false,code:code,message:message};
}
