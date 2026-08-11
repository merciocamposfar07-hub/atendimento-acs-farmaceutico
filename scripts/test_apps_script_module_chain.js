const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'apps-script-controle-integral.gs';
const FIXED_MODULES = [
  'apps-script/ZZ_11_PublicoConteudoPortalV1.gs',
  'apps-script/ZZ_12_PublicoAgendasPortalV1.gs',
  'apps-script/ZZZ_13_ProfissionaisDinamicosPortalV1.gs'
];
const CHAIN_MODULES = [
  'apps-script/ZZZZ_15_MoradoresAdminPortalV1.gs',
  'apps-script/ZZZZ_16_PortalManutencaoNotificacoesV1.gs',
  'apps-script/ZZZZ_17_TacsAreasAdminV1.gs',
  'apps-script/ZZZZ_18_ImportacaoCsvMoradoresV1.gs',
  'apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs'
];

function permutations(items) {
  if (items.length < 2) return [items.slice()];
  const out = [];
  items.forEach((item, index) => {
    const rest = items.slice(0, index).concat(items.slice(index + 1));
    permutations(rest).forEach((tail) => out.push([item].concat(tail)));
  });
  return out;
}

function output(kind, value) {
  return {
    kind,
    value,
    setMimeType() { return this; },
    setXFrameOptionsMode() { return this; }
  };
}

function createContext(order) {
  const context = {
    console,
    ContentService: {
      MimeType: {JSON: 'json', JAVASCRIPT: 'javascript'},
      createTextOutput(value) { return output('content', value); }
    },
    HtmlService: {
      XFrameOptionsMode: {ALLOWALL: 'allowall'},
      createHtmlOutput(value) { return output('html', value); }
    },
    Utilities: {
      formatDate() { return '11/08/2026 12:00'; }
    }
  };
  vm.createContext(context);

  [BASE].concat(FIXED_MODULES, order).forEach((file) => {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(source, context, {filename: file});
  });
  return context;
}

function installRouteProbes(context) {
  const getRoutes = {
    profissionaisDinamicosV1TratarGet_: '__probe_13_get',
    moradoresAdminV1TratarGet_: '__probe_15_get',
    portalManutencaoV1TratarGet_: '__probe_16_get',
    tacsTerritorioV1TratarGet_: '__probe_17_get',
    csvMoradoresV1TratarGet_: '__probe_18_get',
    notificacoesAreaV1TratarGet_: '__probe_19_get'
  };
  const postRoutes = {
    profissionaisDinamicosV1TratarPost_: '__probe_13_post',
    moradoresAdminV1TratarPost_: '__probe_15_post',
    portalManutencaoV1TratarPost_: '__probe_16_post',
    tacsTerritorioV1TratarPost_: '__probe_17_post',
    csvMoradoresV1TratarPost_: '__probe_18_post',
    notificacoesAreaV1TratarPost_: '__probe_19_post'
  };

  Object.keys(getRoutes).forEach((name) => {
    const route = getRoutes[name];
    context[name] = (event) => event.parameter.action === route ? route : null;
  });
  Object.keys(postRoutes).forEach((name) => {
    const route = postRoutes[name];
    context[name] = (event) => event.parameter.action === route ? route : null;
  });
  context.tacsValidateKey_ = () => true;

  return {getRoutes: Object.values(getRoutes), postRoutes: Object.values(postRoutes)};
}

const orders = permutations(CHAIN_MODULES);
orders.forEach((order) => {
  const context = createContext(order);
  const probes = installRouteProbes(context);

  probes.getRoutes.forEach((route) => {
    assert.strictEqual(context.doGet({parameter: {action: route}}), route);
  });
  probes.postRoutes.forEach((route) => {
    assert.strictEqual(context.doPost({parameter: {action: route}}), route);
  });

  const legacyGet = context.doGet({parameter: {action: 'status'}});
  assert.strictEqual(legacyGet.kind, 'content');
  const legacyData = JSON.parse(legacyGet.value);
  assert.strictEqual(
    legacyData.ok,
    true,
    `Rota GET antiga interrompida na ordem ${order.join(', ')}: ${legacyGet.value}`
  );

  const legacyPost = context.doPost({parameter: {action: '__legacy_unknown'}});
  assert.strictEqual(legacyPost.kind, 'html');
  assert.match(legacyPost.value, /Ação não reconhecida/);
});

console.log(
  `Encadeamento Apps Script: ${orders.length} ordens dos módulos 15–19 e rotas antigas validadas.`
);
