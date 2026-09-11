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

async function exposeModules(page, names) {
  await page.evaluate(moduleNames => {
    const modules = document.getElementById('modulesPanel');
    if (modules) modules.hidden = false;
    moduleNames.forEach(name => {
      const button = document.querySelector('#moduleGrid .module[data-module="' + name + '"]');
      if (button) { button.hidden = false; button.disabled = false; }
    });
  }, names);
}

for (const vp of portalViewports) {
  test('Portal responsivo ' + vp.name, async ({ page, browserName }) => {
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
  test('Central responsiva ' + vp.name, async ({ page, browserName }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await blockExternal(page);
    const started = Date.now();
    await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#tabAdmin')).toBeVisible();
    await expect(page.locator('#tabTacs')).toBeVisible();
    await expect(page.locator('#loginPanel')).toBeVisible();
    await expect(page.locator('#adminPin')).toBeVisible();
    await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
    const m = await metrics(page);
    expect(m.overflowPx).toBeLessThanOrEqual(1);
    writeResult({ kind: 'central', browserName, viewport: vp.name, elapsedMs: Date.now() - started, ...m });
  });
}

test('PIN local V3 funciona nos navegadores reais sem persistir token remoto', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });

  const rows = await page.evaluate(async () => {
    const api = window.ConectaPinLocalV2;
    if (!api) throw new Error('ConectaPinLocalV2 ausente');
    const device = localStorage.getItem('portalTacsDispositivoV1') || 'device-homologacao-pin-v3';
    const out = [];
    for (const scope of ['admin', 'tacs', 'morador']) {
      const context = { areas: [{ areaId: 'JAPARANDUBA', areaNome: 'Sítio Japaranduba', ativa: true }] };
      const started = performance.now();
      const saved = await api.guardar(scope, '2468', {
        device,
        token: 'TOKEN-NAO-DEVE-SOBREVIVER-' + scope,
        context,
        snapshot: { nome: 'Morador Teste', areaId: 'JAPARANDUBA' },
        mode: scope
      });
      const opened = await api.abrir(scope, '2468');
      const wrong = await api.abrir(scope, '1357');
      out.push({
        scope,
        saved,
        elapsedMs: performance.now() - started,
        opened: Boolean(opened),
        wrongBlocked: wrong === null,
        hasToken: Boolean(opened && opened.token),
        hasContext: Boolean(opened && (opened.context || opened.snapshot)),
        storageV3: Boolean(localStorage.getItem('conectaPinLocalV3:' + scope))
      });
    }
    return out;
  });

  for (const row of rows) {
    expect(row.saved, row.scope + ': cofre deve ser gravado').toBe(true);
    expect(row.opened, row.scope + ': PIN correto deve abrir o snapshot').toBe(true);
    expect(row.wrongBlocked, row.scope + ': PIN incorreto deve bloquear').toBe(true);
    expect(row.hasToken, row.scope + ': token remoto não pode ficar no cofre').toBe(false);
    expect(row.hasContext, row.scope + ': contexto/snapshot confirmado deve existir').toBe(true);
    expect(row.storageV3, row.scope + ': armazenamento deve usar o formato V3').toBe(true);
    expect(row.elapsedMs, browserName + '/' + row.scope + ': desbloqueio local deve permanecer sub-segundo operacional').toBeLessThan(1500);
  }

  writeResult({ kind: 'pin-local-v3', browserName, rows: rows.map(row => ({ scope: row.scope, elapsedMs: Math.round(row.elapsedMs * 100) / 100 })) });
});

test('Central abre painel comum no mesmo toque sem arquitetura de iframe oculto', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });
  await exposeModules(page, ['suporte']);

  const firstTouch = await page.evaluate(() => {
    const button = document.querySelector('#moduleGrid .module[data-module="suporte"]');
    const viewer = document.getElementById('viewer');
    const started = performance.now();
    button.click();
    return {
      elapsedMs: performance.now() - started,
      visible: Boolean(viewer && !viewer.hidden),
      src: document.getElementById('viewerFrame').getAttribute('src') || '',
      hasPool: Boolean(document.getElementById('portalTacsAdminPreloadPoolV1'))
    };
  });

  expect(firstTouch.visible).toBe(true);
  expect(firstTouch.elapsedMs, browserName + ': resposta visual ao toque deve ficar abaixo de 100 ms').toBeLessThan(100);
  expect(firstTouch.src).toContain('painel-suporte-moradores-v2.html');
  expect(firstTouch.hasPool).toBe(false);

  await page.locator('#viewerBack').click();
  await expect(page.locator('#viewer')).toBeHidden();
  await expect(page.locator('#viewerFrame')).toHaveAttribute('src', 'about:blank');

  writeResult({ kind: 'central-first-touch-direct', browserName, viewport: 'central-mobile-390', touchElapsedMs: Math.round(firstTouch.elapsedMs * 100) / 100 });
});

test('Agendas usa navegação direta e não iframe oculto', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });
  await exposeModules(page, ['agendas']);
  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);

  await Promise.all([
    page.waitForURL(url => {
      const u = new URL(url);
      return u.pathname.endsWith('/painel-oficial-agendas-vagas.html') &&
        u.searchParams.get('from') === 'central' &&
        /^\d+$/.test(u.searchParams.get('_cb') || '');
    }),
    page.locator('#moduleGrid .module[data-module="agendas"]').click()
  ]);

  expect(page.url()).toContain('painel-oficial-agendas-vagas.html');
  writeResult({ kind: 'agendas-direct-navigation', browserName, viewport: 'iphone-390', direct: true });
});

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

test('Botão Atualizar refaz a navegação com cache-bust real', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  const refresh = page.locator('#portalTacsAtualizarPaginaV1');
  await expect(refresh).toBeVisible();
  await Promise.all([
    page.waitForURL(url => {
      const u = new URL(url);
      return u.pathname.endsWith('/index.html') && u.searchParams.get('ptrefresh') === '1' && /^\d+$/.test(u.searchParams.get('ptv') || '');
    }),
    refresh.click()
  ]);
  const u = new URL(page.url());
  expect(u.searchParams.get('ptrefresh')).toBe('1');
  expect(u.searchParams.get('ptv')).toMatch(/^\d+$/);
  writeResult({ kind: 'portal-refresh', browserName, viewport: 'iphone-390', refreshed: true });
});

test('Rodapé usa o símbolo oficial da Conecta Saúde Comunitária', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  const logo = page.locator('.portal-footer-brand [data-conecta-oficial="1"]');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('aria-label', 'Símbolo oficial Conecta Saúde Comunitária');
  writeResult({ kind: 'conecta-brand', browserName, viewport: 'iphone-390', official: true });
});
