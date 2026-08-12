'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'apps-script', 'ZZ_12_PublicoAgendasPortalV1.gs'),
  'utf8'
);

function formatDate(date, timeZone, pattern) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  if (pattern === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
  if (pattern === 'HH') return '09';
  return `${day}/${month}/${year} 09:00`;
}

const rows = [
  [
    'MODULO', 'ORDEM', 'DIA', 'ATIVO', 'DATA', 'HORARIO', 'SITUACAO',
    'MENSAGEM', 'ENCERRA_12H', 'VAGAS_COMUNS', 'VAGAS_EMERGENCIAIS',
    'DIA_EXTRA', 'ATUALIZADO_EM', 'AREA_ID'
  ],
  [
    'MEDICA', 5, 'Sexta-feira', true, new Date(Date.UTC(2099, 7, 7)),
    '08:00 as 12:00', 'CANCELADO', 'Atendimento médico', false, 15, 0,
    false, new Date(Date.UTC(2026, 7, 5)), ''
  ],
  [
    'MEDICA', 6, 'Segunda-feira', true, new Date(Date.UTC(2099, 7, 10)),
    '08:00 as 12:00', 'Atendimento', 'Atendimento Muntuns', false, 8, 0,
    false, new Date(Date.UTC(2026, 7, 5)), 'MUNTUNS'
  ]
];

const sheet = {
  getName: () => 'AGENDAS',
  getLastRow: () => rows.length,
  getLastColumn: () => rows[0].length,
  getRange: (row, column, rowCount, columnCount) => {
    const selected = rows
      .slice(row - 1, row - 1 + rowCount)
      .map(values => values.slice(column - 1, column - 1 + columnCount));
    return {
      getValues: () => selected,
      getDisplayValues: () => selected.map(values =>
        values.map(value => value instanceof Date ? formatDate(value, 'UTC', 'yyyy-MM-dd') : String(value))
      )
    };
  }
};

const context = {
  console,
  Date,
  JSON,
  Math,
  Number,
  Object,
  String,
  isFinite,
  isNaN,
  PropertiesService: {
    getScriptProperties: () => ({getProperty: () => ''})
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({getSheets: () => [sheet]})
  },
  Utilities: {formatDate},
  ContentService: {
    MimeType: {JAVASCRIPT: 'js', JSON: 'json'},
    createTextOutput: text => ({
      text,
      mime: '',
      setMimeType(type) {
        this.mime = type;
        return this;
      }
    })
  }
};

vm.createContext(context);
vm.runInContext(source, context);

const result = context.publicoAgendasV1Montar_();
assert.equal(result.ok, true);
assert.equal(result.somenteLeitura, true);
assert.equal(result.origem, 'AGENDAS');
assert.equal(result.modules.medica.length, 1);
assert.equal(result.modules.medica[0].active, true);
assert.equal(result.modules.medica[0].status, 'CANCELADO');
assert.equal(result.modules.medica[0].date, '2099-08-07');
assert.equal(result.modules.medica[0].common, 15);
assert.equal(result.areaId, 'JAPARANDUBA');
assert.equal(result.modules.medica.length, 1);

const muntunsResult = context.publicoAgendasV1Montar_('MUNTUNS');
assert.equal(muntunsResult.areaId, 'MUNTUNS');
assert.equal(muntunsResult.modules.medica.length, 1);
assert.equal(muntunsResult.modules.medica[0].message, 'Atendimento Muntuns');
assert.equal(result.modules.MEDICA, undefined);

const response = context.doGet({
  parameter: {action: 'painel_publico', areaId: 'JAPARANDUBA', callback: 'testeCallback'}
});
assert.equal(response.mime, 'js');
assert.match(response.text, /^testeCallback\(\{"ok":true/);
assert.doesNotMatch(response.text, /pin|token|sessao|morador/i);

assert.equal(context.publicoAgendasV1Modulo_('MÉDICA'), 'medica');
assert.equal(context.publicoAgendasV1Modulo_('Nutricionista'), 'nutricionista');
assert.equal(context.publicoAgendasV1Booleano_('TRUE'), true);
assert.equal(context.publicoAgendasV1Booleano_('false'), false);

console.log('Apps Script público: MEDICA normalizada e agenda cancelada publicada sem dados privados.');
