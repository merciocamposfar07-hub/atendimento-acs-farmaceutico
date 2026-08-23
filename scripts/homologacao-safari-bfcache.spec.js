'use strict';

const { test, expect } = require('@playwright/test');

async function blockExternal(page) {
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('https://cdn.onesignal.com/**', route => route.abort());
  await page.route('https://api.onesignal.com/**', route => route.abort());
}

test('Central preserva a mesma instância após retorno e pageshow/BFCache', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });

  await expect.poll(() => page.evaluate(() => Boolean(window.PortalTacsCentralPerformanceV1))).toBe(true);
  await page.evaluate(() => {
    sessionStorage.setItem('portalTacsAdminTokenV1', 'sessao-homologacao-bloco13');
    const modules = document.getElementById('modulesPanel');
    if (modules) modules.hidden = false;
    const support = document.querySelector('#moduleGrid .module[data-module="suporte"]');
    if (support) { support.hidden = false; support.disabled = false; }
  });

  const support = page.locator('#moduleGrid .module[data-module="suporte"]');
  await expect(support).toBeVisible();
  await support.click();
  await expect(page.locator('#viewer')).toBeVisible();
  await expect(page.locator('#viewer iframe[data-module="suporte"]')).toHaveCount(1);

  await page.waitForFunction(() => {
    const frame = document.querySelector('#viewer iframe[data-module="suporte"]');
    try {
      return Boolean(frame && frame.contentDocument && frame.contentDocument.body && frame.contentWindow.location.pathname.includes('painel-suporte-moradores-v2.html'));
    } catch (error) {
      return false;
    }
  });

  const firstState = await page.evaluate(() => {
    const frame = document.querySelector('#viewer iframe[data-module="suporte"]');
    window.__bloco13FrameRef = frame;
    window.__bloco13LoadCount = 0;
    frame.addEventListener('load', () => { window.__bloco13LoadCount += 1; });
    frame.dataset.bloco13Identity = 'mesmo-iframe';
    const marker = frame.contentDocument.createElement('input');
    marker.id = 'bloco13StateMarker';
    marker.value = 'estado-preservado';
    frame.contentDocument.body.appendChild(marker);
    return {
      count: document.querySelectorAll('iframe[data-module="suporte"]').length,
      src: frame.getAttribute('src') || '',
      marker: frame.contentDocument.getElementById('bloco13StateMarker')?.value || ''
    };
  });
  expect(firstState.count).toBe(1);
  expect(firstState.src).not.toContain('_cb=');
  expect(firstState.marker).toBe('estado-preservado');

  await page.locator('#viewerBack').click();
  await expect(page.locator('#viewer')).toBeHidden();
  await expect(page.locator('#portalTacsAdminPreloadPoolV1 iframe[data-module="suporte"]')).toHaveCount(1);
  await page.waitForTimeout(300);

  const afterClose = await page.evaluate(() => {
    const frame = document.querySelector('iframe[data-module="suporte"]');
    return {
      count: document.querySelectorAll('iframe[data-module="suporte"]').length,
      sameNode: Boolean(frame && frame === window.__bloco13FrameRef),
      identity: frame ? frame.dataset.bloco13Identity || '' : '',
      marker: frame && frame.contentDocument ? frame.contentDocument.getElementById('bloco13StateMarker')?.value || '' : '',
      loadCount: Number(window.__bloco13LoadCount || 0)
    };
  });

  console.log(JSON.stringify({ kind: 'bloco13-after-close-diagnostic', browserName, ...afterClose }));
  expect(afterClose.count).toBe(1);
  expect(afterClose.sameNode).toBe(true);
  expect(afterClose.identity).toBe('mesmo-iframe');
  expect(afterClose.loadCount, 'Mover o iframe ao pool não pode disparar novo load').toBe(0);
  expect(afterClose.marker, 'O DOM interno do painel deve sobreviver ao retorno').toBe('estado-preservado');

  await page.evaluate(() => {
    let event;
    try { event = new PageTransitionEvent('pageshow', { persisted: true }); }
    catch (error) { event = new Event('pageshow'); }
    window.dispatchEvent(event);
  });
  await page.waitForTimeout(350);

  const afterPageShow = await page.evaluate(() => {
    const frame = document.querySelector('iframe[data-module="suporte"]');
    return {
      count: document.querySelectorAll('iframe[data-module="suporte"]').length,
      sameNode: Boolean(frame && frame === window.__bloco13FrameRef),
      marker: frame && frame.contentDocument ? frame.contentDocument.getElementById('bloco13StateMarker')?.value || '' : '',
      loadCount: Number(window.__bloco13LoadCount || 0)
    };
  });
  expect(afterPageShow.count).toBe(1);
  expect(afterPageShow.sameNode).toBe(true);
  expect(afterPageShow.loadCount).toBe(0);
  expect(afterPageShow.marker).toBe('estado-preservado');

  const reopen = await page.evaluate(() => {
    const button = document.querySelector('#moduleGrid .module[data-module="suporte"]');
    const started = performance.now();
    button.click();
    const frame = document.querySelector('#viewer iframe[data-module="suporte"]');
    return {
      elapsedMs: performance.now() - started,
      visible: !document.getElementById('viewer').hidden,
      sameNode: Boolean(frame && frame === window.__bloco13FrameRef),
      marker: frame && frame.contentDocument ? frame.contentDocument.getElementById('bloco13StateMarker')?.value || '' : '',
      loadCount: Number(window.__bloco13LoadCount || 0),
      count: document.querySelectorAll('iframe[data-module="suporte"]').length
    };
  });

  expect(reopen.visible).toBe(true);
  expect(reopen.elapsedMs).toBeLessThan(100);
  expect(reopen.sameNode).toBe(true);
  expect(reopen.loadCount).toBe(0);
  expect(reopen.marker).toBe('estado-preservado');
  expect(reopen.count).toBe(1);

  console.log(JSON.stringify({ kind: 'safari-bfcache-panel-reuse', browserName, touchElapsedMs: Math.round(reopen.elapsedMs * 100) / 100, sameNode: true, preservedState: true, loadCount: reopen.loadCount }));
});
