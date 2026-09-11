'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page) {
  await page.route('https://script.google.com/**', route => route.abort());
  await page.route('https://script.googleusercontent.com/**', route => route.abort());
  await page.route('https://cdn.onesignal.com/**', route => route.abort());
  await page.route('https://api.onesignal.com/**', route => route.abort());
}

test('Central: navegação direta mantém painel rolável e tocável sem iframe oculto', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternal(page);
  await page.goto('central-administrativa-tacs.html', { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    const modules=document.getElementById('modulesPanel');
    if(modules)modules.hidden=false;
    const support=document.querySelector('#moduleGrid .module[data-module="suporte"]');
    if(support){support.hidden=false;support.disabled=false}
  });
  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);

  await Promise.all([
    page.waitForURL(url=>{
      const u=new URL(url);
      return u.pathname.endsWith('/painel-suporte-moradores-v2.html') &&
        u.searchParams.get('from')==='central';
    },{waitUntil:'domcontentloaded'}),
    page.locator('#moduleGrid .module[data-module="suporte"]').click()
  ]);

  const result=await page.evaluate(async()=>{
    const spacer=document.createElement('div');
    spacer.id='homologacao-scroll-spacer-direto';
    spacer.style.cssText='height:2600px;width:1px;pointer-events:none;';
    document.body.appendChild(spacer);
    const action=document.createElement('button');
    action.id='homologacao-touch-action-direto';
    action.type='button';
    action.textContent='Teste de toque';
    action.style.cssText='display:block;min-height:64px;min-width:220px;margin:16px auto 120px;';
    action.addEventListener('click',()=>{document.documentElement.dataset.homologacaoTouchCount=String(Number(document.documentElement.dataset.homologacaoTouchCount||0)+1)});
    document.body.appendChild(action);
    window.scrollTo(0,1600);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return {
      scrollY:window.scrollY,
      overflowPx:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)
    };
  });
  expect(result.scrollY,browserName+': painel deve rolar').toBeGreaterThan(300);
  expect(result.overflowPx,browserName+': painel não pode criar overflow horizontal').toBeLessThanOrEqual(1);

  const touch=page.locator('#homologacao-touch-action-direto');
  await touch.scrollIntoViewIfNeeded();
  await touch.click();
  await expect.poll(()=>page.evaluate(()=>Number(document.documentElement.dataset.homologacaoTouchCount||0))).toBe(1);

  console.log('CENTRAL_SCROLL_DIRETO_OK '+browserName);
});
