'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

test('Central retorna do painel interno com cartões tocáveis no Safari/WebKit',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e&&e.message||e)));
  await page.addInitScript(()=>{
    sessionStorage.setItem('portalTacsAdminTokenV1','sessao-homologacao-retorno-shell');
    localStorage.setItem('portalTacsDispositivoV1','device-homologacao-retorno-shell');
  });
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');if(b){b.hidden=false;b.disabled=false}});
  const support=page.locator('#moduleGrid .module[data-module="suporte"]');
  await expect(support).toBeVisible();
  await support.click();
  await expect(page.locator('#viewer')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>window.ConectaCentralShellV1&&window.ConectaCentralShellV1.ativo())).toBe('suporte');

  await page.locator('#viewerBack').click();
  await expect(page.locator('#viewer')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>window.ConectaCentralShellV1&&window.ConectaCentralShellV1.ativo())).toBe('');

  await page.evaluate(()=>{
    const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;
    const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');
    if(b){b.hidden=false;b.disabled=false}
  });
  await expect(support).toBeVisible();
  const state=await page.evaluate(()=>{
    const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');
    return {pointerEvents:getComputedStyle(b).pointerEvents,ariaBusy:b.getAttribute('aria-busy')||'',disabled:Boolean(b.disabled)};
  });
  expect(state.pointerEvents).not.toBe('none');expect(state.ariaBusy).toBe('');expect(state.disabled).toBe(false);

  await support.click();
  await expect(page.locator('#viewer')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>window.ConectaCentralShellV1&&window.ConectaCentralShellV1.ativo())).toBe('suporte');
  expect(pageErrors).toEqual([]);
  console.log(JSON.stringify({kind:'safari-retorno-shell',browserName,retouch:true,poolOculto:false}));
});
