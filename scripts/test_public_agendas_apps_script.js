'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'apps-script-controle-integral.gs'), 'utf8');

class Range {
  constructor(sheet, row, column, rowCount, columnCount) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rowCount = rowCount || 1;
    this.columnCount = columnCount || 1;
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.rowCount; r += 1) {
      const src = this.sheet.rows[this.row - 1 + r] || [];
      out.push(Array.from({length: this.columnCount}, (_, c) => src[this.column - 1 + c] ?? ''));
    }
    return out;
  }
  setValues(values) {
    for (let r = 0; r < values.length; r += 1) {
      while (this.sheet.rows.length < this.row + r) this.sheet.rows.push([]);
      const target = this.sheet.rows[this.row - 1 + r];
      values[r].forEach((value, c) => { target[this.column - 1 + c] = value; });
    }
    return this;
  }
  clearContent() { return this; }
  setValue(value) {
    for (let r = 0; r < this.rowCount; r += 1) {
      while (this.sheet.rows.length < this.row + r) this.sheet.rows.push([]);
      const target = this.sheet.rows[this.row - 1 + r];
      for (let c = 0; c < this.columnCount; c += 1) target[this.column - 1 + c] = value;
    }
    return this;
  }
}

class Sheet {
  constructor(name, rows) { this.name = name; this.rows = rows.map(row => row.slice()); }
  getLastRow() { return this.rows.length; }
  getRange(row, column, rowCount, columnCount) { return new Range(this, row, column, rowCount, columnCount); }
  setFrozenRows() { return this; }
  autoResizeColumns() { return this; }
  appendRow(row) { this.rows.push(row.slice()); return this; }
}

const moduleHeaders = [
  'MODULO', 'ORDEM', 'DIA', 'ATIVO', 'DATA', 'HORARIO', 'SITUACAO',
  'MENSAGEM', 'ENCERRA_12H', 'VAGAS_COMUNS', 'VAGAS_EMERGENCIAIS',
  'DIA_EXTRA', 'ATUALIZADO_EM'
];
const sheets = {
  PAINEL_PROFISSIONAIS: new Sheet('PAINEL_PROFISSIONAIS', [
    moduleHeaders,
    ['MEDICA', 1, 'Segunda-feira', true, '2099-08-07', '08:00 as 12:00', 'ATENDIMENTO', 'Atendimento médico', false, 15, 0, false, ''],
    ['NUTRICIONISTA', 1, 'Terça-feira', true, '2099-08-08', '08:00 as 12:00', 'ATENDIMENTO', 'Nutrição', false, 0, 0, false, '']
  ]),
  RECADOS_PORTAL: new Sheet('RECADOS_PORTAL', [
    ['ID', 'TITULO', 'MENSAGEM', 'PRIORIDADE', 'VALIDADE', 'ATIVO', 'ATUALIZADO_EM'],
    ['r1', 'Recado preservado', 'Mensagem', 'informativo', '2099-12-31', true, '']
  ]),
  CAMPANHAS_PORTAL: new Sheet('CAMPANHAS_PORTAL', [
    ['ID', 'TITULO', 'MENSAGEM', 'INICIO', 'DIAS', 'ATIVO', 'ATUALIZADO_EM'],
    ['c1', 'Campanha preservada', 'Campanha', '2099-08-01', 30, true, '']
  ]),
  AGENDA_ENFERMEIRA: new Sheet('AGENDA_ENFERMEIRA', [['ORDEM', 'DIA', 'ATENDIMENTO', 'ICONE', 'DISPONIVEL', 'ATUALIZADO_EM']]),
  CONFIGURACOES: new Sheet('CONFIGURACOES', [['CHAVE', 'VALOR']])
};
const spreadsheet = {
  getSheetByName(name) { return sheets[name] || null; },
  insertSheet(name) { return (sheets[name] = new Sheet(name, [])); }
};

function formatDate(date, zone, pattern) {
  if (pattern === 'yyyy-MM-dd') return '2099-08-07';
  if (pattern === 'HH') return '09';
  return '07/08/2099 09:00';
}

const context = {
  console,
  Date,
  JSON,
  Math,
  Number,
  Object,
  String,
  Array,
  RegExp,
  Error,
  isFinite,
  isNaN,
  PropertiesService: {getScriptProperties: () => ({getProperty: () => ''})},
  SpreadsheetApp: {
    getActiveSpreadsheet: () => spreadsheet,
    openById: () => spreadsheet,
    flush() {}
  },
  Utilities: {formatDate, getUuid: () => 'uuid-teste'},
  ContentService: {
    MimeType: {JAVASCRIPT: 'js', JSON: 'json'},
    createTextOutput(text) {
      return {text, mime: '', setMimeType(type) { this.mime = type; return this; }};
    }
  },
  HtmlService: {
    XFrameOptionsMode: {ALLOWALL: 'allowall'},
    createHtmlOutput(text) { return {text, setXFrameOptionsMode() { return this; }}; }
  }
};
vm.createContext(context);
vm.runInContext(source, context);

assert.equal(context.tacsModuleKey_('MEDICA'), 'medica');
assert.equal(context.tacsModuleKey_('MÉDICA'), 'medica');
assert.equal(context.tacsModuleKey_('medica'), 'medica');
assert.equal(context.tacsModuleKey_('NUTRIÇÃO'), 'nutricionista');

const publicData = context.tacsGetPublic_();
assert.equal(publicData.ok, true);
assert.equal(publicData.modules.medica.length, 1, 'MEDICA em caixa alta foi descartada.');
assert.equal(publicData.modules.nutricionista.length, 1, 'NUTRICIONISTA em caixa alta foi descartada.');
assert.equal(publicData.modules.medica[0].day, 'Segunda-feira');
assert.equal(publicData.modules.medica[0].active, true);
assert.equal(publicData.recados.length, 1, 'Recados desapareceram da resposta pública unificada.');
assert.equal(publicData.campanhas.length, 1, 'Campanhas desapareceram da resposta pública unificada.');

const response = context.doGet({parameter: {action: 'painel_publico', callback: 'cbTeste'}});
assert.equal(response.mime, 'js');
assert.match(response.text, /^cbTeste\(/);
const payloadText = response.text.replace(/^cbTeste\(/, '').replace(/\);$/, '');
const payload = JSON.parse(payloadText);
assert.equal(payload.modules.medica.length, 1);
assert.equal(payload.recados[0].title, 'Recado preservado');
assert.equal(payload.campanhas[0].title, 'Campanha preservada');
assert.doesNotMatch(response.text, /pin|token|sessao|morador/i);

assert.equal(
  fs.existsSync(path.join(ROOT, 'apps-script', 'ZZ_12_PublicoAgendasPortalV1.gs')),
  false,
  'A rota pública concorrente de agendas voltou ao projeto.'
);

console.log('Apps Script público estável: módulos normalizados e agenda + recados + campanhas preservados na mesma resposta.');
