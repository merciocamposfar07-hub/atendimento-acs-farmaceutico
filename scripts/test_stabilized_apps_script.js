'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

class Output {
  constructor(text) { this.text = String(text); this.mime = ''; }
  setMimeType(type) { this.mime = type; return this; }
  setXFrameOptionsMode() { return this; }
  getContent() { return this.text; }
}

class Range {
  constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
    this.sheet = sheet; this.row = row; this.column = column;
    this.rowCount = rowCount; this.columnCount = columnCount;
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.rowCount; r += 1) {
      const src = this.sheet.rows[this.row - 1 + r] || [];
      out.push(Array.from({length: this.columnCount}, (_, c) => src[this.column - 1 + c] ?? ''));
    }
    return out;
  }
  getDisplayValues() {
    return this.getValues().map(row => row.map(value => value instanceof Date ? value.toISOString() : String(value == null ? '' : value)));
  }
  setValues(values) {
    values.forEach((valuesRow, r) => {
      while (this.sheet.rows.length < this.row + r) this.sheet.rows.push([]);
      const target = this.sheet.rows[this.row - 1 + r];
      valuesRow.forEach((value, c) => { target[this.column - 1 + c] = value; });
    });
    return this;
  }
  setValue(value) {
    for (let r = 0; r < this.rowCount; r += 1) {
      while (this.sheet.rows.length < this.row + r) this.sheet.rows.push([]);
      const target = this.sheet.rows[this.row - 1 + r];
      for (let c = 0; c < this.columnCount; c += 1) target[this.column - 1 + c] = value;
    }
    return this;
  }
  clearContent() { return this.setValue(''); }
}

class Sheet {
  constructor(name, rows) { this.name = name; this.rows = rows.map(row => row.slice()); }
  getName() { return this.name; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.rows.reduce((m, row) => Math.max(m, row.length), 0); }
  getRange(row, column, rowCount, columnCount) { return new Range(this, row, column, rowCount, columnCount); }
  appendRow(row) { this.rows.push(row.slice()); return this; }
  deleteRow(row) { this.rows.splice(row - 1, 1); }
  setFrozenRows() { return this; }
}

const H_PROF = ['ID','NOME','TITULO_PUBLICO','ICONE','ORDEM','ATIVO','ATUALIZADO_EM'];
const H_SERV = ['ID','PROFISSIONAL_ID','NOME','DESCRICAO_AUTOMATICA','ORDEM','ATIVO','PERMITE_VAGA_COMUM','PERMITE_EMERGENCIA','ATUALIZADO_EM'];
const H_AG = ['MODULO','ORDEM','DIA','ATIVO','DATA','HORARIO','SITUACAO','MENSAGEM','ENCERRA_12H','VAGAS_COMUNS','VAGAS_EMERGENCIAIS','DIA_EXTRA','ATUALIZADO_EM'];
const H_REC = ['ID','TITULO','MENSAGEM','PRIORIDADE','VALIDADE','ATIVO','ATUALIZADO_EM'];
const H_CAM = ['ID','TITULO','MENSAGEM','INICIO','DIAS','ATIVO','ATUALIZADO_EM'];

const sheets = {
  PROFISSIONAIS: new Sheet('PROFISSIONAIS', [
    H_PROF,
    ['MEDICA','Médica','Atendimento com a Médica','🩺',1,true,''],
    ['ENFERMEIRA','Enfermeira','Atendimento com a Enfermeira Chefe','👩‍⚕️',2,true,''],
    ['NUTRICIONISTA','Nutricionista','Atendimento com a Nutricionista','🥗',3,true,''],
    ['DENTISTA','Dentista','Atendimento odontológico','🦷',4,true,'']
  ]),
  SERVICOS: new Sheet('SERVICOS', [
    H_SERV,
    ['ATEND_MED','MEDICA','Consulta médica','Solicitação médica.',1,true,false,false,''],
    ['ATEND_ENF','ENFERMEIRA','Enfermagem','Solicitação de enfermagem.',1,true,false,false,''],
    ['ATEND_NUTRI','NUTRICIONISTA','Nutrição','Solicitação de nutrição.',1,true,false,false,''],
    ['ATEND_DENT','DENTISTA','Odontologia','Solicitação odontológica.',1,true,true,true,'']
  ]),
  PAINEL_PROFISSIONAIS: new Sheet('PAINEL_PROFISSIONAIS', [
    H_AG,
    ['MEDICA',1,'Segunda-feira',false,'','','NAO_CONFIGURADO','Atendimento médico',false,0,0,false,''],
    ['NUTRICIONISTA',1,'Terça-feira',false,'','','NAO_CONFIGURADO','Nutrição',false,0,0,false,'']
  ]),
  RECADOS_PORTAL: new Sheet('RECADOS_PORTAL', [H_REC, ['r1','Recado existente','Mensagem existente','INFORMATIVO','',true,'']]),
  CAMPANHAS_PORTAL: new Sheet('CAMPANHAS_PORTAL', [H_CAM, ['c1','Campanha existente','Mensagem campanha','','Segunda a sexta',true,'']]),
  AGENDA_ENFERMEIRA: new Sheet('AGENDA_ENFERMEIRA', [['ORDEM','DIA','ATENDIMENTO','ICONE','DISPONIVEL','ATUALIZADO_EM']])
};

