'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(ROOT, 'apps-script', 'ZZZ_13_ProfissionaisDinamicosPortalV1.gs'),
  'utf8'
);

class Output {
  constructor(content) { this.content = String(content); }
  getContent() { return this.content; }
  setMimeType() { return this; }
  setXFrameOptionsMode() { return this; }
}

class Range {
  constructor(sheet, row, column, rowCount, columnCount) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rowCount = rowCount || 1;
    this.columnCount = columnCount || 1;
  }

  getValues() {
    const result = [];
    for (let r = 0; r < this.rowCount; r += 1) {
      const row = this.sheet.rows[this.row - 1 + r] || [];
      const values = [];
      for (let c = 0; c < this.columnCount; c += 1) {
        values.push(row[this.column - 1 + c] ?? '');
      }
      result.push(values);
    }
    return result;
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
      const row = this.sheet.rows[this.row - 1 + r];
      for (let c = 0; c < this.columnCount; c += 1) {
        row[this.column - 1 + c] = values[r][c];
      }
    }
    return this;
  }

  setValue(value) {
    const values = Array.from({length: this.rowCount}, () =>
      Array.from({length: this.columnCount}, () => value)
    );
    return this.setValues(values);
  }
}

class Sheet {
  constructor(name, rows) {
    this.name = name;
    this.rows = rows.map(row => row.slice());
  }
  getName() { return this.name; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.rows[0] ? this.rows[0].length : 0; }
  getRange(row, column, rowCount, columnCount) {
    return new Range(this, row, column, rowCount, columnCount);
  }
  appendRow(row) {
    const width = this.getLastColumn();
    const copy = row.slice(0, width);
    while (copy.length < width) copy.push('');
    this.rows.push(copy);
    return this;
  }
}

const professionalHeaders = [
  'ID', 'NOME', 'TITULO_PUBLICO', 'ICONE', 'ORDEM', 'ATIVO', 'ATUALIZADO_EM'
];
const serviceHeaders = [
  'ID', 'PROFISSIONAL_ID', 'NOME', 'DESCRICAO_AUTOMATICA', 'ORDEM', 'ATIVO',
  'PERMITE_VAGA_COMUM', 'PERMITE_EMERGENCIA', 'ATUALIZADO_EM'
];
const agendaHeaders = [
  'MODULO', 'ORDEM', 'DIA', 'ATIVO', 'DATA', 'HORARIO', 'SITUACAO',
  'MENSAGEM', 'ENCERRA_12H', 'VAGAS_COMUNS', 'VAGAS_EMERGENCIAIS',
  'DIA_EXTRA', 'ATUALIZADO_EM'
];
const dayNames = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'
];

const professionals = [
  professionalHeaders,
  ['MEDICA', 'Médica', 'Atendimento com a Médica', '🩺', 1, true, ''],
  ['ENFERMEIRA', 'Enfermeira', 'Atendimento com a Enfermeira Chefe', '👩‍⚕️', 2, true, ''],
  ['NUTRICIONISTA', 'Nutricionista', 'Atendimento com a Nutricionista', '🥗', 3, true, ''],
  ['DENTISTA', 'Dentista', 'Atendimento odontológico', '🦷', 4, true, ''],
  ['PSICÓLOGO', 'Psicólogo', 'Atendimento com psicólogo', '🧠', 5, true, '']
];
const services = [
  serviceHeaders,
  ['ATEND_MED', 'MEDICA', 'Consulta médica', 'Solicitação médica.', 1, true, false, false, ''],
  ['ATEND_ENF', 'ENFERMEIRA', 'Enfermagem', 'Solicitação de enfermagem.', 1, true, false, false, ''],
  ['ATEND_NUTRI', 'NUTRICIONISTA', 'Nutrição', 'Solicitação de nutrição.', 1, true, false, false, ''],
  ['ATEND_DENT', 'DENTISTA', 'Odontologia', 'Solicitação odontológica.', 1, true, true, true, ''],
  ['ATEND_PSICO', 'PSICÓLOGO', 'Atendimento psicológico', 'Solicitação de atendimento com psicólogo.', 1, true, false, false, '']
];
const agendas = [agendaHeaders];
for (const [module, index] of [
  ['DENTISTA', 0], ['ENFERMEIRA', 1], ['MEDICA', 2], ['NUTRICIONISTA', 3], ['PSICÓLOGO', 4]
]) {
  dayNames.forEach((day, dayIndex) => {
    const active = module === 'PSICÓLOGO' && day === 'Sexta-feira';
    agendas.push([
      module,
      dayIndex + 1,
      day,
      active,
      active ? new Date(Date.UTC(2099, 7, 7)) : '',
      active ? '08:00 as 12:00' : '',
      active ? 'ATENDIMENTO' : 'NAO_CONFIGURADO',
      active ? 'Atendimento psicológico' : '',
      false,
      0,
      0,
      false,
      `grupo-${index}`
    ]);
  });
}

