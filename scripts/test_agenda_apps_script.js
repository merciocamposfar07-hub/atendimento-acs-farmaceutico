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
  /DENTAL_REGULAR='Solicitar atendimento odontológico \(dentista\)'/
);
assert.match(
  portal,
  /DENTAL_EMERGENCY='Solicitar atendimento odontológico de emergência \(dentista\)'/
);
assert.match(
  portal,
  /var v=type==='emergencial'\?slot\.vagasEmergenciais:slot\.vagasComuns/
);
assert.match(portal, /reserveSlot\(\)\.then/);
assert.match(portal, /form\.submit\(\)/);
assert.match(portal, /event\.source!==iframe\.contentWindow/);
assert.match(
  portal,
  /DENTAL_ALLOWED_DAYS=\['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira'\]/
);
assert.match(
  portal,
  /DENTAL_ALLOWED_DAYS\.indexOf\(String\(slot&&slot\.dia\|\|''\)\.trim\(\)\)!==-1/
);
assert.ok(
  portal.indexOf('src="agenda-config.js?v=') <
    portal.indexOf("var DENTAL_API="),
  'A configuração da agenda precisa carregar antes do código do portal.'
);
assert.match(portal, /src="portal-controle-integral\.js\?v=/);
assert.doesNotMatch(portal, /AKfycbwfcTFh7DR3eQa7pA1AQ_f1_aOEe_/);
assert.doesNotMatch(portal, /solicitacao-card\.js/);
assert.equal(
  (portal.match(/form\.submit\(\)/g) || []).length,
  1,
  'O portal oficial deve possuir uma única rotina de envio da reserva odontológica.'
);

const agendaConfig = fs.readFileSync(
  path.join(__dirname, '..', 'agenda-config.js'),
  'utf8'
);
assert.doesNotMatch(agendaConfig, /reserveSlot|reservar|salvar_agenda/);
assert.doesNotMatch(agendaConfig, /AKfycbwfcTFh7DR3eQa7pA1AQ_f1_aOEe_/);
assert.doesNotMatch(agendaConfig, /AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/);
assert.match(
  agendaConfig,
  /TACS_ADMIN_API_URL\s*=\s*'https:\/\/script\.google\.com\/macros\/s\/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw\/exec'/
);

const nurseScript = fs.readFileSync(
  path.join(__dirname, '..', 'agenda-enfermeira.js'),
  'utf8'
);
assert.doesNotMatch(
  nurseScript,
  /dentalPublic|DENTAL_REGULAR|DENTAL_EMERGENCY|DENTAL_AGENDA_API_URL/
);
assert.match(nurseScript, /window\.TACS_ADMIN_API_URL/);
assert.doesNotMatch(nurseScript, /AKfycbzvhH-x6x8Jbg6_F7nuUn1DaS7A08l97Saq5RpjeoFJsCq6wRdVUyGWBNOiboqTLd3rfQ/);

const adminPage = fs.readFileSync(
  path.join(__dirname, '..', 'admin.html'),
  'utf8'
);
assert.match(adminPage, /src="admin-controle-integral\.js\?v=/);
assert.doesNotMatch(adminPage, /admin-post-confirmacao-fix\.js/);
assert.doesNotMatch(adminPage, /admin-post-fetch-fix\.js/);
assert.doesNotMatch(adminPage, /portal-atualizado\.html/);

const adminController = fs.readFileSync(
  path.join(__dirname, '..', 'admin-controle-integral.js'),
  'utf8'
);
assert.match(adminController, /event\.source !== frame\.contentWindow/);
assert.match(adminController, /action: 'salvar_agenda'/);
assert.match(adminController, /data\.source === 'portal-tacs'/);
assert.match(adminController, /data\.source === 'agenda-odontologica-tacs'/);
assert.doesNotMatch(adminController, /NOTICE|no-cors|fallback/i);

const legacyPortal = fs.readFileSync(
  path.join(__dirname, '..', 'portal-atualizado.html'),
  'utf8'
);
assert.match(legacyPortal, /var target = '\.\/index\.html'/);
assert.match(legacyPortal, /window\.location\.replace\(target\)/);

const legacyNoticesAdmin = fs.readFileSync(
  path.join(__dirname, '..', 'admin-avisos.html'),
  'utf8'
);
assert.match(legacyNoticesAdmin, /var target = '\.\/admin\.html'/);
assert.doesNotMatch(
  legacyNoticesAdmin,
  /POSTO_MATIAS_AVISOS_API_URL|no-cors|publicarAvisos/
);

const opener = fs.readFileSync(path.join(__dirname, '..', 'abrir.html'), 'utf8');
assert.match(opener, /portal-version\.json\?t=/);
assert.match(opener, /index\.html\?ptv=/);
assert.match(opener, /scopePath===APP_SCOPE&&scopePath\.indexOf\('\/push\/'\)===-1/);
assert.doesNotMatch(opener, /index\.html\?v=20260805-agenda-sync-v1/);

const mainBackend = fs.readFileSync(
  path.join(__dirname, '..', 'apps-script-controle-integral.gs'),
  'utf8'
);
assert.match(
  mainBackend,
  /setXFrameOptionsMode\(HtmlService\.XFrameOptionsMode\.ALLOWALL\)/
);
assert.match(
  mainBackend,
  /if\(\['medica','nutricionista'\]\.indexOf\(module\)<0\)/
);
assert.match(mainBackend, /var out=\{medica:\[\],nutricionista:\[\]\}/);
assert.doesNotMatch(
  mainBackend,
  /var out=\{medica:\[\],nutricionista:\[\],enfermeira:\[\],odontologia:\[\]\}/
);

[
  'admin-espelho.js',
  'admin-painel.js',
  'admin-post-confirmacao-fix.js',
  'admin-post-fetch-fix.js',
  'admin-publicacao-fix.js',
  'agenda-enfermeira-publica-fix.js',
  'avisos-portal-fix.js',
  'avisos-remocao-fix.js',
  'apps-script-avisos.gs',
  'apps-script-painel-tacs.gs',
  path.join('google-apps-script-avisos', 'Index.html'),
  path.join('.github', 'workflows', 'atualizar-vagas-odontologia.yml'),
  path.join('.github', 'workflows', 'integrar-agenda-enfermeira.yml'),
  'agenda-odontologica.json',
  path.join('scripts', 'atualizar_vagas_odontologia.py'),
  'moradores-api-redirect.js',
  'moradores-pais-compat.js',
  'agendas-semana.js',
  'portal-modules.js',
  'solicitacao-card.js',
  'solicitacao-status-fix.js',
  'portal-morador-cleanup.js',
  'portal-escala-mobile-fix.js',
  'notificacoes-config.js',
  'notificacoes-ui-fix.js',
  'notificacoes-visiveis-fix.js',
  'notificacoes.js',
  'OneSignalSDKWorker.js',
  'admin-painel.css'
].forEach(function (legacyPath) {
  assert.equal(
    fs.existsSync(path.join(__dirname, '..', legacyPath)),
    false,
    'O controlador antigo não pode permanecer no projeto: ' + legacyPath
  );
});

console.log(
  'Agenda: reservas, fontes oficiais e rotas antigas validadas.'
);
