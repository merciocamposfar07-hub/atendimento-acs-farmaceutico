'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'portal-public-data.js'), 'utf8');

function storage(initial) {
  const values = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    value(key) { return values.get(key); }
  };
}

function environment(initial) {
  const requests = [];
  const events = [];
  const localStorage = storage(initial);
  const head = {
    appendChild(node) {
      node.parentNode = head;
      requests.push(node);
      return node;
    },
    removeChild(node) { node.parentNode = null; }
  };
  const context = vm.createContext({
    Promise,
    Date,
    Math,
    JSON,
    Error,
    setTimeout,
    clearTimeout,
    localStorage,
    CustomEvent: function CustomEvent(type, options) {
      this.type = type;
      this.detail = options && options.detail;
    },
    document: {
      head,
      createElement() { return {parentNode: null, src: '', onerror: null}; }
    },
    dispatchEvent(event) { events.push(event); return true; }
  });
  context.window = context;
  vm.runInContext(source, context);
  return {context, requests, events, localStorage};
}

function answer(env, index, data) {
  const node = env.requests[index];
  assert.ok(node, `Consulta ${index + 1} não foi criada.`);
  const callback = new URL(node.src).searchParams.get('callback');
  env.context[callback](data);
}

async function wait(milliseconds) {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function main() {
  const fresh = environment();
  const first = fresh.context.PortalTacsPublicData.get();
  const second = fresh.context.PortalTacsPublicData.get();
  assert.equal(fresh.requests.length, 1, 'Duas telas abriram duas consultas públicas concorrentes.');
  const live = {ok: true, atualizadoEm: '06/08/2026 00:10', modules: {medica: []}};
  answer(fresh, 0, live);
  const results = await Promise.all([first, second]);
  assert.equal(results[0].atualizadoEm, live.atualizadoEm);
  assert.equal(results[1].atualizadoEm, live.atualizadoEm);
  assert.ok(fresh.localStorage.value('portalTacsPublicDataV2'));
  assert.ok(Number(fresh.localStorage.value('portalTacsAppsScriptWarmAtV1')) > 0);
  assert.equal(fresh.events.length, 1, 'A atualização pública não foi anunciada às duas telas.');

  const cacheItem = JSON.stringify({salvoEm: Date.now(), data: live});
  const cached = environment({portalTacsPublicDataV2: cacheItem});
  const cachedResult = await cached.context.PortalTacsPublicData.get();
  assert.equal(cachedResult.atualizadoEm, live.atualizadoEm);
  assert.equal(cached.requests.length, 0, 'O cache não foi exibido antes da atualização.');
  await wait(20);
  assert.equal(cached.requests.length, 1, 'A página não atualizou o cache em segundo plano.');
  answer(cached, 0, live);

  const staleItem = JSON.stringify({salvoEm: Date.now() - 31000, data: live});
  const stale = environment({portalTacsPublicDataV2: staleItem});
  const start = Date.now();
  const staleResult = await stale.context.PortalTacsPublicData.get();
  assert.equal(staleResult.atualizadoEm, live.atualizadoEm);
  assert.ok(Date.now() - start < 100, 'O cache não foi exibido imediatamente.');
  await wait(20);
  assert.equal(stale.requests.length, 1, 'O cache antigo não foi atualizado em segundo plano.');
  answer(stale, 0, {...live, atualizadoEm: '06/08/2026 00:11'});
  await wait(0);
  assert.equal(stale.events.length, 1);

  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(index.indexOf('portal-public-data.js') < index.indexOf('agenda-enfermeira.js'));
  assert.ok(index.indexOf('portal-public-data.js') < index.indexOf('portal-controle-integral.js'));
  assert.match(source, /TIMEOUT_MS=25000/);
  assert.match(fs.readFileSync(path.join(ROOT, 'agenda-enfermeira.js'), 'utf8'), /PortalTacsPublicData\.get/);
  assert.match(fs.readFileSync(path.join(ROOT, 'portal-controle-integral.js'), 'utf8'), /PortalTacsPublicData\.get/);

  console.log('OK: cache imediato, atualização em segundo plano e consulta pública única aprovados.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
