'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
    actions: ['admin_login', 'admin_conteudo_status', 'admin_dados'],
    success: /Sessão validada[\s\S]*Módulo de Recados e Campanhas V1\.2\.3 disponível/,
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

  assert.match(official, /20260805-transporte-v2/);
  assert.doesNotMatch(official, /admin-warmup\.js/);
  assert.doesNotMatch(official, /aplicarRetry|aplicarConexao|aplicarReconexao|reenviarOperacao/);
}

async function testDirectResponse(config) {
  const actions = [];
  const jsonpPolls = [];
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));

  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, config.file), 'utf8'), {
    url: `https://portal.test/${config.file}`,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
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

async function main() {
  CASES.forEach(verifyStaticSource);
  await Promise.all(CASES.map(testDirectResponse));
  console.log('OK: transporte administrativo direto aprovado nos 3 painéis.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
