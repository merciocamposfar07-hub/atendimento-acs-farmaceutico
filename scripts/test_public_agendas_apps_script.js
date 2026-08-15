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

const noticeRows = [
  ['ID', 'TITULO', 'MENSAGEM', 'PRIORIDADE', 'VALIDADE', 'ATIVO', 'ATUALIZADO_EM', 'AREA_ID'],
  ['RECADO_JAPARANDUBA_1', 'Horário da dentista', 'O atendimento com a dentista é até as 11:00 hs!', 'IMPORTANTE', '31/12/2099', true, '', 'JAPARANDUBA'],
  ['RECADO_MUNTUNS_1', 'Outro território', 'Não pode aparecer em Japaranduba.', 'INFORMATIVO', '31/12/2099', true, '', 'MUNTUNS']
];
const noticeSheet = {
  getName: () => 'RECADOS_PORTAL',
  getLastRow: () => noticeRows.length,
  getLastColumn: () => noticeRows[0].length,
  getRange: (row, column, rowCount, columnCount) => {
    const selected = noticeRows
      .slice(row - 1, row - 1 + rowCount)
      .map(values => values.slice(column - 1, column - 1 + columnCount));
    return {
      getDisplayValues: () => selected.map(values => values.map(value => String(value)))
    };
  }
};

function displaySheet(name, values) {
  return {
    getName: () => name,
    getLastRow: () => values.length,
    getLastColumn: () => values[0].length,
    getRange: (row, column, rowCount, columnCount) => {
      const selected = values
        .slice(row - 1, row - 1 + rowCount)
        .map(line => line.slice(column - 1, column - 1 + columnCount));
      return {
        getDisplayValues: () => selected.map(line => line.map(value => String(value)))
      };
    }
  };
}

const professionalsSheet = displaySheet('PROFISSIONAIS', [
  ['ID', 'TITULO_PUBLICO', 'ICONE', 'ORDEM', 'ATIVO', 'AREA_ID'],
  ['DENTISTA', 'Dentista de Japaranduba', '🦷', 1, true, ''],
  ['DENTISTA', 'Dentista de Muntuns', '🦷', 1, true, 'MUNTUNS']
]);
const servicesSheet = displaySheet('SERVICOS', [
  ['ID', 'PROFISSIONAL_ID', 'NOME', 'DESCRICAO_AUTOMATICA', 'ORDEM', 'ATIVO', 'AREA_ID'],
  ['ODONTO_JAP', 'DENTISTA', 'Odontologia', 'Serviço exclusivo de Japaranduba', 1, true, ''],
  ['ODONTO_MUNTUNS', 'DENTISTA', 'Odontologia', 'Serviço exclusivo de Muntuns', 1, true, 'MUNTUNS']
]);
const sharedSpreadsheet = {
  getSheets: () => [sheet, noticeSheet, professionalsSheet, servicesSheet],
  getSheetByName: name => ({
    RECADOS_PORTAL: noticeSheet,
    PROFISSIONAIS: professionalsSheet,
    SERVICOS: servicesSheet
  })[name] || null
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
  adminTacsV1Planilha_: () => sharedSpreadsheet,
  PropertiesService: {
    getScriptProperties: () => { throw new Error('Não deve consultar SPREADSHEET_ID quando a fonte compartilhada existe.'); }
  },
  SpreadsheetApp: {
    openById: () => { throw new Error('Não deve abrir por ID quando a fonte compartilhada existe.'); },
    getActiveSpreadsheet: () => { throw new Error('Não deve depender de planilha ativa no Web App.'); }
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
assert.equal(result.recados.length, 1);
assert.equal(result.recados[0].title, 'Horário da dentista');
assert.match(result.recados[0].message, /dentista é até as 11:00/);
assert.equal(result.recados[0].active, true);
assert.equal(result.professionals.length, 1);
assert.equal(result.professionals[0].title, 'Dentista de Japaranduba');
assert.equal(
  result.professionals[0].service.description,
  'Serviço exclusivo de Japaranduba'
);

const muntunsResult = context.publicoAgendasV1Montar_('MUNTUNS');
assert.equal(muntunsResult.areaId, 'MUNTUNS');
assert.equal(muntunsResult.modules.medica.length, 1);
assert.equal(muntunsResult.modules.medica[0].message, 'Atendimento Muntuns');
assert.equal(muntunsResult.recados.length, 1);
assert.equal(muntunsResult.recados[0].title, 'Outro território');
assert.equal(muntunsResult.professionals.length, 1);
assert.equal(muntunsResult.professionals[0].title, 'Dentista de Muntuns');
assert.equal(
  muntunsResult.professionals[0].service.description,
  'Serviço exclusivo de Muntuns'
);
assert.doesNotMatch(JSON.stringify(muntunsResult.professionals), /Japaranduba/);
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

console.log('Apps Script público: agendas preservadas e recados ativos publicados por área.');
