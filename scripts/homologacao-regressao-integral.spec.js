'use strict';
const { test, expect } = require('@playwright/test');

async function blockExternal(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://cdn.onesignal.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

test('regressão: Central não recria pool/viewer de navegação legado',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  const errors=[];page.on('pageerror',e=>errors.push(String(e&&e.message||e)));
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});

  await expect(page.locator('#portalTacsAdminPreloadPoolV1')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>Boolean(window.PortalTacsCentralSuporteMoradoresV1))).toBe(true);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.portalTacsSafeNavigationV1||'')).toBe('1');

  const legacy=await page.evaluate(()=>{
    const viewer=document.getElementById('viewer');
    const frame=document.getElementById('viewerFrame');
    return {
      viewerHidden:Boolean(viewer&&viewer.hidden),
      frameSrc:frame?frame.getAttribute('src')||'':'',
      pool:Boolean(document.getElementById('portalTacsAdminPreloadPoolV1'))
    };
  });
  expect(legacy.viewerHidden).toBe(true);
  expect(legacy.frameSrc).toBe('about:blank');
  expect(legacy.pool).toBe(false);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({kind:'regressao-central-sem-iframe-legado',browserName}));
});

test('regressão: Moradores mantém rota direta da Central',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});await blockExternal(page);
  await page.goto('central-administrativa-tacs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{const modules=document.getElementById('modulesPanel');if(modules)modules.hidden=false;const b=document.querySelector('#moduleGrid .module[data-module="moradores"]');if(b){b.hidden=false;b.disabled=false}});
  await page.locator('#moduleGrid .module[data-module="moradores"]').click();
  await page.waitForURL(url=>{const u=new URL(url);return u.pathname.endsWith('/teste-v1/painel-moradores-v2.html')&&u.searchParams.get('from')==='central'},{waitUntil:'domcontentloaded'});
  expect(new URL(page.url()).searchParams.get('preload')).toBeNull();
  console.log(JSON.stringify({kind:'regressao-moradores-direta',browserName}));
});
