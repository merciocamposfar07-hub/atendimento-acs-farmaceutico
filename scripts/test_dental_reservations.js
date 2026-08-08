'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

class Range {
  constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
    this.sheet = sheet; this.row = row; this.column = column;
    this.rowCount = rowCount; this.columnCount = columnCount;
  }
  getValue() { return this.sheet.rows[this.row - 1][this.column - 1]; }
  getValues() {
    return Array.from({length: this.rowCount}, (_, r) => {
      const source = this.sheet.rows[this.row - 1 + r] || [];
      return source.slice(this.column - 1, this.column - 1 + this.columnCount);
    });
  }
  setValue(value) { this.sheet.rows[this.row - 1][this.column - 1] = value; return this; }
  setNumberFormat() { return this; }
}

class Sheet {
  constructor(rows) { this.rows = rows; }
  getLastRow() { return this.rows.length; }
  getRange(row, column, rowCount, columnCount) { return new Range(this, row, column, rowCount, columnCount); }
  appendRow(row) { this.rows.push(row); }
}

function nextDates() {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return [1, 2, 4].map(weekday => {
    const date = new Date(base);
    let delta = (weekday - date.getUTCDay() + 7) % 7;
    if (delta === 0) delta = 7;
    date.setUTCDate(date.getUTCDate() + delta);
    return date.toISOString().slice(0, 10);
  });
}

function environment() {
  const dates = nextDates();
  const agenda = new Sheet([
    ['Data', 'Dia', 'Vagas comuns', 'Vagas emergenciais'],
    [dates[0], 'Segunda-feira', 2, 1],
    [dates[1], 'Terça-feira', 0, 2],
    [dates[2], 'Quinta-feira', 1, 0]
  ]);
  const reservations = new Sheet([['Código da solicitação','Registrada em','Data da consulta','Tipo de vaga','Situação']]);
  const spreadsheet = {getSheetByName(name) { return name === 'AGENDA' ? agenda : name === 'RESERVAS' ? reservations : null; }};
  const props = new Map([['SPREADSHEET_ID', 'test-sheet']]);
  const context = {
    console, Date, JSON, Math, Number, Object, String, Array, RegExp,
    SpreadsheetApp: {openById() { return spreadsheet; }, flush() {}},
    PropertiesService: {getScriptProperties() { return {getProperty(k) { return props.get(k) || ''; }, setProperty(k,v) { props.set(k,v); }}; }},
    LockService: {getScriptLock() { return {tryLock() { return true; }, releaseLock() {}}; }},
    Utilities: {formatDate(value, zone, pattern) { assert.equal(zone, 'America/Recife'); return pattern === 'yyyy-MM-dd' ? new Date(value).toISOString().slice(0,10) : new Date(value).toISOString(); }}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'google-apps-script', 'Code.gs'), 'utf8'), context);
  return {context, agenda, reservations, dates};
}

{
  const {context, agenda, reservations, dates} = environment();
  const result = context.reserveSlot_({requestId:'TACS-TEST-0001', date:dates[0], type:'comum'});
  assert.equal(result.ok, true);
  assert.equal(result.remaining, 1);
  assert.equal(agenda.rows[1][2], 1);
  assert.equal(reservations.rows.length, 2);
}
{
  const {context, agenda, dates} = environment();
  const result = context.reserveSlot_({requestId:'TACS-TEST-0002', date:dates[1], type:'emergencial'});
  assert.equal(result.ok, true);
  assert.equal(result.remaining, 1);
  assert.equal(agenda.rows[2][3], 1);
}
{
  const {context, agenda, reservations, dates} = environment();
  const params = {requestId:'TACS-TEST-0003', date:dates[0], type:'comum'};
  assert.equal(context.reserveSlot_(params).ok, true);
  const second = context.reserveSlot_(params);
  assert.equal(second.alreadyReserved, true);
  assert.equal(agenda.rows[1][2], 1);
  assert.equal(reservations.rows.length, 2);
}
{
  const {context, agenda, dates} = environment();
  const result = context.reserveSlot_({requestId:'TACS-TEST-0004', date:dates[1], type:'comum'});
  assert.equal(result.ok, false);
  assert.equal(result.code, 'NO_SLOTS');
  assert.equal(agenda.rows[2][2], 0);
}

const portal = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert.match(portal, /DENTAL_REGULAR='Solicitar atendimento odontológico \(dentista\)'/);
assert.match(portal, /DENTAL_EMERGENCY='Solicitar atendimento odontológico de emergência \(dentista\)'/);
assert.match(portal, /reserveSlot\(\)\.then/);
assert.match(portal, /event\.source!==iframe\.contentWindow/);
assert.equal((portal.match(/form\.submit\(\)/g) || []).length, 1);

const config = fs.readFileSync(path.join(ROOT, 'agenda-config.js'), 'utf8');
assert.match(config, /TACS_ADMIN_API_URL\s*=\s*'https:\/\/script\.google\.com\/macros\/s\/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw\/exec'/);
assert.doesNotMatch(config, /reserveSlot|reservar|salvar_agenda/);

console.log('OK: reservas odontológicas continuam idempotentes e o frontend preserva o contrato oficial.');
