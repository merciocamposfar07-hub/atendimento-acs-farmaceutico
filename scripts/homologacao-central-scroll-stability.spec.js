'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page) {
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('https://cdn.onesignal.com/**', route => route.abort());
  await page.route('https://api.onesignal.com/**', route => route.abort());
}

async function prepareCentral(page, moduleName) {
  await blockExternal(page);
  await page.addInitScript(() => {
    sessionStorage.setItem('portalTacsAdminTokenV1', 'sessao-homologacao-shell-scroll');
    localStorage.setItem('portalTacsDispositivoV1', 'device-homologacao-shell-scroll');
  });
  await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(name => {
    const modules = document.getElementById('modulesPanel');
    if (modules) modules.hidden = false;
    const button = document.querySelector('#moduleGrid .module[data-module="' + name + '"]');
    if (button) { button.hidden = false; button.disabled = false; }
  }, moduleName);
}

test('Central: shell nativo mantém painel rolável e tocável sem iframe oculto', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareCentral(page, 'agendas');
  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);

  const centralPath = new URL(page.url()).pathname;
  await page.locator('#moduleGrid .module[data-module="agendas"]').click();
  await expect(page.locator('#viewer')).toBeVisible();
  await expect(page.locator('#viewer')).toHaveClass(/csc-native-viewer/);
  await expect(page.locator('#viewerFrame')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.ConectaCentralShellV1 && window.ConectaCentralShellV1.ativo())).toBe('agendas');
  await expect.poll(() => page.evaluate(() => window.ConectaCentralShellV1 && window.ConectaCentralShellV1.tipoAtivo())).toBe('native');
  expect(new URL(page.url()).pathname).toBe(centralPath);

  const result = await page.evaluate(async () => {
    const viewer = document.getElementById('viewer');
    const spacer = document.createElement('div');
    spacer.id = 'homologacao-scroll-spacer-shell';
    spacer.style.cssText = 'height:2600px;width:1px;pointer-events:none;';
    const action = document.createElement('button');
    action.id = 'homologacao-touch-action-shell';
    action.type = 'button';
    action.textContent = 'Teste de toque';
    action.style.cssText = 'display:block;min-height:64px;min-width:220px;margin:16px auto 120px;';
    action.addEventListener('click', () => {
      document.documentElement.dataset.homologacaoTouchCount = String(Number(document.documentElement.dataset.homologacaoTouchCount || 0) + 1);
    });
    viewer.appendChild(spacer);
    viewer.appendChild(action);
    viewer.scrollTop = 1600;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      scrollTop: viewer.scrollTop,
      overflowPx: Math.max(0, viewer.scrollWidth - viewer.clientWidth)
    };
  });

  expect(result.scrollTop, browserName + ': shell do painel deve rolar').toBeGreaterThan(300);
  expect(result.overflowPx, browserName + ': shell não pode criar overflow horizontal').toBeLessThanOrEqual(1);

  const touch = page.locator('#homologacao-touch-action-shell');
  await touch.scrollIntoViewIfNeeded();
  await touch.click();
  await expect.poll(() => page.evaluate(() => Number(document.documentElement.dataset.homologacaoTouchCount || 0))).toBe(1);

  console.log('CENTRAL_SCROLL_SHELL_OK ' + browserName);
});
