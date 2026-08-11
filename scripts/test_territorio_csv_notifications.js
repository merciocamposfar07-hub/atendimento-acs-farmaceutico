'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const FILES = {
  territory: 'apps-script/ZZZZ_17_TacsAreasAdminV1.gs',
  csv: 'apps-script/ZZZZ_18_ImportacaoCsvMoradoresV1.gs',
  notifications: 'apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs'
};
const RESIDENT_HEADERS = [
  'ID_PORTAL','ID','CPF','CNS','NOME','DATA_NASCIMENTO','IDADE','SEXO','ENDERECO',
  'CELULAR','TELEFONE_CONTATO','MICROAREA','EQUIPE','ORIGEM','ULTIMA_ATUALIZACAO',
  'STATUS','CONSENTIMENTO_WHATSAPP','DATA_CONSENTIMENTO','DATA_CADASTRO_PORTAL',
  'OBSERVACOES'
];

function read(file) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  new vm.Script(source, {filename: file});
  return source;
}

function display(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function makeSheet(spreadsheet, initialName, initialRows = []) {
  let name = initialName;
  const rows = initialRows.map(row => row.slice());
  function ensure(row, column) {
    while (rows.length < row) rows.push([]);
    while (rows[row - 1].length < column) rows[row - 1].push('');
  }
  function lastRow() {
    for (let row = rows.length; row > 0; row -= 1) {
      if ((rows[row - 1] || []).some(value => value !== '' && value != null)) return row;
    }
    return 0;
  }
  const sheet = {
    rows,
    getName() { return name; },
    setName(next) {
      if (spreadsheet.getSheetByName(next) && spreadsheet.getSheetByName(next) !== sheet) {
        throw new Error(`Aba já existe: ${next}`);
      }
      name = String(next);
      return sheet;
    },
    getLastRow: lastRow,
    getLastColumn() {
      return rows.reduce((max, row) => Math.max(max, row.length), 0);
    },
    getMaxRows() { return Math.max(1000, rows.length); },
    insertRowsAfter() { return sheet; },
    setFrozenRows() { return sheet; },
    appendRow(values) { rows.push(values.slice()); return sheet; },
    getRange(row, column, rowCount = 1, columnCount = 1) {
      return {
        getValues() {
          const out = [];
          for (let r = 0; r < rowCount; r += 1) {
            const current = [];
            for (let c = 0; c < columnCount; c += 1) {
              current.push((rows[row - 1 + r] || [])[column - 1 + c] ?? '');
            }
            out.push(current);
          }
          return out;
        },
        getDisplayValues() {
          return this.getValues().map(current => current.map(display));
        },
        getValue() { return (rows[row - 1] || [])[column - 1] ?? ''; },
        setValue(value) {
          ensure(row, column);
          rows[row - 1][column - 1] = value;
          return this;
        },
        setValues(values) {
          for (let r = 0; r < values.length; r += 1) {
            for (let c = 0; c < values[r].length; c += 1) {
              ensure(row + r, column + c);
              rows[row - 1 + r][column - 1 + c] = values[r][c];
            }
          }
          return this;
        },
        clearContent() {
          for (let r = 0; r < rowCount; r += 1) {
            for (let c = 0; c < columnCount; c += 1) {
              ensure(row + r, column + c);
              rows[row - 1 + r][column - 1 + c] = '';
            }
          }
          return this;
        },
        setNumberFormat() { return this; }
      };
    }
  };
  return sheet;
}

function makeSpreadsheet(id, firstSheetRows = null) {
  const sheets = [];
  const spreadsheet = {
    getId() { return id; },
    getSheets() { return sheets.slice(); },
    getSheetByName(name) { return sheets.find(sheet => sheet.getName() === name) || null; },
    insertSheet(name) {
      const sheet = makeSheet(spreadsheet, name, []);
      sheets.push(sheet);
      return sheet;
    }
  };
  if (firstSheetRows) sheets.push(makeSheet(spreadsheet, 'Sheet1', firstSheetRows));
  return spreadsheet;
}

function parseCsv(text, delimiter) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(value); value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value); rows.push(row); row = []; value = '';
    } else value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function makeContext() {
  const properties = new Map();
  const cache = new Map();
  const spreadsheets = new Map();
  const fetched = [];
  let nextFetchResponse = null;
  let uuid = 0;
  let maintenance = false;
  let created = 0;

  const adminSpreadsheet = makeSpreadsheet('ADMIN_SPREADSHEET_00001');
  const defaultResidents = makeSpreadsheet(
    '114ObXLQ8sQSDosauEbAdlhQRWNksJ20Kq57CucpKbTg',
    [RESIDENT_HEADERS]
  );
  defaultResidents.getSheets()[0].setName('MORADORES');
  spreadsheets.set(adminSpreadsheet.getId(), adminSpreadsheet);
  spreadsheets.set(defaultResidents.getId(), defaultResidents);

  const context = vm.createContext({
    console,
    Date,
    JSON,
    Math,
    Object,
    Array,
    String,
    Number,
    RegExp,
    isFinite,
    doGet() { return {original: 'get'}; },
    doPost() { return {original: 'post'}; },
    profissionaisDinamicosV1Planilha_() { return adminSpreadsheet; },
    profissionaisDinamicosV1ValidarSessao_(parameters) {
      if (parameters.token !== 'admin-token' || parameters.dispositivo !== 'iphone-admin') {
        throw new Error('Sessão administrativa inválida.');
      }
      return {ok: true, perfil: 'ADMIN_GERAL', operadorId: 'ADMIN_GERAL'};
    },
    moradoresAdminV1AreaPadrao_() {
      return {
        areaId: 'JAPARANDUBA', areaNome: 'Sítio Japaranduba', unidadeId: 'POSTO_MATIAS',
        agenteId: 'AG001', planilhaId: defaultResidents.getId(), ativa: true, publica: true
      };
    },
    moradoresAdminV1CpfValido_() { return true; },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(key) { return properties.has(key) ? properties.get(key) : null; },
          setProperty(key, value) { properties.set(key, String(value)); return this; },
          deleteProperty(key) { properties.delete(key); return this; }
        };
      }
    },
    CacheService: {
      getScriptCache() {
        return {
          get(key) { return cache.has(key) ? cache.get(key) : null; },
          put(key, value) { cache.set(key, String(value)); },
          remove(key) { cache.delete(key); }
        };
      }
    },
    LockService: {
      getScriptLock() { return {tryLock() { return true; }, releaseLock() {}}; }
    },
    SpreadsheetApp: {
      getActiveSpreadsheet() { return adminSpreadsheet; },
      openById(id) {
        if (!spreadsheets.has(id)) throw new Error(`Planilha ausente: ${id}`);
        return spreadsheets.get(id);
      },
      create() {
        created += 1;
        const id = `SPREADSHEET_CREATED_${String(created).padStart(6, '0')}`;
        const spreadsheet = makeSpreadsheet(id, [[]]);
        spreadsheets.set(id, spreadsheet);
        return spreadsheet;
      },
      flush() {}
    },
    Utilities: {
      DigestAlgorithm: {SHA_256: 'SHA_256'},
      Charset: {UTF_8: 'UTF_8'},
      getUuid() {
        uuid += 1;
        return `${String(uuid).padStart(8, '0')}-0000-4000-8000-${String(uuid).padStart(12, '0')}`;
      },
      computeDigest(_algorithm, value) {
        return Array.from(crypto.createHash('sha256').update(String(value)).digest())
          .map(byte => byte > 127 ? byte - 256 : byte);
      },
      parseCsv,
      base64Decode(value) { return Array.from(Buffer.from(String(value), 'base64')); },
      newBlob(value) {
        const buffer = Buffer.isBuffer(value)
          ? value
          : (Array.isArray(value) ? Buffer.from(value) : Buffer.from(String(value), 'utf8'));
        return {
          getBytes() { return Array.from(buffer); },
          getDataAsString() { return buffer.toString('utf8'); }
        };
      },
      formatDate(value, _timezone, pattern) {
        const date = value instanceof Date ? value : new Date(value);
        const pad = number => String(number).padStart(2, '0');
        if (pattern === 'yyyyMMdd-HHmmss') {
          return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
        }
        return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
      },
      sleep() {}
    },
    UrlFetchApp: {
      fetch(url, options) {
        fetched.push({url, options});
        const body = nextFetchResponse || {id: 'push-' + fetched.length, recipients: 7};
        nextFetchResponse = null;
        return {
          getResponseCode() { return 200; },
          getContentText() { return JSON.stringify(body); }
        };
      }
    },
    HtmlService: {
      XFrameOptionsMode: {ALLOWALL: 'ALLOWALL'},
      createHtmlOutput(content) { return {content, setXFrameOptionsMode() { return this; }}; }
    },
    ContentService: {
      MimeType: {JSON: 'JSON', JAVASCRIPT: 'JAVASCRIPT'},
      createTextOutput(content) { return {content, setMimeType() { return this; }}; }
    }
  });

  context.__properties = properties;
  context.__cache = cache;
  context.__spreadsheets = spreadsheets;
  context.__adminSpreadsheet = adminSpreadsheet;
  context.__fetched = fetched;
  context.__setFetchResponse = value => { nextFetchResponse = value; };
  context.__created = () => created;
  context.__setMaintenance = value => { maintenance = Boolean(value); };
  context.portalManutencaoV1Estado_ = () => ({ativa: maintenance});
  return context;
}

