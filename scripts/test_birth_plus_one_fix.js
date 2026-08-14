const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'apps-script', 'ZZZZ_23_CorrecaoNascimentoMaisUmDiaV1.gs');
const source = fs.readFileSync(file, 'utf8');
const restoreFile = path.join(__dirname, '..', 'apps-script', 'ZZZZ_24_RestauracaoNascimentoBackupV1.gs');
const restoreSource = fs.readFileSync(restoreFile, 'utf8');

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
  ContentService: {
    MimeType: {JSON: 'json'},
    createTextOutput(value) {
      return {setMimeType() { return value; }};
    }
  }
};
vm.createContext(context);
vm.runInContext(source, context, {filename: 'ZZZZ_23_CorrecaoNascimentoMaisUmDiaV1.gs'});
vm.runInContext(restoreSource, context, {filename: 'ZZZZ_24_RestauracaoNascimentoBackupV1.gs'});

function plus(value) {
  const civil = context.correcaoNascimentoV1Civil_(value);
  assert.ok(civil, `Data deveria ser válida: ${value}`);
  return context.correcaoNascimentoV1Formatar_(context.correcaoNascimentoV1SomarUmDia_(civil));
}

function restorePlus(value) {
  const civil = context.restauracaoNascimentoV1Civil_(value);
  assert.ok(civil, `Data de restauração deveria ser válida: ${value}`);
  return context.restauracaoNascimentoV1Formatar_(context.restauracaoNascimentoV1SomarUmDia_(civil));
}

assert.strictEqual(plus('29/03/2025'), '30/03/2025');
assert.strictEqual(plus('31/03/2025'), '01/04/2025');
assert.strictEqual(plus('31/12/2025'), '01/01/2026');
assert.strictEqual(plus('28/02/2024'), '29/02/2024');
assert.strictEqual(plus('29/02/2024'), '01/03/2024');
assert.strictEqual(plus('28/02/2025'), '01/03/2025');
assert.strictEqual(plus('2025-03-29'), '30/03/2025');
assert.strictEqual(context.correcaoNascimentoV1Civil_('31/02/2025'), null);
assert.strictEqual(context.correcaoNascimentoV1Civil_('texto'), null);

assert.strictEqual(restorePlus('29/03/2025'), '30/03/2025');
assert.strictEqual(restorePlus('31/12/2025'), '01/01/2026');
assert.strictEqual(context.restauracaoNascimentoV1Civil_('31/02/2025'), null);

assert.match(source, /AREA_ID:\s*'JAPARANDUBA'/);
assert.match(source, /DONE_PROPERTY:\s*'TACS_FIX_NASCIMENTO_JAPARANDUBA_PLUS1_V1_DONE'/);
assert.match(source, /BACKUP_SHEET:\s*'TACS_BACKUP_NASCIMENTO_V1'/);
assert.match(source, /CONFIRMATION:\s*'CORRIGIR_UM_DIA_JAPARANDUBA'/);
assert.match(source, /var nascimentoCol=plano\.fonte\.map\.nascimento\+1;/);
assert.match(source, /getRange\(plano\.inicio,nascimentoCol,plano\.quantidade,1\)/);
assert.match(source, /coluna\.setValues\(novos\)/);
assert.match(source, /coluna\.setNumberFormat\('dd\/MM\/yyyy'\)/);
assert.match(source, /correcaoNascimentoV1GarantirBackup_/);
assert.match(source, /props\.setProperty\(TACS_CORRECAO_NASCIMENTO_V1\.DONE_PROPERTY/);
assert.match(source, /não altera IDADE nem qualquer outra coluna/i);

assert.match(restoreSource, /var TACS_RESTAURACAO_NASCIMENTO_V1 = Object\.freeze/);
assert.match(restoreSource, /RESTORED_PROPERTY:\s*'TACS_FIX_NASCIMENTO_JAPARANDUBA_PLUS1_V1_RESTORED'/);
assert.match(restoreSource, /CONFIRMATION:\s*'RESTAURAR_BACKUP_NASCIMENTO_JAPARANDUBA'/);
assert.match(restoreSource, /admin_nascimento_restaurar_preview/);
assert.match(restoreSource, /admin_nascimento_restaurar/);
assert.match(restoreSource, /dataAtual!==depois/);
assert.match(restoreSource, /idPortal&&idAtual!==idPortal/);
assert.match(restoreSource, /esperadoDepois!==restauracaoNascimentoV1Formatar_\(civilDepois\)/);
assert.match(restoreSource, /plano\.formulas\.length/);
assert.match(restoreSource, /porLinha\[item\.linha\]=item\.civilAntes/);
assert.match(restoreSource, /props\.setProperty\(TACS_RESTAURACAO_NASCIMENTO_V1\.RESTORED_PROPERTY/);
assert.doesNotMatch(restoreSource, /deleteProperty\(TACS_RESTAURACAO_NASCIMENTO_V1\.APPLIED_PROPERTY/);
assert.match(restoreSource, /Nenhuma outra coluna foi alterada/);

const page = fs.readFileSync(path.join(__dirname, '..', 'corrigir-nascimentos-japaranduba.html'), 'utf8');
assert.match(page, /admin_nascimento_preview/);
assert.match(page, /admin_nascimento_corrigir/);
assert.match(page, /CORRIGIR 1 DIA/);
assert.match(page, /CORRIGIR_UM_DIA_JAPARANDUBA/);
assert.match(page, /não altera outras colunas/i);
assert.match(page, /id="invalidList"/);
assert.match(page, /Array\.isArray\(r\.invalidas\)/);
assert.match(page, /Datas inválidas encontradas/);
assert.match(page, /Linha da planilha/);
assert.match(page, /Valor encontrado/);
assert.match(page, /corrigir somente essas datas antes de repetir a prévia/);

const restorePage = fs.readFileSync(path.join(__dirname, '..', 'restaurar-backup-nascimentos-japaranduba.html'), 'utf8');
assert.match(restorePage, /admin_nascimento_restaurar_preview/);
assert.match(restorePage, /admin_nascimento_restaurar/);
assert.match(restorePage, /RESTAURAR BACKUP/);
assert.match(restorePage, /RESTAURAR_BACKUP_NASCIMENTO_JAPARANDUBA/);
assert.match(restorePage, /Se qualquer linha tiver mudado depois, a restauração inteira é bloqueada/);
assert.match(restorePage, /correção original continuará travada/i);

const build = fs.readFileSync(path.join(__dirname, 'build_apps_script_release.js'), 'utf8');
assert.match(build, /ZZZZ_24_RestauracaoNascimentoBackupV1\.gs/);
assert.match(build, /TACS_RESTAURACAO_NASCIMENTO_V1/);

console.log('Correção +1 dia e restauração: data civil, backup, conferência integral, datas inválidas visíveis, bloqueio por divergência e travas contra repetição validados.');