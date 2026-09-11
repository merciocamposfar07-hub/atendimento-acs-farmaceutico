'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page) {
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('https://cdn.onesignal.com/**', route => route.abort());
  await page.route('https://api.onesignal.com/**', route => route.abort());
}

test('Central: painéis longos rolam, não se sobrepõem e continuam tocáveis', async ({ page, browserName }) => {
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
    const controller = window.PortalTacsCentralPerformance;
    if (controller && typeof controller.beginPreload === 'function') controller.beginPreload();
  });

  await expect.poll(() => page.evaluate(() => (
    document.querySelectorAll('#portalTacsAdminPreloadPoolV1 iframe[data-module]').length >= 2
  ))).toBe(true);

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

    // O clique e o controlador de estabilidade podem cair em frames distintos da
    // mesma pintura. Medimos somente depois que o iframe realmente atingiu o
    // estado ativo exigido pelo runtime; a exigência continua sendo relative,
    // visível e tocável, sem sleep nem tolerância a estado incorreto.
    await expect.poll(() => page.evaluate(moduleName => {
      const frame = document.querySelector(`#portalTacsAdminPreloadPoolV1 iframe[data-module="${moduleName}"]`);
      if (!frame) return 'ausente';
      const style = getComputedStyle(frame);
      return `${style.position}|${style.pointerEvents}|${style.visibility}`;
    }, name)).toBe('relative|auto|visible');

    await expect.poll(() => page.evaluate(moduleName => {
      const pool = document.getElementById('portalTacsAdminPreloadPoolV1');
      const active = pool && pool.querySelector(`iframe[data-module="${moduleName}"]`);
      if (!pool || !active) return -1;
      const ar = active.getBoundingClientRect();
      const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return [...pool.querySelectorAll('iframe[data-module]')]
        .filter(frame => frame !== active)
        .filter(frame => intersects(ar, frame.getBoundingClientRect())).length;
    }, name)).toBe(0);

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
      const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const inactive = [...pool.querySelectorAll('iframe[data-module]')].filter(item => item !== frame);
      const inactivePoolOverlapCount = inactive.filter(item => intersects(pr, item.getBoundingClientRect())).length;
      const inactiveTouchableCount = inactive.filter(item => {
        const style = getComputedStyle(item);
        return style.pointerEvents !== 'none' && intersects(pr, item.getBoundingClientRect());
      }).length;
      const inactiveStillDimensioned = inactive.every(item => {
        const rect = item.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(item).display !== 'none';
      });
      return {
        viewerHeight: vr.height,
        barHeight: br.height,
        poolHeight: pr.height,
        frameHeight: fr.height,
        viewportHeight: window.innerHeight,
        frameDisplay: getComputedStyle(frame).display,
        framePosition: getComputedStyle(frame).position,
        framePointerEvents: getComputedStyle(frame).pointerEvents,
        inactivePoolOverlapCount,
        inactiveTouchableCount,
        inactiveStillDimensioned
      };
    }, name);

    expect(layout).not.toBeNull();
    expect(layout.viewerHeight).toBeGreaterThan(700);
    expect(layout.poolHeight).toBeGreaterThan(600);
    expect(Math.abs(layout.poolHeight - layout.frameHeight)).toBeLessThanOrEqual(2);
    expect(layout.frameHeight).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.frameDisplay).toBe('block');
    expect(layout.framePosition).toBe('relative');
    expect(layout.framePointerEvents).toBe('auto');
    expect(layout.inactivePoolOverlapCount, 'Nenhum iframe inativo pode ocupar a área pintada do painel ativo').toBe(0);
    expect(layout.inactiveTouchableCount, 'Nenhum iframe inativo pode interceptar a superfície de toque').toBe(0);
    expect(layout.inactiveStillDimensioned, 'Painéis inativos devem continuar carregados e dimensionados para preservar estado/BFCache').toBe(true);

    const handle = await iframe.elementHandle();
    const child = await handle.contentFrame();
    expect(child).not.toBeNull();
    const scrollY = await child.evaluate(async () => {
      const oldSpacer = document.getElementById('homologacao-scroll-spacer-v1');
      if (oldSpacer) oldSpacer.remove();
      const oldButton = document.getElementById('homologacao-touch-action-v1');
      if (oldButton) oldButton.remove();
      const spacer = document.createElement('div');
      spacer.id = 'homologacao-scroll-spacer-v1';
      spacer.style.cssText = 'height:2600px;width:1px;pointer-events:none;';
      document.body.appendChild(spacer);
      const action = document.createElement('button');
      action.id = 'homologacao-touch-action-v1';
      action.type = 'button';
      action.textContent = 'Teste de toque';
      action.style.cssText = 'display:block;min-height:64px;min-width:220px;margin:16px auto 120px;';
      action.addEventListener('click', () => {
        document.documentElement.dataset.homologacaoTouchCount = String(Number(document.documentElement.dataset.homologacaoTouchCount || 0) + 1);
      });
      document.body.appendChild(action);
      window.scrollTo(0, 1600);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return window.scrollY;
    });
    expect(scrollY).toBeGreaterThan(300);

    const touchAction = child.locator('#homologacao-touch-action-v1');
    await touchAction.scrollIntoViewIfNeeded();
    await touchAction.click();
    await expect.poll(() => child.evaluate(() => Number(document.documentElement.dataset.homologacaoTouchCount || 0))).toBe(1);

    await page.locator('#viewerBack').click();
    await expect(page.locator('#viewer')).toBeHidden();
    await expect(page.locator(`#portalTacsAdminPreloadPoolV1 iframe[data-module="${name}"]`)).toHaveCount(1);
  }

  console.log(`CENTRAL_SCROLL_STABILITY_V2_OK ${browserName}: ${modules.length}/${modules.length} painéis rolaram, ficaram sem sobreposição e responderam ao toque.`);
});