function installResidentStubs(context) {
  const normalize = value => String(value == null ? '' : value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  context.moradoresAdminV1NormalizarBusca_ = normalize;
  context.moradoresAdminV1Hash_ = value => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
  context.moradoresAdminV1DataObjeto_ = value => String(value || '');
  context.moradoresAdminV1NormalizarDadosEntrada_ = (body, scope) => ({
    idPortal: String(body.idPortal || '').trim(), id: String(body.id || '').trim(),
    cpf: String(body.cpf || '').replace(/\D/g, ''), cns: String(body.cns || '').replace(/\D/g, ''),
    nome: String(body.nome || '').trim(), nascimento: String(body.nascimento || '').trim(), idade: '',
    sexo: String(body.sexo || '').trim(), endereco: String(body.endereco || scope.areaNome || '').trim(),
    celular: String(body.celular || '').replace(/\D/g, ''),
    telefoneContato: String(body.telefoneContato || '').replace(/\D/g, ''),
    microarea: String(body.microarea || '1').trim(), equipe: String(body.equipe || '').trim(),
    origem: String(body.origem || '').trim(), ultimaAtualizacao: null,
    status: String(body.status || '').trim().toUpperCase(),
    consentimentoWhatsapp: String(body.consentimentoWhatsapp || '').trim(),
    dataConsentimento: String(body.dataConsentimento || '').trim(),
    dataCadastroPortal: String(body.dataCadastroPortal || '').trim(),
    observacoes: String(body.observacoes || '').trim()
  });
  context.moradoresAdminV1PreservarCamposSistema_ = (data, previous) => Object.assign({}, data, {
    idPortal: previous.idPortal,
    id: previous.id,
    origem: previous.origem,
    status: previous.status || 'ATIVO',
    consentimentoWhatsapp: previous.consentimentoWhatsapp || 'NÃO',
    dataConsentimento: previous.dataConsentimento,
    dataCadastroPortal: previous.dataCadastroPortal,
    ultimaAtualizacao: new Date('2026-08-11T13:30:00.000Z')
  });
  context.moradoresAdminV1ValidarDadosMorador_ = data => {
    if (!data.nome || !/^\d{2}\/\d{2}\/\d{4}$/.test(data.nascimento) || !data.sexo) {
      throw new Error('Nome, nascimento e sexo são obrigatórios.');
    }
    if (data.cpf && data.cpf.length !== 11) throw new Error('CPF inválido.');
    if (data.cns && data.cns.length !== 15) throw new Error('CNS inválido.');
  };
  context.moradoresAdminV1ChaveIdentidade_ = data => [
    normalize(data.nome), String(data.nascimento || ''), normalize(data.endereco)
  ].join('|');
  context.moradoresAdminV1ChaveRegistro_ = data => data.cpf
    ? `CPF:${data.cpf}`
    : (data.cns ? `CNS:${data.cns}` : `ID_PORTAL:${data.idPortal}`);
  context.moradoresAdminV1ChaveOrigem_ = origin => `${origin.aba}#${origin.linha}`;
  context.moradoresAdminV1GarantirMeta_ = spreadsheet => {
    const headers = [
      'ID_INTERNO','CHAVE_INTERNA','ABA_ORIGEM','LINHA_ORIGEM','DOC_PRIMARIO',
      'DOC_SECUNDARIO','SITUACAO_PORTAL','MOTIVO_SITUACAO','ESCOPO_A','ESCOPO_B',
      'ESCOPO_C','CRIADO_EM','ATUALIZADO_EM','OPERADOR_INTERNO','ORIGEM_CADASTRO'
    ];
    let sheet = spreadsheet.getSheetByName('TACS_META_AREA');
    if (!sheet) { sheet = spreadsheet.insertSheet('TACS_META_AREA'); sheet.appendRow(headers); }
    return sheet;
  };
  context.moradoresAdminV1GarantirAuditoria_ = spreadsheet => {
    const headers = [
      'EVENTO_INTERNO','ID_REFERENCIA','TIPO_EVENTO','ESCOPO_A','ESCOPO_B',
      'ESCOPO_C','OPERADOR_INTERNO','CAMPOS_EVENTO','REGISTRADO_EM'
    ];
    let sheet = spreadsheet.getSheetByName('TACS_AUDIT_MORADORES');
    if (!sheet) { sheet = spreadsheet.insertSheet('TACS_AUDIT_MORADORES'); sheet.appendRow(headers); }
    return sheet;
  };
  context.moradoresAdminV1LerMetaMap_ = () => ({porChave: {}, porOrigem: {}, porId: {}});
  context.moradoresAdminV1ExigirEscrita_ = () => true;
  context.moradoresAdminV1ProximoIdPortal_ = () => 'TACS-000100';
  context.moradoresAdminV1IdadeTexto_ = () => 'idade calculada';
  context.moradoresAdminV1InvalidarResumo_ = () => {};
  context.moradoresAdminV1LerPorOrigem_ = (spreadsheet, sheetName, row) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || row < 2 || row > sheet.getLastRow()) return null;
    const raw = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const shown = raw.map(display);
    const resident = context.moradoresAdminV1MontarMorador_(shown, raw, residentMap());
    return resident.nome ? {origem: {aba: sheetName, linha: row}, morador: resident} : null;
  };
  context.moradoresAdminV1SetCell_ = (sheet, row, index, value) => {
    sheet.getRange(row, index + 1).setValue(value == null ? '' : value);
  };
  context.moradoresAdminV1EncontrarMeta_ = () => null;
  context.moradoresAdminV1UpsertMeta_ = (spreadsheet, input) => {
    const sheet = context.moradoresAdminV1GarantirMeta_(spreadsheet);
    let target = 0;
    for (let row = 2; row <= sheet.getLastRow(); row += 1) {
      if (String(sheet.getRange(row, 1).getValue()) === String(input.moradorId)) {
        target = row;
        break;
      }
    }
    if (!target) target = sheet.getLastRow() + 1;
    sheet.getRange(target, 1, 1, 15).setValues([[
      input.moradorId, input.chave, input.origem.aba, input.origem.linha,
      input.dados.cpf || '', input.dados.cns || '', input.situacao || 'ATIVO',
      input.motivo || '', 'AG001', 'SITIO_LAGOA_NOVA', 'USF_LAGOA',
      new Date(), new Date(), 'ADMIN_GERAL', input.origemCadastro || 'BASE_EXISTENTE'
    ]]);
    return {moradorId: input.moradorId};
  };
  context.moradoresAdminV1Auditar_ = (spreadsheet, input) => {
    const sheet = context.moradoresAdminV1GarantirAuditoria_(spreadsheet);
    sheet.appendRow([
      'EVT-UNDO', input.moradorId, input.acao, 'AG001', 'SITIO_LAGOA_NOVA',
      'USF_LAGOA', 'ADMIN_GERAL', input.campos || '', new Date()
    ]);
  };
  context.moradoresAdminV1SituacaoOculta_ = status => ['CONSOLIDADO', 'IMPORTACAO_DESFEITA'].includes(String(status || '').toUpperCase());
  context.moradoresAdminV1MontarMorador_ = (shown, raw, map) => ({
    idPortal: String(shown[map.idPortal] || ''), id: String(shown[map.id] || ''),
    cpf: String(shown[map.cpf] || '').replace(/\D/g, ''), cns: String(shown[map.cns] || '').replace(/\D/g, ''),
    nome: String(shown[map.nome] || ''), nascimento: String(shown[map.nascimento] || ''),
    idade: String(shown[map.idade] || ''), sexo: String(shown[map.sexo] || ''),
    endereco: String(shown[map.endereco] || ''), celular: String(shown[map.celular] || '').replace(/\D/g, ''),
    telefoneContato: String(shown[map.telefoneContato] || '').replace(/\D/g, ''),
    microarea: String(shown[map.microarea] || ''), equipe: String(shown[map.equipe] || ''),
    origem: String(shown[map.origem] || ''), ultimaAtualizacao: raw[map.ultimaAtualizacao] || '',
    status: String(shown[map.status] || 'ATIVO'),
    consentimentoWhatsapp: String(shown[map.consentimentoWhatsapp] || ''),
    dataConsentimento: raw[map.dataConsentimento] || '', dataCadastroPortal: raw[map.dataCadastroPortal] || '',
    observacoes: String(shown[map.observacoes] || '')
  });
  context.moradoresAdminV1ResolverContexto_ = (access, requested) => {
    const requestedId = String(requested || access.areaId || 'JAPARANDUBA').toUpperCase();
    if (access.perfil === 'TACS' && requestedId !== access.areaId) throw new Error('Troca de área bloqueada.');
    const area = context.tacsTerritorioV1EncontrarArea_(requestedId);
    if (!area || !area.ativa) throw new Error('Área não ativa.');
    return {
      perfil: access.perfil, operadorId: access.operadorId, agenteId: area.tacsId,
      areaId: area.areaId, areaNome: area.areaNome, unidadeId: area.unidadeId,
      planilhaId: area.planilhaId, permissoes: access.permissoes || []
    };
  };
  context.moradoresAdminV1CatalogoAreas_ = () => context.tacsTerritorioV1LerAreas_().filter(area => area.ativa);
}