const spreadsheet = {
  getSheetByName(name) { return sheets[name] || null; },
  insertSheet(name) { return (sheets[name] = new Sheet(name, [])); }
};

const properties = new Map([['SPREADSHEET_ID', 'sheet-test']]);
const cache = new Map();
let uuidCounter = 0;

const context = {
  console, Date, JSON, Math, Number, Object, String, Array, RegExp, Error,
  isFinite, isNaN,
  SpreadsheetApp: {
    openById() { return spreadsheet; },
    getActiveSpreadsheet() { return spreadsheet; },
    flush() {}
  },
  PropertiesService: {
    getScriptProperties() {
      return {
        getProperty(key) { return properties.get(key) || ''; },
        setProperty(key, value) { properties.set(key, String(value)); return this; },
        deleteProperty(key) { properties.delete(key); return this; },
        getProperties() { return Object.fromEntries(properties); }
      };
    }
  },
  CacheService: {
    getScriptCache() {
      return {
        put(key, value) { cache.set(key, String(value)); },
        get(key) { return cache.get(key) || null; },
        remove(key) { cache.delete(key); }
      };
    }
  },
  LockService: {
    getScriptLock() { return {tryLock() { return true; }, releaseLock() {}}; }
  },
  Utilities: {
    DigestAlgorithm: {SHA_256: 'SHA_256'},
    Charset: {UTF_8: 'UTF_8'},
    computeDigest(algorithm, value) {
      assert.equal(algorithm, 'SHA_256');
      return Array.from(crypto.createHash('sha256').update(String(value), 'utf8').digest()).map(b => b > 127 ? b - 256 : b);
    },
    getUuid() { uuidCounter += 1; return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, '0')}`; },
    formatDate(date, zone, pattern) {
      assert.equal(zone, 'America/Recife');
      const d = date instanceof Date ? date : new Date(date);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      if (pattern === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
      if (pattern === 'HH') return '09';
      return `${day}/${month}/${year} 09:00`;
    }
  },
  ContentService: {
    MimeType: {JSON: 'json', JAVASCRIPT: 'javascript'},
    createTextOutput(text) { return new Output(text); }
  },
  HtmlService: {
    XFrameOptionsMode: {ALLOWALL: 'allowall'},
    createHtmlOutput(text) { return new Output(text); }
  }
};
context.window = context;
vm.createContext(context);
[
  path.join(ROOT, 'apps-script', 'AdminCoreV1.gs'),
  path.join(ROOT, 'apps-script', 'PublicCoreV1.gs'),
  path.join(ROOT, 'apps-script', 'PortalRouterV1.gs')
].forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file}));

function requestId(label) { return `${label}_${String(++uuidCounter).padStart(8, '0')}`; }
function post(action, extra, fixedId) {
  const id = fixedId || requestId(action);
  const response = context.tratarPostAdminCoreV1_({parameter: {action, requestId: id, ...(extra || {})}});
  assert.equal(response.handled, true);
  return {id, result: response.data};
}

context.configurarAdminCoreV1('1234');
assert.equal(properties.has('TACS_ADMIN_PIN_HASH_V1'), true);
assert.notEqual(properties.get('TACS_ADMIN_PIN_HASH_V1'), '1234');

const status = context.tratarGetAdminCoreV1_({parameter: {action: 'admin_status'}}).data;
assert.equal(status.ok, true);
assert.equal(status.pinConfigurado, true);
assert.doesNotMatch(JSON.stringify(status), /1234/);

const wrong = post('admin_login', {pin: '9999', dispositivo: 'iphone-a'}).result;
assert.equal(wrong.ok, false);

const login = post('admin_login', {pin: '1234', dispositivo: 'iphone-a'}).result;
assert.equal(login.ok, true);
assert.ok(login.token);
const auth = {token: login.token, dispositivo: 'iphone-a'};

const dados = post('admin_dados', auth).result;
assert.equal(dados.ok, true);
assert.equal(dados.profissionais.length, 4);
assert.equal(dados.recados.length, 1);
assert.equal(dados.campanhas[0].DIAS, 'Segunda a sexta');

const saveAgenda = post('admin_salvar_agenda', {
  ...auth,
  modulo: 'MÉDICA', dia: 'Segunda-feira', data: '2099-08-10', horario: '08:00 as 12:00',
  situacao: 'ATENDIMENTO', mensagem: 'Atendimento médico', encerra12h: 'false',
  vagasComuns: '12', vagasEmergenciais: '1', diaExtra: 'false', ativo: 'true'
}).result;
assert.equal(saveAgenda.ok, true);
assert.equal(sheets.PAINEL_PROFISSIONAIS.rows[1][3], true);
assert.equal(sheets.PAINEL_PROFISSIONAIS.rows[1][9], 12);

const createId = requestId('admin_criar_profissional');
const createPayload = {
  ...auth,
  id: 'FISIOTERAPEUTA', nome: 'Fisioterapeuta', tituloPublico: 'Atendimento com fisioterapeuta',
  icone: '🧑‍⚕️', ordem: '5', servicoNome: 'Fisioterapia',
  descricaoAutomatica: 'Solicitação de atendimento com fisioterapeuta.', ativo: 'true',
  permiteVagaComum: 'false', permiteEmergencia: 'false'
};
const created = post('admin_criar_profissional', createPayload, createId).result;
assert.equal(created.ok, true);
assert.equal(created.agendasCriadas, 5);
const profRowsAfterCreate = sheets.PROFISSIONAIS.getLastRow();
const repeated = post('admin_criar_profissional', createPayload, createId).result;
assert.equal(repeated.ok, true);
assert.equal(sheets.PROFISSIONAIS.getLastRow(), profRowsAfterCreate, 'Request repetido duplicou profissional.');

const publicData = context.tacsPublicV1Painel_();
assert.equal(publicData.ok, true);
assert.equal(publicData.modules.medica.length >= 1, true);
assert.equal(publicData.modules.medica[0].active, true);
assert.ok(publicData.professionals.some(item => item.id === 'fisioterapeuta'));
assert.equal(publicData.recados.length, 1);
assert.equal(publicData.campanhas.length, 1);
assert.equal(publicData.campanhas[0].days, 'Segunda a sexta');
assert.equal(publicData.campanhas[0].end, '', 'Campanha textual não deve ser convertida para duração numérica.');
assert.doesNotMatch(JSON.stringify(publicData), new RegExp(login.token));

const newCampaign = post('admin_salvar_campanha', {
  ...auth, id: '', titulo: 'Campanha nova', mensagem: 'Mensagem nova', inicio: '', dias: 'Segunda, quarta e sexta', ativo: 'true'
}).result;
assert.equal(newCampaign.ok, true);
assert.ok(newCampaign.id);
const reread = post('admin_dados', auth).result;
assert.ok(reread.campanhas.some(item => item.ID === newCampaign.id && item.DIAS === 'Segunda, quarta e sexta'));

const newNotice = post('admin_salvar_recado', {
  ...auth, id: '', titulo: 'Novo recado', mensagem: 'Mensagem recado', prioridade: 'IMPORTANTE', validade: '', ativo: 'true'
}).result;
assert.equal(newNotice.ok, true);
assert.ok(sheets.RECADOS_PORTAL.rows.some(row => row[0] === newNotice.id));
const removed = post('admin_remover_recado', {...auth, id: newNotice.id}).result;
assert.equal(removed.ok, true);
assert.equal(sheets.RECADOS_PORTAL.rows.some(row => row[0] === newNotice.id), false);

const poll = context.tratarGetAdminCoreV1_({parameter: {action: 'admin_result', requestId: createId}}).data;
assert.equal(poll.ok, true);
assert.equal(poll.pendente, false);
assert.equal(poll.result.id, 'FISIOTERAPEUTA');

const jsonp = context.doGet({parameter: {action: 'painel_publico', callback: 'cbPortal'}});
assert.equal(jsonp.mime, 'javascript');
assert.match(jsonp.text, /^cbPortal\(/);
assert.match(jsonp.text, /fisioterapeuta/);
assert.doesNotMatch(jsonp.text, /TACS_ADMIN_SESSION|1234/);

const logout = post('admin_logout', auth).result;
assert.equal(logout.ok, true);
const afterLogout = post('admin_dados', auth).result;
assert.equal(afterLogout.ok, false);

const routerSource = fs.readFileSync(path.join(ROOT, 'apps-script', 'PortalRouterV1.gs'), 'utf8');
const publicSource = fs.readFileSync(path.join(ROOT, 'apps-script', 'PublicCoreV1.gs'), 'utf8');
const adminSource = fs.readFileSync(path.join(ROOT, 'apps-script', 'AdminCoreV1.gs'), 'utf8');
assert.equal((routerSource.match(/function doGet\s*\(/g) || []).length, 1);
assert.equal((routerSource.match(/function doPost\s*\(/g) || []).length, 1);
assert.equal((publicSource.match(/function doGet\s*\(/g) || []).length, 0);
assert.equal((publicSource.match(/function doPost\s*\(/g) || []).length, 0);
assert.equal((adminSource.match(/function doGet\s*\(/g) || []).length, 0);
assert.equal((adminSource.match(/function doPost\s*\(/g) || []).length, 0);

console.log('OK: Apps Script estabilizado integra login, sessão, agenda, profissionais dinâmicos, conteúdo público e logout em um único contrato.');
