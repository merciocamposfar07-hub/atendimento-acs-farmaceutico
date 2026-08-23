'use strict';
const {test,expect}=require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

async function visualState(page){
  return page.evaluate(()=>{
    const button=document.getElementById('portalTacsAtualizarPaginaV1');
    const style=getComputedStyle(button);
    const footer=document.querySelector('footer.portal-institutional-footer');
    const hero=document.querySelector('.hero');
    return {
      refresh:{width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height,radius:style.borderRadius,fontSize:style.fontSize},
      petroleum:document.body.classList.contains('tema-petroleo'),
      colorScheme:getComputedStyle(document.documentElement).colorScheme,
      heroBackground:getComputedStyle(hero).backgroundImage,
      footerBackground:getComputedStyle(footer).backgroundImage
    };
  });
}

test('Portal mantém a mesma identidade estrutural no iPhone e no tablet',async({page})=>{
  await blockExternal(page);
  await page.addInitScript(()=>localStorage.setItem('portalTacsTemaPublicoV1','claro'));

  const states=[];
  for(const viewport of [{width:390,height:844},{width:1024,height:900}]){
    await page.setViewportSize(viewport);
    await page.goto('index.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#portalTacsAtualizarPaginaV1')).toBeVisible();
    await expect(page.locator('.hero .hours')).toHaveCount(1);
    await expect(page.locator('.hero-actions .action-card')).toHaveCount(1);
    await expect(page.locator('.hero-actions')).toContainText('Envio pelo WhatsApp');
    await expect(page.locator('.hero-actions')).not.toContainText('Segunda a sexta');
    await expect(page.locator('#alternarContrastePortal')).toHaveCount(0);
    await expect(page.getByText('Usar cartões claros',{exact:true})).toHaveCount(0);
    states.push(await visualState(page));
  }

  for(const state of states){
    expect(state.petroleum).toBe(true);
    expect(state.colorScheme).toContain('light');
    expect(state.refresh.width).toBeGreaterThanOrEqual(49);
    expect(state.refresh.width).toBeLessThanOrEqual(51);
    expect(state.refresh.height).toBeGreaterThanOrEqual(49);
    expect(state.refresh.height).toBeLessThanOrEqual(51);
    expect(state.refresh.radius).toBe('50%');
    expect(state.refresh.fontSize).toBe('0px');
    expect(state.footerBackground).toBe(state.heroBackground);
  }
  expect(states[0].refresh).toEqual(states[1].refresh);
});
