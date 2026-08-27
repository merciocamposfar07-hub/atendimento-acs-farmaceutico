'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const guardPath = path.join(root, 'apps-script', 'ZZZZ_50_NascimentoCivilBackupGuardV1.gs');
const guardSource = fs.readFileSync(guardPath, 'utf8');
const plusSource = fs.readFileSync(path.join(root, 'apps-script', 'ZZZZ_23_CorrecaoNascimentoMaisUmDiaV1.gs'), 'utf8');
const buildSource = fs.readFileSync(path.join(root, 'scripts', 'build_apps_script_release.js'), 'utf8');
const packageSource = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const HEADERS = ['ABA_FONTE','LINHA_FONTE','ID_PORTAL','DATA_ANTES','DATA_DEPOIS','REGISTRADO_EM'];
const PLANILHA = '114ObXLQ8sQSDosauEbAdlhQRWNksJ20Kq57CucpKbTg';

function makeFonte(rows, spreadsheetId = PLANILHA) {
  const backupRows = [HEADERS].concat(rows || []);
  const backup = {
    getLastRow() { return backupRows.length; },
    getRange(row, col, numRows, numCols) {
      return {
        getDisplayValues() {
          return backupRows.slice(row - 1, row - 1 + numRows).map(r => r.slice(col - 1, col - 1 + numCols));
        }
      };
    }
  };
  return {
    ss: {
      getId() { return spreadsheetId; },
      getSheetByName(name) { return name === 'TACS_BACKUP_NASCIMENTO_V1' ? backup : null; }
    },
    sheet: { getName() { return 'MORADORES'; } }
  };
}

function execute(rows, currentBirth = '24/08/1988', currentId = 'TACS-000123', spreadsheetId = PLANILHA) {
  const context = {
    console,
    Date,
    Object,
    String,
    Number,
    Boolean,
    Math,
    JSON,
    RegExp,
    Error,
    Array,
    TACS_MORADORES_ADMIN_V1: { DEFAULT_RESIDENT_SPREADSHEET_ID: PLANILHA },
    moradoresAdminV1LocalizarTodosPorDocumento_() {
      return [{
        origem: { aba: 'MORADORES', linha: 27 },
        morador: { idPortal: currentId, nascimento: currentBirth, nome: 'Moradora Teste' }
      }];
    }
  };
  vm.createContext(context);
  vm.runInContext(guardSource, context, {filename: 'ZZZZ_50_NascimentoCivilBackupGuardV1.gs'});
  return context.moradoresAdminV1LocalizarTodosPorDocumento_(makeFonte(rows, spreadsheetId), 'cpf', '')[0].morador.nascimento;
}

const comprovado = [['MORADORES','27','TACS-000123','23/08/1988','24/08/1988','14/08/2026 00:00:00']];
assert.equal(execute(comprovado), '23/08/1988', 'O backup comprovado 23→24 precisa devolver 23 no autofill.');
assert.equal(execute(comprovado, '25/08/1988'), '25/08/1988', 'Data alterada depois do backup não pode ser tocada.');
assert.equal(execute(comprovado, '24/08/1988', 'OUTRO-ID'), '24/08/1988', 'ID Portal divergente não pode ser tocado.');
assert.equal(execute(comprovado, '24/08/1988', 'TACS-000123', 'OUTRA_PLANILHA'), '24/08/1988', 'Outra área/fonte não pode receber a correção.');
assert.equal(
  execute([['MORADORES','27','TACS-000123','22/08/1988','24/08/1988','14/08/2026 00:00:00']]),
  '24/08/1988',
  'Backup que não representa exatamente +1 dia deve ser ignorado.'
);
assert.equal(
  execute(comprovado.concat(comprovado)),
  '24/08/1988',
  'Backup duplicado para a mesma linha deve ser tratado como ambíguo e ignorado.'
);

assert.match(guardSource, /TACS_BACKUP_NASCIMENTO_V1/);
assert.match(guardSource, /atual!==backup\.depois/);
assert.match(guardSource, /copia\.morador\.nascimento=backup\.antes/);
assert.doesNotMatch(guardSource, /\.setValues\(|\.setValue\(|appendRow\(|deleteRow\(/,
  'A proteção de leitura não pode escrever na planilha.');

// Estes contratos passam a ser verdadeiros depois da aplicação cirúrgica do workflow.
if (/DESATIVADA:\s*true/.test(plusSource)) {
  assert.match(plusSource, /correção histórica de \+1 dia foi desativada/i);
  assert.match(plusSource, /podeAplicar:false/);
}
if (/ZZZZ_50_NascimentoCivilBackupGuardV1\.gs/.test(buildSource)) {
  assert.match(buildSource, /TACS_NASCIMENTO_CIVIL_BACKUP_GUARD_V1/);
}
if (/test_nascimento_civil_backup_guard_v1\.js/.test(packageSource)) {
  assert.match(packageSource, /test_birth_plus_one_fix\.js && node scripts\/test_nascimento_civil_backup_guard_v1\.js/);
}

console.log('NASCIMENTO_CIVIL_BACKUP_GUARD_V1_OK');
