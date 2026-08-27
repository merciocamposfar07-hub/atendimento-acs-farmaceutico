'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs'), 'utf8');
const msgSource = fs.readFileSync(path.join(ROOT, 'apps-script/ZZZZ_40_MensagensIndividuaisMoradorV1.gs'), 'utf8');
const reportSource = fs.readFileSync(path.join(ROOT, 'apps-script/ZZZZ_42_ComprovacaoMensagensV1.gs'), 'utf8');

function formatDate(date, timeZone, pattern) {
  assert.equal(timeZone, 'America/Recife', 'O backend deve formatar o horário em America/Recife.');
  assert.equal(pattern, 'dd/MM/yyyy HH:mm:ss');
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(new Date(date.getTime()));
  const value = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return `${value.day}/${value.month}/${value.year} ${value.hour}:${value.minute}:${value.second}`;
}

let auditDataRow = null;
let displayReadOnAuditRows = 0;
const sheet = {
  getLastRow: () => 2,
  getRange: (row) => {
    if (row === 1) {
      return {
        getDisplayValues: () => [sandbox.TACS_NOTIFICACOES_AREA_V1.AUDIT_HEADERS.slice()]
      };
    }
    return {
      getValues: () => [auditDataRow],
      getDisplayValues: () => {
        displayReadOnAuditRows++;
        return [[
          'evt-20260827-111005', 'JAPARANDUBA', 'MENSAGEM_INDIVIDUAL', 'MORADOR_TESTE',
          'Portal TACS — Lembrete', 'ADMIN_GERAL', '123e4567-e89b-12d3-a456-426614174000',
          '1', 'OK', '27/08/2026 07:10:05'
        ]];
      }
    };
  }
};

const sandbox = {
  console,
  Date,
  Utilities: { formatDate },
  tacsTerritorioV1Planilha_: () => ({
    getSheetByName: (name) => name === 'TACS_AUDIT_NOTIFICACOES' ? sheet : null
  })
};
vm.createContext(sandbox);
new vm.Script(source, { filename: 'ZZZZ_19_NotificacoesSegmentadasV1.gs' }).runInContext(sandbox);

// Reproduz exatamente a diferença fotografada: o instante real de 14:10:05 UTC
// corresponde a 11:10:05 em Pernambuco. A planilha, se consultada por texto,
// pode mostrar 07:10:05 por causa do fuso configurado nela. O backend não pode
// usar esse texto; precisa usar o Date bruto e formatar em America/Recife.
const instanteReal = new Date('2026-08-27T14:10:05.000Z');
auditDataRow = [
  'evt-20260827-111005', 'JAPARANDUBA', 'MENSAGEM_INDIVIDUAL', 'MORADOR_TESTE',
  'Portal TACS — Lembrete', 'ADMIN_GERAL', '123e4567-e89b-12d3-a456-426614174000',
  1, 'OK', instanteReal
];

assert.equal(
  sandbox.notificacoesAreaV1DataPainel_(instanteReal),
  '27/08/2026 11:10:05',
  '14:10:05Z precisa aparecer como 11:10:05 em America/Recife.'
);

const porEvento = sandbox.notificacoesAreaV1AuditoriaPorEvento_('JAPARANDUBA', 'evt-20260827-111005');
assert.ok(porEvento, 'A auditoria do evento deve ser localizada.');
assert.equal(
  porEvento.registradoEm,
  '27/08/2026 11:10:05',
  'A consulta por evento deve devolver o horário real de Recife, não o texto 07:10:05 da planilha.'
);

const ultimo = sandbox.notificacoesAreaV1UltimoEnvio_('JAPARANDUBA', 'MENSAGEM_INDIVIDUAL', 'MORADOR_TESTE');
assert.ok(ultimo, 'O último envio deve ser localizado.');
assert.equal(
  ultimo.registradoEm,
  '27/08/2026 11:10:05',
  'O último envio deve devolver o horário real de Recife.'
);

assert.equal(
  displayReadOnAuditRows,
  0,
  'As linhas de auditoria não podem ser lidas por getDisplayValues(), pois isso reaplica o fuso da planilha.'
);

assert.match(
  msgSource,
  /auditoriaEnvio&&auditoriaEnvio\.registradoEm/,
  'O status individual deve usar o horário auditado do envio.'
);
assert.match(
  reportSource,
  /encaminhadoAuditoria/,
  'O histórico persistente deve usar o horário auditado do envio.'
);

console.log('TESTE HORARIO RECIFE OK: 14:10:05Z => 11:10:05 America/Recife; 07:10:05 da planilha foi ignorado.');
