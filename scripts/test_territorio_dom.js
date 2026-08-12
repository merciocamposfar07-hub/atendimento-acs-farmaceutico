'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');

const ROOT = path.resolve(__dirname, '..');

function source(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function pngSize(file) {
  const buffer = fs.readFileSync(path.join(ROOT, file));
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
}

function interceptWarmup(window) {
  const original = window.document.head.appendChild.bind(window.document.head);
  window.document.head.appendChild = node => {
    if (node && node.tagName === 'SCRIPT' && /action=admin_result/.test(node.src || '')) {
      const callback = new URL(node.src).searchParams.get('callback');
      setTimeout(() => {
        if (typeof window[callback] === 'function') window[callback]({ok: false, pendente: true});
      }, 0);
      return node;
    }
    return original(node);
  };
}

async function wait(ms = 15) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(check, timeout = 8000) {
  const limit = Date.now() + timeout;
  while (Date.now() < limit) {
    if (check()) return;
    await wait(25);
  }
  throw new Error('Tempo esgotado aguardando a condição do teste.');
}

async function testResidentPanel() {
  const html = source('teste-v1/painel-moradores-v2.html');
  assert.match(html, /rel="icon"[^>]+painel-moradores\.svg/);
  assert.match(html, /rel="apple-touch-icon"[^>]+painel-moradores-180\.png/);
  assert.match(html, /id="loginTacs"/);
  assert.match(html, /TACS, áreas e importação CSV/);
  assert.match(html, /white-space:nowrap;overflow-wrap:normal;word-break:normal;hyphens:none/);

  const dom = new JSDOM(html, {
    url: 'https://portal.test/teste-v1/painel-moradores-v2.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const {window} = dom;
  interceptWarmup(window);
  window.eval(source('teste-v1/painel-moradores-transport-v2.js'));
  await wait();

  const api = window.PortalTacsMoradoresTransportV2;
  assert.equal(api.version, '3.6.1');
  api.prepareNewResident();
  assert.equal(window.document.getElementById('formArea').classList.contains('hidden'), false);
  assert.equal(window.document.getElementById('searchArea').classList.contains('hidden'), true);
  api.showSearch();
  assert.equal(window.document.getElementById('formArea').classList.contains('hidden'), true);
  assert.equal(window.document.getElementById('searchArea').classList.contains('hidden'), false);
  assert.match(window.document.getElementById('operationStatus').textContent, /Nenhuma alteração.*salva/);

  const birth = window.document.getElementById('birth');
  birth.value = '22091994';
  birth.dispatchEvent(new window.Event('input', {bubbles: true}));
  assert.equal(birth.value, '22/09/1994');
  assert.match(window.document.getElementById('birthAge').textContent, /^Idade: \d+ anos?/);

  window.document.getElementById('tacsCnsAccess').value = '123';
  window.document.getElementById('tacsPinAccess').value = '1234';
  window.document.getElementById('loginTacs').click();
  assert.match(window.document.getElementById('loginStatus').textContent, /15 números do CNS/);
  dom.window.close();
}

async function testSafariPostTargetRegistration() {
  const html = source('teste-v1/painel-moradores-v2.html');
  const dom = new JSDOM(html, {
    url: 'https://portal.test/teste-v1/painel-moradores-v2.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const {window} = dom;
  const submissions = [];
  const results = new Map();
  let prematureSubmits = 0;

  const originalBodyAppend = window.document.body.appendChild.bind(window.document.body);
  window.document.body.appendChild = node => {
    const appended = originalBodyAppend(node);
    if (node && node.tagName === 'IFRAME') {
      node.__safariTargetReady = false;
      setTimeout(() => { node.__safariTargetReady = true; }, 8);
    }
    return appended;
  };

  window.HTMLFormElement.prototype.submit = function submit() {
    const target = this.getAttribute('target') || this.target;
    const frame = Array.from(window.document.querySelectorAll('iframe'))
      .find(item => item.getAttribute('name') === target || item.name === target);
    if (!frame || frame.__safariTargetReady !== true) {
      prematureSubmits++;
      return;
    }

    const fields = {};
    Array.from(this.querySelectorAll('input[name]')).forEach(input => {
      fields[input.name] = input.value;
    });
    submissions.push({action: fields.action, requestId: fields.requestId, targetReady: true});

    if (fields.action === 'admin_login') {
      results.set(fields.requestId, {ok: true, token: 'token-admin-safari'});
    } else if (fields.action === 'admin_moradores_status') {
      results.set(fields.requestId, {
        ok: true,
        versao: '1.4.5',
        perfil: 'ADMIN_GERAL',
        areaId: 'JAPARANDUBA',
        areaNome: 'Sítio Japaranduba',
        totalRegistros: 10,
        totalColunas: 20,
        schemaValido: true,
        escritaHabilitada: true,
        situacaoHabilitada: true,
        consolidacaoHabilitada: true,
        filtroPublicoSituacao: true,
        podeAtivarSituacao: true,
        areas: [{areaId: 'JAPARANDUBA', areaNome: 'Sítio Japaranduba'}]
      });
    }
  };

  window.document.head.appendChild = node => {
    if (node && node.tagName === 'SCRIPT') {
      const url = new URL(node.src);
      const callback = url.searchParams.get('callback');
      const requestId = url.searchParams.get('requestId');
      const result = results.get(requestId);
      setTimeout(() => {
        if (typeof window[callback] !== 'function') return;
        window[callback](result
          ? {ok: true, pendente: false, requestId, result}
          : {ok: true, pendente: true, requestId, result: null});
      }, 0);
      return node;
    }
    return node;
  };

  window.eval(source('teste-v1/painel-moradores-transport-v2.js'));
  window.document.getElementById('pin').value = '1234';
  window.document.getElementById('login').click();

  await waitFor(() => /base de moradores conferida/i.test(
    window.document.getElementById('loginStatus').textContent
  ));

  assert.equal(prematureSubmits, 0, 'O formulário foi enviado antes de o Safari registrar o iframe.');
  assert.deepEqual(submissions.map(item => item.action), [
    'admin_login',
    'admin_moradores_status'
  ]);
  assert.equal(new Set(submissions.map(item => item.requestId)).size, submissions.length);
  assert.ok(submissions.every(item => item.targetReady));
  assert.equal(window.sessionStorage.getItem('portalTacsAdminTokenV1'), 'token-admin-safari');
  assert.equal(window.document.getElementById('schema').textContent, '20/20');
  assert.equal(window.document.getElementById('content').classList.contains('hidden'), false);
  assert.doesNotMatch(window.document.getElementById('loginStatus').textContent, /ainda está em processamento/i);
  dom.window.close();
}

function testTerritoryPanel() {
  const html = source('teste-v1/painel-tacs-areas-v1.html');
  const js = source('teste-v1/painel-tacs-areas-v1.js');
  assert.match(html, /painel-tacs-areas\.svg/);
  assert.match(html, /painel-tacs-areas-180\.png/);
  assert.match(html, /id="tacsCns"/);
  assert.match(html, /id="areaSpreadsheet"/);
  assert.match(html, /id="areaCreateSource"/);
  assert.match(html, /id="permRead"/);
  assert.match(html, /id="permEdit"/);
  assert.match(html, /id="permStatus"/);
  assert.match(html, /id="permCsv"/);
  assert.match(html, /id="csvFile"/);
  assert.match(html, /id="batchList"/);
  assert.match(js, /confirmarTodosImportaveis/);
  assert.match(js, /Desfazer este lote sem excluir linhas/);

  const dom = new JSDOM(html, {
    url: 'https://portal.test/teste-v1/painel-tacs-areas-v1.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const {window} = dom;
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
  window.eval(js);
  assert.equal(window.document.getElementById('adminLogin').classList.contains('hidden'), false);
  window.document.getElementById('loginTacsTab').click();
  assert.equal(window.document.getElementById('tacsLogin').classList.contains('hidden'), false);
  window.document.getElementById('tacsCnsLogin').value = '123';
  window.document.getElementById('tacsPinLogin').value = '1234';
  window.document.getElementById('tacsLoginButton').click();
  assert.match(window.document.getElementById('loginStatus').textContent, /CNS profissional com 15 números/);
  window.document.getElementById('newTacsButton').click();
  assert.equal(window.document.getElementById('tacsForm').classList.contains('hidden'), false);
  for (const id of ['permRead', 'permEdit', 'permStatus', 'permCsv', 'permPublish']) {
    assert.equal(window.document.getElementById(id).checked, true, `Permissão inicial ausente: ${id}`);
  }
  dom.window.close();
}

function testIconsAndManifests() {
  const expected = [
    ['icons/painel-moradores-180.png', 180],
    ['icons/painel-moradores-192.png', 192],
    ['icons/painel-moradores-512.png', 512],
    ['icons/painel-tacs-areas-180.png', 180],
    ['icons/painel-tacs-areas-192.png', 192],
    ['icons/painel-tacs-areas-512.png', 512]
  ];
  expected.forEach(([file, size]) => assert.deepEqual(pngSize(file), {width: size, height: size}));
  for (const file of ['manifest-moradores.webmanifest', 'manifest-tacs-areas.webmanifest']) {
    const manifest = JSON.parse(source(file));
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
    assert.ok(manifest.icons.some(icon => icon.sizes === '512x512'));
  }
}

function testAreaTagClient() {
  const client = source('agenda-enfermeira.js');
  assert.match(client, /morador && morador\.areaId/);
  assert.match(client, /document\.addEventListener\('tacs:morador'/);
  assert.match(client, /OneSignal\.User\.addTag\('area_tacs', area/);
  assert.match(client, /OneSignal\.User\.getTags\(\)/);
  assert.match(client, /Reparar vínculo da área/);
  assert.match(client, /serviceWorkerPath:\s*'\/atendimento-acs-farmaceutico\/push\/OneSignalSDKWorker\.js'/);
  assert.match(client, /autoResubscribe:\s*true/);
  assert.match(client, /PushSubscription/);
  assert.match(client, /push && push\.optedIn === true/);
  assert.match(client, /push && push\.id \|\| ''/);
  assert.match(client, /Reparar recebimento de avisos/);
  assert.doesNotMatch(client, /addTag\('area_tacs', 'JAPARANDUBA'\)/);
}

async function main() {
  await testResidentPanel();
  await testSafariPostTargetRegistration();
  testTerritoryPanel();
  testIconsAndManifests();
  testAreaTagClient();
  console.log('DOM territorial: retorno à busca, data/idade, acesso TACS, CSV e ícones validados.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
