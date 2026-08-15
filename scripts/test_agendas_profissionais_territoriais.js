'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(ROOT, 'apps-script', 'ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs'),
  'utf8'
);

class Output {
  constructor(content) { this.content = String(content); }
  getContent() { return this.content; }
  setMimeType() { return this; }
  setXFrameOptionsMode() { return this; }
}

class Range {
  constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rowCount = rowCount;
    this.columnCount = columnCount;
  }
  getValues() {
    return Array.from({length: this.rowCount}, (_, r) => {
      const sourceRow = this.sheet.rows[this.row - 1 + r] || [];
      return Array.from({length: this.columnCount}, (_, c) =>
        sourceRow[this.column - 1 + c] ?? ''
      );
    });
  }
  getDisplayValues() {
    return this.getValues().map(row => row.map(value => {
      if (value instanceof Date) {
        const day = String(value.getUTCDate()).padStart(2, '0');
        const month = String(value.getUTCMonth() + 1).padStart(2, '0');
        return `${day}/${month}/${value.getUTCFullYear()}`;
      }
      return String(value == null ? '' : value);
    }));
  }
  setValues(values) {
    assert.equal(values.length, this.rowCount);
    for (let r = 0; r < this.rowCount; r += 1) {
      while (this.sheet.rows.length < this.row + r) this.sheet.rows.push([]);
      const target = this.sheet.rows[this.row - 1 + r];
      for (let c = 0; c < this.columnCount; c += 1) {
        target[this.column - 1 + c] = values[r][c];
      }
    }
    return this;
  }
  setValue(value) {
    return this.setValues(Array.from({length: this.rowCount}, () =>
      Array.from({length: this.columnCount}, () => value)
    ));
  }
}

class Sheet {
  constructor(name, rows) {
    this.name = name;
    this.rows = rows.map(row => row.slice());
  }
  getName() { return this.name; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); }
  getRange(row, column, rowCount, columnCount) {
    return new Range(this, row, column, rowCount, columnCount);
  }
  appendRow(row) {
    const width = Math.max(this.getLastColumn(), row.length);
    const copy = row.slice();
    while (copy.length < width) copy.push('');
    this.rows.push(copy);
    return this;
  }
  setFrozenRows() { return this; }
}

const PROF_HEADERS = ['ID','NOME','TITULO_PUBLICO','ICONE','ORDEM','ATIVO','AREA_ID','ATUALIZADO_EM'];
const SERV_HEADERS = ['ID','PROFISSIONAL_ID','NOME','DESCRICAO_AUTOMATICA','ORDEM','ATIVO','PERMITE_VAGA_COMUM','PERMITE_EMERGENCIA','AREA_ID','ATUALIZADO_EM'];
const AGENDA_HEADERS = ['MODULO','ORDEM','DIA','ATIVO','DATA','HORARIO','SITUACAO','MENSAGEM','ENCERRA_12H','VAGAS_COMUNS','VAGAS_EMERGENCIAIS','DIA_EXTRA','AREA_ID','ATUALIZADO_EM'];
const RESERVA_HEADERS = ['CODIGO_SOLICITACAO','REGISTRADA_EM','DATA_CONSULTA','TIPO_VAGA','SITUACAO','VAGAS_RESTANTES','AREA_ID','ATUALIZADO_EM'];

const sheets = {
  PROFISSIONAIS: new Sheet('PROFISSIONAIS', [
    PROF_HEADERS,
    ['DENTISTA','Dentista Japaranduba','Atendimento odontológico','🦷',1,true,'',''],
    ['DENTISTA','Dentista Sítio Matias','Atendimento odontológico','🦷',1,true,'SITIO_MATIAS','']
  ]),
  SERVICOS: new Sheet('SERVICOS', [
    SERV_HEADERS,
    ['ATEND_DENT','DENTISTA','Odontologia','Agenda de Japaranduba',1,true,true,true,'',''],
    ['ATEND_DENT','DENTISTA','Odontologia','Agenda do Sítio Matias',1,true,true,true,'SITIO_MATIAS','']
  ]),
  PAINEL_PROFISSIONAIS: new Sheet('PAINEL_PROFISSIONAIS', [
    AGENDA_HEADERS,
    ['DENTISTA',1,'Segunda-feira',true,'2099-08-17','08:00 às 12:00','ATENDIMENTO','Japaranduba',false,2,1,false,'',''],
    ['DENTISTA',1,'Segunda-feira',true,'2099-08-17','08:00 às 12:00','ATENDIMENTO','Sítio Matias',false,4,1,false,'SITIO_MATIAS','']
  ]),
  RESERVAS_ODONTOLOGIA: new Sheet('RESERVAS_ODONTOLOGIA', [RESERVA_HEADERS])
};

const spreadsheet = {
  getSheetByName(name) { return sheets[name] || null; },
  insertSheet(name) {
    sheets[name] = new Sheet(name, []);
    return sheets[name];
  }
};