function residentMap() {
  return {
    idPortal:0,id:1,cpf:2,cns:3,nome:4,nascimento:5,idade:6,sexo:7,endereco:8,
    celular:9,telefoneContato:10,microarea:11,equipe:12,origem:13,
    ultimaAtualizacao:14,status:15,consentimentoWhatsapp:16,dataConsentimento:17,
    dataCadastroPortal:18,observacoes:19
  };
}

function event(parameters) { return {parameter: Object.assign({}, parameters)}; }

function resultFromHtml(output) {
  const marker = 'parent.postMessage(';
  const start = output.content.indexOf(marker) + marker.length;
  const end = output.content.indexOf(',"*");', start);
  assert.ok(start >= marker.length && end > start, 'Envelope HTML de resposta inválido.');
  return JSON.parse(output.content.slice(start, end)).result;
}

function resultFromJson(output) {
  return JSON.parse(output.content);
}

function saveTacs(context, body) {
  return context.tacsTerritorioV1SalvarTacs_(
    {payload: JSON.stringify(body)},
    {perfil: 'ADMIN_GERAL', operadorId: 'ADMIN_GERAL'}
  );
}

function saveArea(context, body) {
  return context.tacsTerritorioV1SalvarArea_(
    {payload: JSON.stringify(body)},
    {perfil: 'ADMIN_GERAL', operadorId: 'ADMIN_GERAL'}
  );
}

