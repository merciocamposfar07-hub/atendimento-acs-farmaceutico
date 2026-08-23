'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const playwright = fs.readFileSync(path.join(root, 'playwright.homologacao.config.js'), 'utf8');
const performance = fs.readFileSync(path.join(root, 'central-admin-performance-v1.js'), 'utf8');

const npmGate = String(pkg.scripts && pkg.scripts.test || '');
const requiredStatic = [
  'test_dental_confirmation_gate_v103.js',
  'test_dental_reserva_territorial_v1.js',
  'test_multiagent_isolation_50.js',
  'test_identificacao_familiar_publica_v1.js',
  'test_vinculo_familiar_notificacoes_v1.js',
  'test_push_comunitario_v1.js',
  'test_troca_aparelho_notificacoes_v1.js',
  'test_central_admin_performance_v1.js',
  'test_safari_bfcache_central_v1.js',
  'test_onesignal_service_worker_isolation_v1.js',
  'test_admin_local_first_v1.js',
  'test_admin_request_dedup_v1.js',
  'test_push_onboarding_v1.js',
  'test_familia_aparelho_beneficiario_v1.js',
  'test_matriz_identificacao_morador_v1.js',
  'test_performance_v101.js',
  'test_portal_release_integrity_v1.js',
  'test_quality_gate_v101.js'
];
for (const file of requiredStatic) {
  assert.ok(npmGate.includes(file), `Gate npm perdeu contrato crítico: ${file}`);
}

const requiredBrowser = [
  'homologacao-cross-engine.spec.js',
  'homologacao-performance-budget.spec.js',
  'homologacao-push-onboarding.spec.js',
  'homologacao-identificacao-familiar.spec.js',
  'homologacao-familia-aparelho-beneficiario.spec.js',
  'homologacao-matriz-identificacao.spec.js',
  'homologacao-reserva-confirmada.spec.js',
  'homologacao-safari-bfcache.spec.js',
  'homologacao-service-worker-isolation.spec.js',
  'homologacao-interface-acoes.spec.js',
  'homologacao-regressao-integral.spec.js',
  'homologacao-portal-release-layout.spec.js'
];
for (const file of requiredBrowser) {
  assert.ok(playwright.includes(file), `Matriz Playwright perdeu cenário crítico: ${file}`);
}

for (const engine of ["name: 'chromium'", "name: 'firefox'", "name: 'webkit'"]) {
  assert.ok(playwright.includes(engine), `Matriz final perdeu engine: ${engine}`);
}

// Proteções arquiteturais dos blocos 13/15 não podem regredir.
assert.doesNotMatch(performance, /if\s*\(name===['"]agendas['"]\)\s*setTimeout[\s\S]{0,220}frame\.remove\(\)/, 'Agendas não pode voltar a ser descartada por timer.');
assert.doesNotMatch(performance, /viewer\.appendChild\(frame\)/, 'Iframe carregado não pode voltar a ser reparentado para o viewer.');
assert.match(performance, /window\.addEventListener\(['"]pageshow['"],\s*beginPreload\)/, 'Suporte a pageshow/BFCache deve permanecer ativo.');

console.log('REGRESSAO_INTEGRAL_V1_OK');
