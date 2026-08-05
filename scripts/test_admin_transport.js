'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM, VirtualConsole} = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const CASES = [
  {
    file: 'teste-v1/painel-agendas-v1.html',
    frame: 'ponteAgendaV1',
    actions: ['admin_login', 'admin_dados'],
    success: /Sessão validada e agendas carregadas/,
    official: 'painel-oficial-agendas-vagas.html'
  },
  {
    file: 'teste-v1/painel-profissionais-servicos-v1.html',
    frame: 'pontePainelPSV1',
    actions: ['admin_login', 'admin_dados'],
    success: /Sessão validada e dados carregados/,
    official: 'painel-oficial-profissionais-servicos.html'
  },
  {
    file: 'teste-v1/painel-recados-campanhas-v1.html',
    frame: 'ponteConteudoV1',
    actions: ['admin_login', 'admin_dados'],
    success: /Sessão validada e conteúdo carregado/,
    official: 'painel-oficial-recados-campanhas.html'
  }
];

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitFor(predicate, message, timeout = 2500) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return;
    await wait(20);
  }
  throw new Error(message);
}

function fields(form) {
  return Object.fromEntries(
    Array.from(form.querySelectorAll('[name]')).map(field => [field.name, field.value])
  );
}

function responseFor(action) {
  if (action === 'admin_login') {
    return {ok: true, token: 'token-interno-valido', expiraEm: '2026-08-05T18:00:00.000Z'};
  }
  if (action === 'admin_conteudo_status') {
    return {ok: true, versao: '1.2.3'};
  }
  if (action === 'admin_dados') {
    return {
      ok: true,
      profissionais: [],
      servicos: [],
      agendas: [],
      recados: [],
      campanhas: []
    };
  }
  throw new Error(`Ação não prevista no teste administrativo: ${action}`);
}

function verifyStaticSource(config) {
  const base = fs.readFileSync(path.join(ROOT, config.file), 'utf8');
  const official = fs.readFileSync(path.join(ROOT, config.official), 'utf8');

  for (const [index, match] of Array.from(official.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)).entries()) {
    if (match[1].trim()) new vm.Script(match[1], {filename: `${config.official}#script-${index + 1}`});
  }

  assert.match(base, new RegExp(`event\\.source!==frame\\.contentWindow`));
  assert.match(base, /proximaEspera:2500/);
  assert.match(base, /Math\.min\(7000,[^)]*\+1200\)/);
  assert.equal(
    (base.match(/\.submit\(\)/g) || []).length,
    1,
    `${config.file} deve enviar cada operação uma única vez.`
  );

  for (const staleMessage of [
    'A implantação de teste não respondeu',
    'Não foi possível concluir a conexão',
    'O servidor não respondeu à consulta',
    'A operação não produziu resposta consultável em 50 segundos'
  ]) {
    assert.doesNotMatch(base, new RegExp(staleMessage));
    assert.doesNotMatch(official, new RegExp(staleMessage));
  }

  assert.match(base, /admin-warmup\.js\?v=20260805-preaquecimento-v3/);
  assert.match(base, /Preparando a conexão com o Google Apps Script/);
  assert.match(base, /A sessão anterior não pôde ser reutilizada/);
  assert.match(official, /20260805-preaquecimento-v3/);
  assert.match(official, /admin-warmup\.js\?v=20260805-preaquecimento-v3/);
  assert.match(official, /rel="preconnect" href="https:\/\/script\.google\.com"/);
  assert.match(official, /Promise\.all\(\[painel,conexao/);
  assert.doesNotMatch(official, /aplicarRetry|aplicarConexao|aplicarReconexao|reenviarOperacao/);
}

function baseHtml(config) {
  return fs
    .readFileSync(path.join(ROOT, config.file), 'utf8')
    .replace(/<script src="\.\.\/admin-warmup\.js[^>]*><\/script>/, '');
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
          pinConfigurado: true
        });
      }, 0);
      return node;
    },
    removeChild(node) {
      node.parentNode = null;
    }
  };
  const context = vm.createContext({
    Promise,
    Date,
    Math,
    CustomEvent: function CustomEvent(type, options) {
      this.type = type;
      this.detail = options && options.detail;
    },
    setTimeout,
    clearTimeout,
    document: {
      head,
      visibilityState: 'visible',
      createElement() {
        return {parentNode: null, async: false, src: '', onerror: null};
      },
      addEventListener(type, handler) {
        listeners[type] = handler;
      }
    }
  });
  context.window = context;
  context.addEventListener = (type, handler) => {
    listeners[type] = handler;
  };
  context.dispatchEvent = () => true;

  vm.runInContext(source, context);
  const result = await context.PortalTacsAdminWarmup.ready;

  assert.equal(result.ok, true, 'O pré-aquecimento não reconheceu admin_status como disponível.');
  assert.equal(requests.length, 1, 'O pré-aquecimento duplicou a consulta após resposta válida.');
  assert.match(requests[0], /AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/);
  assert.match(requests[0], /[?&]action=admin_status(?:&|$)/);
  assert.doesNotMatch(requests[0], /painel_publico|admin_result/);
}

