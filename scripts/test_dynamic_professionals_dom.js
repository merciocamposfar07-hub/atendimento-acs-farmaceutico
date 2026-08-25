'use strict';

// PORTAL_TACS_JSDOM_LOCAL_ASSETS_V1
const {ResourceLoader: __PortalTacsResourceLoader} = require('jsdom');
const __portalTacsFs = require('node:fs');
const __portalTacsPath = require('node:path');
class __PortalTacsLocalResourceLoader extends __PortalTacsResourceLoader {
  fetch(url) {
    let parsed;
    try { parsed = new URL(url); } catch (error) { return null; }
    const prefix = '/atendimento-acs-farmaceutico/';
    if (!parsed.pathname.startsWith(prefix)) return null;
    const relative = decodeURIComponent(parsed.pathname.slice(prefix.length)).replace(/^\/+/, '');
    const root = __portalTacsPath.resolve(__dirname, '..');
    const target = __portalTacsPath.resolve(root, relative);
    if (target !== root && !target.startsWith(root + __portalTacsPath.sep)) return null;
    if (!__portalTacsFs.existsSync(target) || !__portalTacsFs.statSync(target).isFile()) return null;
    return Promise.resolve(__portalTacsFs.readFileSync(target));
  }
}
function __portalTacsLocalResources(){ return new __PortalTacsLocalResourceLoader(); }


