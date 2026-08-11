'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'apps-script/ZZZZ_15_MoradoresAdminPortalV1.gs'),
  'utf8'
);

function makeContext() {
  const cache = new Map();
  let spreadsheet = null;
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
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty() { return null; },
          setProperty() {},
          deleteProperty() {}
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
    SpreadsheetApp: {
      openById() { return spreadsheet; }
    },
    Utilities: {
      DigestAlgorithm: {SHA_256: 'SHA_256'},
      Charset: {UTF_8: 'UTF_8'},
      computeDigest(_algorithm, value) {
        return Array.from(crypto.createHash('sha256').update(String(value)).digest())
          .map(byte => byte > 127 ? byte - 256 : byte);
      }
    }
  });
  context.__cache = cache;
  context.__setSpreadsheet = value => { spreadsheet = value; };
  return context;
}

function testLightweightCountAndSummary(context) {
  const calls = [];
  const names = [['Ana'], ['Bruno'], [''], ['Carla'], ['Denise']];
  const statuses = [
    ['ATIVO'],
    ['CONSOLIDADO'],
    ['ATIVO'],
    ['TRANSFERIDO'],
    ['IMPORTACAO_DESFEITA']
  ];
  const sheet = {
    getName() { return 'MORADORES'; },
    getLastRow() { return 6; },
    getLastColumn() { return 20; },
    getRange(row, column, rowCount, columnCount) {
      calls.push({row, column, rowCount, columnCount});
      return {
        getDisplayValues() {
          if (column === 5) return names;
          if (column === 16) return statuses;
          throw new Error(`Leitura inesperada na coluna ${column}.`);
        }
      };
    }
  };
  const fonte = {
    sheet,
    headerRow: 0,
    map: {nome: 4, status: 15}
  };
  const contexto = {
    areaId: 'JAPARANDUBA',
    planilhaId: '114ObXLQ8sQSDosauEbAdlhQRWNksJ20Kq57CucpKbTg'
  };

  assert.equal(context.moradoresAdminV1ContarOperacionais_(fonte), 2);
  assert.deepEqual(
    calls.map(call => call.column),
    [5, 16],
    'A contagem deve ler somente NOME e STATUS.'
  );

  calls.length = 0;
  const first = context.moradoresAdminV1ResumoFonte_(fonte, contexto);
  assert.equal(first.cache, false);
  assert.equal(first.totalRegistros, 2);
  assert.equal(calls.length, 2);

  const second = context.moradoresAdminV1ResumoFonte_(fonte, contexto);
  assert.equal(second.cache, true);
  assert.equal(second.totalRegistros, 2);
  assert.equal(calls.length, 2, 'O resumo em cache não deve reler moradores.');

  context.moradoresAdminV1InvalidarResumo_(contexto);
  const third = context.moradoresAdminV1ResumoFonte_(fonte, contexto);
  assert.equal(third.cache, false);
  assert.equal(calls.length, 4, 'A escrita deve invalidar e forçar nova contagem.');
}

function testSourceCache(context) {
  const headers = [
    'ID_PORTAL','ID','CPF','CNS','NOME','DATA_NASCIMENTO','IDADE','SEXO',
    'ENDERECO','CELULAR','TELEFONE_CONTATO','MICROAREA','EQUIPE','ORIGEM',
    'ULTIMA_ATUALIZACAO','STATUS','CONSENTIMENTO_WHATSAPP','DATA_CONSENTIMENTO',
    'DATA_CADASTRO_PORTAL','OBSERVACOES'
  ];
  let scans = 0;
  let directLookups = 0;
  const sheet = {
    getName() { return 'MORADORES'; },
    getLastRow() { return 4; },
    getLastColumn() { return 20; },
    getRange(row, _column, rowCount) {
      return {
        getDisplayValues() {
          if (row === 1 && rowCount === 1) return [headers.slice()];
          if (row === 1) {
            const rows = [headers.slice()];
            while (rows.length < rowCount) rows.push(new Array(20).fill(''));
            return rows;
          }
          throw new Error('Faixa inesperada durante localização da fonte.');
        }
      };
    }
  };
  const spreadsheet = {
    getSheets() { scans += 1; return [sheet]; },
    getSheetByName(name) {
      directLookups += 1;
      return name === 'MORADORES' ? sheet : null;
    }
  };
  context.__setSpreadsheet(spreadsheet);
  const contexto = {
    areaId: 'JAPARANDUBA',
    planilhaId: '114ObXLQ8sQSDosauEbAdlhQRWNksJ20Kq57CucpKbTg'
  };

  const first = context.moradoresAdminV1LocalizarFonte_(contexto);
  assert.equal(first.cacheFonte, false);
  assert.equal(scans, 1);

  const second = context.moradoresAdminV1LocalizarFonte_(contexto);
  assert.equal(second.cacheFonte, true);
  assert.equal(scans, 1, 'O segundo acesso não deve varrer todas as abas.');
  assert.equal(directLookups, 1);
  assert.equal(second.map.nome, 4);
  assert.equal(second.map.status, 15);
}

function main() {
  new vm.Script(SOURCE, {filename: 'ZZZZ_15_MoradoresAdminPortalV1.gs'});
  const context = makeContext();
  vm.runInContext(SOURCE, context);
  assert.equal(context.TACS_MORADORES_ADMIN_V1.VERSAO, '1.4.5');
  assert.equal(
    context.moradoresAdminV1EstaOculto_(
      {status: 'IMPORTACAO_DESFEITA'},
      {situacao: 'ATIVO'}
    ),
    true,
    'Uma importação desfeita não pode reaparecer por causa de META antiga.'
  );
  assert.equal(
    context.moradoresAdminV1EstaOculto_(
      {status: 'ATIVO'},
      {situacao: 'IMPORTACAO_DESFEITA'}
    ),
    true,
    'A situação de desfazimento registrada na META também deve ocultar a linha.'
  );
  assert.equal(
    context.moradoresAdminV1FormatarNascimento_(
      new Date('1994-09-23T00:00:00.000Z'),
      '22/09/1994'
    ),
    '22/09/1994',
    'A data civil exibida na planilha deve prevalecer sobre o objeto Date com fuso diferente.'
  );
  testLightweightCountAndSummary(context);
  testSourceCache(context);
  console.log('Moradores 1.4.5: leitura leve, cache validado e invalidação após escrita aprovados.');
}

main();