async function testDirectResponse(config) {
  const actions = [];
  const jsonpPolls = [];
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));

  const dom = new JSDOM(baseHtml(config), {
    url: `https://portal.test/${config.file}`,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.PortalTacsAdminWarmup = {ready: Promise.resolve({ok: true})};
      window.HTMLFormElement.prototype.submit = function submit() {
        const form = this;
        const payload = fields(form);
        const frame = Array.from(window.document.querySelectorAll('iframe')).find(
          item => item.name === form.target
        );
        if (!frame) {
          errors.push(`Iframe não encontrado: ${form.target}`);
          return;
        }

        actions.push(payload.action);
        let result;
        try {
          result = responseFor(payload.action);
        } catch (error) {
          errors.push(error.message);
          return;
        }

        window.dispatchEvent(
          new window.MessageEvent('message', {
            source: window,
            data: {
              requestId: payload.requestId,
              result: {ok: false, message: 'Resposta forjada de outra janela.'}
            }
          })
        );

        setTimeout(() => {
          window.dispatchEvent(
            new window.MessageEvent('message', {
              source: frame.contentWindow,
              data: {
                source: 'admin-painel-tacs-v1',
                requestId: payload.requestId,
                result
              }
            })
          );
        }, 15);
      };

      const appendChild = window.Element.prototype.appendChild;
      window.Element.prototype.appendChild = function appendChildWithPollingCheck(node) {
        if (
          node &&
          node.tagName === 'SCRIPT' &&
          typeof node.src === 'string' &&
          node.src.includes('action=admin_result')
        ) {
          jsonpPolls.push(node.src);
        }
        return appendChild.call(this, node);
      };
    }
  });

  const {window} = dom;
  await waitFor(
    () => window.document.readyState === 'complete' || window.document.readyState === 'interactive',
    `A página ${config.file} não concluiu a inicialização.`
  );

  const pin = window.document.getElementById('pin');
  const enter = window.document.getElementById('entrar');
  assert.ok(pin && enter, `Controles de acesso ausentes em ${config.file}.`);
  assert.equal(actions.length, 0, `${config.file} consultou o servidor antes do usuário entrar.`);

  pin.value = '1234';
  enter.click();

  await waitFor(
    () => {
      const status = window.document.getElementById('loginStatus');
      return (
        actions.length === config.actions.length &&
        status &&
        status.classList.contains('ok') &&
        config.success.test(status.textContent)
      );
    },
    `O fluxo direto não concluiu em ${config.file}. Ações: ${actions.join(', ')}`
  );

  assert.deepEqual(actions, config.actions, `${config.file} duplicou ou alterou a ordem dos POSTs.`);
  assert.equal(pin.value, '', `${config.file} não apagou o PIN depois do envio.`);
  assert.equal(
    window.document.getElementById('conteudo').classList.contains('oculto'),
    false,
    `${config.file} não exibiu o conteúdo após a resposta direta.`
  );

  await wait(2700);
  assert.deepEqual(jsonpPolls, [], `${config.file} iniciou polling mesmo após a resposta direta.`);
  assert.deepEqual(errors, [], `${config.file} produziu erros internos: ${errors.join(' | ')}`);
  window.close();
}

async function testExpiredStoredSession(config) {
  const actions = [];
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));

  const dom = new JSDOM(baseHtml(config), {
    url: `https://portal.test/${config.file}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.PortalTacsAdminWarmup = {ready: Promise.resolve({ok: true})};
      window.sessionStorage.setItem('portalTacsAdminTokenV1', 'token-antigo');
      window.HTMLFormElement.prototype.submit = function submit() {
        const payload = fields(this);
        const frame = Array.from(window.document.querySelectorAll('iframe')).find(
          item => item.name === this.target
        );
        actions.push(payload.action);
        setTimeout(() => {
          window.dispatchEvent(
            new window.MessageEvent('message', {
              source: frame.contentWindow,
              data: {
                requestId: payload.requestId,
                result: {ok: false, message: 'Sessão inválida ou expirada.'}
              }
            })
          );
        }, 10);
      };
    }
  });

  const {window} = dom;
  await waitFor(() => {
    const status = window.document.getElementById('loginStatus');
    return status && /sessão anterior não pôde ser reutilizada/i.test(status.textContent);
  }, `A sessão antiga não foi tratada silenciosamente em ${config.file}.`);

  const status = window.document.getElementById('loginStatus');
  assert.deepEqual(actions, ['admin_dados'], `${config.file} fez consultas extras ao validar a sessão antiga.`);
  assert.equal(status.classList.contains('erro'), false, `${config.file} exibiu alerta vermelho antes do PIN.`);
  assert.equal(status.classList.contains('ok'), true, `${config.file} não voltou ao estado pronto para novo PIN.`);
  assert.equal(window.sessionStorage.getItem('portalTacsAdminTokenV1'), null);
  assert.equal(window.document.getElementById('entrar').disabled, false);
  assert.deepEqual(errors, [], `${config.file} produziu erros internos: ${errors.join(' | ')}`);
  window.close();
}

async function main() {
  CASES.forEach(verifyStaticSource);
  await testWarmupRoute();
  await Promise.all(CASES.map(testDirectResponse));
  await Promise.all(CASES.map(testExpiredStoredSession));
  console.log('OK: pré-aquecimento, transporte direto e sessão antiga aprovados nos 3 painéis.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
