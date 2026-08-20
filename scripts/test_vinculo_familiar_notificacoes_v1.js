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
assert.equal(context.TACS_VINCULO_FAMILIAR_NOTIFICACOES_V1.VERSAO, '1.0.1');
assert.equal(
  context.vinculoFamiliarNotifV1CodigoEndereco_('Sítio JAPARANDUBA, 002. ZONA RURAL, Chã Grande - PE'),
  '002'
);
assert.equal(
  context.vinculoFamiliarNotifV1CodigoEndereco_('Sítio JAPARANDUBA, 012C. ZONA RURAL, Chã Grande - PE'),
  '012C'
);
assert.equal(
  context.vinculoFamiliarNotifV1CodigoEndereco_('Sítio JAPARANDUBA, 012. ZONA RURAL, Chã Grande - PE'),
  '012'
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
  idPortal: '72',
  nome: 'Maria',
  subscriptionId: '11111111-1111-1111-1111-111111111111',
  areaId: 'JAPARANDUBA'
});
context.vinculoFamiliarNotifV1ResolverMoradorDocumento_ = () => ({
  familiaId: '003',
  idPortal: '99',
  nome: 'Outra pessoa'
});
context.vinculoFamiliarNotifV1ResolverLegado_ = () => null;
context.vinculoFamiliarNotifV1ReconciliarReferencia_ = (vinculo) => vinculo;
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
  idPortal: morador.idPortal,
  nome: morador.nome,
  areaId: 'JAPARANDUBA',
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

const correctionContext = contextBase();
let correctionCalls = 0;
correctionContext.vinculoFamiliarNotifV1ResolverMoradorId_ = () => ({
  familiaId: '012',
  idPortal: '120',
  nome: 'Morador referência'
});
correctionContext.vinculoFamiliarNotifV1AtualizarReferencia_ = (vinculo, morador) => {
  correctionCalls += 1;
  return {...vinculo, familiaId: morador.familiaId, nome: morador.nome, origem: 'CADASTRO_REFERENCIA_ATUALIZADO'};
};
const corrected = correctionContext.vinculoFamiliarNotifV1ReconciliarReferencia_({
  familiaId: '012C',
  idPortal: '120',
  nome: 'Morador referência',
  areaId: 'JAPARANDUBA',
  subscriptionId: '33333333-3333-3333-3333-333333333333'
}, 'JAPARANDUBA');
assert.equal(corrected.familiaId, '012');
assert.equal(corrected.origem, 'CADASTRO_REFERENCIA_ATUALIZADO');
assert.equal(correctionCalls, 1);

correctionContext.vinculoFamiliarNotifV1ResolverMoradorId_ = () => ({
  familiaId: '012',
  idPortal: '999',
  nome: 'Outra pessoa'
});
const protectedLink = correctionContext.vinculoFamiliarNotifV1ReconciliarReferencia_({
  familiaId: '012C',
  idPortal: '120',
  nome: 'Morador referência',
  areaId: 'JAPARANDUBA',
  subscriptionId: '33333333-3333-3333-3333-333333333333'
}, 'JAPARANDUBA');
assert.equal(protectedLink.familiaId, '012C');
assert.equal(correctionCalls, 1, 'Outra pessoa não pode corrigir/trocar o vínculo familiar do aparelho.');

assert(SOURCE.includes('vinculoFamiliarNotifV1ReconciliarArea_(contexto);'));
assert(SOURCE.includes('CADASTRO_REFERENCIA_ATUALIZADO'));

console.log('Vínculo familiar de notificações: código no ENDERECO, vínculo persistente, outra família protegida e correção cadastral sincronizada.');


const FAMILY_AUTOFILL_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'apps-script', 'ZZZZ_39_VerificacaoFamiliaAutofillV1.gs'),
  'utf8'
);
const AUTOFILL_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'moradores-autofill.js'), 'utf8');
const NOTIFICATION_FRONT_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'portal-notification-health.js'), 'utf8');
const INDEX_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(FAMILY_AUTOFILL_SOURCE.includes("TACS_VERIFICACAO_FAMILIA_AUTOFILL_V1=Object.freeze({VERSAO:'1.0.0'})"));
assert(FAMILY_AUTOFILL_SOURCE.includes('vinculoFamiliarNotifV1CodigoEndereco_'));
assert(FAMILY_AUTOFILL_SOURCE.includes('vinculoFamiliarNotifV1Decidir_'));
assert(FAMILY_AUTOFILL_SOURCE.includes("action!=='buscar_morador'&&action!=='buscar_morador_bridge'"));
assert(AUTOFILL_SOURCE.includes("FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaAutofillV1:'"));
assert(AUTOFILL_SOURCE.includes("familiaReferencia=' + encodeURIComponent(familyReference())"));
assert(AUTOFILL_SOURCE.includes('applyFamilyContext(payload);'));
assert(AUTOFILL_SOURCE.includes("notice.id = 'familyAutofillNotice'"));
assert(!NOTIFICATION_FRONT_SOURCE.includes('familyDeviceNotice'));
assert(!NOTIFICATION_FRONT_SOURCE.includes('showFamilyContext'));
assert(INDEX_SOURCE.includes('portal-notification-health.js?v=20260820-notif-only-v107'));
assert(INDEX_SOURCE.includes('moradores-autofill.js?v=20260820-familia-autofill-v111'));
console.log('VERIFICACAO_FAMILIA_AUTOFILL_V1_TESTS_OK');
