'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page) {
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('https://cdn.onesignal.com/**', route => route.abort());
  await page.route('https://api.onesignal.com/**', route => route.abort());
}

test('Central limpa o visualizador no pageshow e continua tocável sem iframe persistente', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error&&error.message||error)));
  await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    const modules = document.getElementById('modulesPanel');
    if (modules) modules.hidden = false;
    const support = document.querySelector('#moduleGrid .module[data-module="suporte"]');
    if (support) { support.hidden = false; support.disabled = false; }
  });

  const support = page.locator('#moduleGrid .module[data-module="suporte"]');
  await expect(support).toBeVisible();
  await support.click();
  await expect(page.locator('#viewer')).toBeVisible();
  await expect(page.locator('#viewerFrame')).toHaveAttribute('src', /painel-suporte-moradores-v2\.html/);
  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);

  await page.evaluate(() => {
    let event;
    try { event = new PageTransitionEvent('pageshow', { persisted: true }); }
    catch (error) { event = new Event('pageshow'); }
    window.dispatchEvent(event);
  });

  await expect(page.locator('#viewer')).toBeHidden();
  await expect(page.locator('#viewerFrame')).toHaveAttribute('src', 'about:blank');
  await expect(page.locator('body')).not.toHaveClass(/viewer-open/);
  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);

  const reopen = await page.evaluate(() => {
    const button = document.querySelector('#moduleGrid .module[data-module="suporte"]');
    const viewer = document.getElementById('viewer');
    const started = performance.now();
    button.click();
    return {
      elapsedMs: performance.now() - started,
      visible: Boolean(viewer && !viewer.hidden),
      src: document.getElementById('viewerFrame').getAttribute('src') || ''
    };
  });

  expect(reopen.visible).toBe(true);
  expect(reopen.elapsedMs, browserName+': reabertura após pageshow deve responder abaixo de 100 ms').toBeLessThan(100);
  expect(reopen.src).toContain('painel-suporte-moradores-v2.html');
  expect(pageErrors).toEqual([]);

  console.log(JSON.stringify({kind:'safari-bfcache-direto',browserName,touchElapsedMs:Math.round(reopen.elapsedMs*100)/100,poolOculto:false}));
});
