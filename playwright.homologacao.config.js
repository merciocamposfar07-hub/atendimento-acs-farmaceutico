'use strict';
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './scripts',
  testMatch: ['homologacao-cross-engine.spec.js','homologacao-performance-budget.spec.js','homologacao-push-onboarding.spec.js','homologacao-identificacao-familiar.spec.js','homologacao-familia-aparelho-beneficiario.spec.js','homologacao-matriz-identificacao.spec.js','homologacao-reserva-confirmada.spec.js','homologacao-safari-bfcache.spec.js','homologacao-service-worker-isolation.spec.js','homologacao-interface-acoes.spec.js','homologacao-regressao-integral.spec.js'],
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line']],
  use: {
    baseURL: 'http://127.0.0.1:4173/atendimento-acs-farmaceutico/',
    serviceWorkers: 'block',
    ignoreHTTPSErrors: true
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
