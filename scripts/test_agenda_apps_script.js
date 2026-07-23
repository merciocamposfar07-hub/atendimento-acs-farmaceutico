#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class MockRange {
  constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rowCount = rowCount;
    this.columnCount = columnCount;
  }

  getValue() {
    return this.sheet.rows[this.row - 1][this.column - 1];
  }

  getValues() {
    const values = [];
    for (let row = 0; row < this.rowCount; row += 1) {
      const source = this.sheet.rows[this.row - 1 + row] || [];
      values.push(
        source.slice(this.column - 1, this.column - 1 + this.columnCount)
      );
    }
    return values;
  }

  setValue(value) {
    this.sheet.rows[this.row - 1][this.column - 1] = value;
    return this;
  }

  setNumberFormat() {
    return this;
  }
}

class MockSheet {
  constructor(rows) {
    this.rows = rows;
  }

  getLastRow() {
    return this.rows.length;
  }

  getRange(row, column, rowCount, columnCount) {
    assert.equal(typeof row, 'number');
    return new MockRange(this, row, column, rowCount, columnCount);
  }

  appendRow(row) {
    this.rows.push(row);
  }
}

function nextAllowedDates() {
  const today = new Date();
  const midnight = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );
  return [1, 2, 4].map((weekday) => {
    const date = new Date(midnight);
    let distance = (weekday - date.getUTCDay() + 7) % 7;
    if (distance === 0) distance = 7;
    date.setUTCDate(date.getUTCDate() + distance);
    return date.toISOString().slice(0, 10);
  });
}

function createContext() {
  const dates = nextAllowedDates();
  const agenda = new MockSheet([
    ['Data', 'Dia', 'Vagas comuns', 'Vagas emergenciais'],
    [dates[0], 'Segunda-feira', 2, 1],
    [dates[1], 'Terça-feira', 0, 2],
    [dates[2], 'Quinta-feira', 1, 0],
  ]);
  const reservations = new MockSheet([
    [
      'Código da solicitação',
      'Registrada em',
      'Data da consulta',
      'Tipo de vaga',
      'Situação',
    ],
  ]);
  const spreadsheet = {
    getSheetByName(name) {
      if (name === 'AGENDA') return agenda;
      if (name === 'RESERVAS') return reservations;
      return null;
    },
  };
  const properties = new Map([['SPREADSHEET_ID', 'test-sheet']]);

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
    SpreadsheetApp: {
      openById() {
        return spreadsheet;
      },
      flush() {},
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(key) {
            return properties.get(key) || '';
          },
          setProperty(key, value) {
            properties.set(key, value);
          },
        };
      },
    },
    LockService: {
      getScriptLock() {
        return {
          tryLock() {
            return true;
          },
          releaseLock() {},
        };
      },
    },
    Utilities: {
      formatDate(value, timezone, pattern) {
        assert.equal(timezone, 'America/Recife');
        if (pattern === 'yyyy-MM-dd') {
          return new Date(value).toISOString().slice(0, 10);
        }
        return new Date(value).toISOString();
      },
    },
  };

  vm.createContext(context);
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'google-apps-script', 'Code.gs'),
    'utf8'
  );
  vm.runInContext(source, context);
  return { context, agenda, reservations, dates };
}

function testCommonReservation() {
  const { context, agenda, reservations, dates } = createContext();
  const result = context.reserveSlot_({
    requestId: 'TACS-230726-ABCD',
    date: dates[0],
    type: 'comum',
  });
  assert.equal(result.ok, true);
  assert.equal(result.remaining, 1);
  assert.equal(agenda.rows[1][2], 1);
  assert.equal(agenda.rows[1][3], 1);
  assert.equal(reservations.rows.length, 2);
}

function testEmergencyReservation() {
  const { context, agenda, dates } = createContext();
  const result = context.reserveSlot_({
    requestId: 'TACS-230726-EFGH',
    date: dates[1],
    type: 'emergencial',
  });
  assert.equal(result.ok, true);
  assert.equal(result.remaining, 1);
  assert.equal(agenda.rows[2][2], 0);
  assert.equal(agenda.rows[2][3], 1);
}

function testIdempotency() {
  const { context, agenda, reservations, dates } = createContext();
  const params = {
    requestId: 'TACS-230726-JKLM',
    date: dates[0],
    type: 'comum',
  };
  const first = context.reserveSlot_(params);
  const second = context.reserveSlot_(params);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.alreadyReserved, true);
  assert.equal(agenda.rows[1][2], 1);
  assert.equal(reservations.rows.length, 2);
}

function testUnavailableSlot() {
  const { context, agenda, dates } = createContext();
  const result = context.reserveSlot_({
    requestId: 'TACS-230726-NPQR',
    date: dates[1],
    type: 'comum',
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'NO_SLOTS');
  assert.equal(agenda.rows[2][2], 0);
}

testCommonReservation();
testEmergencyReservation();
testIdempotency();
testUnavailableSlot();

const portal = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.match(
  portal,
  /DENTAL_REGULAR_CATEGORY='Solicitar atendimento odontológico \(dentista\)'/
);
assert.match(
  portal,
  /DENTAL_EMERGENCY_CATEGORY='Solicitar atendimento odontológico de emergência \(dentista\)'/
);
assert.match(portal, /type==='emergencial'\?slot\.vagasEmergenciais:slot\.vagasComuns/);
assert.match(portal, /reserveDentalSlot\(\)\.then/);
assert.match(portal, /form\.submit\(\)/);
assert.ok(
  portal.indexOf('<script src="agenda-config.js"></script>') <
    portal.indexOf("var DENTAL_AGENDA_API_URL="),
  'A configuração da agenda precisa carregar antes do código do portal.'
);

console.log('Agenda: 4 testes de reserva e integração do portal concluídos.');
