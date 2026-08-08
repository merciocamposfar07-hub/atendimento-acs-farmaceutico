'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'apps-script');
const official = [
  'PortalRouterV1.gs',
  'AdminCoreV1.gs',
  'PublicCoreV1.gs',
  'PerformanceCoreV1.gs'
];

for (const file of official) {
  assert.equal(fs.existsSync(path.join(APP, file)), true, `Módulo oficial ausente: ${file}`);
}

const gsFiles = fs.readdirSync(APP).filter(file => file.endsWith('.gs'));
assert.deepEqual(gsFiles.sort(), official.slice().sort(), 'A pasta apps-script contém módulo .gs fora do pacote oficial.');

let getOwners = [];
let postOwners = [];
for (const file of gsFiles) {
  const source = fs.readFileSync(path.join(APP, file), 'utf8');
  if (/function\s+doGet\s*\(/.test(source)) getOwners.push(file);
  if (/function\s+doPost\s*\(/.test(source)) postOwners.push(file);
}
assert.deepEqual(getOwners, ['PortalRouterV1.gs'], 'Existe mais de um proprietário de doGet no pacote oficial.');
assert.deepEqual(postOwners, ['PortalRouterV1.gs'], 'Existe mais de um proprietário de doPost no pacote oficial.');

const router = fs.readFileSync(path.join(APP, 'PortalRouterV1.gs'), 'utf8');
for (const handler of [
  'tratarGetAdminCoreV1_',
  'tratarPostAdminCoreV1_',
  'tratarGetPublicCoreV1_',
  'tacsPerformanceV1PreaquecerAdmin_',
  'tacsPerformanceV1AdminDadosCache_',
  'tacsPerformanceV1PublicoCache_'
]) assert.match(router, new RegExp(handler), `Roteador não referencia ${handler}.`);

for (const legacy of [
  'ZZ_11_PublicoConteudoPortalV1.gs',
  'ZZ_12_PublicoAgendasPortalV1.gs',
  'ZZZ_13_ProfissionaisDinamicosPortalV1.gs'
]) assert.equal(fs.existsSync(path.join(APP, legacy)), false, `Backend legado reapareceu: ${legacy}`);

const workflowDir = path.join(ROOT, '.github', 'workflows');
const workflows = fs.readdirSync(workflowDir).filter(file => /\.ya?ml$/i.test(file));
assert.deepEqual(workflows, ['stabilization-tests.yml'], 'A branch de estabilização voltou a conter workflows paralelos.');

console.log('OK: pacote de implantação possui quatro módulos e um único roteador do Apps Script.');