function testTerritory(context) {
  vm.runInContext(read(FILES.territory), context);
  assert.equal(context.TACS_TERRITORIO_V1.VERSAO, '1.0.0');

  const createdBeforeInvalid = context.__created();
  assert.throws(() => saveArea(context, {
    areaNome: 'Área inválida', unidadeId: 'USF_X', unidadeNome: 'USF X',
    tacsId: 'AUSENTE', criarFonte: true, ativa: true
  }), /TACS responsável não foi encontrado/);
  assert.equal(context.__created(), createdBeforeInvalid, 'Uma planilha órfã foi criada antes da validação do TACS.');

  const first = saveTacs(context, {
    nomeCompleto: 'Ana Agente', cnsProfissional: '123456789012345', matricula: 'M-01',
    telefone: '(81) 99999-0000', email: 'ana@example.org', microarea: '2', pin: '4321', ativo: true
  });
  const tacsId = first.tacs.tacsId;
  assert.ok(tacsId.startsWith('TACS_'));
  assert.equal(first.tacs.pinConfigurado, true);
  assert.equal(Object.prototype.hasOwnProperty.call(first.tacs, 'pinHash'), false);

  const corrected = saveTacs(context, {
    tacsId, nomeCompleto: 'Ana Agente Corrigida', cnsProfissional: '123456789012346',
    matricula: 'M-02', telefone: '81988880000', email: 'ana.corrigida@example.org',
    microarea: '3', ativo: true
  });
  assert.equal(corrected.tacs.cnsProfissional, '123456789012346');
  assert.equal(corrected.tacs.nomeCompleto, 'Ana Agente Corrigida');
  assert.equal(corrected.tacs.pinConfigurado, true, 'Editar sem novo PIN deve preservar o PIN atual.');

  const withoutPermissions = saveTacs(context, {
    tacsId, nomeCompleto: 'Ana Agente Corrigida', cnsProfissional: '123456789012346',
    matricula: 'M-02', telefone: '81988880000', email: 'ana.corrigida@example.org',
    microarea: '3', permissoes: [], ativo: true
  });
  assert.deepEqual(
    Array.from(withoutPermissions.tacs.permissoes),
    [],
    'Retirar todas as permissões não pode reativá-las silenciosamente.'
  );
  saveTacs(context, {
    tacsId, nomeCompleto: 'Ana Agente Corrigida', cnsProfissional: '123456789012346',
    matricula: 'M-02', telefone: '81988880000', email: 'ana.corrigida@example.org',
    microarea: '3', permissoes: [
      'MORADORES_LER','MORADORES_EDITAR','MORADORES_SITUACAO','MORADORES_IMPORTAR_CSV'
    ], ativo: true
  });

  assert.throws(() => saveTacs(context, {
    nomeCompleto: 'Outro TACS', cnsProfissional: '123456789012346', ativo: false
  }), /já pertence a outro TACS/);

  const second = saveTacs(context, {
    nomeCompleto: 'Bruno Agente', cnsProfissional: '223456789012345', pin: '1234', ativo: true
  });
  const area = saveArea(context, {
    areaNome: 'Sítio Lagoa Nova', unidadeId: 'USF_LAGOA', unidadeNome: 'USF Lagoa',
    tacsId, microareaPadrao: '3', equipe: 'Equipe Lagoa', criarFonte: true,
    consultaPorDocumento: true, ativa: true
  }).area;
  assert.equal(area.areaId, 'SITIO_LAGOA_NOVA');
  assert.equal(context.tacsTerritorioV1ConferirFonte_(area.planilhaId).schema, '20/20');
  assert.equal(context.tacsTerritorioV1EncontrarTacs_(tacsId).areaId, area.areaId);
  assert.ok(context.tacsTerritorioV1LerAreas_().some(item => item.areaId === 'JAPARANDUBA'), 'A área padrão desapareceu ao cadastrar a segunda área.');

  const catalog = JSON.parse(context.__properties.get('PORTAL_TACS_MORADORES_AREAS_JSON'));
  assert.equal(catalog.length, 2);
  assert.ok(catalog.some(item => item.areaId === area.areaId && item.ativa === true));

  const editedArea = saveArea(context, {
    areaId: area.areaId, areaNome: 'Sítio Lagoa Nova', unidadeId: 'USF_LAGOA',
    unidadeNome: 'USF Lagoa Atualizada', tacsId, microareaPadrao: '3', equipe: 'Equipe Lagoa',
    planilhaId: area.planilhaId, consultaPorDocumento: false, ativa: true
  }).area;
  assert.equal(editedArea.consultaPorDocumento, false, 'A consulta por documento não respeitou o valor falso.');

  assert.throws(() => saveArea(context, {
    areaNome: 'Área Fonte Repetida', unidadeId: 'USF_2', unidadeNome: 'USF 2',
    tacsId: second.tacs.tacsId, planilhaId: area.planilhaId, ativa: true
  }), /planilha de moradores já está vinculada/);

  const createdBeforeTacsConflict = context.__created();
  assert.throws(() => saveArea(context, {
    areaNome: 'Outra Área do Mesmo TACS', unidadeId: 'USF_3', unidadeNome: 'USF 3',
    tacsId, criarFonte: true, ativa: true
  }), /já está vinculado à área/);
  assert.equal(context.__created(), createdBeforeTacsConflict, 'O conflito territorial criou uma fonte órfã.');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.throws(() => context.tacsTerritorioV1LoginTacs_({
      cns: '123456789012346', pin: '9999', dispositivo: 'iphone-tacs'
    }), /PIN incorreto/);
  }
  assert.throws(() => context.tacsTerritorioV1LoginTacs_({
    cns: '123456789012346', pin: '4321', dispositivo: 'iphone-tacs'
  }), /Aguarde 15 minutos/, 'O bloqueio temporário não foi aplicado após cinco falhas.');
  context.tacsTerritorioV1LimparFalhasLogin_('123456789012346');

  const login = context.tacsTerritorioV1LoginTacs_({
    cns: '123456789012346', pin: '4321', dispositivo: 'iphone-tacs'
  });
  assert.equal(login.areaId, area.areaId);
  const session = context.tacsTerritorioV1ValidarSessaoToken_({
    territorioToken: login.token, dispositivo: 'iphone-tacs'
  }, false);
  assert.equal(session.areaId, area.areaId);
  assert.ok(session.permissoes.includes('MORADORES_IMPORTAR_CSV'));

  return {area, login, tacsId};
}