const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, VirtualConsole} = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(
  path.join(ROOT, 'teste-v1', 'painel-profissionais-servicos-v1.html'),
  'utf8'
);

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitFor(predicate, message, timeout = 4000) {
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

function setField(window, id, value) {
  const field = window.document.getElementById(id);
  assert.ok(field, `Campo ausente: ${id}`);
  field.value = value;
  field.dispatchEvent(new window.Event('input', {bubbles: true}));
}

async function main() {
  const actions = [];
  const createPayloads = [];
  const errors = [];
  const data = {
    professionals: [
      {ID: 'MEDICA', NOME: 'Médica', TITULO_PUBLICO: 'Atendimento com a Médica', ICONE: '🩺', ORDEM: 1, ATIVO: true},
      {ID: 'ENFERMEIRA', NOME: 'Enfermeira', TITULO_PUBLICO: 'Atendimento com a Enfermeira Chefe', ICONE: '👩‍⚕️', ORDEM: 2, ATIVO: true},
      {ID: 'NUTRICIONISTA', NOME: 'Nutricionista', TITULO_PUBLICO: 'Atendimento com a Nutricionista', ICONE: '🥗', ORDEM: 3, ATIVO: true},
      {ID: 'DENTISTA', NOME: 'Dentista', TITULO_PUBLICO: 'Atendimento odontológico', ICONE: '🦷', ORDEM: 4, ATIVO: true},
      {ID: 'PSICÓLOGO', NOME: 'Psicólogo', TITULO_PUBLICO: 'Atendimento com psicólogo', ICONE: '🧠', ORDEM: 5, ATIVO: true}
    ],
    services: [
      {ID: 'ATEND_PSICO', PROFISSIONAL_ID: 'PSICÓLOGO', NOME: 'Atendimento psicológico', DESCRICAO_AUTOMATICA: 'Solicitação de atendimento com psicólogo.', ORDEM: 1, ATIVO: true, PERMITE_VAGA_COMUM: false, PERMITE_EMERGENCIA: false}
    ]
  };

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));

  const dom = new JSDOM(html, {
    url: 'https://portal.test/teste-v1/painel-profissionais-servicos-v1.html',
    runScripts: 'dangerously',
    resources: __portalTacsLocalResources(),
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.PortalTacsAdminPreload = {ok: true};
      window.confirm = () => true;
      window.HTMLFormElement.prototype.submit = function submit() {
        const payload = fields(this);
        const frame = Array.from(window.document.querySelectorAll('iframe')).find(
          item => item.name === this.target
        );
        assert.ok(frame, `Iframe de resposta não encontrado: ${this.target}`);
        actions.push(payload.action);
        let result;

        if (payload.action === 'admin_login') {
          result = {ok: true, token: 'token-valido'};
        } else if (payload.action === 'admin_dados') {
          result = {
            ok: true,
            profissionais: JSON.parse(JSON.stringify(data.professionals)),
            servicos: JSON.parse(JSON.stringify(data.services))
          };
        } else if (payload.action === 'admin_criar_profissional') {
          createPayloads.push({...payload});
          data.professionals.push({
            ID: payload.id,
            NOME: payload.nome,
            TITULO_PUBLICO: payload.tituloPublico,
            ICONE: payload.icone,
            ORDEM: Number(payload.ordem),
            ATIVO: payload.ativo === 'true'
          });
          data.services.push({
            ID: `ATENDIMENTO_${payload.id}`,
            PROFISSIONAL_ID: payload.id,
            NOME: payload.servicoNome,
            DESCRICAO_AUTOMATICA: payload.descricaoAutomatica,
            ORDEM: 1,
            ATIVO: payload.ativo === 'true',
            PERMITE_VAGA_COMUM: payload.permiteVagaComum === 'true',
            PERMITE_EMERGENCIA: payload.permiteEmergencia === 'true'
          });
          result = {
            ok: true,
            id: payload.id,
            jaExistia: false,
            agendasCriadas: 5
          };
        } else {
          throw new Error(`Ação não prevista: ${payload.action}`);
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
  try {
    await waitFor(
      () => window.document.getElementById('loginStatus').classList.contains('ok'),
      'O painel não ficou pronto para o login. Estado: ' +
        window.document.getElementById('loginStatus').textContent +
        ' | erros: ' + errors.join(' | ')
    );
    setField(window, 'pin', '1234');
    window.document.getElementById('entrar').click();
    await waitFor(
      () => window.document.getElementById('qProf').textContent === '5',
      'Os cinco profissionais iniciais não foram carregados.'
    );
    assert.match(window.document.getElementById('listaProfissionais').textContent, /PSICÓLOGO/);

    const newTab = window.document.getElementById('abaNovo');
    assert.ok(newTab, 'A aba Adicionar profissional não foi criada.');
    newTab.click();
    assert.equal(
      window.document.getElementById('novoProfissionalArea').classList.contains('oculto'),
      false
    );

    setField(window, 'novoNome', 'Fisioterapeuta');
    setField(window, 'novoTitulo', 'Atendimento com fisioterapeuta');
    setField(window, 'novoIcone', '🧑‍⚕️');
    setField(window, 'novaOrdem', '6');
    setField(window, 'novoServico', 'Fisioterapia');
    setField(window, 'novaDescricao', 'Solicitação de atendimento com fisioterapeuta.');
    window.document.getElementById('novoAtivo').checked = true;

    assert.match(
      window.document.getElementById('novoIdPreview').textContent,
      /FISIOTERAPEUTA/
    );
    window.document.getElementById('criarProfissional').click();

    await waitFor(
      () => window.document.getElementById('qProf').textContent === '6',
      'O novo profissional não apareceu após a releitura.'
    );
    await waitFor(
      () => /cinco dias de agenda criados/i.test(
        window.document.getElementById('statusOperacao').textContent
      ),
      'A confirmação integrada não apareceu.'
    );

    assert.equal(createPayloads.length, 1, 'O cadastro foi enviado mais de uma vez.');
    assert.equal(createPayloads[0].id, 'FISIOTERAPEUTA');
    assert.equal(createPayloads[0].servicoNome, 'Fisioterapia');
    assert.equal(createPayloads[0].ativo, 'true');
    assert.equal(
      actions.filter(action => action === 'admin_criar_profissional').length,
      1
    );
    assert.match(
      window.document.getElementById('listaProfissionais').textContent,
      /Atendimento com fisioterapeuta/
    );
    assert.equal(
      window.document.getElementById('profissionaisArea').classList.contains('oculto'),
      false
    );
    assert.deepEqual(errors, [], `Erros no DOM: ${errors.join(' | ')}`);
  } finally {
    window.close();
  }

  console.log(
    'Painel dinâmico: terceira aba, criação única, serviço associado e releitura confirmada.'
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
