'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page) {
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('https://cdn.onesignal.com/**', route => route.abort());
  await page.route('https://api.onesignal.com/**', route => route.abort());
}

test('Central: painéis longos rolam e o botão Central sempre retorna', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });

  await expect.poll(() => page.evaluate(() => Boolean(window.PortalTacsCentralPerformanceV1))).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.PortalTacsCentralScrollStabilityV1))).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.portalTacsScrollStabilityInstalled || '')).toBe('1');

  await page.evaluate(() => {
    sessionStorage.setItem('portalTacsAdminTokenV1', 'sessao-homologacao-scroll-v1');
    const modules = document.getElementById('modulesPanel');
    if (modules) modules.hidden = false;
    ['moradores','agendas','recados','profissionais','suporte'].forEach(name => {
      const button = document.querySelector(`#moduleGrid .module[data-module="${name}"]`);
      if (button) { button.hidden = false; button.disabled = false; }
    });
  });

  const modules = ['moradores','agendas','recados','profissionais','suporte'];
  for (const name of modules) {
    const button = page.locator(`#moduleGrid .module[data-module="${name}"]`);
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.locator('#viewer')).toBeVisible();

    const iframe = page.locator(`#portalTacsAdminPreloadPoolV1 iframe[data-module="${name}"]`);
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('scrolling', 'yes');

    await page.waitForFunction(moduleName => {
      const frame = document.querySelector(`#portalTacsAdminPreloadPoolV1 iframe[data-module="${moduleName}"]`);
      try { return Boolean(frame && frame.contentDocument && frame.contentDocument.body); }
      catch (error) { return false; }
    }, name);

    const layout = await page.evaluate(moduleName => {
      const viewer = document.getElementById('viewer');
      const bar = viewer && viewer.querySelector('.viewer-bar');
      const pool = document.getElementById('portalTacsAdminPreloadPoolV1');
      const frame = pool && pool.querySelector(`iframe[data-module="${moduleName}"]`);
      if (!viewer || !bar || !pool || !frame) return null;
      const vr = viewer.getBoundingClientRect();
      const br = bar.getBoundingClientRect();
      const pr = pool.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      return {
        viewerHeight: vr.height,
        barHeight: br.height,
        poolHeight: pr.height,
        frameHeight: fr.height,
        viewportHeight: window.innerHeight,
        frameDisplay: getComputedStyle(frame).display,
        framePointerEvents: getComputedStyle(frame).pointerEvents
      };
    }, name);

    expect(layout).not.toBeNull();
    expect(layout.viewerHeight).toBeGreaterThan(700);
    expect(layout.poolHeight).toBeGreaterThan(600);
    expect(Math.abs(layout.poolHeight - layout.frameHeight)).toBeLessThanOrEqual(2);
    expect(layout.frameHeight).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.frameDisplay).toBe('block');
    expect(layout.framePointerEvents).toBe('auto');

    const handle = await iframe.elementHandle();
    const child = await handle.contentFrame();
    expect(child).not.toBeNull();
    const scrollY = await child.evaluate(async () => {
      const old = document.getElementById('homologacao-scroll-spacer-v1');
      if (old) old.remove();
      const spacer = document.createElement('div');
      spacer.id = 'homologacao-scroll-spacer-v1';
      spacer.style.cssText = 'height:2600px;width:1px;pointer-events:none;';
      document.body.appendChild(spacer);
      window.scrollTo(0, 1600);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return window.scrollY;
    });
    expect(scrollY).toBeGreaterThan(300);

    await page.locator('#viewerBack').click();
    await expect(page.locator('#viewer')).toBeHidden();
    await expect(page.locator(`#portalTacsAdminPreloadPoolV1 iframe[data-module="${name}"]`)).toHaveCount(1);
  }

  console.log(`CENTRAL_SCROLL_STABILITY_V1_OK ${browserName}: ${modules.length}/${modules.length} painéis rolaram e retornaram à Central.`);
});
