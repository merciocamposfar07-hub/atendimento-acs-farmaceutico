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
    actions: [
      'admin_login',
      'admin_dados',
      'admin_moradores_areas',
      'admin_portal_manutencao_status'
    ],
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
  if (action === 'admin_portal_manutencao_status') {
    return {ok: true, ativa: false, areaId: 'JAPARANDUBA'};
  }
  if (action === 'admin_moradores_areas') {
    return {
      ok: true,
      areaId: 'JAPARANDUBA',
      areas: [
        {
          areaId: 'JAPARANDUBA',
          areaNome: 'Sítio Japaranduba'
        }
      ]
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

  if (config.file === 'teste-v1/painel-recados-campanhas-v1.html') {
    assert.match(base, /event\.source!==ativa\.frame\.contentWindow/);
    assert.match(base, /frame\.setAttribute\('name',frameName\)/);
    assert.match(base, /requestAnimationFrame\(function\(\)\{window\.requestAnimationFrame\(enviarUmaVez\)\}\)/);
    assert.match(base, /submitTimer=setTimeout\(enviarUmaVez,180\)/);
    assert.match(base, /input\[type="date"\]\.campo\{[^}]*min-inline-size:0[^}]*max-inline-size:100%/);
    assert.match(base, /id="alternarContraste"[^>]*aria-pressed="false"/);
    assert.match(base, /TEMA_KEY='portalTacsTemaRecadosV1'/);
    assert.match(base, /dataVisual:dataExibicao\('2026-08-12'\)==='12\/08\/2026'/);
    assert.match(base, /\.tema-petroleo \.numero,\.tema-petroleo \.areaEnvio,\.tema-petroleo \.item/);
  } else {
    assert.match(base, new RegExp(`event\\.source!==frame\\.contentWindow`));
  }
  assert.match(base, /proximaEspera:2500/);
  assert.match(base, /Math\.min\(8000,[^)]*\+1000\)/);
  assert.match(base, /},25000\)/);
  if (config.file === 'teste-v1/painel-recados-campanhas-v1.html') {
    assert.match(base, /ativa\.limite=Date\.now\(\)\+74000/);
  } else {
    assert.match(base, /limite:Date\.now\(\)\+74000/);
  }
  assert.match(base, /},75000\)/);
  assert.match(base, /portalTacsPublicDataV3/);
  assert.match(base, /portalTacsPublicInvalidateAtV1/);
  assert.match(base, /if\(ativa\)/);
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

  assert.match(base, /PortalTacsAdminWarmup/);
  assert.doesNotMatch(base, /jsonp\('admin_status',\{\},pronto\)/);
  assert.doesNotMatch(base, /Preparando a conexão com o Google Apps Script/);
  assert.match(base, /A sessão anterior não pôde ser reutilizada/);
  assert.match(official, /v=202608/);
  assert.match(
    official,
    /admin-warmup\.js\?v=202608(?:06-desempenho-v5|08-profissionais-duplicidade-v1)/
  );
  assert.match(official, /rel="preconnect" href="https:\/\/script\.google\.com"/);
  assert.doesNotMatch(official, /Promise\.all\(\[painel,conexao/);
  assert.match(official, /painel\.then\(function\(html\)/);
  assert.match(official, /window\.PortalTacsAdminPreload=/);
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
      window.PortalTacsAdminPreload = {ok: true};
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

async function testImmediatePanel(config) {
  const statusRequests = [];
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));

  const dom = new JSDOM(baseHtml(config), {
    url: `https://portal.test/${config.file}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.HTMLFormElement.prototype.submit = function submit() {
        errors.push('Um POST foi enviado antes do PIN.');
      };
      const appendChild = window.Element.prototype.appendChild;
      window.Element.prototype.appendChild = function appendChildWithStatus(node) {
        const result = appendChild.call(this, node);
        if (node && node.tagName === 'SCRIPT' && node.src.includes('action=admin_status')) {
          statusRequests.push(node.src);
          const callback = new URL(node.src).searchParams.get('callback');
          setTimeout(() => window[callback]({ok: true, versaoAdmin: '1.0.0'}), 10);
        }
        return result;
      };
    }
  });

  const {window} = dom;
  await waitFor(() => {
    const status = window.document.getElementById('loginStatus');
    return status && /Digite o PIN/.test(status.textContent);
  }, `O painel não liberou o PIN imediatamente em ${config.file}.`);

  const status = window.document.getElementById('loginStatus');
  assert.equal(statusRequests.length, 0, `${config.file} bloqueou a abertura com admin_status.`);
  assert.equal(status.classList.contains('ok'), true);
  assert.equal(status.classList.contains('erro'), false);
  assert.equal(window.document.getElementById('entrar').disabled, false);
  assert.deepEqual(errors, [], `${config.file} produziu erros internos: ${errors.join(' | ')}`);
  window.close();
}

async function testVisualPreferences() {
  const config = CASES.find(item => item.file === 'teste-v1/painel-recados-campanhas-v1.html');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));

  const dom = new JSDOM(baseHtml(config), {
    url: `https://portal.test/${config.file}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem('portalTacsTemaRecadosV1', 'petroleo');
      window.HTMLFormElement.prototype.submit = function submit() {
        errors.push('A preferência visual iniciou uma operação administrativa.');
      };
    }
  });

  const {window} = dom;
  await waitFor(
    () => /Digite o PIN/.test(window.document.getElementById('loginStatus').textContent),
    'O painel não ficou pronto durante o teste de contraste.'
  );

  const button = window.document.getElementById('alternarContraste');
  const dateField = window.document.querySelector('#formNovoRecado input[type="date"]');
  const dateStyle = window.getComputedStyle(dateField);

  assert.equal(window.document.body.classList.contains('tema-petroleo'), true);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.match(button.textContent, /cartões claros/);
  assert.equal(dateStyle.width, '100%');
  assert.equal(dateStyle.minWidth, '0');
  assert.equal(dateStyle.maxWidth, '100%');

  button.click();
  assert.equal(window.document.body.classList.contains('tema-petroleo'), false);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.match(button.textContent, /azul-petróleo/);
  assert.equal(window.localStorage.getItem('portalTacsTemaRecadosV1'), 'claro');
  assert.deepEqual(errors, [], 'O contraste alterou comportamento administrativo: ' + errors.join(' | '));
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
      window.PortalTacsAdminPreload = {ok: true};
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

async function testNewNoticeWithoutReturnedId(eventuallyVisible) {
  const config = CASES.find(item => item.file === 'teste-v1/painel-recados-campanhas-v1.html');
  const submissions = [];
  const errors = [];
  let dataReads = 0;
  const savedNotice = {
    ID: 'REC-NOVO-001',
    TITULO: 'Atendimento médico sexta-feira',
    MENSAGEM: 'Atendimento confirmado das 08h às 11h.',
    PRIORIDADE: 'INFORMATIVO',
    VALIDADE: '12/08/2026',
    ATIVO: true
  };
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));

  const dom = new JSDOM(baseHtml(config), {
    url: 'https://portal.test/' + config.file,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.PortalTacsAdminPreload = {ok: true};
      window.confirm = () => true;
      window.CSS = window.CSS || {};
      window.CSS.escape = window.CSS.escape || (value => String(value));
      window.HTMLFormElement.prototype.submit = function submit() {
        const payload = fields(this);
        const frame = Array.from(window.document.querySelectorAll('iframe')).find(
          item => item.name === this.target
        );
        if (!frame) {
          errors.push('Iframe não encontrado: ' + this.target);
          return;
        }
        submissions.push(payload);
        let result;
        if (payload.action === 'admin_login') {
          result = {ok: true, token: 'token-interno-valido'};
        } else if (payload.action === 'admin_dados') {
          dataReads += 1;
          result = {
            ok: true,
            recados: eventuallyVisible && dataReads >= 3 ? [savedNotice] : [],
            campanhas: []
          };
        } else if (payload.action === 'admin_moradores_areas') {
          result = {
            ok: true,
            areaId: 'JAPARANDUBA',
            areas: [{areaId: 'JAPARANDUBA', areaNome: 'Sítio Japaranduba'}]
          };
        } else if (payload.action === 'admin_portal_manutencao_status') {
          result = {ok: true, ativa: false, areaId: 'JAPARANDUBA'};
        } else if (payload.action === 'admin_salvar_recado') {
          result = {ok: true};
        } else if (payload.action === 'admin_publicar_notificacao') {
          result = {ok: true, push: true, onesignalId: 'push-001', destinatarios: 1};
        } else {
          errors.push('Ação não prevista: ' + payload.action);
          return;
        }
        setTimeout(() => {
          window.dispatchEvent(new window.MessageEvent('message', {
            source: frame.contentWindow,
            data: {requestId: payload.requestId, result}
          }));
        }, 10);
      };
    }
  });

  const {window} = dom;
  await waitFor(
    () => /Digite o PIN/.test(window.document.getElementById('loginStatus').textContent),
    'O painel de recados não ficou pronto para o login.'
  );
  window.document.getElementById('pin').value = '1234';
  window.document.getElementById('entrar').click();
  await waitFor(
    () => /Sessão validada e conteúdo carregado/.test(
      window.document.getElementById('loginStatus').textContent
    ),
    'O contexto do painel de recados não foi validado.'
  );

  window.document.getElementById('novoRecado').click();
  const form = window.document.getElementById('formNovoRecado');
  form.querySelector('[name="titulo"]').value = savedNotice.TITULO;
  form.querySelector('[name="mensagem"]').value = savedNotice.MENSAGEM;
  form.querySelector('[name="prioridade"]').value = savedNotice.PRIORIDADE;
  form.querySelector('[name="validade"]').value = '2026-08-12';
  form.querySelector('[name="ativo"]').checked = true;
  form.querySelector('.salvarNovoRecado').click();

  await waitFor(
    () => (eventuallyVisible ? /opção Desfazer preparada/ : /lista ainda está sincronizando/i).test(
      window.document.getElementById('statusOperacao').textContent
    ),
    eventuallyVisible
      ? 'O salvamento com data brasileira não concluiu o push e a sincronização.'
      : 'O atraso total da releitura bloqueou o push ou não encerrou a sincronização.',
    6000
  );

  const saves = submissions.filter(item => item.action === 'admin_salvar_recado');
  const pushes = submissions.filter(item => item.action === 'admin_publicar_notificacao');
  assert.equal(saves.length, 1, 'O painel reenviou o salvamento durante a releitura.');
  assert.equal(pushes.length, 1, 'O painel enviou a notificação mais de uma vez.');
  assert.match(pushes[0].id, /^publicacao_[a-f0-9]{48}$/, 'A notificação não recebeu a referência idempotente da publicação.');
  assert.equal(pushes[0].eventoPublicacao, pushes[0].id, 'A referência e o evento idempotente divergiram.');
  assert.equal(
    dataReads,
    eventuallyVisible ? 3 : 5,
    'O painel não executou a quantidade esperada de releituras sem reenviar o salvamento.'
  );
  const saveIndex = submissions.findIndex(item => item.action === 'admin_salvar_recado');
  const pushIndex = submissions.findIndex(item => item.action === 'admin_publicar_notificacao');
  const rereadIndex = submissions.findIndex((item, index) => index > saveIndex && item.action === 'admin_dados');
  assert.ok(saveIndex >= 0 && pushIndex > saveIndex, 'O push não ocorreu depois da confirmação do salvamento.');
  assert.ok(rereadIndex > pushIndex, 'A releitura voltou a atrasar ou bloquear o push.');
  assert.doesNotMatch(window.document.getElementById('statusOperacao').textContent, /nenhuma notificação foi enviada/i);
  if (eventuallyVisible) {
    assert.equal(
      JSON.parse(window.sessionStorage.getItem('portalTacsUndoConteudoV1')).id,
      savedNotice.ID,
      'O desfazer não guardou o ID confirmado do novo recado.'
    );
  } else {
    assert.equal(
      window.sessionStorage.getItem('portalTacsUndoConteudoV1'),
      null,
      'O painel habilitou Desfazer sem conhecer o ID real do novo registro.'
    );
    assert.equal(
      window.document.getElementById('statusOperacao').classList.contains('erro'),
      false,
      'O atraso de sincronização foi apresentado como falha de gravação ou push.'
    );
  }
  assert.deepEqual(errors, [], 'O teste do novo recado produziu erros internos: ' + errors.join(' | '));
  window.close();
}

async function main() {
  CASES.forEach(verifyStaticSource);
  await testWarmupRoute();
  await Promise.all(CASES.map(testImmediatePanel));
  await testVisualPreferences();
  await Promise.all(CASES.map(testDirectResponse));
  await Promise.all(CASES.map(testExpiredStoredSession));
  await testNewNoticeWithoutReturnedId(true);
  await testNewNoticeWithoutReturnedId(false);
  console.log('OK: abertura imediata, transporte Safari, data brasileira, push antecipado e releitura atrasada aprovados.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