const sheets = {
  PROFISSIONAIS: new Sheet('PROFISSIONAIS', professionals),
  SERVICOS: new Sheet('SERVICOS', services),
  PAINEL_PROFISSIONAIS: new Sheet('PAINEL_PROFISSIONAIS', agendas)
};
const spreadsheet = {
  getSheetByName(name) { return sheets[name] || null; }
};

const oldResults = new Map();
const dynamicCache = new Map();
let legacyPasses = 0;
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
  getPlanilha: () => spreadsheet,
  SpreadsheetApp: {
    getActiveSpreadsheet: () => spreadsheet,
    flush() {}
  },
  LockService: {
    getScriptLock: () => ({tryLock: () => true, releaseLock() {}})
  },
  CacheService: {
    getScriptCache: () => ({
      put(key, value) { dynamicCache.set(key, String(value)); },
      get(key) { return dynamicCache.get(key) || null; }
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
    getUuid: () => `uuid-${Math.random().toString(16).slice(2)}-12345678`,
    sleep() {},
    formatDate(date, zone, pattern) {
      assert.equal(zone, 'America/Recife');
      if (pattern === 'HH') return '09';
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      if (pattern === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
      return `${day}/${month}/${year} 09:00`;
    }
  }
};

context.integralLerModulos_ = () => ({antigo: true});
context.tacsReadModules_ = () => ({antigo: true});
context.integralObterPainelPublico_ = () => ({
  ok: true,
  atualizadoEm: '06/08/2026 13:43',
  modules: context.integralLerModulos_(),
  recados: [{id: 'recado-preservado'}],
  campanhas: [{id: 'campanha-preservada'}]
});
context.tratarPostPainelTacs_ = event => {
  const parameters = event && event.parameter || {};
  if (parameters.action === 'admin_dados') {
    oldResults.set(parameters.requestId, {
      ok: true,
      profissionais: [],
      servicos: [],
      agendas: []
    });
    return new Output('<html></html>');
  }
  legacyPasses += 1;
  return {legacy: true, action: parameters.action};
};
context.tratarGetPainelTacs_ = event => {
  const parameters = event && event.parameter || {};
  if (parameters.action === 'admin_result' && oldResults.has(parameters.requestId)) {
    return new Output(JSON.stringify({
      ok: true,
      pendente: false,
      requestId: parameters.requestId,
      result: oldResults.get(parameters.requestId)
    }));
  }
  return new Output(JSON.stringify({ok: true, pendente: true}));
};
context.doPost = event => context.tratarPostPainelTacs_(event);
context.doGet = event => context.tratarGetPainelTacs_(event);

vm.createContext(context);
vm.runInContext(source, context);

function event(parameters) {
  return {parameter: parameters, parameters: {}};
}

function runPost(action, suffix, extra) {
  const requestId = `${action}_${suffix}_12345678`;
  const response = context.doPost(event({
    action,
    requestId,
    token: 'sessao-valida',
    dispositivo: 'iphone-teste',
    ...extra
  }));
  assert.ok(response && typeof response.getContent === 'function');
  const resultResponse = context.doGet(event({
    action: 'admin_result',
    requestId,
    callback: ''
  }));
  const envelope = JSON.parse(resultResponse.getContent());
  assert.equal(envelope.ok, true);
  assert.equal(envelope.pendente, false);
  return envelope.result;
}

const publicInitial = context.integralObterPainelPublico_();
assert.equal(publicInitial.ok, true);
assert.equal(publicInitial.recados[0].id, 'recado-preservado');
assert.equal(publicInitial.campanhas[0].id, 'campanha-preservada');
assert.equal(publicInitial.modules.psicologo.length, 5);
assert.equal(publicInitial.modules.psicologo[4].active, true);
assert.equal(publicInitial.modules.psicologo[4].date, '2099-08-07');
const psychologist = publicInitial.professionals.find(item => item.id === 'psicologo');
assert.ok(psychologist, 'O psicólogo ativo não apareceu nos metadados públicos.');
assert.equal(psychologist.title, 'Atendimento com psicólogo');
assert.equal(psychologist.icon, '🧠');
assert.equal(psychologist.category, 'Solicitar atendimento com psicólogo');
assert.equal(psychologist.service.name, 'Atendimento psicológico');
assert.doesNotMatch(JSON.stringify(publicInitial), /sessao-valida|iphone-teste|pin/i);
assert.equal(context.tacsReadModules_().psicologo.length, 5);

const psychologistService = sheets.SERVICOS.rows.find(row =>
  String(row[1]).normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'PSICOLOGO'
);
psychologistService[5] = false;
assert.equal(
  context.integralObterPainelPublico_().professionals.some(
    item => item.id === 'psicologo'
  ),
  false,
  'Um serviço dinâmico inativo não pode aparecer no portal.'
);
psychologistService[5] = true;

const agendaResult = runPost('admin_salvar_agenda', 'psico', {
  modulo: 'PSICOLOGO',
  dia: 'Quarta-feira',
  data: '2099-08-05',
  horario: '13:00 as 16:00',
  situacao: 'ATENDIMENTO',
  mensagem: 'Psicologia',
  encerra12h: 'false',
  vagasComuns: '0',
  vagasEmergenciais: '0',
  diaExtra: 'false',
  ativo: 'true'
});
assert.equal(agendaResult.ok, true);
const psychologistWednesday = sheets.PAINEL_PROFISSIONAIS.rows.find(row =>
  String(row[0]).normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'PSICOLOGO' &&
  row[2] === 'Quarta-feira'
);
assert.equal(psychologistWednesday[3], true);
assert.equal(psychologistWednesday[7], 'Psicologia');

const serviceLinkBefore = psychologistService[1];
const invalidServiceLink = runPost('admin_salvar_servico', 'linkinvalido', {
  id: 'ATEND_PSICO',
  profissionalId: 'PROFISSIONAL_INEXISTENTE',
  nome: 'Atendimento psicológico',
  descricaoAutomatica: 'Solicitação de atendimento com psicólogo.',
  ordem: '1',
  ativo: 'true',
  permiteVagaComum: 'false',
  permiteEmergencia: 'false'
});
assert.equal(invalidServiceLink.ok, false);
assert.equal(psychologistService[1], serviceLinkBefore);

const beforeAdoption = {
  professionals: sheets.PROFISSIONAIS.getLastRow(),
  services: sheets.SERVICOS.getLastRow(),
  agendas: sheets.PAINEL_PROFISSIONAIS.getLastRow()
};
const adoption = runPost('admin_criar_profissional', 'adotar', {
  id: 'PSICOLOGO',
  nome: 'Psicólogo',
  tituloPublico: 'Atendimento com psicólogo',
  icone: '🧠',
  ordem: '5',
  servicoNome: 'Atendimento psicológico',
  descricaoAutomatica: 'Solicitação de atendimento com psicólogo.',
  ativo: 'true',
  permiteVagaComum: 'false',
  permiteEmergencia: 'false'
});
assert.equal(adoption.ok, true);
assert.equal(adoption.jaExistia, true);
assert.equal(adoption.agendasCriadas, 0);
assert.equal(sheets.PROFISSIONAIS.getLastRow(), beforeAdoption.professionals);
assert.equal(sheets.SERVICOS.getLastRow(), beforeAdoption.services);
assert.equal(sheets.PAINEL_PROFISSIONAIS.getLastRow(), beforeAdoption.agendas);

const physiotherapist = runPost('admin_criar_profissional', 'fisio1', {
  id: 'FISIOTERAPEUTA',
  nome: 'Fisioterapeuta',
  tituloPublico: 'Atendimento com fisioterapeuta',
  icone: '🧑‍⚕️',
  ordem: '6',
  servicoNome: 'Fisioterapia',
  descricaoAutomatica: 'Solicitação de atendimento com fisioterapeuta.',
  ativo: 'true',
  permiteVagaComum: 'false',
  permiteEmergencia: 'false'
});
assert.equal(physiotherapist.ok, true);
assert.equal(physiotherapist.jaExistia, false);
assert.equal(physiotherapist.agendasCriadas, 5);
assert.equal(sheets.PROFISSIONAIS.getLastRow(), beforeAdoption.professionals + 1);
assert.equal(sheets.SERVICOS.getLastRow(), beforeAdoption.services + 1);
assert.equal(sheets.PAINEL_PROFISSIONAIS.getLastRow(), beforeAdoption.agendas + 5);

sheets.SERVICOS.appendRow([
  'ATENDIMENTO_TERAPEUTA',
  'MEDICA',
  'Identificador ocupado',
  'Registro de teste.',
  99,
  false,
  false,
  false,
  ''
]);
const professionalsBeforeCollision = sheets.PROFISSIONAIS.getLastRow();
const agendasBeforeCollision = sheets.PAINEL_PROFISSIONAIS.getLastRow();
const collision = runPost('admin_criar_profissional', 'colisao', {
  id: 'TERAPEUTA',
  nome: 'Terapeuta',
  tituloPublico: 'Atendimento com terapeuta',
  icone: '👤',
  ordem: '7',
  servicoNome: 'Terapia',
  descricaoAutomatica: 'Solicitação de atendimento com terapeuta.',
  ativo: 'true'
});
assert.equal(collision.ok, false);
assert.equal(sheets.PROFISSIONAIS.getLastRow(), professionalsBeforeCollision);
assert.equal(sheets.PAINEL_PROFISSIONAIS.getLastRow(), agendasBeforeCollision);
sheets.SERVICOS.rows.pop();

const duplicate = runPost('admin_criar_profissional', 'fisio2', {
  id: 'FISIOTERAPEUTA',
  nome: 'Fisioterapeuta',
  tituloPublico: 'Atendimento com fisioterapeuta',
  icone: '🧑‍⚕️',
  ordem: '6',
  servicoNome: 'Fisioterapia',
  descricaoAutomatica: 'Solicitação de atendimento com fisioterapeuta.',
  ativo: 'true'
});
assert.equal(duplicate.jaExistia, true);
assert.equal(duplicate.agendasCriadas, 0);
assert.equal(sheets.PROFISSIONAIS.getLastRow(), beforeAdoption.professionals + 1);
assert.equal(sheets.SERVICOS.getLastRow(), beforeAdoption.services + 1);
assert.equal(sheets.PAINEL_PROFISSIONAIS.getLastRow(), beforeAdoption.agendas + 5);

const publicAfter = context.integralObterPainelPublico_();
assert.equal(publicAfter.modules.fisioterapeuta.length, 5);
assert.ok(publicAfter.professionals.some(item => item.id === 'fisioterapeuta'));

const legacyResponse = context.doPost(event({
  action: 'admin_salvar_profissional',
  requestId: 'legacy_medica_12345678',
  id: 'MEDICA'
}));
assert.equal(legacyResponse.legacy, true);
assert.equal(legacyPasses, 1);

const invalidRequest = context.doPost(event({
  action: 'admin_criar_profissional',
  requestId: 'curto',
  token: 'sessao-valida',
  dispositivo: 'iphone-teste'
}));
assert.match(invalidRequest.getContent(), /Identificador da operação inválido/);

const rowsBeforeDiagnostic = {
  professionals: sheets.PROFISSIONAIS.getLastRow(),
  services: sheets.SERVICOS.getLastRow(),
  agendas: sheets.PAINEL_PROFISSIONAIS.getLastRow()
};
const diagnostic = context.testarProfissionaisDinamicosPortalV1();
assert.equal(diagnostic.ok, true);
assert.equal(diagnostic.somenteLeitura, true);
assert.equal(diagnostic.agendasPorProfissional.psicologo, 5);
assert.ok(diagnostic.profissionaisAtivos.includes('psicologo'));
assert.deepEqual(rowsBeforeDiagnostic, {
  professionals: sheets.PROFISSIONAIS.getLastRow(),
  services: sheets.SERVICOS.getLastRow(),
  agendas: sheets.PAINEL_PROFISSIONAIS.getLastRow()
});

console.log(
  'Apps Script dinâmico: psicólogo adotado sem duplicação, fisioterapeuta criado com 5 agendas e módulos legados preservados.'
);
