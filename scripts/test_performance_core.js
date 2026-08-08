'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const cache = new Map();
let reads = 0;
let validated = 0;
let storedResult = null;

const context = {
  console, JSON, String, RegExp, Error,
  CacheService: {
    getScriptCache() {
      return {
        get(key) { return cache.get(key) || null; },
        put(key, value) { cache.set(key, String(value)); },
        remove(key) { cache.delete(key); }
      };
    }
  },
  tacsAdminV1Dados_() {
    reads += 1;
    return {ok:true, profissionais:[{ID:'MEDICA'}], atualizadoEm:'08/08/2026 01:00'};
  },
  tacsAdminV1ValidarSessao_(p) {
    validated += 1;
    if (p.token !== 'token-ok') throw new Error('Sessão inválida.');
  },
  tacsAdminV1ValidarRequestId_(id) {
    if (!/^req_[0-9]{8}$/.test(String(id))) throw new Error('request inválido');
    return String(id);
  },
  tacsAdminV1GuardarResultado_(id, result) {
    storedResult = {id, result};
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'apps-script', 'PerformanceCoreV1.gs'), 'utf8'), context);

const firstWarm = context.tacsPerformanceV1PreaquecerAdmin_();
assert.equal(firstWarm.ok, true);
assert.equal(firstWarm.cache, false);
assert.equal(reads, 1);
const secondWarm = context.tacsPerformanceV1PreaquecerAdmin_();
assert.equal(secondWarm.ok, true);
assert.equal(secondWarm.cache, true);
assert.equal(reads, 1, 'Segundo aquecimento releu a planilha sem necessidade.');

const cachedAdmin = context.tacsPerformanceV1AdminDadosCache_({token:'token-ok', requestId:'req_00000001'});
assert.equal(cachedAdmin.handled, true);
assert.equal(cachedAdmin.data.cache, true);
assert.equal(validated, 1);
assert.equal(storedResult.id, 'req_00000001');

context.tacsPerformanceV1GuardarPublico_({ok:true, modules:{medica:[]}});
assert.ok(cache.has('tacs_public_snapshot_v1'));
assert.ok(cache.has('tacs_admin_snapshot_v1'));
context.tacsPerformanceV1DepoisDeAdmin_('admin_salvar_agenda', {ok:true});
assert.equal(cache.has('tacs_admin_snapshot_v1'), false);
assert.equal(cache.has('tacs_public_snapshot_v1'), false);

context.tacsPerformanceV1GuardarAdminDados_({ok:true, profissionais:[]});
context.tacsPerformanceV1GuardarPublico_({ok:true, modules:{}});
assert.equal(context.tacsPerformanceV1PublicoCache_().cache, true);
context.tacsPerformanceV1DepoisDeAdmin_('admin_dados', {ok:true, profissionais:[{ID:'NUTRICIONISTA'}]});
const refreshed = JSON.parse(cache.get('tacs_admin_snapshot_v1'));
assert.equal(refreshed.profissionais[0].ID, 'NUTRICIONISTA');

const router = fs.readFileSync(path.join(ROOT, 'apps-script', 'PortalRouterV1.gs'), 'utf8');
assert.match(router, /prewarm/);
assert.match(router, /tacsPerformanceV1PreaquecerAdmin_/);
assert.match(router, /tacsPerformanceV1AdminDadosCache_/);
assert.match(router, /tacsPerformanceV1PublicoCache_/);
assert.match(router, /tacsPerformanceV1DepoisDeAdmin_/);

const warmup = fs.readFileSync(path.join(ROOT, 'admin-warmup.js'), 'utf8');
assert.match(warmup, /action=admin_status&prewarm=1/);
assert.match(warmup, /TIMEOUT_MS=15000/);

[
  'painel-oficial-agendas-vagas.html',
  'painel-oficial-profissionais-servicos.html',
  'painel-oficial-recados-campanhas.html'
].forEach(file => {
  const official = fs.readFileSync(path.join(ROOT, file), 'utf8');
  assert.match(official, /fetch\(origem\)/, `${file} não usa o cache normal do navegador.`);
  assert.doesNotMatch(official, /cache\s*:\s*['"]no-store['"]/, `${file} ainda força download em toda abertura.`);
  assert.match(official, /\?v=20260806-desempenho-v5/, `${file} perdeu o versionamento do recurso.`);
});

console.log('OK: pré-aquecimento, cache servidor e cache versionado dos três painéis aprovados.');