function testCsv(context, territory) {
  installResidentStubs(context);
  vm.runInContext(read(FILES.csv), context);
  assert.equal(context.TACS_CSV_MORADORES_V1.VERSAO, '1.0.0');

  const access = {
    perfil: 'ADMIN_GERAL', operadorId: 'ADMIN_GERAL',
    areaId: territory.area.areaId, permissoes: ['*']
  };
  const csvContext = context.csvMoradoresV1Contexto_(access, territory.area.areaId);
  assert.equal(csvContext.microareaPadrao, '3');
  assert.equal(csvContext.equipe, 'Equipe Lagoa');

  const sourceSpreadsheet = context.__spreadsheets.get(territory.area.planilhaId);
  const sourceSheet = sourceSpreadsheet.getSheetByName('MORADORES');
  sourceSheet.appendRow([
    'TACS-000001','','12345678901','123456789012345','Ana Pessoa','22/09/1994','31 anos',
    'Feminino','Rua A','','','1','Equipe Lagoa','BASE','', 'ATIVO','NÃO','','',''
  ]);
  sourceSheet.appendRow([
    'TACS-000002','','22222222222','222222222222222','Carlos Pessoa','10/10/1990','35 anos',
    'Masculino','Rua C','','','1','Equipe Lagoa','BASE','', 'ATIVO','NÃO','','',''
  ]);
  const fonte = {ss: sourceSpreadsheet, sheet: sourceSheet, headerRow: 0, map: residentMap()};
  context.moradoresAdminV1LocalizarFonte_ = () => fonte;

  const csv = [
    'CPF;CNS;NOME;DATA_NASCIMENTO;SEXO;ENDERECO;CELULAR',
    '12345678901;123456789012345;Ana Pessoa;22/09/1994;Feminino;Rua A;81999990000',
    '22222222222;222222222222222;Carlos Pessoa;11/10/1990;Masculino;Rua C;',
    '33333333333;333333333333333;Nova Pessoa;05/05/2000;Feminino;Rua N;',
    ';;Bebê Sem Documento;01/08/2026;Feminino;Rua B;',
    ';;Bebê Sem Documento;01/08/2026;Feminino;Rua B;'
  ].join('\n');
  const before = sourceSheet.getLastRow();
  const preview = context.csvMoradoresV1Previa_({payload: JSON.stringify({
    csvTexto: csv, arquivo: 'moradores-lagoa.csv'
  })}, csvContext, access);

  assert.equal(sourceSheet.getLastRow(), before, 'A prévia do CSV gravou linhas na fonte.');
  assert.equal(preview.resumo.MESCLAR, 1);
  assert.equal(preview.resumo.CONFLITO_DADOS, 1);
  assert.equal(preview.resumo.NOVO, 1);
  assert.equal(preview.resumo.DUPLICADO_NO_CSV, 2, 'Duplicatas sem documento dentro do CSV não foram bloqueadas.');
  assert.equal(preview.nenhumaAlteracaoRealizada, true);
  assert.ok(preview.previewToken.length >= 20);
  const signature = context.csvMoradoresV1Token_(csv, preview.mapeamento, territory.area.areaId);
  assert.equal(
    context.csvMoradoresV1ValidarPrevia_(preview.previewToken, signature, csvContext, access),
    true,
    'O token opaco da prévia válida foi recusado.'
  );
  assert.throws(
    () => context.csvMoradoresV1ValidarPrevia_(
      preview.previewToken,
      context.csvMoradoresV1Token_(csv + '\n', preview.mapeamento, territory.area.areaId),
      csvContext,
      access
    ),
    /mudou depois da prévia/,
    'Uma alteração no CSV depois da prévia não foi bloqueada.'
  );

  const parsed = context.csvMoradoresV1Parse_(csv, ';');
  const newResident = context.csvMoradoresV1Dados_(parsed.rows[2], preview.mapeamento, csvContext);
  assert.equal(newResident.microarea, '3', 'O CSV sem microárea não herdou a configuração da área.');
  assert.equal(newResident.equipe, 'Equipe Lagoa', 'O CSV sem equipe herdou dados de outra área.');

  const merge = context.csvMoradoresV1MesclarVazios_(
    {nome: 'Ana Pessoa', celular: '', endereco: 'Rua A'},
    {nome: 'Nome que não deve substituir', celular: '81999990000', endereco: 'Outra rua'}
  );
  assert.deepEqual(Array.from(merge.campos), ['celular']);
  assert.equal(merge.dados.nome, 'Ana Pessoa');
  const consentMerge = context.csvMoradoresV1MesclarVazios_(
    {consentimentoWhatsapp: '', dataConsentimento: ''},
    {consentimentoWhatsapp: 'SIM', dataConsentimento: '11/08/2026 10:30'}
  );
  const consentPrepared = context.csvMoradoresV1PreservarMescla_(
    consentMerge,
    {
      idPortal: 'TACS-000001', id: '', origem: 'BASE', status: 'ATIVO',
      consentimentoWhatsapp: '', dataConsentimento: '', dataCadastroPortal: ''
    },
    fonte
  );
  assert.equal(consentPrepared.consentimentoWhatsapp, 'SIM');
  assert.equal(consentPrepared.dataConsentimento, '11/08/2026 10:30');
  assert.equal(context.csvMoradoresV1Booleano_('true'), true);
  assert.equal(context.csvMoradoresV1Booleano_('false'), false);

  sourceSheet.getRange(2, 17).setValue('');
  sourceSheet.getRange(2, 18).setValue('');
  const anaRaw = sourceSheet.getRange(2, 1, 1, 20).getValues()[0];
  const anaCurrent = context.moradoresAdminV1MontarMorador_(anaRaw.map(display), anaRaw, residentMap());
  const mergedData = Object.assign({}, anaCurrent, {
    celular: '81999990000',
    consentimentoWhatsapp: 'SIM',
    dataConsentimento: '11/08/2026 10:30',
    ultimaAtualizacao: new Date('2026-08-11T13:30:00.000Z')
  });
  context.csvMoradoresV1EscreverMesclasEmLote_(fonte, [{
    tipo: 'MESCLAR', dados: mergedData, origem: {aba: 'MORADORES', linha: 2},
    antes: anaCurrent, raw: anaRaw,
    campos: ['celular', 'consentimentoWhatsapp', 'dataConsentimento'],
    valores: {
      celular: '81999990000',
      consentimentoWhatsapp: 'SIM',
      dataConsentimento: '11/08/2026 10:30'
    },
    assinatura: ''
  }]);
  assert.equal(sourceSheet.getRange(2, 10).getValue(), '81999990000');
  assert.equal(sourceSheet.getRange(2, 17).getValue(), 'SIM');
  assert.equal(sourceSheet.getRange(2, 18).getValue(), '11/08/2026 10:30');

  const newPlan = [{
    tipo: 'NOVO',
    dados: {
      idPortal: 'TACS-000099', id: '', cpf: '44444444444', cns: '',
      nome: 'Pessoa em Lote', nascimento: '09/08/2001', idade: '25 anos',
      sexo: 'Feminino', endereco: 'Rua L', celular: '', telefoneContato: '',
      microarea: '3', equipe: 'Equipe Lagoa', origem: 'CSV_PORTAL:TESTE',
      ultimaAtualizacao: new Date('2026-08-11T13:30:00.000Z'), status: 'ATIVO',
      consentimentoWhatsapp: 'NÃO', dataConsentimento: '',
      dataCadastroPortal: new Date('2026-08-11T13:30:00.000Z'), observacoes: ''
    },
    campos: [], valores: {}
  }];
  const newRow = sourceSheet.getLastRow() + 1;
  context.csvMoradoresV1AdicionarNovosEmLote_(fonte, newPlan);
  assert.equal(sourceSheet.getRange(newRow, 1).getValue(), 'TACS-000099');
  assert.equal(sourceSheet.getRange(newRow, 13).getValue(), 'Equipe Lagoa');
  context.csvMoradoresV1MetasEAuditoria_(fonte, newPlan, csvContext, 'CSV-TESTE-20260811');
  const metaSheet = sourceSpreadsheet.getSheetByName('TACS_META_AREA');
  const auditSheet = sourceSpreadsheet.getSheetByName('TACS_AUDIT_MORADORES');
  assert.ok(/^MOR-/.test(String(newPlan[0].moradorId)));
  assert.equal(metaSheet.getRange(2, 2).getValue(), 'CPF:44444444444');
  assert.equal(metaSheet.getRange(2, 4).getValue(), newRow);
  assert.equal(auditSheet.getRange(2, 3).getValue(), 'IMPORTAR_CSV_NOVO');

  context.csvMoradoresV1ConsumirPrevia_(preview.previewToken);
  assert.throws(
    () => context.csvMoradoresV1ValidarPrevia_(preview.previewToken, signature, csvContext, access),
    /prévia expirou/,
    'Um token de prévia consumido continuou reutilizável.'
  );

  const commitCsv = [
    'CPF;CNS;NOME;DATA_NASCIMENTO;SEXO;ENDERECO',
    '55555555555;555555555555555;Importação Completa;12/12/2000;Feminino;Rua Completa'
  ].join('\n');
  const commitPayload = {csvTexto: commitCsv, arquivo: 'lote-completo.csv'};
  const commitPreview = context.csvMoradoresV1Previa_(
    {payload: JSON.stringify(commitPayload)}, csvContext, access
  );
  const commitResult = context.csvMoradoresV1Importar_(
    {payload: JSON.stringify(Object.assign({}, commitPayload, {
      previewToken: commitPreview.previewToken
    }))},
    csvContext,
    access
  );
  assert.equal(commitResult.ok, true);
  assert.equal(commitResult.novos, 1);
  assert.equal(sourceSheet.getRange(sourceSheet.getLastRow(), 5).getValue(), 'Importação Completa');
  assert.equal(sourceSheet.getRange(sourceSheet.getLastRow(), 13).getValue(), 'Equipe Lagoa');
  assert.equal(
    sourceSpreadsheet.getSheetByName('TACS_IMPORTACOES_MORADORES').getRange(2, 5).getValue(),
    'CONFIRMADO'
  );
  assert.throws(
    () => context.csvMoradoresV1ValidarPrevia_(
      commitPreview.previewToken,
      context.csvMoradoresV1Token_(commitCsv, commitPreview.mapeamento, territory.area.areaId),
      csvContext,
      access
    ),
    /prévia expirou/,
    'A importação confirmada não consumiu o token da prévia.'
  );

  const undone = context.csvMoradoresV1Desfazer_(
    {payload: JSON.stringify({loteId: commitResult.loteId})},
    csvContext,
    access
  );
  assert.equal(undone.ok, true);
  assert.equal(sourceSheet.getRange(sourceSheet.getLastRow(), 16).getValue(), 'IMPORTACAO_DESFEITA');
  assert.equal(
    sourceSpreadsheet.getSheetByName('TACS_IMPORTACOES_MORADORES').getRange(2, 5).getValue(),
    'DESFEITO'
  );

  sourceSheet.appendRow([
    'TACS-000200','','','666666666666666','Mescla Reversível','20/02/1990','36 anos',
    'Masculino','Rua Mescla','','','3','Equipe Lagoa','BASE','',
    'ATIVO','','','',''
  ]);
  const mergeRow = sourceSheet.getLastRow();
  const mergeCsv = [
    'CPF;CNS;NOME;DATA_NASCIMENTO;SEXO;ENDERECO;CELULAR',
    '66666666666;666666666666666;Mescla Reversível;20/02/1990;Masculino;Rua Mescla;81977770000'
  ].join('\n');
  const mergePayload = {csvTexto: mergeCsv, arquivo: 'mescla-reversivel.csv'};
  const mergePreview = context.csvMoradoresV1Previa_(
    {payload: JSON.stringify(mergePayload)}, csvContext, access
  );
  assert.equal(mergePreview.resumo.MESCLAR, 1);
  const mergeResult = context.csvMoradoresV1Importar_(
    {payload: JSON.stringify(Object.assign({}, mergePayload, {
      previewToken: mergePreview.previewToken
    }))},
    csvContext,
    access
  );
  assert.equal(mergeResult.mesclados, 1);
  assert.equal(sourceSheet.getRange(mergeRow, 3).getValue(), '66666666666');
  assert.equal(sourceSheet.getRange(mergeRow, 10).getValue(), '81977770000');
  const itemSheet = sourceSpreadsheet.getSheetByName('TACS_IMPORTACOES_ITENS');
  const mergedMoradorId = itemSheet.getRange(itemSheet.getLastRow(), 6).getValue();
  context.csvMoradoresV1Desfazer_(
    {payload: JSON.stringify({loteId: mergeResult.loteId})},
    csvContext,
    access
  );
  assert.equal(sourceSheet.getRange(mergeRow, 3).getValue(), '');
  assert.equal(sourceSheet.getRange(mergeRow, 10).getValue(), '');
  let restoredMetaKey = '';
  for (let row = 2; row <= metaSheet.getLastRow(); row += 1) {
    if (String(metaSheet.getRange(row, 1).getValue()) === String(mergedMoradorId)) {
      restoredMetaKey = String(metaSheet.getRange(row, 2).getValue());
      break;
    }
  }
  assert.equal(restoredMetaKey, 'CNS:666666666666666', 'A META permaneceu presa ao CPF removido no desfazimento.');
}

