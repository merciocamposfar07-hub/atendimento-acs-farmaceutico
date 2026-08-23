'use strict';

const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

test.use({ serviceWorkers: 'allow' });

test('Portal não registra service worker legado de raiz durante abertura comum', async ({ page, browserName }) => {
  await blockExternal(page);
  await page.addInitScript(() => {
    window.__tacsSwRegistrations = [];
    if (!('serviceWorker' in navigator) || typeof navigator.serviceWorker.register !== 'function') return;
    const original = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = function(scriptURL, options){
      window.__tacsSwRegistrations.push({ scriptURL: String(scriptURL || ''), scope: String(options && options.scope || '') });
      return original(scriptURL, options);
    };
  });

  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const result = await page.evaluate(async () => {
    const calls = Array.isArray(window.__tacsSwRegistrations) ? window.__tacsSwRegistrations.slice() : [];
    let registrations = [];
    try {
      if ('serviceWorker' in navigator && typeof navigator.serviceWorker.getRegistrations === 'function') {
        registrations = await navigator.serviceWorker.getRegistrations();
      }
    } catch (error) {}
    return {
      calls,
      scopes: registrations.map(reg => String(reg.scope || '')),
      rootCalls: calls.filter(item => /(?:^|\/)service-worker\.js(?:[?#]|$)/i.test(item.scriptURL)).length,
      rootScopes: registrations.filter(reg => /\/atendimento-acs-farmaceutico\/$/.test(String(reg.scope || ''))).length
    };
  });

  expect(result.rootCalls, 'Abertura comum não pode registrar service-worker.js legado').toBe(0);
  expect(result.rootScopes, 'Nenhum worker deve assumir o escopo raiz do Portal na abertura comum').toBe(0);

  console.log(JSON.stringify({
    kind:'onesignal-sw-isolation',
    browserName,
    rootCalls:result.rootCalls,
    rootScopes:result.rootScopes,
    totalRegisterCalls:result.calls.length
  }));
});
