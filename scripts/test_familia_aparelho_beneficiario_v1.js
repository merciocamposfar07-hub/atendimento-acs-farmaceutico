'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const PORTAL=fs.readFileSync(path.join(ROOT,'portal-identificacao-familia-v1.js'),'utf8');
const FAMILY=fs.readFileSync(path.join(ROOT,'apps-script/ZZZZ_37_VinculoFamiliarNotificacoesV1.gs'),'utf8');
const HEALTH=fs.readFileSync(path.join(ROOT,'portal-notification-health.js'),'utf8');

assert(PORTAL.includes("FAMILY_STORAGE_PREFIX='portalTacsFamiliaAutofillV1:'"),'A família lembrada precisa continuar isolada por área.');
assert(PORTAL.includes('oneSignal.User.PushSubscription'),'O canal técnico deve continuar vindo da Subscription ID do OneSignal.');

const selectStart=PORTAL.indexOf('function selectMember(token)');
const selectEnd=PORTAL.indexOf('function complementRequestId()',selectStart);
assert(selectStart>=0&&selectEnd>selectStart,'Não foi possível localizar o fluxo de seleção do beneficiário.');
const selectBlock=PORTAL.slice(selectStart,selectEnd);
assert(!/localStorage\.setItem|FAMILY_STORAGE_PREFIX|LEGACY_FAMILY_STORAGE_PREFIX/.test(selectBlock),'Selecionar beneficiário não pode trocar a família persistida do aparelho.');
assert(!/OneSignal|oneSignal|PushSubscription|\.login\s*\(|\.logout\s*\(|addAlias|external[_A-Z]?id/i.test(selectBlock),'Selecionar beneficiário não pode reidentificar o canal Push.');

const fillStart=PORTAL.indexOf('function fillSelectedDocument');
const fillEnd=PORTAL.indexOf('function selectMember',fillStart);
const fillBlock=PORTAL.slice(fillStart,fillEnd);
assert(fillBlock.includes('input.value=documento'),'Beneficiário selecionado deve alterar apenas o documento operacional exibido.');
assert(!/localStorage\.setItem|PushSubscription|OneSignal|oneSignal/.test(fillBlock),'Carregar beneficiário não pode persistir identidade de aparelho/Push.');

assert(!/OneSignal\.login|\.addAlias\s*\(|external_id|externalId/.test(PORTAL),'CPF/CNS/beneficiário não podem virar External ID do OneSignal nesta camada.');
assert(HEALTH.includes('subscriptionId:st.subscriptionId'),'Check-in técnico precisa permanecer centrado na Subscription ID.');
assert(!/phoneNumber|mobileNumber|telefone|celular|whatsapp/i.test(HEALTH.slice(HEALTH.indexOf('function state()'),HEALTH.indexOf('function waitSubscriptionState'))),'Telefone não pode definir a identidade técnica do aparelho.');

assert(FAMILY.includes('OUTRA_FAMILIA'),'Backend precisa manter proteção contra revínculo silencioso para outra família.');
assert(FAMILY.includes('MESMA_FAMILIA'),'Backend precisa reconhecer a mesma família sem recriar vínculo.');
assert(!/deleteRow\s*\(/.test(FAMILY),'Troca de beneficiário/aparelho não pode apagar silenciosamente outro vínculo familiar.');

console.log('FAMILIA_APARELHO_BENEFICIARIO_V1_OK: família do aparelho, Subscription e beneficiário permanecem entidades separadas.');