const cache = new Map();
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
  isNaN,
  doGet: () => new Output(JSON.stringify({legacy: true})),
  doPost: () => new Output('legacy-post'),
  tacsTerritorioV1Planilha_: () => spreadsheet,
  tacsTerritorioV1ValidarAcesso_: p => {
    if (!p || p.territorioToken !== 'territorio-manoel') throw new Error('Sessão territorial inválida.');
    return {
      perfil: 'TACS',
      areaId: 'SITIO_MATIAS',
      tacsId: 'MANOEL',
      operadorId: 'TACS:MANOEL',
      permissoes: ['AGENDAS_GERENCIAR','PROFISSIONAIS_GERENCIAR']
    };
  },
  tacsTerritorioV1EncontrarArea_: areaId => ({areaId, ativa: true}),
  tacsTerritorioV1ExigirAdmin_: () => {},
  SpreadsheetApp: {
    getActiveSpreadsheet: () => spreadsheet,
    flush() {}
  },
  LockService: {
    getScriptLock: () => ({tryLock: () => true, releaseLock() {}})
  },
  CacheService: {
    getScriptCache: () => ({
      put(key, value) { cache.set(key, String(value)); },
      get(key) { return cache.get(key) || null; }
    })
  },
  ContentService: {
    MimeType: {JSON: 'json', JAVASCRIPT: 'javascript'},
    createTextOutput: content => new Output(content)
  },
  HtmlService: {
    XFrameOptionsMode: {ALLOWALL: 'allowall'},
    createHtmlOutput: content => new Output(content)
  },
  Utilities: {
    formatDate(date, zone, pattern) {
      assert.equal(zone, 'America/Recife');
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      if (pattern === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
      return `${day}/${month}/${year} 10:00`;
    }
  }
};

vm.createContext(context);
vm.runInContext(source, context, {filename: 'ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs'});

function json(output) { return JSON.parse(output.getContent()); }
function agendaRow(areaId) {
  const areaIndex = AGENDA_HEADERS.indexOf('AREA_ID');
  return sheets.PAINEL_PROFISSIONAIS.rows.slice(1).find(row =>
    (String(row[areaIndex] || '') || 'JAPARANDUBA') === areaId
  );
}
function result(requestId) {
  return json(context.doGet({parameter: {action: 'admin_result', requestId}})).result;
}

const japaranduba = json(context.doGet({parameter: {action: 'agenda', areaId: 'JAPARANDUBA'}}));
const sitioMatias = json(context.doGet({parameter: {action: 'agenda', areaId: 'SITIO_MATIAS'}}));
assert.equal(japaranduba.areaId, 'JAPARANDUBA');
assert.equal(japaranduba.dias[0].vagasComuns, 2);
assert.equal(sitioMatias.areaId, 'SITIO_MATIAS');
assert.equal(sitioMatias.dias[0].vagasComuns, 4);

context.doPost({parameter: {
  action: 'admin_dados', requestId: 'DADOS-MANOEL-001', escopo: 'agendas',
  territorioToken: 'territorio-manoel', dispositivo: 'iphone-manoel',
  areaId: 'JAPARANDUBA'
}});
const dadosManoel = result('DADOS-MANOEL-001');
assert.equal(dadosManoel.ok, true);
assert.equal(dadosManoel.areaId, 'SITIO_MATIAS');
assert.ok(dadosManoel.agendas.length > 0);
assert.ok(dadosManoel.agendas.every(item => item.AREA_ID === 'SITIO_MATIAS'));

context.doPost({parameter: {
  action: 'admin_salvar_agenda', requestId: 'SALVAR-MANOEL-001', escopo: 'agendas',
  territorioToken: 'territorio-manoel', dispositivo: 'iphone-manoel',
  areaId: 'JAPARANDUBA', modulo: 'DENTISTA', dia: 'Segunda-feira',
  data: '2099-08-17', horario: '08:00 às 12:00', situacao: 'ATENDIMENTO',
  mensagem: 'Agenda exclusiva do Sítio Matias', encerra12h: 'false',
  vagasComuns: '3', vagasEmergenciais: '1', diaExtra: 'false', ativo: 'true'
}});
const salvo = result('SALVAR-MANOEL-001');
assert.equal(salvo.ok, true);
assert.equal(salvo.areaId, 'SITIO_MATIAS');
assert.equal(agendaRow('SITIO_MATIAS')[AGENDA_HEADERS.indexOf('VAGAS_COMUNS')], 3);
assert.equal(agendaRow('JAPARANDUBA')[AGENDA_HEADERS.indexOf('VAGAS_COMUNS')], 2);

const reserva = context.agendasProfissionaisTerritoriaisV1Reservar_({
  areaId: 'SITIO_MATIAS', requestId: 'RESERVA-TESTE-001',
  date: '2099-08-17', type: 'comum'
});
assert.equal(reserva.ok, true);
assert.equal(reserva.areaId, 'SITIO_MATIAS');
assert.equal(reserva.remaining, 2);
assert.equal(agendaRow('SITIO_MATIAS')[AGENDA_HEADERS.indexOf('VAGAS_COMUNS')], 2);
assert.equal(agendaRow('JAPARANDUBA')[AGENDA_HEADERS.indexOf('VAGAS_COMUNS')], 2);

const repetida = context.agendasProfissionaisTerritoriaisV1Reservar_({
  areaId: 'SITIO_MATIAS', requestId: 'RESERVA-TESTE-001',
  date: '2099-08-17', type: 'comum'
});
assert.equal(repetida.alreadyReserved, true);
assert.equal(agendaRow('SITIO_MATIAS')[AGENDA_HEADERS.indexOf('VAGAS_COMUNS')], 2);

const legado = context.doPost({parameter: {
  action: 'admin_dados', requestId: 'LEGADO-SEM-ESCOPO'
}});
assert.equal(legado.getContent(), 'legacy-post', 'admin_dados sem escopo deve continuar na cadeia antiga.');

console.log('AGENDAS_PROFISSIONAIS_TERRITORIAIS_TESTS_OK');
