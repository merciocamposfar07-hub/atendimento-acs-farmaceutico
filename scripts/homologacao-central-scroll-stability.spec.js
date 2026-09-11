'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page) {
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('https://cdn.onesignal.com/**', route => route.abort());
  await page.route('https://api.onesignal.com/**', route => route.abort());
}

async function prepareCentral(page) {
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#loginPanel')).toBeVisible();
  await page.evaluate(() => {
    const modules = document.getElementById('modulesPanel');
    if (modules) modules.hidden = false;
    const support = document.querySelector('#moduleGrid .module[data-module="suporte"]');
    if (support) { support.hidden = false; support.disabled = false; }
  });
}

test('Central: painel visível rola e responde ao toque sem pool de iframes ocultos', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareCentral(page);

  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);

  const support = page.locator('#moduleGrid .module[data-module="suporte"]');
  await expect(support).toBeVisible();
  await support.click();

  const viewer = page.locator('#viewer');
  const iframe = page.locator('#viewerFrame');
  await expect(viewer).toBeVisible();
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveAttribute('src', /painel-suporte-moradores-v2\.html/);

  await page.waitForFunction(() => {
    const frame = document.getElementById('viewerFrame');
    try { return Boolean(frame && frame.contentDocument && frame.contentDocument.body); }
    catch (error) { return false; }
  });

  const handle = await iframe.elementHandle();
  const child = await handle.contentFrame();
  expect(child).not.toBeNull();

  const result = await child.evaluate(async () => {
    const spacer = document.createElement('div');
    spacer.id = 'homologacao-scroll-spacer-direto';
    spacer.style.cssText = 'height:2600px;width:1px;pointer-events:none;';
    document.body.appendChild(spacer);

    const action = document.createElement('button');
    action.id = 'homologacao-touch-action-direto';
    action.type = 'button';
    action.textContent = 'Teste de toque';
    action.style.cssText = 'display:block;min-height:64px;min-width:220px;margin:16px auto 120px;';
    action.addEventListener('click', () => {
      document.documentElement.dataset.homologacaoTouchCount =
        String(Number(document.documentElement.dataset.homologacaoTouchCount || 0) + 1);
    });
    document.body.appendChild(action);

    window.scrollTo(0, 1600);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      scrollY: window.scrollY,
      width: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });

  expect(result.scrollY, browserName + ': painel deve manter rolagem própria').toBeGreaterThan(300);
  expect(Math.max(0, result.width - result.clientWidth), browserName + ': painel não pode criar overflow horizontal').toBeLessThanOrEqual(1);

  const touchAction = child.locator('#homologacao-touch-action-direto');
  await touchAction.scrollIntoViewIfNeeded();
  await touchAction.click();
  await expect.poll(() => child.evaluate(() => Number(document.documentElement.dataset.homologacaoTouchCount || 0))).toBe(1);

  await page.locator('#viewerBack').click();
  await expect(viewer).toBeHidden();
  await expect(iframe).toHaveAttribute('src', 'about:blank');
  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);

  console.log('CENTRAL_SCROLL_DIRETO_OK ' + browserName + ': painel único, rolável, tocável e sem iframe oculto persistente.');
});
