'use strict';
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const reportPath = path.resolve(process.cwd(), 'homologacao-cross-engine.ndjson');
const portalViewports = [
  { name: 'iphone-390', width: 390, height: 844, direction: 'down' },
  { name: 'android-430', width: 430, height: 932, direction: 'down' },
  { name: 'tablet-768', width: 768, height: 1024, direction: 'right' },
  { name: 'desktop-1366', width: 1366, height: 768, direction: 'right' }
];

function writeResult(result) {
  fs.appendFileSync(reportPath, JSON.stringify(result) + '\n', 'utf8');
}

async function blockExternal(page) {
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('https://cdn.onesignal.com/**', route => route.abort());
  await page.route('https://api.onesignal.com/**', route => route.abort());
}

async function metrics(page) {
  return page.evaluate(() => {
    const html = document.documentElement;
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: html.scrollWidth,
      clientWidth: html.clientWidth,
      overflowPx: Math.max(0, html.scrollWidth - html.clientWidth),
      domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      loadMs: nav ? Math.round(nav.loadEventEnd) : null
    };
  });
}

for (const vp of portalViewports) {
  test(`Portal responsivo ${vp.name}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await blockExternal(page);
    const started = Date.now();
    await page.goto('index.html', { waitUntil: 'domcontentloaded' });
    const arrow = page.locator('.portal-flow-arrow[data-guide-key="document"]');
    await expect(arrow).toBeVisible();
    await expect.poll(async () => arrow.getAttribute('data-arrow-direction')).toBe(vp.direction);
    await expect(page.locator('#portalTacsAtualizarPaginaV1')).toBeVisible();
    await expect(page.locator('#portalTacsVoltarCentralV1')).toHaveCount(0);
    const appleHref = await page.locator('link[rel="apple-touch-icon"]').first().getAttribute('href');
    expect(appleHref || '').toContain('portal-tacs-oficial-512.png');
    const m = await metrics(page);
    expect(m.overflowPx).toBeLessThanOrEqual(1);
    writeResult({ kind: 'portal', browserName, viewport: vp.name, expectedDirection: vp.direction, actualDirection: await arrow.getAttribute('data-arrow-direction'), elapsedMs: Date.now() - started, ...m });
  });
}

for (const vp of [
  { name: 'central-mobile-390', width: 390, height: 844 },
  { name: 'central-desktop-1024', width: 1024, height: 768 }
]) {
  test(`Central responsiva ${vp.name}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await blockExternal(page);
    const started = Date.now();
    await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#tabAdmin')).toBeVisible();
    await expect(page.locator('#tabTacs')).toBeVisible();
    await expect(page.locator('#portalTacsCentralRefreshV1')).toBeVisible();
    const m = await metrics(page);
    expect(m.overflowPx).toBeLessThanOrEqual(1);
    writeResult({ kind: 'central', browserName, viewport: vp.name, elapsedMs: Date.now() - started, ...m });
  });
}

test('Portal vindo da Central mostra retorno sem credencial na URL', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.addInitScript(() => sessionStorage.setItem('portalTacsAdminTokenV1', 'sessao-teste-sem-credencial-na-url'));
  await page.goto('index.html?from=central&area=JAPARANDUBA', { waitUntil: 'domcontentloaded' });
  const back = page.locator('#portalTacsVoltarCentralV1');
  await expect(back).toBeVisible();
  expect(page.url()).not.toContain('token=');
  expect(page.url()).not.toContain('territorioToken=');
  const m = await metrics(page);
  expect(m.overflowPx).toBeLessThanOrEqual(1);
  writeResult({ kind: 'central-return', browserName, viewport: 'iphone-390', visible: true, ...m });
});

test('Portal público comum não expõe retorno administrativo', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#portalTacsVoltarCentralV1')).toHaveCount(0);
  const m = await metrics(page);
  expect(m.overflowPx).toBeLessThanOrEqual(1);
  writeResult({ kind: 'public-no-central-return', browserName, viewport: 'iphone-390', visible: false, ...m });
});
