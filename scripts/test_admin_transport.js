const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');

const PANELS = [
  {
    file: 'teste-v1/painel-profissionais-servicos-v1.html',
    official: 'painel-oficial-profissionais-servicos.html',
    script: 'admin-profissionais.js',
    expectedAction: 'admin_profissionais',
    expectedResult: 'admin_profissionais_result',
    mutationAction: 'admin_profissionais_salvar',
    mutationResult: 'admin_profissionais_result',
  },
  {
    file: 'teste-v1/painel-agendas-v1.html',
    official: 'painel-oficial-agendas-vagas.html',
    script: 'admin-agendas.js',
    expectedAction: 'admin_agendas',
    expectedResult: 'admin_agendas_result',
    mutationAction: 'admin_agendas_salvar',
    mutationResult: 'admin_agendas_result',
  },
  {
    file: 'teste-v1/painel-tacs-areas-v1.html',
    official: 'painel-oficial-tacs-areas.html',
    script: 'admin-tacs-areas.js',
    expectedAction: 'admin_areas',
    expectedResult: 'admin_areas_result',
    mutationAction: 'admin_area_criar',
    mutationResult: 'admin_areas_result',
  },
  {
    file: 'teste-v1/painel-organizacoes-municipios-v1.html',
    official: 'painel-oficial-organizacoes-municipios.html',
    script: 'admin-organizacoes-municipios.js',
    expectedAction: 'admin_organizacoes',
    expectedResult: 'admin_organizacoes_result',
    mutationAction: 'admin_organizacao_salvar',
    mutationResult: 'admin_organizacoes_result',
  },
  {
    file: 'teste-v1/painel-recados-campanhas-v1.html',
    official: 'painel-oficial-recados-campanhas.html',
    script: 'admin-publicacoes.js',
    expectedAction: 'admin_publicacoes_dados',
    expectedResult: 'admin_result',
    mutationAction: 'admin_recado_salvar',
    mutationResult: 'admin_result',
  },
];

function executeScript(source, document, extra = {}) {
  const context = {
    window: {},
    document,
    console,
    URL,
    URLSearchParams,
    setTimeout: extra.setTimeout || setTimeout,
    clearTimeout: extra.clearTimeout || clearTimeout,
    location: extra.location || { href: 'https://portal.test/' },
    sessionStorage: extra.sessionStorage || { getItem() { return ''; }, setItem() {}, removeItem() {} },
    localStorage: extra.localStorage || { getItem() { return ''; }, setItem() {}, removeItem() {} },
    fetch: extra.fetch || (() => Promise.resolve({ ok: true, json: async () => ({ ok: true }) })),
    Event: extra.Event || function Event(type) { this.type = type; },
    CustomEvent: extra.CustomEvent || function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
    ...extra,
  };
  context.window = context;
  vm.createContext(context);
  new vm.Script(source).runInContext(context);
  return context;
}

function scriptSources(html) {
  return Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)).map((m) => m[1]);
}

function inlineScripts(html) {
  return Array.from(html.matchAll(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/g)).map((m) => m[1]);
}

function getFile(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

function verifyStaticSource(config) {
  const base = getFile(config.file);
  const official = getFile(config.official);
  assert.match(base, /PortalTacsAdminWarmup/);
  assert.doesNotMatch(base, /jsonp\('admin_status',\{\},pronto\)/);
  assert.doesNotMatch(base, /Preparando a conexão com o Google Apps Script/);
  assert.match(base, /A sessão anterior não pôde ser reutilizada/);
  assert.match(official, /v=202608/);
  if (config.official !== 'painel-oficial-recados-campanhas.html') {
    assert.match(
      official,
      /admin-warmup\.js\?v=202608(?:06-desempenho-v5|08-profissionais-duplicidade-v1|12-auto-v101|13-admin-v103|14-receipt-v110)/
    );
  }
  if (config.official !== 'painel-oficial-recados-campanhas.html') {
    assert.match(official, /rel="preconnect" href="https:\/\/script\.google\.com"/);
  }
  assert.doesNotMatch(official, /Promise\.all\(\[painel,conexao/);
  if (config.official === 'painel-oficial-agendas-vagas.html') {
    assert.doesNotMatch(official, /fetch\([^)]*teste-v1\/painel-agendas-v1\.html/);
    assert.match(official, /portalTacsAdminSnapshotV1:agendas:/);
    assert.match(official, /function cacheIdentity\(\)/);
    assert.match(official, /p&&p\.tacsId/);
    assert.match(official, /p&&p\.areaId/);
    assert.doesNotMatch(official, /DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV102:'\+areaId/);
  } else if (config.official === 'painel-oficial-recados-campanhas.html') {
    // Recados e campanhas é standalone e usa POST isolado por fetch + requestId/JSONP.
    assert.match(official, /admin_publicacoes_dados/);
    assert.doesNotMatch(official, /ponteConteudoV102_/);
    assert.match(official, /mode:'no-cors'/);
    assert.match(official, /agendarConsulta\(\)/);
    assert.doesNotMatch(official, /document\.write/);
  } else {
    assert.match(official, /painel\.then\(function\(html\)/);
    assert.match(official, /window\.PortalTacsAdminPreload=/);
  }
  assert.doesNotMatch(official, /aplicarRetry|aplicarConexao|aplicarReconexao|reenviarOperacao/);
}

function baseHtml(config) {
  return fs.readFileSync(path.join(ROOT, config.file), 'utf8');
}

async function testWarmupRoute() {
  const source = fs.readFileSync(path.join(ROOT, 'admin-warmup.js'), 'utf8');
  const requests = [];
  const listeners = {};
  const head = {
    appendChild(node) {
      node.parentNode = head;
      requests.push(node.src);
      const callback = new URL(node.src).searchParams.get('callback');
      setTimeout(() => {
        context[callback]({
          ok: true,
          versaoAdmin: '1.0.0',
        });
      }, 0);
    },
    removeChild() {},
  };
  const document = {
    head,
    createElement(tag) {
      if (tag === 'script') return { parentNode: null };
      return {};
    },
    addEventListener(name, fn) { listeners[name] = fn; },
    visibilityState: 'visible',
  };
  const store = new Map();
  const localStorage = {
    getItem(key) { return store.get(key) || null; },
    setItem(key, value) { store.set(key, String(value)); },
  };
  const context = executeScript(source, document, {
    localStorage,
    addEventListener(name, fn) { listeners[name] = fn; },
    dispatchEvent() {},
    location: { pathname: '/atendimento-acs-farmaceutico/' },
  });
  await context.PortalTacsAdminWarmup.ready;
  assert.ok(requests.some((url) => url.includes('action=admin_status')));
}

async function testDirectResponse(config) {
  const html = baseHtml(config);
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on('jsdomError', (error) => errors.push(error.message));
  const dom = new JSDOM(html, {
    url: `https://portal.test/atendimento-acs-farmaceutico/${config.file}`,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.fetch = async () => ({ ok: true, text: async () => '' });
      window.alert = () => {};
      window.confirm = () => false;
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
      window.sessionStorage.setItem('portalTacsAdminTokenV1', 'token-test');
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 350));
  dom.window.close();
  assert.deepStrictEqual(errors, [], `${config.file} produziu erros internos: ${errors.join(' | ')}`);
}

async function main() {
  PANELS.forEach(verifyStaticSource);
  await testWarmupRoute();
  await Promise.all(PANELS.map(testDirectResponse));
  console.log('ADMIN_TRANSPORT_OK');
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