function notification(context, parameters) {
  return resultFromHtml(context.notificacoesAreaV1TratarPost_(event(parameters)));
}

function testNotifications(context, territory) {
  // Compatibilidade com o nome já utilizado no Apps Script em produção.
  context.__properties.set('ONESIGNAL_APP_API_KEY', 'private-key-for-test');
  vm.runInContext(read(FILES.notifications), context);
  assert.equal(context.TACS_NOTIFICACOES_AREA_V1.VERSAO, '1.0.2');
  assert.equal(
    context.TACS_NOTIFICACOES_AREA_V1.DEFAULT_APP_ID,
    'e2294b98-c72b-4f8c-a055-de28979676dc'
  );

  const base = {
    action: 'admin_publicar_notificacao', token: 'admin-token', dispositivo: 'iphone-admin',
    areaId: territory.area.areaId, tipo: 'recado', id: 'REC-1', titulo: 'Consulta sexta-feira',
    mensagem: 'Atendimento confirmado.', ativo: 'true', areaTag: 'area_tacs=OUTRA_AREA'
  };
  const first = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000001', eventoPublicacao: 'evento-recado-1'
  }));
  assert.equal(first.ok, true);
  assert.equal(first.areaId, territory.area.areaId);
  assert.equal(context.__fetched.length, 1);
  const sent = JSON.parse(context.__fetched[0].options.payload);
  assert.equal(sent.app_id, 'e2294b98-c72b-4f8c-a055-de28979676dc');
  assert.deepEqual(JSON.parse(JSON.stringify(sent.filters)), [
    {field: 'tag', key: 'area_tacs', relation: '=', value: territory.area.areaId}
  ]);
  assert.equal(sent.data.areaId, territory.area.areaId);
  assert.equal(JSON.stringify(sent).includes('OUTRA_AREA'), false, 'O servidor aceitou o filtro livre enviado pelo navegador.');
  assert.equal(context.__fetched[0].options.headers.Authorization, 'Key private-key-for-test');
  const polled = resultFromJson(context.notificacoesAreaV1TratarGet_(event({
    action: 'admin_result', requestId: 'push_area_000001'
  })));
  assert.equal(polled.ok, true);
  assert.equal(polled.pendente, false);
  assert.equal(polled.result.onesignalId, first.onesignalId);

  const sameEvent = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000002', eventoPublicacao: 'evento-recado-1'
  }));
  assert.equal(sameEvent.onesignalId, first.onesignalId);
  assert.equal(context.__fetched.length, 1, 'O mesmo evento foi enviado duas vezes.');

  notification(context, Object.assign({}, base, {
    requestId: 'push_area_000003', eventoPublicacao: 'evento-recado-2'
  }));
  assert.equal(context.__fetched.length, 2, 'Republicar o mesmo recado como novo evento não gerou nova notificação.');

  context.__setMaintenance(true);
  const blocked = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000004', eventoPublicacao: 'evento-bloqueado'
  }));
  assert.equal(blocked.skipped, true);
  assert.equal(blocked.maintenance, true);
  assert.equal(context.__fetched.length, 2);

  const fakeBypass = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000005', eventoPublicacao: 'evento-falso',
    comunicadoManutencao: 'true', titulo: 'Outro título'
  }));
  assert.equal(fakeBypass.skipped, true);
  assert.equal(context.__fetched.length, 2, 'Um comunicado falso contornou o modo manutenção.');

  const maintenancePush = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000006', eventoPublicacao: 'evento-manutencao',
    comunicadoManutencao: 'true',
    titulo: context.TACS_NOTIFICACOES_AREA_V1.MAINTENANCE_TITLE,
    mensagem: context.TACS_NOTIFICACOES_AREA_V1.MAINTENANCE_MESSAGE
  }));
  assert.equal(maintenancePush.push, true);
  assert.equal(context.__fetched.length, 3);

  const tacsDenied = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000007', eventoPublicacao: 'evento-tacs', token: '',
    territorioToken: territory.login.token, dispositivo: 'iphone-tacs'
  }));
  assert.equal(tacsDenied.ok, false);
  assert.match(tacsDenied.message, /administrador geral/);
  assert.equal(context.__fetched.length, 3);

  context.__setMaintenance(false);
  context.__setFetchResponse({recipients: 0});
  const zeroAudience = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000008', eventoPublicacao: 'evento-sem-destinatario'
  }));
  assert.equal(zeroAudience.ok, true);
  assert.equal(zeroAudience.push, false);
  assert.equal(zeroAudience.zeroAudience, true);
  assert.equal(zeroAudience.destinatarios, 0);
  assert.equal(context.__fetched.length, 4);

  context.__setFetchResponse({id: 'push-sem-contagem'});
  const acceptedWithoutCount = notification(context, Object.assign({}, base, {
    requestId: 'push_area_000009', eventoPublicacao: 'evento-sem-contagem'
  }));
  assert.equal(acceptedWithoutCount.push, true);
  assert.equal(acceptedWithoutCount.onesignalId, 'push-sem-contagem');
  assert.equal(acceptedWithoutCount.destinatarios, null);
  assert.equal(context.__fetched.length, 5);
}

function testWrappedRoutes(context) {
  const session = {token: 'admin-token', dispositivo: 'iphone-admin'};
  const territoryResult = resultFromHtml(context.doPost(event(Object.assign({}, session, {
    action: 'admin_territorio_dados', requestId: 'wrapped_territory_001'
  }))));
  assert.equal(territoryResult.ok, true, 'A cadeia global de doPost perdeu a rota territorial.');

  const csvResult = resultFromHtml(context.doPost(event(Object.assign({}, session, {
    action: 'admin_csv_lotes', requestId: 'wrapped_csv_00000001', areaId: 'SITIO_LAGOA_NOVA'
  }))));
  assert.equal(csvResult.ok, true, 'A cadeia global de doPost perdeu a rota de CSV.');
  assert.equal(csvResult.areaId, 'SITIO_LAGOA_NOVA');
}

function main() {
  const context = makeContext();
  const territory = testTerritory(context);
  testCsv(context, territory);
  testNotifications(context, territory);
  testWrappedRoutes(context);
  console.log('Território, TACS reeditável, isolamento, CSV seguro e push segmentado validados.');
}

main();
