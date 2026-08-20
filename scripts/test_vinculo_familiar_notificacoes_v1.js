'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'apps-script', 'ZZZZ_37_VinculoFamiliarNotificacoesV1.gs'),
  'utf8'
);

function contextBase() {
  const calls = [];
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
    moradoresAdminV1NormalizarAreaId_(value) {
      return String(value || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    },
    saudeNotificacoesV1CheckinPublico_(payload) {
      calls.push({...payload});
      return {ok: true, registrado: true};
    },
    saudeNotificacoesV1SaudeAdmin_() {
      return {ok: true, aparelhos: []};
    }
  });
  context.__calls = calls;
  vm.runInContext(SOURCE, context);
  return context;
}

const context = contextBase();
assert.equal(context.TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.VERSAO, '1.0.0');
assert.equal(
  context.vinculoFamiliarNotifV1CodigoEndereco_('Sítio JAPARANDUBA, 002. ZONA RURAL, Chã Grande - PE'),
  '002'
);
assert.equal(
  context.vinculoFamiliarNotifV1CodigoEndereco_('Sítio JAPARANDUBA, 012C. ZONA RURAL, Chã Grande - PE'),
  '012C'
);
assert.equal(context.vinculoFamiliarNotifV1CodigoEndereco_('ENDEREÇO SEM CÓDIGO'), '');
assert.equal(context.vinculoFamiliarNotifV1Decidir_(null, {familiaId: '002'}).acao, 'VINCULAR');
assert.equal(
  context.vinculoFamiliarNotifV1Decidir_({familiaId: '002'}, {familiaId: '002'}).acao,
  'MESMA_FAMILIA'
);
assert.equal(
  context.vinculoFamiliarNotifV1Decidir_({familiaId: '002'}, {familiaId: '003'}).acao,
  'OUTRA_FAMILIA'
);
assert.equal(context.vinculoFamiliarNotifV1Decidir_({familiaId: '002'}, null).acao, 'NADA');

context.vinculoFamiliarNotifV1Ler_ = () => ({
  familiaId: '002',
  nome: 'Maria',
  subscriptionId: '11111111-1111-1111-1111-111111111111'
});
context.vinculoFamiliarNotifV1ResolverMoradorDocumento_ = () => ({
  familiaId: '003',
  idPortal: '99',
  nome: 'Outra pessoa'
});
context.vinculoFamiliarNotifV1ResolverLegado_ = () => null;
context.vinculoFamiliarNotifV1Gravar_ = () => {
  throw new Error('O vínculo familiar existente não pode ser trocado.');
};

const otherFamily = context.saudeNotificacoesV1CheckinPublico_({
  subscriptionId: '11111111-1111-1111-1111-111111111111',
  areaId: 'JAPARANDUBA',
  documento: '12345678901',
  permission: 'true'
});
assert.equal(otherFamily.familiaId, '002');
assert.equal(otherFamily.familiaDiferente, true);
assert.equal(otherFamily.familiaBeneficiario, '003');
assert.equal(context.__calls.length, 1);
assert.equal(
  Object.prototype.hasOwnProperty.call(context.__calls[0], 'documento'),
  false,
  'O CPF/CNS do beneficiário não pode substituir o vínculo do aparelho depois que a família foi definida.'
);

const firstContext = contextBase();
firstContext.vinculoFamiliarNotifV1Ler_ = () => null;
firstContext.vinculoFamiliarNotifV1ResolverLegado_ = () => null;
firstContext.vinculoFamiliarNotifV1ResolverMoradorDocumento_ = () => ({
  familiaId: '002',
  idPortal: '72',
  nome: 'Luiz Pedro'
});
firstContext.vinculoFamiliarNotifV1Gravar_ = (_subscription, _area, morador) => ({
  familiaId: morador.familiaId,
  nome: morador.nome,
  subscriptionId: '22222222-2222-2222-2222-222222222222'
});

const firstLink = firstContext.saudeNotificacoesV1CheckinPublico_({
  subscriptionId: '22222222-2222-2222-2222-222222222222',
  areaId: 'JAPARANDUBA',
  documento: '12345678901'
});
assert.equal(firstLink.vinculadoFamilia, true);
assert.equal(firstLink.familiaId, '002');
assert.equal(firstLink.familiaDiferente, false);

console.log('Vínculo familiar de notificações: código no ENDERECO, vínculo persistente e outra família da mesma área aprovados.');
