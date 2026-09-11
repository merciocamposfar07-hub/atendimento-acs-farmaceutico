'use strict';

const { test, expect } = require('@playwright/test');

async function blockExternal(page) {
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('https://cdn.onesignal.com/**', route => route.abort());
  await page.route('https://api.onesignal.com/**', route => route.abort());
}

test('Central preserva a mesma instância e o viewport interno após retorno/pageshow', async ({ page, browserName }) => {
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
      marker: frame.contentDocument.getElementById('bloco13StateMarker')?.value || '',
      rectHeight: frame.getBoundingClientRect().height,
      innerHeight: frame.contentWindow.innerHeight
    };
  });
  expect(firstState.count).toBe(1);
  expect(firstState.src).not.toContain('_cb=');
  expect(firstState.marker).toBe('estado-preservado');
  expect(firstState.rectHeight).toBeGreaterThan(0);
  expect(firstState.innerHeight).toBeGreaterThan(0);

  await page.locator('#viewerBack').click();
  await expect(page.locator('#viewer')).toBeHidden();
  await expect(page.locator('#portalTacsAdminPreloadPoolV1 iframe[data-module="suporte"]')).toHaveCount(1);
  await page.waitForTimeout(300);

  const afterClose = await page.evaluate(() => {
    const viewer = document.getElementById('viewer');
    const frame = document.querySelector('iframe[data-module="suporte"]');
    const frameStyle = frame ? getComputedStyle(frame) : null;
    const viewerStyle = viewer ? getComputedStyle(viewer) : null;
    return {
      count: document.querySelectorAll('iframe[data-module="suporte"]').length,
      sameNode: Boolean(frame && frame === window.__bloco13FrameRef),
      identity: frame ? frame.dataset.bloco13Identity || '' : '',
      marker: frame && frame.contentDocument ? frame.contentDocument.getElementById('bloco13StateMarker')?.value || '' : '',
      loadCount: Number(window.__bloco13LoadCount || 0),
      viewerHiddenAttribute: Boolean(viewer && viewer.hidden),
      viewerDisplay: viewerStyle ? viewerStyle.display : '',
      viewerVisibility: viewerStyle ? viewerStyle.visibility : '',
      frameDisplay: frameStyle ? frameStyle.display : '',
      frameVisibility: frameStyle ? frameStyle.visibility : '',
      rectHeight: frame ? frame.getBoundingClientRect().height : 0,
      innerHeight: frame && frame.contentWindow ? frame.contentWindow.innerHeight : 0
    };
  });

  console.log(JSON.stringify({ kind: 'ios-paint-after-close', browserName, ...afterClose }));
  expect(afterClose.count).toBe(1);
  expect(afterClose.sameNode).toBe(true);
  expect(afterClose.identity).toBe('mesmo-iframe');
  expect(afterClose.loadCount, 'Voltar à Central não pode disparar novo load').toBe(0);
  expect(afterClose.marker, 'O DOM interno do painel deve sobreviver ao retorno').toBe('estado-preservado');
  expect(afterClose.viewerHiddenAttribute, 'O viewer estacionado não pode voltar a usar hidden/display:none no Safari').toBe(false);
  expect(afterClose.viewerDisplay, 'O viewer estacionado precisa continuar dimensionado').not.toBe('none');
  expect(afterClose.viewerVisibility, 'O viewer deve ficar invisível sem colapsar o layout interno').toBe('hidden');
  expect(afterClose.frameDisplay, 'Iframe estacionado não pode usar display:none').not.toBe('none');
  expect(afterClose.frameVisibility).toBe('hidden');
  expect(afterClose.rectHeight, 'Iframe estacionado deve manter altura real para o compositor do iOS').toBeGreaterThan(0);
  expect(afterClose.innerHeight, 'Viewport interno do iframe não pode zerar ao voltar à Central').toBeGreaterThan(0);

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
      loadCount: Number(window.__bloco13LoadCount || 0),
      rectHeight: frame ? frame.getBoundingClientRect().height : 0,
      innerHeight: frame && frame.contentWindow ? frame.contentWindow.innerHeight : 0
    };
  });
  expect(afterPageShow.count).toBe(1);
  expect(afterPageShow.sameNode).toBe(true);
  expect(afterPageShow.loadCount).toBe(0);
  expect(afterPageShow.marker).toBe('estado-preservado');
  expect(afterPageShow.rectHeight).toBeGreaterThan(0);
  expect(afterPageShow.innerHeight).toBeGreaterThan(0);

  const reopen = await page.evaluate(() => {
    const button = document.querySelector('#moduleGrid .module[data-module="suporte"]');
    const started = performance.now();
    button.click();
    const frame = document.querySelector('#viewer iframe[data-module="suporte"]');
    const viewer = document.getElementById('viewer');
    return {
      elapsedMs: performance.now() - started,
      visible: Boolean(viewer && !viewer.hidden && getComputedStyle(viewer).visibility === 'visible'),
      sameNode: Boolean(frame && frame === window.__bloco13FrameRef),
      marker: frame && frame.contentDocument ? frame.contentDocument.getElementById('bloco13StateMarker')?.value || '' : '',
      loadCount: Number(window.__bloco13LoadCount || 0),
      count: document.querySelectorAll('iframe[data-module="suporte"]').length,
      rectHeight: frame ? frame.getBoundingClientRect().height : 0,
      innerHeight: frame && frame.contentWindow ? frame.contentWindow.innerHeight : 0
    };
  });

  expect(reopen.visible).toBe(true);
  expect(reopen.elapsedMs).toBeLessThan(100);
  expect(reopen.sameNode).toBe(true);
  expect(reopen.loadCount).toBe(0);
  expect(reopen.marker).toBe('estado-preservado');
  expect(reopen.count).toBe(1);
  expect(reopen.rectHeight).toBeGreaterThan(0);
  expect(reopen.innerHeight).toBeGreaterThan(0);

  console.log(JSON.stringify({ kind: 'safari-bfcache-panel-reuse', browserName, touchElapsedMs: Math.round(reopen.elapsedMs * 100) / 100, sameNode: true, preservedState: true, loadCount: reopen.loadCount, persistentViewport: true }));
});
