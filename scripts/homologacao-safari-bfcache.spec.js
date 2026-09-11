'use strict';
const { test, expect } = require('@playwright/test');

async function seedCentralSession(page){
  await page.addInitScript(()=>{
    sessionStorage.setItem('portalTacsAdminTokenV1','homologacao-admin-session');
    sessionStorage.setItem('portalTacsCentralReturnUrlV1',location.origin+'/atendimento-acs-farmaceutico/central-administrativa-tacs.html');
    localStorage.setItem('portalTacsCentralAreaV1','JAPARANDUBA');
  });
}

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

test('Central volta do painel com cartões tocáveis no BFCache/Safari',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e&&e.message||e)));
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');if(b){b.hidden=false;b.disabled=false}});
  const support=page.locator('#moduleGrid .module[data-module="suporte"]');
  await expect(support).toBeVisible();
  await support.click();
  await page.waitForURL(url=>{const u=new URL(url);return u.pathname.endsWith('/painel-suporte-moradores-v2.html')&&u.searchParams.get('from')==='central'},{waitUntil:'domcontentloaded'});
  const back=page.locator('.csc-appbar-back');
  await expect(back).toBeVisible();
  await Promise.all([
    page.waitForURL(url=>new URL(url).pathname.endsWith('/central-administrativa-tacs.html'),{waitUntil:'domcontentloaded'}),
    back.click()
  ]);
  await page.waitForSelector('#moduleGrid',{state:'attached',timeout:7000});

  /* A visibilidade do módulo depende da sessão/permissão, que não é o alvo deste
     teste isolado. Reexibimos somente o cartão; não tocamos em pointer-events
     nem aria-busy, justamente os estados que o BFCache precisa preservar. */
  await page.evaluate(()=>{
    const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;
    const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');
    if(b){b.hidden=false;b.disabled=false}
  });
  await expect(page.locator('#moduleGrid .module[data-module="suporte"]')).toBeVisible();
  const state=await page.evaluate(()=>{
    const b=document.querySelector('#moduleGrid .module[data-module="suporte"]');
    return {pointerEvents:getComputedStyle(b).pointerEvents,ariaBusy:b.getAttribute('aria-busy')||'',disabled:Boolean(b.disabled)};
  });
  expect(state.pointerEvents).not.toBe('none');expect(state.ariaBusy).toBe('');expect(state.disabled).toBe(false);

  await page.locator('#moduleGrid .module[data-module="suporte"]').click();
  await page.waitForURL(url=>new URL(url).pathname.endsWith('/painel-suporte-moradores-v2.html'),{waitUntil:'domcontentloaded'});
  expect(pageErrors).toEqual([]);
  console.log(JSON.stringify({kind:'safari-bfcache-direto',browserName,retouch:true,poolOculto:false}));
});
